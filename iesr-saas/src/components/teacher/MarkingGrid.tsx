"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AttendanceStatus } from "@/types";
import type { ResolvedSession, Session, WeekAttendance } from "@/lib/attendance";
import {
  buildAttendanceKey, setCell, markAllPresentForDay, summarizeWeek,
  getSessionsForTeacherDate, cycleStatus, SUBMISSION_CODE,
} from "@/lib/attendance";
import { getMarkingWindow, type MarkingWindow } from "@/lib/validation";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import {
  getWeekDates, formatDate, formatDateDisplay, addDays, noon, timeToMinutes, WEEKDAY_LABELS,
} from "@/lib/dates";

interface Student { id: string; admissionNo: string; fullName: string; }
interface Props {
  classInfo: { id: string; code: string; displayName: string };
  teacherName: string;
  teacherId: string;
  students: Student[];
  timetable: Session[];
  initialWeekStart: string;
  initialDayIndex: number;
  initialCells: WeekAttendance;
  submissionCode?: string;
}

type Msg = { type: "success" | "error"; text: string } | null;
interface MomentumRow { studentId: string; present: number; absent: number; late: number; marked: number; firstDate: string | null; lastDate: string | null; }

/* Filled, high-contrast cell styles — easy to read at a glance. */
const CELL_STYLE: Record<AttendanceStatus, string> = {
  present: "bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600",
  absent: "bg-rose-500 text-white border-rose-600 hover:bg-rose-600",
  late: "bg-amber-400 text-amber-950 border-amber-500 hover:bg-amber-500",
  unmarked: "bg-white text-slate-300 border-slate-200 hover:border-kplc-blue hover:text-slate-400",
};
const SYMBOL: Record<AttendanceStatus, string> = { present: "✓", absent: "✗", late: "L", unmarked: "—" };

