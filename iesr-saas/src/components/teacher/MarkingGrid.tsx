"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AttendanceStatus } from "@/types";
import type { Session, WeekAttendance } from "@/lib/attendance";
import {
  buildAttendanceKey, setCell, markAllPresentForDay, summarizeWeek, getSessionsForTeacherDate,
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

export function MarkingGrid({
  classInfo, teacherName, teacherId, students, timetable, initialWeekStart, initialDayIndex, initialCells,
}: Props) {
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [cells, setCells] = useState<WeekAttendance>(initialCells);
  const [dayIndex, setDayIndex] = useState(initialDayIndex);
  const [sessionId, setSessionId] = useState("DEFAULT");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [message, setMessage] = useState<Msg>(null);
  const [todayStr, setTodayStr] = useState("");

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const selectedDate = weekDates[dayIndex];
  const daySessions = useMemo(
    () => getSessionsForTeacherDate(timetable, teacherName, selectedDate),
    [timetable, teacherName, selectedDate],
  );
  const currentSession = daySessions.find((s) => s.sessionId === sessionId) ?? daySessions[0] ?? null;
  const effectiveSessionId = currentSession?.sessionId ?? "DEFAULT";
  const summary = useMemo(() => summarizeWeek(cells, weekDates, students.length), [cells, weekDates, students.length]);

  // After mount: align "today" highlight + default day to the user's timezone.
  useEffect(() => { setTodayStr(formatDate(new Date())); }, []);
  // Keep a valid session selected when the day changes.
  useEffect(() => { setSessionId(daySessions[0]?.sessionId ?? "DEFAULT"); }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const statusFor = (studentId: string): AttendanceStatus =>
    cells[buildAttendanceKey(studentId, selectedDate, effectiveSessionId)]?.status ?? "unmarked";

  function setStatus(studentId: string, status: AttendanceStatus) {
    const key = buildAttendanceKey(studentId, selectedDate, effectiveSessionId);
    setCells((prev) =>
      setCell(prev, key, {
        status, sessionId: effectiveSessionId,
        subjectId: currentSession?.subjectId ?? null, subject: currentSession?.subject,
        teacherId, markedAt: new Date().toISOString(),
      }),
    );
    setDirty(true);
  }

  function markAll() {
    setCells((prev) => markAllPresentForDay(prev, students, selectedDate, currentSession, { teacherId }));
    setDirty(true);
  }
  function clearDay() {
    setCells((prev) => {
      let next = prev;
      for (const s of students)
        next = setCell(next, buildAttendanceKey(s.id, selectedDate, effectiveSessionId), { status: "unmarked", sessionId: effectiveSessionId });
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
      setMessage({ type: "success", text: `Saved — ${json.data.written} record${json.data.written === 1 ? "" : "s"} submitted.` });
    } catch {
      setMessage({ type: "error", text: "Submit failed. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  // counts for the current day/session
  const dayCounts = students.reduce(
    (acc, s) => { acc[statusFor(s.id)]++; return acc; },
    { present: 0, absent: 0, late: 0, unmarked: 0 } as Record<AttendanceStatus, number>,
  );

  return (
    <div className="space-y-5 pb-28">
      {/* header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/teacher" className="text-sm text-slate-500 hover:text-slate-700">← All classes</Link>
          <h1 className="mt-1 text-2xl font-bold">{classInfo.displayName}</h1>
          <p className="font-mono text-sm text-slate-500">{classInfo.code} · {students.length} students</p>
        </div>
        {/* week nav */}
        <div className="flex items-center gap-2">
          <button onClick={() => changeWeek(-1)} disabled={loadingWeek} className="btn-outline px-3 py-2" aria-label="Previous week">‹</button>
          <div className="card px-4 py-2 text-center">
            <p className="text-xs uppercase tracking-wide text-slate-400">Week of</p>
            <p className="text-sm font-semibold">{formatDateDisplay(weekDates[0])} – {formatDateDisplay(weekDates[4])}</p>
          </div>
          <button onClick={() => changeWeek(1)} disabled={loadingWeek} className="btn-outline px-3 py-2" aria-label="Next week">›</button>
        </div>
      </div>

      {/* day tabs */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {WEEKDAY_LABELS.map((label, i) => {
          const d = noon(weekDates[i]);
          const isToday = todayStr === weekDates[i];
          const active = i === dayIndex;
          return (
            <button
              key={label}
              onClick={() => setDayIndex(i)}
              className={`flex min-w-[64px] flex-col items-center rounded-xl border px-3 py-2 transition ${
                active ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <span className="text-xs font-medium">{label}</span>
              <span className="text-lg font-bold leading-tight">{d.getDate()}</span>
              {isToday && <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />}
            </button>
          );
        })}
      </div>

      {/* session selector */}
      {daySessions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-500">Session:</span>
          {daySessions.map((s) => (
            <button
              key={s.sessionId}
              onClick={() => setSessionId(s.sessionId)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                s.sessionId === effectiveSessionId
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {s.subject || "Session"} <span className="text-slate-400">· {s.startTime.slice(0, 5)}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No scheduled session for this day — marking a <strong>general</strong> session.</p>
      )}

      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3 text-sm">
          <Chip color="emerald" label="Present" n={dayCounts.present} />
          <Chip color="rose" label="Absent" n={dayCounts.absent} />
          <Chip color="amber" label="Late" n={dayCounts.late} />
          <Chip color="slate" label="Unmarked" n={dayCounts.unmarked} />
        </div>
        <div className="flex gap-2">
          <button onClick={clearDay} className="btn-ghost px-3 py-1.5 text-sm">Clear day</button>
          <button onClick={markAll} className="btn-outline px-3 py-1.5 text-sm">Mark all present</button>
        </div>
      </div>

      {/* student list */}
      {loadingWeek ? (
        <div className="card p-10 text-center text-sm text-slate-500">Loading week…</div>
      ) : students.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">No students in this class yet.</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {students.map((s, i) => {
            const status = statusFor(s.id);
            return (
              <div
                key={s.id}
                className={`flex items-center justify-between gap-3 px-4 py-3 ${i > 0 ? "border-t border-slate-100" : ""}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-6 shrink-0 text-right text-sm tabular-nums text-slate-400">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{s.fullName}</p>
                    <p className="truncate font-mono text-xs text-slate-400">{s.admissionNo}</p>
                  </div>
                </div>
                <StatusControl value={status} onChange={(st) => setStatus(s.id, st)} />
              </div>
            );
          })}
        </div>
      )}

      {/* sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="container-page flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            {message ? (
              <p className={`truncate text-sm font-medium ${message.type === "success" ? "text-emerald-600" : "text-rose-600"}`}>
                {message.text}
              </p>
            ) : (
              <p className="truncate text-sm text-slate-500">
                Week: <strong className="text-slate-700">{summary.markedLessons}</strong> marked
                {dirty && <span className="ml-2 inline-flex items-center gap-1 text-amber-600"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> unsaved</span>}
              </p>
            )}
          </div>
          <button onClick={submit} disabled={saving || !dirty} className="btn-primary">
            {saving ? "Submitting…" : "Submit attendance"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusControl({ value, onChange }: { value: AttendanceStatus; onChange: (s: AttendanceStatus) => void }) {
  const opts: { s: AttendanceStatus; label: string; active: string }[] = [
    { s: "present", label: "P", active: "border-emerald-500 bg-emerald-500 text-white" },
    { s: "absent", label: "A", active: "border-rose-500 bg-rose-500 text-white" },
    { s: "late", label: "L", active: "border-amber-500 bg-amber-500 text-white" },
  ];
  return (
    <div className="flex shrink-0 gap-1.5">
      {opts.map((o) => {
        const on = value === o.s;
        return (
          <button
            key={o.s}
            type="button"
            aria-pressed={on}
            title={o.s}
            onClick={() => onChange(on ? "unmarked" : o.s)}
            className={`h-9 w-9 rounded-lg border text-sm font-bold transition active:scale-95 sm:w-11 ${
              on ? o.active : "border-slate-200 bg-white text-slate-400 hover:border-slate-300"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Chip({ color, label, n }: { color: "emerald" | "rose" | "amber" | "slate"; label: string; n: number }) {
  const dot = { emerald: "bg-emerald-500", rose: "bg-rose-500", amber: "bg-amber-500", slate: "bg-slate-300" }[color];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="font-semibold text-slate-700 tabular-nums">{n}</span>
      <span className="hidden text-slate-400 sm:inline">{label}</span>
    </span>
  );
}
