"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AttendanceStatus } from "@/types";
import type { ResolvedSession, Session, WeekAttendance } from "@/lib/attendance";
import {
  buildAttendanceKey, setCell, markAllPresentForDay, summarizeWeek,
  getSessionsForTeacherDate, cycleStatus,
} from "@/lib/attendance";
import { getWeekDates, formatDate, formatDateDisplay, addDays, noon, WEEKDAY_LABELS } from "@/lib/dates";

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
}

type Msg = { type: "success" | "error"; text: string } | null;

/* Visual styling per status — KPLC palette. */
const CELL_STYLE: Record<AttendanceStatus, string> = {
  present: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
  absent: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100",
  late: "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100",
  unmarked: "bg-white text-slate-300 border-slate-200 hover:border-slate-300 hover:text-slate-400",
};
const SYMBOL: Record<AttendanceStatus, string> = { present: "✓", absent: "✗", late: "L", unmarked: "—" };

export function MarkingGrid({
  classInfo, teacherName, teacherId, students, timetable, initialWeekStart, initialDayIndex, initialCells,
}: Props) {
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [cells, setCells] = useState<WeekAttendance>(initialCells);
  const [dayIndex, setDayIndex] = useState(Math.min(initialDayIndex, 4));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [message, setMessage] = useState<Msg>(null);
  const [todayStr, setTodayStr] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  // Per-day sessions for THIS teacher (legacy getTeacherSessionsForDate).
  const daySessions = useMemo<ResolvedSession[][]>(
    () => weekDates.map((d) => getSessionsForTeacherDate(timetable, teacherName, d)),
    [weekDates, timetable, teacherName],
  );
  const summary = useMemo(
    () => summarizeWeek(cells, weekDates, students.length),
    [cells, weekDates, students.length],
  );

  // After mount: align "today" highlight to the user's timezone.
  useEffect(() => { setTodayStr(formatDate(new Date())); }, []);

  // Presence heartbeat — tells the admin monitor who's marking which class.
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

  function clearDay() {
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

  function clearWeek() {
    if (!confirm("Clear all marks for this week in the grid? (Submit to persist.)")) return;
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

  async function loadWeek(ws: string) {
    setLoadingWeek(true); setMessage(null);
    try {
      const res = await fetch(`/api/teacher/attendance?classId=${classInfo.id}&weekStart=${ws}`);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "load_failed");
      setCells((json.data?.cells as WeekAttendance) ?? {});
      setWeekStart(ws);
      setDirty(false);
    } catch {
      setMessage({ type: "error", text: "Couldn't load that week." });
    } finally {
      setLoadingWeek(false);
    }
  }
  function changeWeek(deltaWeeks: number) {
    if (dirty && !confirm("You have unsaved changes. Switch week and discard them?")) return;
    loadWeek(formatDate(addDays(noon(weekStart), deltaWeeks * 7)));
  }
  function onPickWeek(value: string) {
    if (!value) return;
    if (dirty && !confirm("You have unsaved changes. Switch week and discard them?")) return;
    // Snap any picked date back to its Monday via the API loader's week key.
    loadWeek(formatDate(addDays(noon(value), -((noon(value).getDay() + 6) % 7))));
  }

  async function submit() {
    setSaving(true); setMessage(null);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: classInfo.id, weekStart, cells }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "save_failed");
      setDirty(false);
      setMessage({ type: "success", text: `Register updated — ${json.data.written} record${json.data.written === 1 ? "" : "s"} saved.` });
    } catch {
      setMessage({ type: "error", text: "Submit failed. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  /* ---- per-student week intelligence (P+L = present over scheduled sessions) ---- */
  const intel = useMemo(() => {
    let totalMarked = 0, totalPresent = 0, below = 0;
    const perStudent = new Map<string, { pct: number; marked: number }>();
    for (const s of students) {
      let scheduled = 0, marked = 0, present = 0;
      for (let i = 0; i < 5; i++) {
        for (const session of daySessions[i]) {
          scheduled++;
          const st = statusFor(s.id, weekDates[i], session.sessionId);
          if (st !== "unmarked") marked++;
          if (st === "present" || st === "late") present++;
        }
      }
      const pct = scheduled > 0 ? Math.round((present / scheduled) * 100) : 100;
      perStudent.set(s.id, { pct, marked });
      totalMarked += marked; totalPresent += present;
      if (marked > 0 && pct < 80) below++;
    }
    const overall = totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0;
    return { totalMarked, overall, below, perStudent };
  }, [students, daySessions, weekDates, cells]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- notes (sidebar, bound to selected student + active day's first session) ---- */
  const selectedStudent = students.find((s) => s.id === selectedStudentId) ?? null;
  useEffect(() => {
    if (!selectedStudent) { setNoteDraft(""); return; }
    const sid = daySessions[dayIndex]?.[0]?.sessionId ?? "DEFAULT";
    setNoteDraft(cells[buildAttendanceKey(selectedStudent.id, weekDates[dayIndex], sid)]?.notes ?? "");
  }, [selectedStudentId, dayIndex, weekStart]); // eslint-disable-line react-hooks/exhaustive-deps

  function saveNote() {
    if (!selectedStudent) return;
    const session = daySessions[dayIndex]?.[0] ?? null;
    const sid = session?.sessionId ?? "DEFAULT";
    setCells((prev) =>
      setCell(prev, buildAttendanceKey(selectedStudent.id, weekDates[dayIndex], sid), {
        status: prev[buildAttendanceKey(selectedStudent.id, weekDates[dayIndex], sid)]?.status ?? "unmarked",
        sessionId: sid, subjectId: session?.subjectId ?? null, subject: session?.subject, teacherId, notes: noteDraft,
      }),
    );
    setDirty(true);
    setMessage({ type: "success", text: "Note attached (Submit to save)." });
  }

  /* ---- export CSV / print ---- */
  function exportCsv() {
    const head = ["#", "Adm No", "Student Name", ...WEEKDAY_LABELS.map((l, i) => `${l} ${dm(weekDates[i])}`)];
    const lines = [head.join(",")];
    students.forEach((s, idx) => {
      const cols = weekDates.map((d, i) => {
        const sessions = daySessions[i];
        if (sessions.length === 0) return "";
        return sessions.map((se) => SYMBOL[statusFor(s.id, d, se.sessionId)]).join(" ");
      });
      lines.push([idx + 1, csv(s.admissionNo), csv(s.fullName), ...cols.map(csv)].join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${classInfo.code}_${weekStart}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const colCount = daySessions.reduce((n, ds) => n + Math.max(1, ds.length), 0);

  return (
    <div className="space-y-4 pb-28">
      {/* ===== Header ===== */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-kplc-navy to-kplc-blue text-white shadow-soft">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/teacher" className="text-xs text-white/70 hover:text-white">← All classes</Link>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{classInfo.displayName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/80">
              <span className="font-mono">{classInfo.code}</span>
              <span className="opacity-50">·</span>
              <span>{students.length} students</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-300/40">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> {teacherName} · Unlocked
              </span>
            </div>
          </div>
          {/* week nav */}
          <div className="flex items-center gap-2">
            <button onClick={() => changeWeek(-1)} disabled={loadingWeek}
              className="rounded-lg bg-white/10 px-3 py-2 text-lg leading-none hover:bg-white/20 disabled:opacity-50" aria-label="Previous week">‹</button>
            <div className="rounded-xl bg-white/10 px-4 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wide text-white/60">Week of</p>
              <p className="text-sm font-semibold">{formatDateDisplay(weekDates[0])} – {formatDateDisplay(weekDates[4])}</p>
              <input type="date" value={weekStart} onChange={(e) => onPickWeek(e.target.value)}
                className="mt-1 w-full rounded bg-white/15 px-2 py-0.5 text-center text-xs text-white [color-scheme:dark]" />
            </div>
            <button onClick={() => changeWeek(1)} disabled={loadingWeek}
              className="rounded-lg bg-white/10 px-3 py-2 text-lg leading-none hover:bg-white/20 disabled:opacity-50" aria-label="Next week">›</button>
          </div>
        </div>
      </div>

      {/* ===== Toolbar ===== */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
        <button onClick={markAllPresentForActiveDay}
          className="rounded-lg bg-kplc-green px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-95">
          ✓ Mark All Present
        </button>
        <button onClick={clearDay}
          className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100">
          Clear Day
        </button>
        <button onClick={clearWeek}
          className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100">
          Clear Week
        </button>
        <div className="mx-1 h-6 w-px bg-slate-200" />
        <button onClick={exportCsv} className="btn-outline px-3.5 py-2 text-sm">Export CSV</button>
        <button onClick={() => window.print()} className="btn-outline px-3.5 py-2 text-sm">Print</button>
        <div className="ml-auto">
          <button onClick={submit} disabled={saving || !dirty} className="btn-primary px-5 py-2 text-sm">
            {saving ? "Updating…" : "Update Register"}
          </button>
        </div>
      </div>

      {/* ===== Intelligence panel ===== */}
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-soft">
        <Stat big={String(intel.totalMarked)} label="Marked this week" />
        <Stat big={`${intel.overall}%`} label="Present rate" />
        <Stat big={String(intel.below)} label="Below 80%" warn={intel.below > 0} />
      </div>

      {/* ===== Body: grid + sidebar ===== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* grid */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-kplc-navy">Class Register — {classInfo.code}</h2>
              <p className="text-xs text-slate-400">Admission No · Student Name · Week view (Mon–Fri)</p>
            </div>
            <p className="hidden text-xs text-slate-500 sm:block">
              Present <b className="text-emerald-600">{summary.present}</b> · Absent <b className="text-rose-600">{summary.absent}</b> ·
              Late <b className="text-amber-600">{summary.late}</b> · Unmarked <b className="text-slate-500">{summary.unmarked}</b>
            </p>
          </div>

          {loadingWeek ? (
            <div className="p-10 text-center text-sm text-slate-500">Loading week…</div>
          ) : students.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">No students in this class yet.</div>
          ) : (
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10">
                  {/* row 1: day groups */}
                  <tr className="bg-kplc-navy text-white">
                    <th rowSpan={2} className="sticky left-0 z-20 bg-kplc-navy px-2 py-2 text-left text-xs font-semibold">#</th>
                    <th rowSpan={2} className="bg-kplc-navy px-2 py-2 text-left text-xs font-semibold">Adm No</th>
                    <th rowSpan={2} className="bg-kplc-navy px-3 py-2 text-left text-xs font-semibold">Student Name</th>
                    {weekDates.map((d, i) => {
                      const isToday = todayStr === d;
                      return (
                        <th key={d} colSpan={Math.max(1, daySessions[i].length)}
                          className={`px-2 py-2 text-center text-xs font-semibold ${isToday ? "bg-kplc-yellow text-kplc-navy" : ""}`}>
                          {WEEKDAY_LABELS[i]} {dm(d)}
                        </th>
                      );
                    })}
                    <th rowSpan={2} className="bg-kplc-navy px-3 py-2 text-center text-xs font-semibold">Notes</th>
                  </tr>
                  {/* row 2: session sub-headers */}
                  <tr className="bg-kplc-blue text-white">
                    {weekDates.map((d, i) => {
                      const sessions = daySessions[i];
                      const isToday = todayStr === d;
                      const base = `px-2 py-1.5 text-center text-[10px] font-medium ${isToday ? "bg-amber-300 text-kplc-navy" : "text-white/85"}`;
                      if (sessions.length === 0) return <th key={d} className={base}>—</th>;
                      return sessions.map((s) => (
                        <th key={s.sessionId} className={base} title={`${s.subject} (${s.teacher})`}>
                          {s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)}
                          <span className="block max-w-[96px] truncate font-semibold text-cyan-200">{s.subject}</span>
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
                    return (
                      <tr key={s.id}
                        onClick={() => setSelectedStudentId(s.id)}
                        className={`border-t border-slate-100 ${selected ? "bg-kplc-yellow/10" : idx % 2 ? "bg-slate-50/50" : "bg-white"} hover:bg-kplc-yellow/5`}>
                        <td className="sticky left-0 z-[1] bg-inherit px-2 py-1.5 text-right text-xs tabular-nums text-slate-400">{idx + 1}</td>
                        <td className="whitespace-nowrap px-2 py-1.5 font-mono text-[11px] text-slate-500">{s.admissionNo}</td>
                        <td className="px-3 py-1.5">
                          <span className="font-medium text-slate-800">{s.fullName}</span>
                          {warn && (
                            <span className="ml-2 inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                              ⚠ {ps!.pct}%
                            </span>
                          )}
                        </td>
                        {weekDates.map((d, i) => {
                          const sessions = daySessions[i];
                          const isToday = todayStr === d;
                          if (sessions.length === 0)
                            return <td key={d} className={`px-2 py-1.5 text-center text-slate-300 ${isToday ? "bg-amber-50" : ""}`}>—</td>;
                          return sessions.map((session) => {
                            const st = statusFor(s.id, d, session.sessionId);
                            return (
                              <td key={session.sessionId} className={`px-1.5 py-1.5 text-center ${isToday ? "bg-amber-50/60" : ""}`}>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); toggleCell(s.id, d, session); }}
                                  title={`${session.subject} · ${st}`}
                                  className={`h-8 w-8 rounded-md border text-sm font-bold transition active:scale-95 ${CELL_STYLE[st]}`}
                                >
                                  {SYMBOL[st]}
                                </button>
                              </td>
                            );
                          });
                        })}
                        <td className="px-2 py-1.5 text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedStudentId(s.id); }}
                            className="rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-500 hover:border-kplc-blue hover:text-kplc-blue"
                          >
                            {cells[buildAttendanceKey(s.id, weekDates[dayIndex], daySessions[dayIndex]?.[0]?.sessionId ?? "DEFAULT")]?.notes ? "View" : "Add"} Note
                          </button>
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

        {/* sidebar */}
        <aside className="space-y-4">
          {/* day selector + summary */}
          <div className="card p-4">
            <h3 className="text-sm font-bold text-kplc-navy">Weekly Summary</h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {WEEKDAY_LABELS.map((label, i) => (
                <button key={label} onClick={() => setDayIndex(i)}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-center transition ${
                    i === dayIndex ? "border-kplc-navy bg-kplc-navy text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
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

          {/* teacher schedule */}
          <div className="card p-4">
            <h3 className="text-sm font-bold text-kplc-navy">{teacherName}&apos;s Schedule</h3>
            <div className="mt-2 space-y-2">
              {daySessions.every((d) => d.length === 0) ? (
                <p className="text-xs text-slate-400">No timetabled sessions found for you in this class.</p>
              ) : (
                daySessions.map((sessions, i) =>
                  sessions.length === 0 ? null : (
                    <div key={i}>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{WEEKDAY_LABELS[i]}</p>
                      {sessions.map((s) => (
                        <div key={s.sessionId} className="mt-1 rounded-lg border-l-2 border-kplc-blue bg-slate-50 px-2.5 py-1.5">
                          <p className="text-[11px] font-semibold text-slate-700">{s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)}</p>
                          <p className="text-xs text-slate-500">{s.subject}</p>
                        </div>
                      ))}
                    </div>
                  ),
                )
              )}
            </div>
          </div>

          {/* legend */}
          <div className="card p-4">
            <h3 className="text-sm font-bold text-kplc-navy">Legend</h3>
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs text-slate-600">
              <span><b className="text-emerald-600">✓</b> Present</span>
              <span><b className="text-rose-600">✗</b> Absent</span>
              <span><b className="text-amber-600">L</b> Late</span>
              <span><b className="text-slate-400">—</b> Unmarked</span>
            </div>
          </div>

          {/* notes */}
          <div className="card p-4">
            <h3 className="text-sm font-bold text-kplc-navy">Notes</h3>
            <p className="mt-1 text-xs text-slate-400">
              {selectedStudent ? `${selectedStudent.fullName} · ${WEEKDAY_LABELS[dayIndex]}` : "Select a student row first"}
            </p>
            <textarea
              value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} disabled={!selectedStudent}
              placeholder="Notes for selected student/day…" rows={3}
              className="mt-2 w-full resize-none rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-kplc-blue focus:outline-none disabled:bg-slate-50"
            />
            <button onClick={saveNote} disabled={!selectedStudent}
              className="mt-2 w-full rounded-lg bg-kplc-blue px-3 py-1.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50">
              Attach Note
            </button>
          </div>
        </aside>
      </div>

      {/* ===== sticky action bar ===== */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/90 backdrop-blur print:hidden">
        <div className="container-page flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            {message ? (
              <p className={`truncate text-sm font-medium ${message.type === "success" ? "text-emerald-600" : "text-rose-600"}`}>{message.text}</p>
            ) : (
              <p className="truncate text-sm text-slate-500">
                Week: <strong className="text-slate-700">{summary.markedLessons}</strong> marked
                {dirty && <span className="ml-2 inline-flex items-center gap-1 text-amber-600"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> unsaved</span>}
              </p>
            )}
          </div>
          <button onClick={submit} disabled={saving || !dirty} className="btn-primary btn-lg">
            {saving ? "Updating…" : "Update Register"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- small presentational helpers ---- */
function Stat({ big, label, warn }: { big: string; label: string; warn?: boolean }) {
  return (
    <div className="bg-transparent px-4 py-4 text-center">
      <p className={`text-3xl font-extrabold leading-none ${warn ? "text-amber-200" : "text-white"}`}>{big}</p>
      <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-white/70">{label}</p>
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

/* ---- utils ---- */
function dm(dateStr: string) { const [, m, d] = dateStr.split("-"); return `${d}/${m}`; }
function csv(v: string | number) { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
