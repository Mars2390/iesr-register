// Attendance marking logic & session management.
// Ported from legacy js/attendance.js: buildSessionId, buildAttendanceKey,
// getStudentDayRecords, getTeacherSessionsForDate/getAllSessionsForDate,
// markAllPresentForSelectedDay, saveAttendanceForWeek/loadAttendanceForWeek,
// and the submitToAdmin totals.
//
// Pure & storage-agnostic: the legacy localStorage/IndexedDB/global-`state`/DOM
// pieces are replaced by explicit inputs/outputs. The in-memory marking grid is
// a `WeekAttendance` map (keyed like the old app); DB rows convert to/from it via
// recordsToWeek()/weekToRecords(), which the API routes feed to Drizzle.

import type { AttendanceStatus } from "@/types";
import { STATUS_TO_LEGACY, STATUS_FROM_LEGACY } from "@/types";
import { dayKeyFromDate, normalizeDay, timeToMinutes, formatDate } from "@/lib/dates";

export type { AttendanceStatus };
export { STATUS_TO_LEGACY, STATUS_FROM_LEGACY };

export const STATUS_ORDER: AttendanceStatus[] = ["unmarked", "present", "absent", "late"];
export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Present", absent: "Absent", late: "Late", unmarked: "—",
};
/** Tap-to-cycle order for a single cell: unmarked → present → absent → late → unmarked. */
export function cycleStatus(s: AttendanceStatus): AttendanceStatus {
  const i = STATUS_ORDER.indexOf(s);
  return STATUS_ORDER[(i + 1) % STATUS_ORDER.length];
}

/* --------------------------------------------------------------- types */

/** A normalized lesson/session (one timetable slot). */
export interface Session {
  id?: string;            // timetable id, when known
  day: string;            // any case; normalized internally
  startTime: string;      // "08:00" | "08:00:00" | "08:00AM"
  endTime: string;
  subject: string;        // subject NAME (used for matching/display + id building)
  subjectId?: string | null;
  teacher: string;        // teacher NAME (lecturer matching + id building)
  teacherId?: string | null;
}
export type ResolvedSession = Session & { sessionId: string };

export interface StudentRef {
  id: string;             // students.id — the stable grid key
  admissionNo?: string;
  fullName?: string;
}

/** One marked cell in the grid. */
export interface AttendanceCell {
  status: AttendanceStatus;
  subjectId?: string | null;
  subject?: string;       // name kept for display only (not persisted)
  sessionId?: string;
  teacherId?: string | null;
  markedAt?: string;      // ISO
  tags?: string[];
  notes?: string;
}
/** In-memory grid for one week, keyed by buildAttendanceKey(). */
export type WeekAttendance = Record<string, AttendanceCell>;

/** A DB attendance row (load input). */
export interface AttendanceRow {
  studentId: string;
  date: string;            // "YYYY-MM-DD"
  sessionId: string;
  status: AttendanceStatus;
  subjectId?: string | null;
  teacherId?: string | null;
  tags?: unknown;
  notes?: string | null;
}
/** An upsert payload (save output) — shape matches the attendance_records insert. */
export interface AttendanceUpsert {
  schoolId: string;
  studentId: string;
  classId: string;
  date: string;
  sessionId: string;
  subjectId: string | null;
  status: AttendanceStatus;
  teacherId: string | null;
  tags: string[];
  notes: string;
}

/* --------------------------------------------------------------- keys / ids */

const clean = (s: string, allow: RegExp, max: number) =>
  (s || "").toUpperCase().replace(allow, "").slice(0, max);

/**
 * Stable id for a lesson instance (legacy buildSessionId).
 * Format preserved: `${TEACHER}_${SUBJECT}_${DAY}_${TIME}`.
 */
export function buildSessionId(session: Session | null | undefined): string {
  if (!session) return "DEFAULT";
  const teach = clean(session.teacher || "ALL", /[^A-Z0-9]/g, 10);
  const sub = clean(session.subject || "SUB", /[^A-Z0-9]/g, 12);
  const day = normalizeDay(session.day || "mon").toUpperCase();
  const time = clean(session.startTime || "", /[^0-9APM:]/g, 9);
  return `${teach}_${sub}_${day}_${time}`;
}

