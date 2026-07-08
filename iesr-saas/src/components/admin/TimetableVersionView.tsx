"use client";

import type { GenClass, PlacedSession, Unplaced } from "@/lib/timetable/generate";

const DAYS = [["mon", "Mon"], ["tue", "Tue"], ["wed", "Wed"], ["thu", "Thu"], ["fri", "Fri"]] as const;
const hhmm = (t: string) => t.slice(0, 5);

const PALETTE = [
  "bg-blue-50 text-blue-900 border-blue-200", "bg-emerald-50 text-emerald-900 border-emerald-200",
  "bg-amber-50 text-amber-900 border-amber-200", "bg-violet-50 text-violet-900 border-violet-200",
  "bg-rose-50 text-rose-900 border-rose-200", "bg-cyan-50 text-cyan-900 border-cyan-200",
  "bg-indigo-50 text-indigo-900 border-indigo-200", "bg-teal-50 text-teal-900 border-teal-200",
  "bg-orange-50 text-orange-900 border-orange-200", "bg-fuchsia-50 text-fuchsia-900 border-fuchsia-200",
  "bg-sky-50 text-sky-900 border-sky-200", "bg-lime-50 text-lime-900 border-lime-200",
];
const colorFor = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return PALETTE[h % PALETTE.length]; };

export interface VersionView { classes: GenClass[]; sessions: PlacedSession[]; unplaced: Unplaced[]; teacherLoad: { teacher: string; total: number }[]; stats: { classes: number; sessions: number; teachers: number; unplaced: number }; }

export function TimetableVersionView({ v }: { v: VersionView }) {
  return (
    <div className="space-y-6">
      {/* stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Classes" value={v.stats.classes} />
        <Stat label="Sessions placed" value={v.stats.sessions} accent="emerald" />
        <Stat label="Teachers" value={v.stats.teachers} />
        <Stat label="Needs review" value={v.stats.unplaced} accent={v.stats.unplaced ? "rose" : undefined} />
      </div>

      {/* needs review */}
      {v.unplaced.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-bold text-rose-700">⚠ {v.unplaced.length} session{v.unplaced.length === 1 ? "" : "s"} could not be placed</p>
          <ul className="mt-2 space-y-1 text-xs text-rose-700/90">
            {v.unplaced.slice(0, 12).map((u, i) => <li key={i}>• <b>{u.code}</b> — {u.subject} ({u.teacher}): {u.reason}</li>)}
            {v.unplaced.length > 12 && <li>…and {v.unplaced.length - 12} more.</li>}
          </ul>
        </div>
      )}

      {/* per-class grids */}
      <div className="space-y-5">
        {v.classes.map((c) => {
          const sessions = v.sessions.filter((s) => s.classId === c.id);
          const slotKeys = [...new Set(sessions.map((s) => `${s.startTime}|${s.endTime}`))].sort();
          const at = (day: string, key: string) => sessions.find((s) => s.day === day && `${s.startTime}|${s.endTime}` === key);
          return (
            <div key={c.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
              <div className="flex flex-wrap items-center gap-2 bg-gradient-to-r from-kplc-navy to-kplc-blue px-4 py-3 text-white">
                <p className="font-bold">{c.name}</p>
                <span className="font-mono text-xs text-white/70">{c.code}</span>
                <span className="ml-auto rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide">Room {c.room}</span>
                <span className="rounded-full bg-kplc-yellow px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-kplc-navy">{c.category}</span>
              </div>
              <div className="overflow-x-auto p-3">
                <div className="grid min-w-[720px] gap-1.5" style={{ gridTemplateColumns: "5rem repeat(5, minmax(120px, 1fr))" }}>
                  <div />
                  {DAYS.map(([, l]) => <div key={l} className="rounded-lg bg-slate-100 py-1.5 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">{l}</div>)}
                  {slotKeys.map((key) => {
                    const [start, end] = key.split("|");
                    return (
                      <FragmentRow key={key} start={start} end={end}>
                        {DAYS.map(([day]) => {
                          const s = at(day, key);
                          if (!s) return <div key={day} className="rounded-lg border border-dashed border-slate-200/70" />;
                          const col = colorFor(s.subject);
                          return (
                            <div key={day} className={`rounded-lg border p-1.5 ${col}`}>
                              <p className="text-[11px] font-bold leading-tight">{s.subject}</p>
                              <p className="text-[10px] opacity-75">{s.teacher}{s.fullDay ? " · full day" : ""}</p>
                            </div>
                          );
                        })}
                      </FragmentRow>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* teacher load */}
      {v.teacherLoad.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <p className="text-sm font-semibold text-slate-700">Teacher workload (sessions / week)</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {v.teacherLoad.map((t) => (
              <span key={t.teacher} className={`rounded-full px-3 py-1 text-xs font-medium ${t.total >= 20 ? "bg-rose-100 text-rose-700" : t.total >= 12 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                {t.teacher} · {t.total}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FragmentRow({ start, end, children }: { start: string; end: string; children: React.ReactNode }) {
  return (
    <>
      <div className="flex flex-col justify-center rounded-lg bg-slate-50 px-1 py-1.5 text-center">
        <span className="font-display text-xs font-bold text-kplc-navy">{hhmm(start)}</span>
        <span className="text-[10px] text-slate-400">{hhmm(end)}</span>
      </div>
      {children}
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "emerald" | "rose" }) {
  const c = accent === "emerald" ? "text-emerald-700 bg-emerald-50" : accent === "rose" ? "text-rose-700 bg-rose-50" : "text-kplc-navy bg-kplc-navy/5";
  return <div className={`rounded-2xl px-4 py-3 ${c}`}><p className="font-display text-2xl font-bold">{value}</p><p className="text-xs font-medium opacity-80">{label}</p></div>;
}
