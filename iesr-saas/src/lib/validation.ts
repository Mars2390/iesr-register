// Attendance validation & conflict detection.
// Ported from legacy js/app.js (TimeSlotManager.getMarkingWindow) and
// js/attendance.js (validateMarkingAuthorization + addConflictEntry).
//
// Pure functions. The legacy version logged conflicts to localStorage and
// flagged teachers in-place; here, when a conflict is detected, we RETURN a
// ConflictEntry and let the caller (API route) persist it (e.g. to flags_issues
// or activity_log). No globals, no storage.

import type { Session } from "@/lib/attendance";
import { formatDate, normalizeDay, dayKeyFromDate, timeToMinutes, nowMinutes } from "@/lib/dates";

export type MarkingWindowType =
  | "DURING_CLASS" | "BREAK" | "AFTER_HOURS" | "BEFORE_CLASS"
  | "LOCKED_OTHER" | "NO_CLASS_TODAY";

export interface MarkingWindow {
  type: MarkingWindowType;
  authorized: boolean;
  message: string;
  session: Session | null;
  conflictTeacher?: string;
  minutesUntil?: number;
}

function lecturerMatches(sessionTeacher: string, teacherName: string): boolean {
  const a = (sessionTeacher || "").toUpperCase();
  const b = (teacherName || "").toUpperCase();
  if (!a || a === "ALL" || a === "ALL LECTURERS") return true;
  return a.includes(b) || b.includes(a);
}

type Ranged = Session & { _start: number; _end: number };
function sessionsForDay(sessions: Session[], dayKey: string): Ranged[] {
  return sessions
    .filter((s) => normalizeDay(s.day) === dayKey)
    .map((s) => ({ ...s, _start: timeToMinutes(s.startTime), _end: timeToMinutes(s.endTime) }))
    .filter((s) => s._end > s._start)
    .sort((a, b) => a._start - b._start);
}

/**
 * Marking window for a teacher at `now` (legacy TimeSlotManager.getMarkingWindow).
 * Authorized in every window EXCEPT LOCKED_OTHER (another teacher's live session).
 */
export function getMarkingWindow(
  sessions: Session[], teacherName: string, now: Date = new Date(),
): MarkingWindow {
  if (!teacherName) return { type: "NO_CLASS_TODAY", authorized: false, message: "No teacher selected.", session: null };

  const dayKey = dayKeyFromDate(formatDate(now));
  const todays = sessionsForDay(sessions, dayKey);
  if (!todays.length) {
    return { type: "NO_CLASS_TODAY", authorized: true, message: "No sessions scheduled today. Marking allowed.", session: null };
  }

  const cur = nowMinutes(now);
  const firstStart = todays[0]._start;
  const lastEnd = todays[todays.length - 1]._end;

  if (cur < firstStart) {
    const mine = todays.find((s) => lecturerMatches(s.teacher, teacherName));
    return {
      type: "BEFORE_CLASS", authorized: true, session: mine ?? todays[0],
      minutesUntil: firstStart - cur,
      message: "Pre-class window. You may mark in advance with caution.",
    };
  }
  if (cur > lastEnd) {
    const mine = todays.filter((s) => lecturerMatches(s.teacher, teacherName));
    return {
      type: "AFTER_HOURS", authorized: true,
      session: mine.length ? mine[mine.length - 1] : todays[todays.length - 1],
      message: "After-hours window. All sessions have ended. You may complete today's attendance.",
    };
  }

  const active = todays.find((s) => cur >= s._start && cur <= s._end);
  if (active) {
    if (lecturerMatches(active.teacher, teacherName)) {
      return {
        type: "DURING_CLASS", authorized: true, session: active,
        message: `Active session — you are authorized to mark ${active.subject}.`,
      };
    }
    const nextMine = todays.find((s) => lecturerMatches(s.teacher, teacherName) && s._start > cur);
    const suffix = nextMine ? ` Your next session: ${nextMine.subject}.` : "";
    return {
      type: "LOCKED_OTHER", authorized: false, session: active, conflictTeacher: active.teacher,
      message: `Locked — ${active.teacher} is currently teaching ${active.subject}.${suffix}`,
    };
  }

  const next = todays.find((s) => s._start > cur);
  const lastEnded = [...todays].reverse().find((s) => s._end < cur) ?? null;
  let msg = "Break period. You may mark, but ensure you are on the correct session.";
  if (next) msg += ` Next: ${next.subject} in ${next._start - cur} min.`;
  return { type: "BREAK", authorized: true, session: lastEnded, message: msg };
}

/* --------------------------------------------------------------- authorization */

export interface ConflictEntry {
  date: string;
  time: string;             // local time string of the attempt
  attemptingTeacher: string;
  scheduledTeacher: string;
  subject: string;
}

export type AuthWindow = "NONE" | "FUTURE" | "PAST" | MarkingWindowType;

export interface AuthResult {
  allowed: boolean;
  reason: string;
  window: AuthWindow;
  session?: Session | null;
  conflictTeacher?: string;
  /** Present only when a live conflict was detected — caller persists it. */
  conflict?: ConflictEntry;
}

/**
 * Whether `teacherName` may mark attendance for `dateStr` right now
 * (legacy validateMarkingAuthorization). Only today is markable; future is
 * blocked; past is blocked; today defers to the time-window check.
 */
export function validateMarkingAuthorization(params: {
  teacherName: string;
  dateStr: string;
  sessions: Session[];
  now?: Date;
}): AuthResult {
  const { teacherName, dateStr, sessions, now = new Date() } = params;
  if (!teacherName) return { allowed: false, reason: "No teacher selected.", window: "NONE" };

  const todayStr = formatDate(now);
  if (dateStr > todayStr) {
    return { allowed: false, window: "FUTURE", reason: `Future dates are blocked. You can only mark today (${todayStr}).` };
  }
  if (dateStr < todayStr) {
    return { allowed: false, window: "PAST", reason: `Past dates can't be marked — only today (${todayStr}). This will be flagged.` };
  }

  const win = getMarkingWindow(sessions, teacherName, now);
  if (!win.authorized) {
    return {
      allowed: false,
      window: "LOCKED_OTHER",
      reason: win.message,
      session: win.session,
      conflictTeacher: win.conflictTeacher,
      conflict: {
        date: todayStr,
        time: now.toLocaleTimeString(),
        attemptingTeacher: teacherName,
        scheduledTeacher: win.conflictTeacher || "Unknown",
        subject: win.session?.subject || "Unknown",
      },
    };
  }
  return { allowed: true, window: win.type, reason: win.message, session: win.session };
}

/* --------------------------------------------------------------- data integrity */

const VALID_STATUSES = new Set(["present", "absent", "late", "unmarked"]);

export interface IntegrityResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Sanity-check upsert payloads before writing (legacy validateAttendanceData):
 * known statuses, dates within the week, and no duplicate (student,date,session).
 */
export function validateAttendanceRecords(
  records: Array<{ studentId: string; date: string; sessionId: string; status: string }>,
  weekDates?: string[],
): IntegrityResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  for (const r of records) {
    if (!VALID_STATUSES.has(r.status)) errors.push(`Invalid status "${r.status}" for student ${r.studentId}.`);
    if (weekDates && !weekDates.includes(r.date)) warnings.push(`Record date ${r.date} is outside the selected week.`);
    const k = `${r.studentId}|${r.date}|${r.sessionId}`;
    if (seen.has(k)) errors.push(`Duplicate record for ${k}.`);
    seen.add(k);
  }
  return { valid: errors.length === 0, errors, warnings };
}