/** Grid key (legacy buildAttendanceKey). DEFAULT session collapses to 2 parts. */
export function buildAttendanceKey(studentKey: string, dateStr: string, sessionId?: string): string {
  if (!sessionId || sessionId === "DEFAULT") return `${studentKey}|${dateStr}`;
  return `${studentKey}|${dateStr}|${sessionId}`;
}

export function parseAttendanceKey(
  key: string,
): { studentKey: string; date: string; sessionId: string } | null {
  const parts = key.split("|");
  if (parts.length < 2) return null;
  const sessionId = parts[2] || "DEFAULT";
  if (sessionId === "tags" || sessionId === "notes") return null; // legacy guard
  return { studentKey: parts[0], date: parts[1], sessionId };
}

/** All marked cells for one student on one date, across sessions (legacy getStudentDayRecords). */
export function getStudentDayRecords(
  week: WeekAttendance, studentKey: string, dateStr: string,
): Array<{ sessionId: string; key: string; cell: AttendanceCell }> {
  const out: Array<{ sessionId: string; key: string; cell: AttendanceCell }> = [];
  const prefix = `${studentKey}|${dateStr}`;
  for (const key of Object.keys(week)) {
    if (!key.startsWith(prefix)) continue;
    const parsed = parseAttendanceKey(key);
    if (!parsed) continue;
    out.push({ sessionId: parsed.sessionId, key, cell: week[key] });
  }
  return out;
}

/* --------------------------------------------------------------- sessions */

function lecturerMatches(sessionTeacher: string, teacherName: string): boolean {
  const a = (sessionTeacher || "").toUpperCase();
  const b = (teacherName || "").toUpperCase();
  if (!a || a === "ALL" || a === "ALL LECTURERS") return true;
  return a.includes(b) || b.includes(a);
}

/** Sessions for a teacher on a given date, with sessionId (legacy getTeacherSessionsForDate). */
export function getSessionsForTeacherDate(
  sessions: Session[], teacherName: string, dateStr: string,
): ResolvedSession[] {
  const dayKey = dayKeyFromDate(dateStr);
  return sessions
    .filter((s) => normalizeDay(s.day) === dayKey && lecturerMatches(s.teacher, teacherName))
    .map((s) => ({ ...s, sessionId: buildSessionId(s) }));
}

/** All sessions on a date (any teacher), sorted by start time (legacy getAllSessionsForDate). */
export function getAllSessionsForDate(sessions: Session[], dateStr: string): ResolvedSession[] {
  const dayKey = dayKeyFromDate(dateStr);
  return sessions
    .filter((s) => normalizeDay(s.day) === dayKey)
    .map((s) => ({ ...s, sessionId: buildSessionId(s) }))
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}

/** Active session for a teacher right now (one if any), else null. */
export function detectActiveSession(
  sessions: Session[], teacherName: string, dateStr: string, now: Date = new Date(),
): ResolvedSession | null {
  const todays = getSessionsForTeacherDate(sessions, teacherName, dateStr);
  const mins = now.getHours() * 60 + now.getMinutes();
  for (const s of todays) {
    const start = timeToMinutes(s.startTime), end = timeToMinutes(s.endTime);
    if (mins >= start && mins <= end) return s;
  }
  return todays.length === 1 ? todays[0] : null;
}

/* --------------------------------------------------------------- mutations (immutable) */

/** Set/patch a single cell. Returns a NEW map (React-friendly). */
export function setCell(
  week: WeekAttendance, key: string, patch: Partial<AttendanceCell> & { status: AttendanceStatus },
): WeekAttendance {
  return { ...week, [key]: { ...(week[key] || { status: "unmarked" }), ...patch } };
}

/** Mark every student Present for a session on a day (legacy markAllPresentForSelectedDay core). */
export function markAllPresentForDay(
  week: WeekAttendance, students: StudentRef[], dateStr: string,
  session: ResolvedSession | null, markedBy?: { teacherId?: string | null },
): WeekAttendance {
  const sessionId = session ? session.sessionId : "DEFAULT";
  const next: WeekAttendance = { ...week };
  for (const s of students) {
    const key = buildAttendanceKey(s.id, dateStr, sessionId);
    next[key] = {
      ...(next[key] || {}),
      status: "present",
      sessionId,
      subjectId: session?.subjectId ?? next[key]?.subjectId ?? null,
      subject: session?.subject ?? next[key]?.subject,
      teacherId: markedBy?.teacherId ?? next[key]?.teacherId ?? null,
      markedAt: new Date().toISOString(),
    };
  }
  return next;
}

