"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { PublicTimetableClass, PublicSession } from "@/lib/data/public";

/* ------------------------------------------------------------------ helpers */
const DAYS = [
  { k: "mon", label: "Monday", short: "Mon" }, { k: "tue", label: "Tuesday", short: "Tue" },
  { k: "wed", label: "Wednesday", short: "Wed" }, { k: "thu", label: "Thursday", short: "Thu" },
  { k: "fri", label: "Friday", short: "Fri" },
] as const;
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DAY_FULL: Record<string, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };

const hhmm = (t: string) => t.slice(0, 5);
const toMin = (t: string) => { const [h, m] = t.split(":"); return Number(h) * 60 + Number(m); };
const fmtCountdown = (mins: number) => (mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`);
const initials = (name: string) => (name.match(/[A-Za-z]+/g)?.slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "—");

// curated subject palette — literal class strings so Tailwind keeps them
const PALETTE = [
  { chip: "bg-blue-50 text-blue-900", bar: "bg-blue-500", ava: "bg-blue-500" },
  { chip: "bg-emerald-50 text-emerald-900", bar: "bg-emerald-500", ava: "bg-emerald-500" },
  { chip: "bg-amber-50 text-amber-900", bar: "bg-amber-500", ava: "bg-amber-500" },
  { chip: "bg-violet-50 text-violet-900", bar: "bg-violet-500", ava: "bg-violet-500" },
  { chip: "bg-rose-50 text-rose-900", bar: "bg-rose-500", ava: "bg-rose-500" },
  { chip: "bg-cyan-50 text-cyan-900", bar: "bg-cyan-500", ava: "bg-cyan-500" },
  { chip: "bg-indigo-50 text-indigo-900", bar: "bg-indigo-500", ava: "bg-indigo-500" },
  { chip: "bg-teal-50 text-teal-900", bar: "bg-teal-500", ava: "bg-teal-500" },
  { chip: "bg-orange-50 text-orange-900", bar: "bg-orange-500", ava: "bg-orange-500" },
  { chip: "bg-fuchsia-50 text-fuchsia-900", bar: "bg-fuchsia-500", ava: "bg-fuchsia-500" },
  { chip: "bg-sky-50 text-sky-900", bar: "bg-sky-500", ava: "bg-sky-500" },
  { chip: "bg-lime-50 text-lime-900", bar: "bg-lime-600", ava: "bg-lime-600" },
];
const colorFor = (subject: string) => {
  let h = 0;
  for (let i = 0; i < subject.length; i++) h = (h * 31 + subject.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

type Status = "live" | "upcoming" | "completed" | "scheduled";
type Tab = "today" | "week" | "all";

/* ------------------------------------------------------------------ component */
export function TimetableShowcase({ initial }: { initial: PublicTimetableClass[] }) {
  const [data, setData] = useState<PublicTimetableClass[]>(initial);
  const [tab, setTab] = useState<Tab>("today");
  const [now, setNow] = useState<Date | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<{ cls: PublicTimetableClass; s: PublicSession } | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let alive = true;
    const id = setInterval(async () => {
      try {
        const r = await fetch("/api/public/timetable", { cache: "no-store" });
        const j = await r.json();
        if (alive && j.ok) setData(j.data as PublicTimetableClass[]);
      } catch { /* keep last */ }
    }, 30_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const todayKey = now ? DAY_KEYS[now.getDay()] : null;
  const nowMin = now ? now.getHours() * 60 + now.getMinutes() : -1;

  const statusOf = useMemo(() => (s: PublicSession): Status => {
    if (!now || s.day !== todayKey) return "scheduled";
    if (nowMin < toMin(s.startTime)) return "upcoming";
    if (nowMin < toMin(s.endTime)) return "live";
    return "completed";
  }, [now, todayKey, nowMin]);

  const todaySessions = useMemo(() => {
    if (!todayKey) return [];
    return data.flatMap((c) => c.sessions.filter((s) => s.day === todayKey).map((s) => ({ cls: c, s })))
      .sort((a, b) => a.s.startTime.localeCompare(b.s.startTime));
  }, [data, todayKey]);

  const liveCount = useMemo(() => todaySessions.filter(({ s }) => statusOf(s) === "live").length, [todaySessions, statusOf]);

  const toggle = (id: string) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const empty = data.length === 0;

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50 to-white py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-64 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(20,102,184,0.08),transparent_70%)]" />

      <div className="container-page relative">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-kplc-blue">Live schedule</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Active Programmes &amp; Schedule</h2>
          <p className="mt-4 text-lg text-slate-600">Real-time class schedules — updated live from the register.</p>
          {liveCount > 0 && (
            <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <Ping /> {liveCount} session{liveCount === 1 ? "" : "s"} in progress now
            </span>
          )}
        </div>

        {empty ? <EmptyState /> : (
          <>
            {/* tabs + legend */}
            <div className="mt-10 flex flex-col items-center gap-5">
              <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
                {([["today", "Today"], ["week", "This Week"], ["all", "All Classes"]] as [Tab, string][]).map(([k, label]) => (
                  <button key={k} onClick={() => setTab(k)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:px-6 ${tab === k ? "bg-kplc-navy text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
                <span className="inline-flex items-center gap-1.5"><Ping small /> In progress</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-kplc-blue" /> Upcoming</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-300" /> Completed</span>
              </div>
            </div>

            <div className="mt-10">
              <AnimatePresence mode="wait">
                <motion.div key={tab}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>

                  {tab === "today" && <TodayView now={now} sessions={todaySessions} statusOf={statusOf} nowMin={nowMin} onPick={(cls, s) => setSelected({ cls, s })} />}

                  {tab === "week" && (
                    <div className="mx-auto max-w-5xl space-y-5">
                      {data.map((c) => <ClassCard key={c.id} cls={c} open statusOf={statusOf} onPick={(s) => setSelected({ cls: c, s })} />)}
                    </div>
                  )}

                  {tab === "all" && (
                    <div className="mx-auto max-w-5xl space-y-4">
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

      <AnimatePresence>
        {selected && <SessionDetail sel={selected} status={statusOf(selected.s)} nowMin={nowMin} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </section>
  );
}

/* ------------------------------------------------------------------ today timeline */
function TodayView({ now, sessions, statusOf, nowMin, onPick }: {
  now: Date | null; sessions: { cls: PublicTimetableClass; s: PublicSession }[];
  statusOf: (s: PublicSession) => Status; nowMin: number;
  onPick: (cls: PublicTimetableClass, s: PublicSession) => void;
}) {
  if (!now) return <p className="text-center text-sm text-slate-400">Loading today&apos;s schedule…</p>;
  const dayName = DAY_FULL[DAY_KEYS[now.getDay()]] ?? "";
  if (sessions.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-soft">
        <p className="text-4xl">📅</p>
        <p className="mt-3 font-bold text-slate-800">No sessions scheduled for {dayName}.</p>
        <p className="mt-1 text-sm text-slate-500">Switch to <b>This Week</b> to see the full timetable.</p>
      </div>
    );
  }
  return (
    <div className="relative mx-auto max-w-3xl">
      {/* timeline rail */}
      <div className="absolute bottom-4 left-[68px] top-4 w-px bg-slate-200 sm:left-[76px]" />
      <div className="space-y-4">
        {sessions.map(({ cls, s }, i) => {
          const st = statusOf(s);
          const col = colorFor(s.subject);
          const until = toMin(s.startTime) - nowMin;
          return (
            <motion.div key={`${cls.id}-${s.startTime}-${i}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              className="relative flex items-stretch gap-4">
              {/* time */}
              <div className="w-14 shrink-0 pt-3 text-right sm:w-16">
                <p className="font-display text-sm font-bold text-kplc-navy">{hhmm(s.startTime)}</p>
                <p className="text-[11px] text-slate-400">{hhmm(s.endTime)}</p>
              </div>
              {/* node */}
              <div className="relative z-10 flex w-4 shrink-0 justify-center pt-4">
                {st === "live"
                  ? <span className="relative flex h-4 w-4"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-4 w-4 rounded-full border-2 border-white bg-emerald-500 shadow" /></span>
                  : <span className={`h-4 w-4 rounded-full border-2 border-white shadow ${st === "completed" ? "bg-slate-300" : col.bar}`} />}
              </div>
              {/* card */}
              <button onClick={() => onPick(cls, s)}
                className={`group relative flex flex-1 items-center gap-3 overflow-hidden rounded-2xl border bg-white p-3.5 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-md ${st === "live" ? "border-emerald-300 ring-1 ring-emerald-200" : "border-slate-200"} ${st === "completed" ? "opacity-55" : ""}`}>
                <span className={`absolute inset-y-0 left-0 w-1.5 ${st === "live" ? "" : col.bar}`} />
                {st === "live" && <span className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-kplc-blue via-kplc-green to-kplc-yellow" />}
                <span className={`ml-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${col.ava}`}>{initials(s.teacher)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-900">{s.subject}</p>
                  <p className="truncate text-sm text-slate-500"><span className="font-mono">{cls.code}</span> · {s.teacher}</p>
                </div>
                <StatusBadge status={st} until={until} />
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ class card + matrix */
function ClassCard({ cls, open, onToggle, statusOf, onPick }: {
  cls: PublicTimetableClass; open: boolean; onToggle?: () => void;
  statusOf: (s: PublicSession) => Status; onPick: (s: PublicSession) => void;
}) {
  const liveHere = cls.sessions.some((s) => statusOf(s) === "live");
  const isDiploma = cls.category.toLowerCase().includes("diploma");

  // distinct time slots present in this class → matrix rows
  const slots = useMemo(() => {
    const keys = [...new Set(cls.sessions.map((s) => `${s.startTime}|${s.endTime}`))].sort();
    return keys.map((k) => { const [start, end] = k.split("|"); return { key: k, start, end }; });
  }, [cls.sessions]);
  const at = (day: string, key: string) => cls.sessions.find((s) => s.day === day && `${s.startTime}|${s.endTime}` === key);

  return (
    <div className={`overflow-hidden rounded-3xl border bg-white shadow-soft transition ${liveHere ? "border-emerald-300 ring-1 ring-emerald-200" : "border-slate-200"}`}>
      {/* branded header */}
      <button onClick={onToggle} disabled={!onToggle} className="flex w-full items-center gap-4 bg-gradient-to-r from-kplc-navy to-kplc-blue p-5 text-left disabled:cursor-default">
        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/95 p-0.5 ring-1 ring-white/30">
          <Image src="/images/iesr-4.jpg" alt="IESR" fill sizes="48px" className="rounded-[10px] object-cover" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-lg font-bold text-white">{cls.name}</p>
            {liveHere && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-100 ring-1 ring-emerald-400/40"><Ping small /> Live now</span>}
          </div>
          <p className="mt-0.5 truncate text-xs text-white/70"><span className="font-mono">{cls.code}</span> · {cls.sessions.length} sessions / week</p>
        </div>
        <span className={`hidden shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide sm:inline ${isDiploma ? "bg-kplc-yellow text-kplc-navy" : "bg-white/15 text-white ring-1 ring-white/25"}`}>{cls.category}</span>
        {onToggle && <svg viewBox="0 0 24 24" className={`h-5 w-5 shrink-0 text-white/80 transition-transform ${open ? "rotate-180" : ""}`} fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
            <div className="overflow-x-auto p-4 sm:p-5">
              <div className="grid min-w-[760px] gap-2" style={{ gridTemplateColumns: "5rem repeat(5, minmax(130px, 1fr))" }}>
                {/* header row */}
                <div />
                {DAYS.map((d) => <div key={d.k} className="rounded-lg bg-slate-100 py-2 text-center text-xs font-bold uppercase tracking-wide text-slate-500">{d.short}</div>)}

                {/* slot rows */}
                {slots.map((slot) => (
                  <RowFragment key={slot.key} slot={slot} at={at} statusOf={statusOf} onPick={onPick} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RowFragment({ slot, at, statusOf, onPick }: {
  slot: { key: string; start: string; end: string };
  at: (day: string, key: string) => PublicSession | undefined;
  statusOf: (s: PublicSession) => Status; onPick: (s: PublicSession) => void;
}) {
  return (
    <>
      <div className="flex flex-col justify-center rounded-lg bg-slate-50 px-2 py-2 text-center">
        <span className="font-display text-sm font-bold text-kplc-navy">{hhmm(slot.start)}</span>
        <span className="text-[10px] text-slate-400">{hhmm(slot.end)}</span>
      </div>
      {DAYS.map((d) => {
        const s = at(d.k, slot.key);
        if (!s) return <div key={d.k} className="rounded-xl border border-dashed border-slate-200/70" />;
        const st = statusOf(s);
        const col = colorFor(s.subject);
        return (
          <button key={d.k} onClick={() => onPick(s)}
            className={`group relative overflow-hidden rounded-xl p-2.5 text-left transition hover:shadow-md ${col.chip} ${st === "live" ? "ring-2 ring-emerald-400" : ""} ${st === "completed" ? "opacity-45" : ""}`}>
            <span className={`absolute inset-y-0 left-0 w-1 ${col.bar}`} />
            {st === "live" && <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-kplc-blue via-kplc-green to-kplc-yellow" />}
            <p className="pl-1.5 text-[13px] font-bold leading-tight" title={s.subject}>{s.subject}</p>
            <div className="mt-1.5 flex items-center gap-1.5 pl-1.5">
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white ${col.ava}`}>{initials(s.teacher)}</span>
              <span className="truncate text-[11px] font-medium opacity-80" title={s.teacher}>{s.teacher}</span>
            </div>
            {st === "live" && <span className="mt-1.5 inline-flex items-center gap-1 pl-1.5 text-[10px] font-bold uppercase text-emerald-700"><Ping small /> In progress</span>}
            {st === "upcoming" && <span className="mt-1.5 block pl-1.5 text-[10px] font-bold uppercase text-kplc-blue">Upcoming</span>}
          </button>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ bits */
function Ping({ small }: { small?: boolean }) {
  const sz = small ? "h-2 w-2" : "h-2.5 w-2.5";
  return <span className={`relative flex ${sz}`}><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className={`relative inline-flex ${sz} rounded-full bg-emerald-500`} /></span>;
}

function StatusBadge({ status, until }: { status: Status; until: number }) {
  if (status === "live") return <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700"><Ping small /> In Progress</span>;
  if (status === "upcoming") return <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-kplc-blue/10 px-3 py-1 text-xs font-bold text-kplc-blue">Upcoming{until > 0 && until <= 600 ? ` · ${fmtCountdown(until)}` : ""}</span>;
  if (status === "completed") return <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">Completed</span>;
  return <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">Scheduled</span>;
}

function SessionDetail({ sel, status, nowMin, onClose }: { sel: { cls: PublicTimetableClass; s: PublicSession }; status: Status; nowMin: number; onClose: () => void }) {
  const { cls, s } = sel;
  const col = colorFor(s.subject);
  const until = toMin(s.startTime) - nowMin;
  return (
    <motion.div className="fixed inset-0 z-[90] flex items-end justify-center p-4 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: 24, scale: 0.98, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 16, opacity: 0 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="h-1.5 w-full bg-gradient-to-r from-kplc-blue via-kplc-green to-kplc-yellow" />
        <div className="p-6">
          <div className="flex items-center gap-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${col.ava}`}>{initials(s.teacher)}</span>
            <div className="min-w-0">
              <p className="truncate font-bold text-kplc-navy">{s.subject}</p>
              <p className="truncate text-xs text-slate-500">{cls.name}</p>
            </div>
            <button onClick={onClose} aria-label="Close" className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none"><path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          </div>
          <div className="mt-5 space-y-3 text-sm">
            <Row label="Class" value={`${cls.name} · ${cls.code}`} />
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
    <div className="mx-auto mt-12 max-w-md rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-soft">
      <span className="relative mx-auto block h-14 w-14 overflow-hidden rounded-2xl ring-1 ring-slate-200">
        <Image src="/images/iesr-4.jpg" alt="IESR" fill sizes="56px" className="object-cover" />
      </span>
      <p className="mt-4 text-lg font-bold text-slate-800">Schedule being prepared</p>
      <p className="mt-1 text-sm text-slate-500">The timetable for this term is being set up. Check back shortly — it updates live from the register.</p>
    </div>
  );
}
