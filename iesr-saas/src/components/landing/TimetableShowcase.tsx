"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { PublicTimetableClass, PublicSession } from "@/lib/data/public";

/* ------------------------------------------------------------------ helpers */
const DAYS = [
  { k: "mon", label: "Mon" }, { k: "tue", label: "Tue" }, { k: "wed", label: "Wed" },
  { k: "thu", label: "Thu" }, { k: "fri", label: "Fri" },
] as const;
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DAY_FULL: Record<string, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };

const hhmm = (t: string) => t.slice(0, 5);
const toMin = (t: string) => { const [h, m] = t.split(":"); return Number(h) * 60 + Number(m); };
const fmtCountdown = (mins: number) => (mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`);

type Status = "live" | "upcoming" | "completed" | "scheduled";
type Tab = "today" | "week" | "all";

/* ------------------------------------------------------------------ component */
export function TimetableShowcase({ initial }: { initial: PublicTimetableClass[] }) {
  const [data, setData] = useState<PublicTimetableClass[]>(initial);
  const [tab, setTab] = useState<Tab>("today");
  const [now, setNow] = useState<Date | null>(null); // set on mount (avoids SSR hydration mismatch)
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<{ cls: PublicTimetableClass; s: PublicSession } | null>(null);

  // clock tick (status + countdown) every 30s
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // poll the timetable every 30s → admin edits appear automatically
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch("/api/public/timetable", { cache: "no-store" });
        const j = await r.json();
        if (alive && j.ok) setData(j.data as PublicTimetableClass[]);
      } catch { /* keep last */ }
    };
    const id = setInterval(poll, 30_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const todayKey = now ? DAY_KEYS[now.getDay()] : null;
  const nowMin = now ? now.getHours() * 60 + now.getMinutes() : -1;

  const statusOf = (s: PublicSession): Status => {
    if (!now || s.day !== todayKey) return "scheduled";
    if (nowMin < toMin(s.startTime)) return "upcoming";
    if (nowMin < toMin(s.endTime)) return "live";
    return "completed";
  };

  // today's sessions across every class, in time order
  const todaySessions = useMemo(() => {
    if (!todayKey) return [];
    return data
      .flatMap((c) => c.sessions.filter((s) => s.day === todayKey).map((s) => ({ cls: c, s })))
      .sort((a, b) => a.s.startTime.localeCompare(b.s.startTime));
  }, [data, todayKey]);

  const liveCount = useMemo(() => todaySessions.filter(({ s }) => statusOf(s) === "live").length, [todaySessions, now]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: string) => setExpanded((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const empty = data.length === 0;

  return (
    <section className="bg-slate-50 py-20 sm:py-28">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-kplc-blue">Live schedule</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Active Programmes &amp; Schedule</h2>
          <p className="mt-4 text-lg text-slate-600">Real-time class schedules — updated live from the register.</p>
          {liveCount > 0 && (
            <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
              {liveCount} session{liveCount === 1 ? "" : "s"} in progress now
            </span>
          )}
        </div>

        {empty ? (
          <EmptyState />
        ) : (
          <>
            {/* tabs */}
            <div className="mt-10 flex justify-center">
              <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
                {([["today", "Today"], ["week", "This Week"], ["all", "All Classes"]] as [Tab, string][]).map(([k, label]) => (
                  <button key={k} onClick={() => setTab(k)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:px-5 ${tab === k ? "bg-kplc-navy text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-10">
              <AnimatePresence mode="wait">
                <motion.div key={tab}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>

                  {tab === "today" && (
                    <TodayView now={now} sessions={todaySessions} statusOf={statusOf} nowMin={nowMin} onPick={(cls, s) => setSelected({ cls, s })} />
                  )}

                  {tab === "week" && (
                    <div className="space-y-4">
                      {data.map((c) => <ClassCard key={c.id} cls={c} open statusOf={statusOf} onPick={(s) => setSelected({ cls: c, s })} />)}
                    </div>
                  )}

                  {tab === "all" && (
                    <div className="grid gap-4 lg:grid-cols-2">
                      {data.map((c) => (
                        <ClassCard key={c.id} cls={c} open={expanded.has(c.id)} onToggle={() => toggle(c.id)} statusOf={statusOf} onPick={(s) => setSelected({ cls: c, s })} />
                      ))}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* session detail popover */}
      <AnimatePresence>
        {selected && <SessionDetail sel={selected} status={statusOf(selected.s)} nowMin={nowMin} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </section>
  );
}

/* ------------------------------------------------------------------ today timeline */
function TodayView({ now, sessions, statusOf, nowMin, onPick }: {
  now: Date | null;
  sessions: { cls: PublicTimetableClass; s: PublicSession }[];
  statusOf: (s: PublicSession) => Status; nowMin: number;
  onPick: (cls: PublicTimetableClass, s: PublicSession) => void;
}) {
  if (!now) return <p className="text-center text-sm text-slate-400">Loading today&apos;s schedule…</p>;
  const dayName = DAY_FULL[DAY_KEYS[now.getDay()]] ?? "";
  if (sessions.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-soft">
        <p className="text-4xl">📅</p>
        <p className="mt-3 font-semibold text-slate-800">No sessions scheduled for {dayName}.</p>
        <p className="mt-1 text-sm text-slate-500">Switch to <b>This Week</b> to see the full timetable.</p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {sessions.map(({ cls, s }, i) => {
        const st = statusOf(s);
        const until = toMin(s.startTime) - nowMin;
        return (
          <motion.button
            key={`${cls.id}-${s.startTime}-${i}`}
            onClick={() => onPick(cls, s)}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
            className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border bg-white p-4 text-left shadow-soft transition hover:shadow-md ${
              st === "live" ? "border-emerald-300" : st === "completed" ? "border-slate-200 opacity-60" : "border-slate-200"
            }`}
          >
            {st === "live" && <span className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-kplc-blue via-kplc-green to-kplc-yellow" />}
            <div className="w-20 shrink-0 text-center">
              <p className="font-display text-lg font-bold text-kplc-navy">{hhmm(s.startTime)}</p>
              <p className="text-[11px] text-slate-400">{hhmm(s.endTime)}</p>
            </div>
            <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg ring-1 ring-slate-200">
              <Image src="/images/iesr-4.jpg" alt="IESR" fill sizes="40px" className="object-cover" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-900">{s.subject}</p>
              <p className="truncate text-sm text-slate-500">{cls.code} · {s.teacher}</p>
            </div>
            <StatusBadge status={st} until={until} />
          </motion.button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ class card */
function ClassCard({ cls, open, onToggle, statusOf, onPick }: {
  cls: PublicTimetableClass; open: boolean; onToggle?: () => void;
  statusOf: (s: PublicSession) => Status;
  onPick: (s: PublicSession) => void;
}) {
  const liveHere = cls.sessions.some((s) => statusOf(s) === "live");
  const catColor = cls.category.toLowerCase().includes("diploma") ? "bg-kplc-blue/10 text-kplc-blue" : "bg-kplc-green/10 text-kplc-green";
  return (
    <div className={`overflow-hidden rounded-2xl border bg-white shadow-soft transition ${liveHere ? "border-emerald-300" : "border-slate-200"}`}>
      <button onClick={onToggle} disabled={!onToggle} className="flex w-full items-center gap-4 p-5 text-left disabled:cursor-default">
        <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl ring-1 ring-slate-200">
          <Image src="/images/iesr-4.jpg" alt="IESR" fill sizes="44px" className="object-cover" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-bold text-slate-900">{cls.name}</p>
            {liveHere && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500"><span className="font-mono">{cls.code}</span> · {cls.sessions.length} session{cls.sessions.length === 1 ? "" : "s"}/week</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${catColor}`}>{cls.category}</span>
        {onToggle && (
          <svg viewBox="0 0 24 24" className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
            <div className="grid gap-2 border-t border-slate-100 p-4 sm:grid-cols-3 lg:grid-cols-5">
              {DAYS.map((d) => {
                const daySessions = cls.sessions.filter((s) => s.day === d.k);
                return (
                  <div key={d.k} className="rounded-xl bg-slate-50 p-2.5">
                    <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">{d.label}</p>
                    <div className="space-y-2">
                      {daySessions.length === 0 ? (
                        <p className="py-2 text-center text-[11px] text-slate-300">—</p>
                      ) : daySessions.map((s, i) => {
                        const st = statusOf(s);
                        return (
                          <button key={i} onClick={() => onPick(s)}
                            className={`relative w-full overflow-hidden rounded-lg border p-2 text-left transition hover:shadow-sm ${
                              st === "live" ? "border-emerald-300 bg-emerald-50" : st === "completed" ? "border-slate-200 bg-white opacity-50" : "border-slate-200 bg-white"
                            }`}>
                            {st === "live" && <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-kplc-blue via-kplc-green to-kplc-yellow" />}
                            <p className="text-[11px] font-bold text-kplc-navy">{hhmm(s.startTime)}–{hhmm(s.endTime)}</p>
                            <p className="mt-0.5 truncate text-xs font-semibold text-slate-800" title={s.subject}>{s.subject}</p>
                            <p className="truncate text-[11px] text-slate-500" title={s.teacher}>{s.teacher}</p>
                            {st === "live" && <span className="mt-1 inline-block text-[10px] font-bold uppercase text-emerald-600">● In progress</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ small bits */
function StatusBadge({ status, until }: { status: Status; until: number }) {
  if (status === "live") return <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> In Progress</span>;
  if (status === "upcoming") return <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-kplc-blue/10 px-3 py-1 text-xs font-bold text-kplc-blue">Upcoming{until > 0 && until <= 600 ? ` · ${fmtCountdown(until)}` : ""}</span>;
  if (status === "completed") return <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">Completed</span>;
  return <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">Scheduled</span>;
}

function SessionDetail({ sel, status, nowMin, onClose }: { sel: { cls: PublicTimetableClass; s: PublicSession }; status: Status; nowMin: number; onClose: () => void }) {
  const { cls, s } = sel;
  const until = toMin(s.startTime) - nowMin;
  return (
    <motion.div className="fixed inset-0 z-[90] flex items-end justify-center p-4 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: 24, scale: 0.98, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 16, opacity: 0 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="h-1.5 w-full bg-gradient-to-r from-kplc-blue via-kplc-green to-kplc-yellow" />
        <div className="p-6">
          <div className="flex items-center gap-3">
            <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg ring-1 ring-slate-200"><Image src="/images/iesr-4.jpg" alt="IESR" fill sizes="40px" className="object-cover" /></span>
            <div className="min-w-0">
              <p className="truncate font-bold text-kplc-navy">{cls.name}</p>
              <p className="truncate font-mono text-xs text-slate-500">{cls.code}</p>
            </div>
            <button onClick={onClose} aria-label="Close" className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none"><path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          </div>
          <div className="mt-5 space-y-3 text-sm">
            <Row label="Subject / Unit" value={s.subject} />
            <Row label="Lecturer" value={s.teacher} />
            <Row label="Day" value={DAY_FULL[s.day] ?? s.day} />
            <Row label="Time" value={`${hhmm(s.startTime)} – ${hhmm(s.endTime)}`} />
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status</span>
              <StatusBadge status={status} until={until} />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start justify-between gap-4">
    <span className="shrink-0 text-slate-500">{label}</span>
    <span className="text-right font-semibold text-slate-800">{value}</span>
  </div>
);

function EmptyState() {
  return (
    <div className="mx-auto mt-12 max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-soft">
      <span className="relative mx-auto block h-14 w-14 overflow-hidden rounded-2xl ring-1 ring-slate-200">
        <Image src="/images/iesr-4.jpg" alt="IESR" fill sizes="56px" className="object-cover" />
      </span>
      <p className="mt-4 text-lg font-bold text-slate-800">Schedule being prepared</p>
      <p className="mt-1 text-sm text-slate-500">The timetable for this term is being set up. Check back shortly — it updates live from the register.</p>
    </div>
  );
}