/* --------------------------------------------------------------- summary (submitToAdmin totals) */

export interface WeekSummary {
  students: number;
  present: number;
  absent: number;
  late: number;
  unmarked: number;
  markedLessons: number;   // present + absent + late
  totalRecords: number;
  recordsWithSubject: number;
  dates: string[];
}

/** Tally a week's grid (legacy submitToAdmin counting). Only counts marked, in-week cells. */
export function summarizeWeek(
  week: WeekAttendance, weekDates: string[], studentCount: number,
): WeekSummary {
  const totals = { present: 0, absent: 0, late: 0, unmarked: 0 };
  let totalRecords = 0;
  let recordsWithSubject = 0;
  for (const [key, cell] of Object.entries(week)) {
    if (!cell || !cell.status || cell.status === "unmarked") continue;
    const parsed = parseAttendanceKey(key);
    if (!parsed || !weekDates.includes(parsed.date)) continue;
    totals[cell.status] += 1;
    totalRecords += 1;
    if (cell.subjectId || cell.subject) recordsWithSubject += 1;
  }
  return {
    students: studentCount,
    present: totals.present, absent: totals.absent, late: totals.late, unmarked: totals.unmarked,
    markedLessons: totals.present + totals.absent + totals.late,
    totalRecords, recordsWithSubject, dates: weekDates,
  };
}

/* --------------------------------------------------------------- DB <-> map adapters */

/** DB rows → in-memory grid (legacy loadAttendanceForWeek). */
export function recordsToWeek(rows: AttendanceRow[]): WeekAttendance {
  const week: WeekAttendance = {};
  for (const r of rows) {
    const key = buildAttendanceKey(r.studentId, formatDate(r.date), r.sessionId);
    week[key] = {
      status: r.status,
      sessionId: r.sessionId,
      subjectId: r.subjectId ?? null,
      teacherId: r.teacherId ?? null,
      tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
      notes: r.notes ?? "",
    };
  }
  return week;
}

export interface WeekToRecordsCtx {
  schoolId: string;
  classId: string;
  teacherId: string | null;
}
export interface WeekToRecordsOpts {
  /** Restrict to these dates (defaults to whatever is in the map). */
  weekDates?: string[];
  /** Persist 'unmarked' cells too (default false — matches legacy, which skipped 'U'). */
  includeUnmarked?: boolean;
  /** Legacy IESR rule skipped subjects containing "SPORTS"; pass a predicate to exclude. */
  excludeSubject?: (cell: AttendanceCell) => boolean;
}

/** In-memory grid → attendance_records upserts (legacy saveAttendanceForWeek/submitToAdmin). */
export function weekToRecords(
  week: WeekAttendance, ctx: WeekToRecordsCtx, opts: WeekToRecordsOpts = {},
): AttendanceUpsert[] {
  const { weekDates, includeUnmarked = false, excludeSubject } = opts;
  const out: AttendanceUpsert[] = [];
  for (const [key, cell] of Object.entries(week)) {
    if (!cell || !cell.status) continue;
    if (!includeUnmarked && cell.status === "unmarked") continue;
    const parsed = parseAttendanceKey(key);
    if (!parsed) continue;
    if (weekDates && !weekDates.includes(parsed.date)) continue;
    if (excludeSubject && excludeSubject(cell)) continue;
    out.push({
      schoolId: ctx.schoolId,
      studentId: parsed.studentKey,
      classId: ctx.classId,
      date: parsed.date,
      sessionId: parsed.sessionId,
      subjectId: cell.subjectId ?? null,
      status: cell.status,
      teacherId: cell.teacherId ?? ctx.teacherId,
      tags: cell.tags ?? [],
      notes: cell.notes ?? "",
    });
  }
  return out;
}