const BEHAVIOR_TAGS = [
  { id: "late", label: "Late", cls: "bg-amber-100 text-amber-800 border-amber-300" },
  { id: "disruptive", label: "Disruptive", cls: "bg-rose-100 text-rose-800 border-rose-300" },
  { id: "helpful", label: "Helpful", cls: "bg-sky-100 text-sky-800 border-sky-300" },
  { id: "attentive", label: "Attentive", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
];

const FLAG_REASONS = [
  "Persistent absenteeism", "Late arrival", "Disruptive behaviour",
  "Attendance dispute", "Missing / left early", "Other",
];

/* localStorage key for an in-progress (unsaved) week draft. */
const draftKey = (classId: string, weekStart: string) => `iesr_draft_v1:${classId}:${weekStart}`;
const hhmm = (t: string) => { const m = timeToMinutes(t); return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
const lecturerMatches = (a: string, b: string) => {
  const x = (a || "").toUpperCase(), y = (b || "").toUpperCase();
  if (!x || x === "ALL" || x === "ALL LECTURERS") return true;
  return x.includes(y) || y.includes(x);
};

export function MarkingGrid({
  classInfo, teacherName, teacherId, students, timetable, initialWeekStart, initialDayIndex, initialCells,
  submissionCode = SUBMISSION_CODE,
}: Props) {
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [cells, setCells] = useState<WeekAttendance>(initialCells);
  const [dayIndex, setDayIndex] = useState(Math.min(initialDayIndex, 4));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [message, setMessage] = useState<Msg>(null);
  const [todayStr, setTodayStr] = useState("");
  const confirm = useConfirm();
  const [now, setNow] = useState<Date | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [modal, setModal] = useState<null | "tags" | "momentum" | "export">(null);

  // momentum (all-time) — fetched lazily when the modal opens
  const [momentum, setMomentum] = useState<MomentumRow[] | null>(null);
  const [momentumLoading, setMomentumLoading] = useState(false);

  // flexible export custom range
  const [customFrom, setCustomFrom] = useState(initialWeekStart);
  const [customTo, setCustomTo] = useState(initialWeekStart);

  // inline student flagging
  const [flagFor, setFlagFor] = useState<Student | null>(null);
  const [flagReason, setFlagReason] = useState(FLAG_REASONS[0]);
  const [flagNote, setFlagNote] = useState("");
  const [flagBusy, setFlagBusy] = useState(false);

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const daySessions = useMemo<ResolvedSession[][]>(
    () => weekDates.map((d) => getSessionsForTeacherDate(timetable, teacherName, d)),
    [weekDates, timetable, teacherName],
  );
  const summary = useMemo(
    () => summarizeWeek(cells, weekDates, students.length),
    [cells, weekDates, students.length],
  );

  useEffect(() => { setTodayStr(formatDate(new Date())); setNow(new Date()); }, []);
  // live clock for the marking window banner — ticks each 30s
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);

  /* ---------- persistent (unsaved) draft restore + autosave ---------- */
  // Restore an in-progress draft for the initial week on first mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey(classInfo.id, initialWeekStart));
      if (raw) { setCells(JSON.parse(raw) as WeekAttendance); setDirty(true); }
    } catch { /* ignore corrupt drafts */ }
  }, [classInfo.id, initialWeekStart]);
  // Autosave the grid locally whenever it changes with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    try { localStorage.setItem(draftKey(classInfo.id, weekStart), JSON.stringify(cells)); } catch { /* quota */ }
  }, [cells, dirty, weekStart, classInfo.id]);

  const activeDate = weekDates[dayIndex];
  const activeSession = daySessions[dayIndex]?.[0] ?? null;
  useEffect(() => {
    const beat = () =>
      fetch("/api/presence", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: classInfo.id, date: activeDate,
          sessionId: activeSession?.sessionId ?? "DEFAULT", subjectId: activeSession?.subjectId ?? null,
        }),
      }).catch(() => {});
    beat();
    const t = setInterval(beat, 20000);
    return () => clearInterval(t);
  }, [classInfo.id, activeDate, activeSession?.sessionId, activeSession?.subjectId]);

  const statusFor = (studentId: string, dateStr: string, sessionId: string): AttendanceStatus =>
    cells[buildAttendanceKey(studentId, dateStr, sessionId)]?.status ?? "unmarked";

  function toggleCell(studentId: string, dateStr: string, session: ResolvedSession) {
    const key = buildAttendanceKey(studentId, dateStr, session.sessionId);
    const next = cycleStatus(cells[key]?.status ?? "unmarked");
    setCells((prev) =>
      setCell(prev, key, {
        status: next, sessionId: session.sessionId,
        subjectId: session.subjectId ?? null, subject: session.subject,
        teacherId, markedAt: new Date().toISOString(),
      }),
    );
    setDirty(true);
  }

  function markAllPresentForActiveDay() {
    const dateStr = weekDates[dayIndex];
    const sessions = daySessions[dayIndex];
    if (sessions.length === 0) { setMessage({ type: "error", text: "No session scheduled for you on this day." }); return; }
    setCells((prev) => {
      let next = prev;
      for (const session of sessions) next = markAllPresentForDay(next, students, dateStr, session, { teacherId });
      return next;
    });
    setDirty(true);
  }

  async function clearDay() {
    if (!(await confirm({ tone: "danger", title: "Clear day", confirmText: "Clear day", message: <>Clear all marks for <b>{WEEKDAY_LABELS[dayIndex]} {dm(weekDates[dayIndex])}</b> in the grid? Press <b>Update Register</b> afterwards to persist.</> }))) return;
    const dateStr = weekDates[dayIndex];
    const sessions = daySessions[dayIndex];
    setCells((prev) => {
      let next = prev;
      for (const s of students)
        for (const session of sessions)
          next = setCell(next, buildAttendanceKey(s.id, dateStr, session.sessionId), { status: "unmarked", sessionId: session.sessionId });
      return next;
    });
    setDirty(true);
  }

  async function clearWeek() {
    if (!(await confirm({ tone: "danger", title: "Clear week", confirmText: "Clear week", message: <>Clear all marks for <b>this whole week</b> in the grid? Press <b>Update Register</b> afterwards to persist.</> }))) return;
    setCells((prev) => {
      let next = prev;
      for (let i = 0; i < 5; i++)
        for (const session of daySessions[i])
          for (const s of students)
            next = setCell(next, buildAttendanceKey(s.id, weekDates[i], session.sessionId), { status: "unmarked", sessionId: session.sessionId });
      return next;
    });
    setDirty(true);
  }

  const loadWeek = useCallback(async (ws: string) => {
    setLoadingWeek(true); setMessage(null);
    try {
      const res = await fetch(`/api/teacher/attendance?classId=${classInfo.id}&weekStart=${ws}`);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "load_failed");
      // Prefer a local in-progress draft for that week over the saved copy,
      // so unsaved marks survive navigating away and back.
      let draft: WeekAttendance | null = null;
      try { const raw = localStorage.getItem(draftKey(classInfo.id, ws)); if (raw) draft = JSON.parse(raw); } catch { /* ignore */ }
      setCells(draft ?? ((json.data?.cells as WeekAttendance) ?? {}));
      setWeekStart(ws);
      setDirty(!!draft);
    } catch {
      setMessage({ type: "error", text: "Couldn't load that week." });
    } finally {
      setLoadingWeek(false);
    }
  }, [classInfo.id]);

  async function changeWeek(deltaWeeks: number) {
    if (dirty && !(await confirm({ title: "Switch week?", confirmText: "Switch week", message: <>You have <b>unsaved changes</b>. Switch week and discard the on-screen copy? Your draft is kept locally.</> }))) return;
    loadWeek(formatDate(addDays(noon(weekStart), deltaWeeks * 7)));
  }
  // Jump to ANY date: load its week AND select that weekday.
  async function jumpToDate(value: string) {
    if (!value) return;
    if (dirty && weekStartOf(value) !== weekStart && !(await confirm({ title: "Switch week?", confirmText: "Switch week", message: <>You have <b>unsaved changes</b>. Switch week? Your draft is kept locally.</> }))) return;
    const ws = weekStartOf(value);
    setDayIndex(weekdayIndex(value));
    if (ws === weekStart) return; // same week — just moved the day cursor
    loadWeek(ws);
  }
  function goToday() { jumpToDate(formatDate(new Date())); }

  async function submit(label = "Register updated") {
    if (!(await confirm({ title: "Update register", confirmText: "Update register", message: <>Submit this week&apos;s register to the cloud? <b>{summary.markedLessons}</b> marked {summary.markedLessons === 1 ? "entry" : "entries"} will be saved.</> }))) return;
    setSaving(true); setMessage(null);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: classInfo.id, weekStart, cells, submissionCode }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "save_failed");
      setDirty(false);
      try { localStorage.removeItem(draftKey(classInfo.id, weekStart)); } catch { /* ignore */ }
      setMessage({ type: "success", text: `${label} — ${json.data.written} record${json.data.written === 1 ? "" : "s"} saved.` });
    } catch {
      setMessage({ type: "error", text: "Submit failed. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  /* ---------- marking window + lecturer indicator (time-based authorization) ---------- */
  const win: MarkingWindow | null = useMemo(
    () => (now ? getMarkingWindow(timetable, teacherName, now) : null),
    [timetable, teacherName, now],
  );
  const windowView = useMemo(() => {
    if (!win) return null;
    const s = win.session;
    switch (win.type) {
      case "BEFORE_CLASS":
        return { tone: "sky", text: `🌅 PRE-CLASS — School day hasn't started yet.${s ? ` First session: ${s.subject} at ${hhmm(s.startTime)}` : ""}` };
      case "DURING_CLASS":
        return { tone: "emerald", text: `✅ MARKING OPEN — Current session: ${s?.subject ?? "—"}${s?.teacher ? ` with ${s.teacher}` : ""}` };
      case "BREAK":
        return { tone: "emerald", text: `✅ MARKING OPEN — Break period. ${win.message.replace(/^Break period\.?\s*/i, "")}`.trim() };
      case "NO_CLASS_TODAY":
        return { tone: "emerald", text: "✅ MARKING OPEN — No sessions scheduled today." };
      case "AFTER_HOURS":
        return { tone: "amber", text: `⚠️ LATE MARKING — ${s ? `This session ended at ${hhmm(s.endTime)}.` : "All sessions have ended."} You may still finalize today.` };
      case "LOCKED_OTHER":
        return { tone: "rose", text: `🔒 MARKING CLOSED — Outside allowed window.${win.conflictTeacher ? ` ${win.conflictTeacher} is currently teaching.` : ""}` };
    }
  }, [win]);
  const lecturerView = useMemo(() => {
    if (!win || !win.session) return null;
    const assigned = win.session.teacher || "";
    if (!assigned || lecturerMatches(assigned, teacherName))
      return { tone: "emerald", text: `✅ You are the assigned lecturer for: ${win.session.subject}` };
    return { tone: "amber", text: `⚠️ Assigned lecturer: ${assigned} — You are marking as: ${teacherName}` };
  }, [win, teacherName]);

  /* ---------- per-student week intelligence ---------- */
  const intel = useMemo(() => {
    let totalMarked = 0, totalPresent = 0, below = 0;
    const perStudent = new Map<string, { pct: number; marked: number; present: number; absent: number; late: number }>();
    for (const s of students) {
      let scheduled = 0, marked = 0, present = 0, absent = 0, late = 0;
      for (let i = 0; i < 5; i++) {
        for (const session of daySessions[i]) {
          scheduled++;
          const st = statusFor(s.id, weekDates[i], session.sessionId);
          if (st !== "unmarked") marked++;
          if (st === "present") present++;
          else if (st === "absent") absent++;
          else if (st === "late") late++;
        }
      }
      const pct = scheduled > 0 ? Math.round(((present + late) / scheduled) * 100) : 100;
      perStudent.set(s.id, { pct, marked, present, absent, late });
      totalMarked += marked; totalPresent += present + late;
      if (marked > 0 && pct < 80) below++;
    }
    const overall = totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0;
    return { totalMarked, overall, below, perStudent };
  }, [students, daySessions, weekDates, cells]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- continuous tally: per-day counts for the visible week ---------- */
  const perDayTally = useMemo(() => weekDates.map((d, i) => {
    let present = 0, absent = 0, late = 0, unmarked = 0;
    for (const s of students)
      for (const session of daySessions[i]) {
        const st = statusFor(s.id, d, session.sessionId);
        if (st === "present") present++;
        else if (st === "absent") absent++;
        else if (st === "late") late++;
        else unmarked++;
      }
    return { present, absent, late, unmarked, scheduled: daySessions[i].length };
  }), [weekDates, daySessions, students, cells]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live totals for the SELECTED day (updates instantly as you mark).
  const dayTotals = perDayTally[dayIndex] ?? { present: 0, absent: 0, late: 0, unmarked: 0, scheduled: 0 };

  /* ---------- notes — bound to selected student + active day's first session ---------- */
  const selectedStudent = students.find((s) => s.id === selectedStudentId) ?? null;
  const activeSessionId = daySessions[dayIndex]?.[0]?.sessionId ?? "DEFAULT";
  useEffect(() => {
    if (!selectedStudent) { setNoteDraft(""); return; }
    setNoteDraft(cells[buildAttendanceKey(selectedStudent.id, weekDates[dayIndex], activeSessionId)]?.notes ?? "");
  }, [selectedStudentId, dayIndex, weekStart]); // eslint-disable-line react-hooks/exhaustive-deps

  function patchActiveCell(studentId: string, patch: Partial<{ notes: string; tags: string[] }>) {
    const session = daySessions[dayIndex]?.[0] ?? null;
    const sid = session?.sessionId ?? "DEFAULT";
    const key = buildAttendanceKey(studentId, weekDates[dayIndex], sid);
    setCells((prev) =>
      setCell(prev, key, {
        status: prev[key]?.status ?? "unmarked", sessionId: sid,
        subjectId: session?.subjectId ?? null, subject: session?.subject, teacherId,
        notes: patch.notes ?? prev[key]?.notes, tags: patch.tags ?? prev[key]?.tags,
      }),
    );
    setDirty(true);
  }
  function saveNote() {
    if (!selectedStudent) return;
    patchActiveCell(selectedStudent.id, { notes: noteDraft });
    setMessage({ type: "success", text: "Note attached (press Update Register to save)." });
  }
  function toggleTag(studentId: string, tagId: string) {
    const sid = activeSessionId;
    const current = cells[buildAttendanceKey(studentId, weekDates[dayIndex], sid)]?.tags ?? [];
    const nextTags = current.includes(tagId) ? current.filter((t) => t !== tagId) : [...current, tagId];
    patchActiveCell(studentId, { tags: nextTags });
  }

  /* ---------- flags → admin (real-time) ---------- */
  async function submitFlag() {
    if (!flagFor) return;
    setFlagBusy(true);
    try {
      const description = `${flagFor.fullName} (${flagFor.admissionNo}) — ${flagReason}` +
        `${flagNote.trim() ? `: ${flagNote.trim()}` : ""} · ${classInfo.code} · ${activeDate}`;
      const res = await fetch("/api/flags", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: classInfo.id, issueType: "Student behaviour", description, submissionCode }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error();
      setMessage({ type: "success", text: `Flag raised for ${flagFor.fullName} — your admin can see it now.` });
      setFlagFor(null); setFlagNote(""); setFlagReason(FLAG_REASONS[0]);
    } catch {
      setMessage({ type: "error", text: "Couldn't raise the flag. Try again." });
    } finally {
      setFlagBusy(false);
    }
  }

  /* ---------- flexible export (Weekly / Monthly / Custom) ---------- */
  async function runExport(label: string, from: string, to: string) {
    if (!from || !to) { setMessage({ type: "error", text: "Pick both a start and end date." }); return; }
    if (from > to) { setMessage({ type: "error", text: "Start date must be on or before the end date." }); return; }
    if (!(await confirm({ title: "Export CSV", confirmText: "Download CSV", message: <>Export the <b>{label}</b> attendance CSV ({from} → {to})?</> }))) return;
    const qs = new URLSearchParams({ classId: classInfo.id, from, to, label });
    const a = document.createElement("a");
    a.href = `/api/teacher/export?${qs.toString()}`;
    a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    setMessage({ type: "success", text: `${label} CSV exported (${from} → ${to}).` });
    setModal(null);
  }
  function exportWeekly() { runExport("Weekly", weekDates[0], weekDates[4]); }
  function exportMonthly() {
    const [y, m] = activeDate.split("-").map(Number);
    const from = `${y}-${String(m).padStart(2, "0")}-01`;
    const last = new Date(y, m, 0).getDate();
    runExport("Monthly", from, `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`);
  }

  /* ---------- momentum modal (all-time) ---------- */
  async function openMomentum() {
    setModal("momentum");
    if (momentum) return;
    setMomentumLoading(true);
    try {
      const res = await fetch(`/api/teacher/momentum?classId=${classInfo.id}`);
      const json = await res.json();
      if (res.ok && json.ok) setMomentum(json.data.momentum as MomentumRow[]);
    } finally {
      setMomentumLoading(false);
    }
  }
  const momentumByStudent = useMemo(() => {
    const m = new Map<string, MomentumRow>();
    for (const r of momentum ?? []) m.set(r.studentId, r);
    return m;
  }, [momentum]);

  const colCount = daySessions.reduce((n, ds) => n + Math.max(1, ds.length), 0);

  return (
    <div className="space-y-3 pb-24">
      {/* ===== Header band ===== */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-kplc-navy via-kplc-navy to-kplc-blue text-white shadow-soft">
        <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link href="/teacher" className="text-xs text-white/70 hover:text-white">← All classes</Link>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight lg:text-3xl">{classInfo.displayName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/80">
              <span className="font-mono">{classInfo.code}</span>
              <span className="opacity-50">·</span>
              <span>{students.length} students</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-100 ring-1 ring-emerald-300/40">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> {teacherName} · Unlocked
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => changeWeek(-1)} disabled={loadingWeek}
              className="rounded-lg bg-white/10 px-3 py-2.5 text-lg leading-none hover:bg-white/20 disabled:opacity-50" aria-label="Previous week">‹</button>
            <div className="rounded-xl bg-white/10 px-4 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wide text-white/60">Week of</p>
              <p className="text-sm font-semibold">{formatDateDisplay(weekDates[0])} – {formatDateDisplay(weekDates[4])}</p>
            </div>
            <button onClick={() => changeWeek(1)} disabled={loadingWeek}
              className="rounded-lg bg-white/10 px-3 py-2.5 text-lg leading-none hover:bg-white/20 disabled:opacity-50" aria-label="Next week">›</button>
          </div>
        </div>
      </div>

      {/* ===== Marking window banner (time-based authorization) ===== */}
      {windowView && (
        <div className={`rounded-2xl border px-4 py-3 shadow-soft ${TONE[windowView.tone]}`}>
          <p className="text-sm font-bold">{windowView.text}</p>
          {lecturerView && <p className={`mt-1 text-xs font-semibold ${lecturerView.tone === "emerald" ? "text-emerald-700" : "text-amber-700"}`}>{lecturerView.text}</p>}
        </div>
      )}

      {/* ===== Toolbar ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
        <div className="flex flex-wrap items-center gap-2">
          {/* date + day selector — click to load that day */}
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            Date
            <input type="date" value={activeDate} onChange={(e) => jumpToDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800" />
          </label>
          <button onClick={goToday} className="btn-muted">Today</button>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            Day
            <select value={dayIndex} onChange={(e) => setDayIndex(Number(e.target.value))}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800">
              {WEEKDAY_LABELS.map((l, i) => <option key={l} value={i}>{l} {dm(weekDates[i])}</option>)}
            </select>
          </label>
          <div className="mx-1 h-7 w-px bg-slate-200" />
          <button onClick={markAllPresentForActiveDay}
            className="rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-700">✓ Mark All Present</button>
          <button onClick={clearDay} className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50">Clear Day</button>
          <button onClick={clearWeek} className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50">Clear Week</button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
            🔑 Submission Code: {submissionCode}
          </span>
          <button onClick={() => setModal("tags")} className="btn-muted">Behavior Tags</button>
          <button onClick={openMomentum} className="btn-muted">Attendance Momentum</button>
          <button onClick={() => setModal("export")} className="btn-muted">Export CSV ▾</button>
          <button onClick={async () => { if (await confirm({ title: "Print register", confirmText: "Open print dialog", message: "Open the print dialog for this register?" })) window.print(); }} className="btn-muted">Print</button>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => submit("Week saved")} disabled={saving || !dirty} className="btn-muted disabled:opacity-50">Save Week</button>
            <button onClick={() => submit("Register updated")} disabled={saving || !dirty} className="btn-primary px-5 py-2 text-sm">
              {saving ? "Updating…" : "Update Register"}
            </button>
          </div>
        </div>
      </div>

      {/* ===== Live summary totals — update instantly as you mark ===== */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Totals label="Present" value={summary.present} day={dayTotals.present} cls="from-emerald-600 to-emerald-700" />
        <Totals label="Absent" value={summary.absent} day={dayTotals.absent} cls="from-rose-600 to-rose-700" />
        <Totals label="Late" value={summary.late} day={dayTotals.late} cls="from-amber-400 to-amber-500" dark />
        <Totals label="Unmarked" value={summary.unmarked} day={dayTotals.unmarked} cls="from-slate-500 to-slate-600" />
      </div>

      {/* ===== Continuous tally — per-day breakdown ===== */}
      <div className="grid grid-cols-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
        {WEEKDAY_LABELS.map((label, i) => {
          const t = perDayTally[i];
          const isToday = todayStr === weekDates[i];
          return (
            <button key={label} onClick={() => setDayIndex(i)}
              className={`border-r border-slate-100 px-2 py-2 text-center last:border-r-0 ${i === dayIndex ? "bg-kplc-navy text-white" : isToday ? "bg-kplc-yellow/20" : "hover:bg-slate-50"}`}>
              <p className={`text-[10px] font-bold uppercase ${i === dayIndex ? "text-white/80" : "text-slate-400"}`}>{label} {dm(weekDates[i])}</p>
              <p className="mt-0.5 text-[11px] font-semibold">
                <span className={i === dayIndex ? "text-emerald-300" : "text-emerald-600"}>{t.present}</span>
                <span className="opacity-40"> / </span>
                <span className={i === dayIndex ? "text-rose-300" : "text-rose-600"}>{t.absent}</span>
                <span className="opacity-40"> / </span>
                <span className={i === dayIndex ? "text-amber-300" : "text-amber-600"}>{t.late}</span>
              </p>
              <p className={`text-[9px] ${i === dayIndex ? "text-white/60" : "text-slate-400"}`}>{t.scheduled === 0 ? "no session" : `${t.scheduled} session${t.scheduled === 1 ? "" : "s"}`}</p>
            </button>
          );
        })}
      </div>

      {/* ===== Body: full-width register + sidebar ===== */}
      <div className="flex flex-col gap-3 xl:flex-row">
        <section className="min-w-0 flex-1">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
              <div>
                <h2 className="text-base font-bold text-kplc-navy">Class Register — {classInfo.code}</h2>
                <p className="text-xs text-slate-400">Admission No · Student Name · Week view (Mon–Fri) with subject tracking</p>
              </div>
              <p className="text-xs text-slate-600">
                Students <b className="text-slate-800">{students.length}</b> · Present <b className="text-emerald-600">{summary.present}</b> ·
                Absent <b className="text-rose-600">{summary.absent}</b> · Late <b className="text-amber-600">{summary.late}</b> ·
                Unmarked <b className="text-slate-500">{summary.unmarked}</b>
              </p>
            </div>

            {loadingWeek ? (
              <div className="p-12 text-center text-sm text-slate-500">Loading week…</div>
            ) : students.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500">No students in this class yet.</div>
            ) : (
              <div className="max-h-[68vh] overflow-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-kplc-navy text-white">
                      <th rowSpan={2} className="sticky left-0 z-20 bg-kplc-navy px-2 py-2 text-left text-xs font-semibold">#</th>
                      <th rowSpan={2} className="bg-kplc-navy px-2 py-2 text-left text-xs font-semibold">Adm No</th>
                      <th rowSpan={2} className="bg-kplc-navy px-3 py-2 text-left text-xs font-semibold">Student Name</th>
                      {weekDates.map((d, i) => {
                        const isToday = todayStr === d;
                        return (
                          <th key={d} colSpan={Math.max(1, daySessions[i].length)}
                            className={`border-l-2 border-kplc-blue px-2 py-2 text-center text-xs font-bold ${isToday ? "bg-kplc-yellow text-kplc-navy" : ""}`}>
                            {WEEKDAY_LABELS[i]} {dm(d)}
                          </th>
                        );
                      })}
                      <th rowSpan={2} className="bg-kplc-navy px-3 py-2 text-center text-xs font-semibold">Notes</th>
                      <th rowSpan={2} className="bg-kplc-navy px-2 py-2 text-center text-xs font-semibold">Flag</th>
                    </tr>
                    <tr className="bg-kplc-blue text-white">
                      {weekDates.map((d, i) => {
                        const sessions = daySessions[i];
                        const isToday = todayStr === d;
                        const base = `border-l border-white/20 px-2 py-1 text-center text-[10px] font-medium ${isToday ? "bg-amber-300 text-kplc-navy" : "text-white/90"}`;
                        if (sessions.length === 0) return <th key={d} className={base}>—</th>;
                        return sessions.map((s) => (
                          <th key={s.sessionId} className={base} title={`${s.subject} (${s.teacher})`}>
                            {hhmm(s.startTime)}–{hhmm(s.endTime)}
                            <span className="block max-w-[110px] truncate font-semibold text-cyan-100">{s.subject}</span>
                          </th>
                        ));
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, idx) => {
                      const ps = intel.perStudent.get(s.id);
                      const warn = ps && ps.marked > 0 && ps.pct < 80;
                      const selected = selectedStudentId === s.id;
                      const sid0 = daySessions[dayIndex]?.[0]?.sessionId ?? "DEFAULT";
                      const hasNote = !!cells[buildAttendanceKey(s.id, weekDates[dayIndex], sid0)]?.notes;
                      return (
                        <tr key={s.id} onClick={() => setSelectedStudentId(s.id)}
                          className={`cursor-pointer border-t border-slate-100 ${selected ? "bg-kplc-yellow/10 outline outline-1 outline-kplc-yellow/40" : idx % 2 ? "bg-slate-50/60" : "bg-white"} hover:bg-sky-50`}>
                          <td className="sticky left-0 z-[1] bg-inherit px-2 py-2 text-right text-xs tabular-nums text-slate-400">{idx + 1}</td>
                          <td className="whitespace-nowrap px-2 py-2 font-mono text-[11px] text-slate-500">{s.admissionNo}</td>
                          <td className="px-3 py-2">
                            <span className="font-medium text-slate-800">{s.fullName}</span>
                            {warn && <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">⚠ &lt;80%</span>}
                            {(ps && (ps.present + ps.absent + ps.late) > 0) && (
                              <span className="ml-2 text-[10px] text-slate-400">{ps.pct}%</span>
                            )}
                          </td>
                          {weekDates.map((d, i) => {
                            const sessions = daySessions[i];
                            const isToday = todayStr === d;
                            const tdBg = isToday ? "bg-sky-50" : "";
                            if (sessions.length === 0)
                              return <td key={d} className={`border-l border-slate-100 px-2 py-2 text-center text-slate-300 ${tdBg}`}>—</td>;
                            return sessions.map((session, si) => {
                              const st = statusFor(s.id, d, session.sessionId);
                              return (
                                <td key={session.sessionId} className={`px-1.5 py-1.5 text-center ${si === 0 ? "border-l border-slate-200" : "border-l border-dashed border-slate-100"} ${tdBg}`}>
                                  <button type="button"
                                    onClick={(e) => { e.stopPropagation(); toggleCell(s.id, d, session); }}
                                    title={`${session.subject} · ${st}`}
                                    className={`h-9 w-9 rounded-md border text-base font-bold leading-none transition active:scale-90 ${CELL_STYLE[st]}`}>
                                    {SYMBOL[st]}
                                  </button>
                                </td>
                              );
                            });
                          })}
                          <td className="px-2 py-2 text-center">
                            <button onClick={(e) => { e.stopPropagation(); setSelectedStudentId(s.id); }}
                              className={`rounded border px-2 py-1 text-[11px] ${hasNote ? "border-kplc-blue bg-sky-50 text-kplc-blue" : "border-slate-200 text-slate-500 hover:border-kplc-blue hover:text-kplc-blue"}`}>
                              {hasNote ? "View" : "Add"} Note
                            </button>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button onClick={(e) => { e.stopPropagation(); setFlagFor(s); }}
                              title="Flag this student to admin"
                              className="rounded border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50">⚑ Flag</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="px-4 py-2 text-[11px] text-slate-400">{colCount} session-column{colCount === 1 ? "" : "s"} this week · tap a cell to cycle ✓ → ✗ → L → —</p>
          </div>
        </section>

        {/* sidebar */}
        <aside className="w-full space-y-3 xl:w-[340px] xl:shrink-0">
          <div className="card p-4">
            <h3 className="text-sm font-bold text-kplc-navy">Weekly Summary</h3>
            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {WEEKDAY_LABELS.map((label, i) => (
                <button key={label} onClick={() => setDayIndex(i)}
                  className={`rounded-lg border px-1 py-1.5 text-center transition ${i === dayIndex ? "border-kplc-navy bg-kplc-navy text-white" : todayStr === weekDates[i] ? "border-kplc-yellow bg-kplc-yellow/20 text-slate-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
                  <span className="block text-[10px] font-medium">{label}</span>
                  <span className="block text-sm font-bold leading-none">{dm(weekDates[i]).split("/")[0]}</span>
                </button>
              ))}
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              <Row label="Present" value={summary.present} dot="bg-emerald-500" />
              <Row label="Absent" value={summary.absent} dot="bg-rose-500" />
              <Row label="Late" value={summary.late} dot="bg-amber-500" />
              <Row label="Unmarked" value={summary.unmarked} dot="bg-slate-300" />
            </dl>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-bold text-kplc-navy">{teacherName}&apos;s Schedule</h3>
            <div className="mt-2 space-y-2">
              {daySessions.every((d) => d.length === 0) ? (
                <p className="text-xs text-slate-400">No timetabled sessions found for you in this class.</p>
              ) : (
                daySessions.map((sessions, i) => sessions.length === 0 ? null : (
                  <div key={i}>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{WEEKDAY_LABELS[i]}</p>
                    {sessions.map((s) => (
                      <div key={s.sessionId} className="mt-1 rounded-lg border-l-2 border-kplc-blue bg-slate-50 px-2.5 py-1.5">
                        <p className="text-[11px] font-semibold text-slate-700">{hhmm(s.startTime)}–{hhmm(s.endTime)}</p>
                        <p className="text-xs text-slate-500">{s.subject}</p>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-bold text-kplc-navy">Legend</h3>
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1"><b className="grid h-5 w-5 place-items-center rounded bg-emerald-500 text-white">✓</b> Present</span>
              <span className="inline-flex items-center gap-1"><b className="grid h-5 w-5 place-items-center rounded bg-rose-500 text-white">✗</b> Absent</span>
              <span className="inline-flex items-center gap-1"><b className="grid h-5 w-5 place-items-center rounded bg-amber-400 text-amber-950">L</b> Late</span>
              <span className="inline-flex items-center gap-1"><b className="grid h-5 w-5 place-items-center rounded border border-slate-200 text-slate-300">—</b> Unmarked</span>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-bold text-kplc-navy">Notes</h3>
            <p className="mt-1 text-xs text-slate-400">{selectedStudent ? `${selectedStudent.fullName} · ${WEEKDAY_LABELS[dayIndex]}` : "Tap a student row first"}</p>
            <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} disabled={!selectedStudent}
              placeholder="Notes for selected student/day…" rows={3}
              className="mt-2 w-full resize-none rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-kplc-blue focus:outline-none disabled:bg-slate-50" />
            <div className="mt-2 flex gap-2">
              <button onClick={saveNote} disabled={!selectedStudent}
                className="flex-1 rounded-lg bg-kplc-blue px-3 py-1.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50">Attach Note</button>
              <button onClick={() => selectedStudent && setModal("tags")} disabled={!selectedStudent}
                className="btn-muted disabled:opacity-50">Tags</button>
              <button onClick={() => selectedStudent && setFlagFor(selectedStudent)} disabled={!selectedStudent}
                className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50">⚑ Flag</button>
            </div>
          </div>
        </aside>
      </div>

      {/* ===== sticky action bar (live bottom totals) ===== */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur print:hidden">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            {message ? (
              <p className={`truncate text-sm font-medium ${message.type === "success" ? "text-emerald-600" : "text-rose-600"}`}>{message.text}</p>
            ) : (
              <p className="truncate text-sm text-slate-500">
                Present <b className="text-emerald-600">{summary.present}</b> · Absent <b className="text-rose-600">{summary.absent}</b> ·
                Late <b className="text-amber-600">{summary.late}</b> · Unmarked <b className="text-slate-500">{summary.unmarked}</b>
                {dirty && <span className="ml-2 inline-flex items-center gap-1 text-amber-600"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> unsaved (kept locally)</span>}
              </p>
            )}
          </div>
          <button onClick={() => submit("Register updated")} disabled={saving || !dirty} className="btn-primary btn-lg">
            {saving ? "Updating…" : "Update Register"}
          </button>
        </div>
      </div>

      {/* ===== Modals ===== */}
      {modal === "export" && (
        <Modal title="Export attendance (CSV)" onClose={() => setModal(null)}>
          <p className="text-sm text-slate-600">Download a per-student attendance summary as CSV.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button onClick={exportWeekly} className="rounded-xl border border-slate-200 p-3 text-left hover:border-kplc-blue hover:bg-sky-50">
              <p className="font-semibold text-kplc-navy">Export Weekly</p>
              <p className="text-xs text-slate-500">{weekDates[0]} → {weekDates[4]}</p>
            </button>
            <button onClick={exportMonthly} className="rounded-xl border border-slate-200 p-3 text-left hover:border-kplc-blue hover:bg-sky-50">
              <p className="font-semibold text-kplc-navy">Export Monthly</p>
              <p className="text-xs text-slate-500">Calendar month of {dm(activeDate)}</p>
            </button>
          </div>
          <div className="mt-4 rounded-xl border border-slate-200 p-3">
            <p className="font-semibold text-kplc-navy">Custom Range</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-500">From
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" /></label>
              <label className="flex items-center gap-1.5 text-xs text-slate-500">To
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" /></label>
              <button onClick={() => runExport("Custom", customFrom, customTo)} className="btn-primary px-4 py-2 text-sm">Export Range</button>
            </div>
          </div>
        </Modal>
      )}
      {modal === "tags" && (
        <Modal title="Behavior Tags" onClose={() => setModal(null)}>
          {!selectedStudent ? (
            <p className="text-sm text-slate-500">Tap a student row in the register first, then reopen this.</p>
          ) : (
            <div>
              <p className="text-sm text-slate-600">
                <b>{selectedStudent.fullName}</b> · {WEEKDAY_LABELS[dayIndex]} {dm(weekDates[dayIndex])}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {BEHAVIOR_TAGS.map((t) => {
                  const on = (cells[buildAttendanceKey(selectedStudent.id, weekDates[dayIndex], activeSessionId)]?.tags ?? []).includes(t.id);
                  return (
                    <button key={t.id} onClick={() => toggleTag(selectedStudent.id, t.id)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${on ? t.cls : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}>
                      {on ? "✓ " : ""}{t.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-slate-400">Tags &amp; notes save with the register when you press Update Register — even if the student isn&apos;t marked present/absent yet.</p>
            </div>
          )}
        </Modal>
      )}
      {modal === "momentum" && (
        <Modal title="Attendance Momentum — all-time (from day one)" onClose={() => setModal(null)}>
          {momentumLoading ? (
            <p className="py-8 text-center text-sm text-slate-500">Loading lifetime attendance…</p>
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white"><tr className="border-b text-left text-xs uppercase text-slate-400">
                  <th className="py-1.5 pr-2">Student</th><th className="px-2 text-center">P</th><th className="px-2 text-center">A</th>
                  <th className="px-2 text-center">L</th><th className="px-2 text-center">Marked</th><th className="px-2 text-right">Rate</th>
                </tr></thead>
                <tbody>
                  {students.map((s) => {
                    const m = momentumByStudent.get(s.id);
                    const marked = m?.marked ?? 0;
                    const attended = (m?.present ?? 0) + (m?.late ?? 0);
                    const pct = marked > 0 ? Math.round((attended / marked) * 100) : null;
                    return (
                      <tr key={s.id} className="border-b border-slate-50">
                        <td className="py-1.5 pr-2"><span className="font-medium text-slate-700">{s.fullName}</span></td>
                        <td className="px-2 text-center text-emerald-600">{m?.present ?? 0}</td>
                        <td className="px-2 text-center text-rose-600">{m?.absent ?? 0}</td>
                        <td className="px-2 text-center text-amber-600">{m?.late ?? 0}</td>
                        <td className="px-2 text-center text-slate-500">{marked}</td>
                        <td className={`px-2 text-right font-semibold ${pct === null ? "text-slate-300" : pct < 80 ? "text-rose-600" : "text-emerald-600"}`}>{pct === null ? "—" : `${pct}%`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-2 text-[11px] text-slate-400">Cumulative across every week ever recorded for this class — never reset.</p>
            </div>
          )}
        </Modal>
      )}
      {flagFor && (
        <Modal title="Flag student to admin" onClose={() => setFlagFor(null)}>
          <p className="text-sm text-slate-600"><b>{flagFor.fullName}</b> · {flagFor.admissionNo} · {classInfo.code}</p>
          <label className="mt-3 block text-xs font-medium text-slate-500">Reason
            <select value={flagReason} onChange={(e) => setFlagReason(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm">
              {FLAG_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label className="mt-3 block text-xs font-medium text-slate-500">Details (optional)
            <textarea value={flagNote} onChange={(e) => setFlagNote(e.target.value)} rows={3}
              placeholder="Anything the admin should know…"
              className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-2.5 py-2 text-sm" />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setFlagFor(null)} className="btn-muted">Cancel</button>
            <button onClick={submitFlag} disabled={flagBusy} className="btn-primary px-5 py-2 text-sm disabled:opacity-50">
              {flagBusy ? "Sending…" : "Raise flag"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---- helpers ---- */
const TONE: Record<string, string> = {
  sky: "border-sky-200 bg-sky-50 text-sky-800",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  rose: "border-rose-200 bg-rose-50 text-rose-800",
};

function Totals({ label, value, day, cls, dark = false }: { label: string; value: number; day: number; cls: string; dark?: boolean }) {
  // `dark` = readable text for the light amber "Late" card (white-on-amber fails contrast).
  const main = dark ? "text-amber-950" : "text-white";
  const sub = dark ? "text-amber-900/80" : "text-white/80";
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${cls} px-4 py-3 ${main} shadow-soft`}>
      <p className={`text-[11px] font-semibold uppercase tracking-wide ${sub}`}>{label}</p>
      <p className="text-2xl font-extrabold leading-none">{value}</p>
      <p className={`mt-0.5 text-[11px] ${sub}`}>today: {day}</p>
    </div>
  );
}
function Row({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-slate-600"><span className={`h-2 w-2 rounded-full ${dot}`} />{label}</span>
      <span className="font-bold tabular-nums text-slate-800">{value}</span>
    </div>
  );
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-kplc-navy">{title}</h3>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function dm(dateStr: string) { const [, m, d] = dateStr.split("-"); return `${d}/${m}`; }
/** Monday-of-week "YYYY-MM-DD" for any date string. */
function weekStartOf(dateStr: string) { return formatDate(addDays(noon(dateStr), -((noon(dateStr).getDay() + 6) % 7))); }
/** 0=Mon … 4=Fri (weekend clamps to Fri) for a date string. */
function weekdayIndex(dateStr: string) { return Math.min((noon(dateStr).getDay() + 6) % 7, 4); }
