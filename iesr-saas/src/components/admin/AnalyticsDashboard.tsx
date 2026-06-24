"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DashboardData } from "@/lib/data/dashboard";
import { statusBand } from "@/lib/analytics";
import { formatDate, getWeekStartStr, addDays, noon } from "@/lib/dates";
import { TrendChart, MiniBars, Donut } from "@/components/admin/charts";

type RangeKey = "week" | "month" | "term" | "all";
interface ClassOpt { id: string; code: string; displayName: string }

const today = () => formatDate(new Date());
function rangeFor(key: RangeKey): { from?: string; to?: string } {
  const t = today();
  if (key === "week") return { from: getWeekStartStr(new Date()), to: t };
  if (key === "month") return { from: `${t.slice(0, 8)}01`, to: t };
  if (key === "term") return { from: formatDate(addDays(noon(t), -120)), to: t };
  return {}; // all-time
}

export function AnalyticsDashboard({
  initial, classes, initialRange = "term",
}: { initial: DashboardData; classes: ClassOpt[]; initialRange?: RangeKey }) {
  const [data, setData] = useState<DashboardData>(initial);
  const [range, setRange] = useState<RangeKey>(initialRange);
  const [classId, setClassId] = useState("");
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const firstRender = useRef(true);

  const load = useCallback(async (key: RangeKey, cid: string, quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const { from, to } = rangeFor(key);
      const p = new URLSearchParams();
      if (from) p.set("from", from);
      if (to) p.set("to", to);
      if (cid) p.set("classId", cid);
      const r = await fetch(`/api/admin/analytics/dashboard?${p.toString()}`, { cache: "no-store" });
      const j = await r.json();
      if (r.ok && j.ok) {
        setData(j.data as DashboardData);
        setUpdatedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  // Refetch when range / class changes (skip the very first paint — SSR data is fresh).
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    load(range, classId);
  }, [range, classId, load]);

  // Live updates — silent poll every 15s.
  useEffect(() => {
    const t = setInterval(() => load(range, classId, true), 15000);
    return () => clearInterval(t);
  }, [range, classId, load]);

  const d = data;
  const trend = useMemo(() => d.weeklyTrend.map((w) => ({ label: dm(w.week), value: w.rate })), [d.weeklyTrend]);
  const compliance = useMemo(() => {
    // Marking compliance ≈ active teachers who recorded marks in range / total teachers.
    const active = new Set(d.teacherConsistency.top.concat(d.teacherConsistency.bottom).map((t) => t.teacher)).size;
    return d.counts.teachers ? Math.round((active / d.counts.teachers) * 100) : 0;
  }, [d]);

  return (
    <div className="space-y-6">
      {/* ===== Header ===== */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold sm:text-3xl">Analytics &amp; insights</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live
            </span>
          </div>
          <p className="mt-1 text-slate-600">
            KPLC IESR attendance intelligence · recalculates as registers are marked
            {updatedAt && <span className="text-slate-400"> · updated {updatedAt}</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/monitor"
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${d.activeNow > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
            <span className={`h-2 w-2 rounded-full ${d.activeNow > 0 ? "animate-pulse bg-emerald-500" : "bg-slate-400"}`} />
            {d.activeNow > 0 ? `${d.activeNow} marking now` : "No one marking"}
          </Link>
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="">All classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
          </select>
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {(["week", "month", "term", "all"] as RangeKey[]).map((k) => (
              <button key={k} onClick={() => setRange(k)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${range === k ? "bg-white text-kplc-navy shadow-sm" : "text-slate-600 hover:text-slate-800"}`}>
                {k === "term" ? "Term" : k === "all" ? "All-time" : `This ${k}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && <div className="h-1 w-full overflow-hidden rounded bg-slate-100"><div className="h-full w-1/3 animate-pulse rounded bg-kplc-blue" /></div>}

      {/* ===== KPI hero ===== */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <Kpi label="Overall attendance" value={`${d.overview.rate}%`} hero
          sub={`${d.trendArrow} ${d.trendDelta > 0 ? "+" : ""}${d.trendDelta}% vs first wk`}
          subTone={d.trendArrow === "↑" ? "good" : d.trendArrow === "↓" ? "bad" : "muted"} />
        <Kpi label="Students" value={d.counts.students} href="/admin/students" />
        <Kpi label="Teachers" value={d.counts.teachers} href="/admin/teachers" />
        <Kpi label="Classes" value={d.counts.classes} href="/admin/classes" />
        <Kpi label="At-risk (<60%)" value={d.risk.atRisk} tone={d.risk.atRisk > 0 ? "bad" : "good"} sub={`${d.risk.warning} on watch`} />
        <Kpi label="Marking compliance" value={`${compliance}%`} tone={compliance >= 80 ? "good" : compliance >= 50 ? "warn" : "bad"} sub={`${d.openFlags} open flags`} href="/admin/flags" />
      </div>

      {/* ===== Today + trend ===== */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Weekly attendance trend</h2>
            <span className="text-xs text-slate-400">last {trend.length} weeks · present = present + late</span>
          </div>
          <TrendChart data={trend} />
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">Today</h2>
          <div className="grid grid-cols-3 gap-3">
            <Mini color="emerald" label="Present" n={d.today.present} />
            <Mini color="rose" label="Absent" n={d.today.absent} />
            <Mini color="amber" label="Late" n={d.today.late} />
          </div>
          <p className="mt-3 text-sm text-slate-500">{d.today.marked} records marked today.</p>
          <hr className="my-4 border-slate-100" />
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Risk distribution</h3>
          <Donut segments={[
            { value: d.risk.good, color: "#10b981", label: "Good (≥80%)" },
            { value: d.risk.warning, color: "#f59e0b", label: "Warning (60–80%)" },
            { value: d.risk.critical, color: "#ef4444", label: "Critical (<60%)" },
          ]} />
        </div>
      </div>

      {/* ===== Day pattern + class comparison ===== */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">Attendance by weekday</h2>
          <MiniBars data={d.dayPattern.days.map((x) => ({ label: x.label.slice(0, 3), value: x.rate }))} />
          {d.dayPattern.insight && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">💡 {d.dayPattern.insight}</p>
          )}
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">Class comparison</h2>
          {d.byClass.length === 0 ? <Empty /> : (
            <div className="space-y-2.5">
              {d.byClass.map((c) => {
                const band = statusBand(c.rate);
                const color = band === "Good" ? "bg-emerald-500" : band === "Warning" ? "bg-amber-500" : "bg-rose-500";
                return (
                  <div key={c.classCode} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 truncate font-mono text-xs text-slate-600">{c.classCode}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${c.rate}%` }} />
                    </div>
                    <span className="w-12 shrink-0 text-right text-sm font-bold tabular-nums text-slate-700">{c.rate}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ===== Lessons most/least attended ===== */}
      <div className="grid gap-6 lg:grid-cols-2">
        <LessonList title="Top 5 most-attended lessons" rows={d.subjects.most} tone="good" />
        <LessonList title="Top 5 least-attended lessons" rows={d.subjects.least} tone="bad" />
      </div>

      {/* ===== Teacher consistency ===== */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TeacherList title="Most consistent markers" rows={d.teacherConsistency.top} />
        <TeacherList title="Needs attention (fewest sessions)" rows={d.teacherConsistency.bottom} muted />
      </div>

      {/* ===== At-risk students ===== */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">At-risk students (&lt;80%)</h2>
          <Link href="/admin/reports" className="text-sm font-medium text-kplc-blue hover:text-kplc-navy">Full report</Link>
        </div>
        <div className="card overflow-x-auto">
          {d.atRiskStudents.length === 0 ? <p className="p-6 text-sm text-slate-500">No at-risk students in this range. 🎉</p> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-2 font-medium">Student</th><th className="px-3 py-2 font-medium">Class</th>
                <th className="px-3 py-2 text-right font-medium">Rate</th><th className="px-3 py-2 text-right font-medium">Absent</th>
                <th className="px-5 py-2 font-medium">Most-missed subject</th>
              </tr></thead>
              <tbody>
                {d.atRiskStudents.map((s) => (
                  <tr key={s.admNo} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-2"><div className="font-medium text-slate-800">{s.name}</div><div className="font-mono text-xs text-slate-400">{s.admNo}</div></td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">{s.classCode}</td>
                    <td className="px-3 py-2 text-right"><Band rate={s.rate} /></td>
                    <td className="px-3 py-2 text-right tabular-nums text-rose-600">{s.absent}</td>
                    <td className="px-5 py-2 text-slate-600">{s.mostMissed ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ===== System flags: bottom/top decile ===== */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DecileList title="🚩 Lowest attendance (bottom 10%)" rows={d.lowestStudents} tone="bad" />
        <DecileList title="🏅 Highest attendance (top 10%)" rows={d.highestStudents} tone="good" />
      </div>
    </div>
  );
}

/* ---------------- presentational helpers ---------------- */
function Kpi({ label, value, sub, subTone, tone, hero, href }: {
  label: string; value: string | number; sub?: string; subTone?: "good" | "bad" | "muted";
  tone?: "good" | "warn" | "bad"; hero?: boolean; href?: string;
}) {
  const valColor = hero ? "text-white" : tone === "bad" ? "text-rose-600" : tone === "warn" ? "text-amber-600" : tone === "good" ? "text-emerald-600" : "text-kplc-navy";
  const body = (
    <div className={`h-full rounded-2xl border p-4 shadow-soft transition ${hero ? "border-transparent bg-gradient-to-br from-kplc-navy to-kplc-blue text-white" : "border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-md"}`}>
      <p className={`text-xs font-medium ${hero ? "text-white/70" : "text-slate-500"}`}>{label}</p>
      <p className={`mt-1 font-display text-3xl font-bold ${valColor}`}>{value}</p>
      {sub && <p className={`mt-0.5 text-xs ${hero ? "text-white/80" : subTone === "good" ? "text-emerald-600" : subTone === "bad" ? "text-rose-600" : "text-slate-400"}`}>{sub}</p>}
    </div>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}
function Mini({ color, label, n }: { color: "emerald" | "rose" | "amber"; label: string; n: number }) {
  const bg = { emerald: "bg-emerald-50 text-emerald-700", rose: "bg-rose-50 text-rose-700", amber: "bg-amber-50 text-amber-700" }[color];
  return <div className={`rounded-xl px-3 py-3 text-center ${bg}`}><p className="font-display text-2xl font-bold">{n}</p><p className="text-xs font-medium">{label}</p></div>;
}
function Band({ rate }: { rate: number }) {
  const c = rate >= 80 ? "bg-emerald-100 text-emerald-700" : rate >= 60 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${c}`}>{rate}%</span>;
}
function LessonList({ title, rows, tone }: { title: string; rows: { subject: string; teacher: string; rate: number; total: number }[]; tone: "good" | "bad" }) {
  return (
    <div className="card p-5">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {rows.length === 0 ? <Empty /> : (
        <ol className="space-y-2">
          {rows.map((r, i) => (
            <li key={r.subject} className="flex items-center gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">{i + 1}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-800">{r.subject}</p><p className="truncate text-xs text-slate-400">{r.teacher} · {r.total} sessions</p></div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${tone === "good" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{r.rate}%</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
function TeacherList({ title, rows, muted }: { title: string; rows: { teacher: string; sessions: number; marks: number; rate: number }[]; muted?: boolean }) {
  return (
    <div className="card p-5">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {rows.length === 0 ? <Empty /> : (
        <ul className="space-y-2">
          {rows.map((t) => (
            <li key={t.teacher} className="flex items-center gap-3">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${muted ? "bg-slate-100 text-slate-500" : "bg-kplc-navy/10 text-kplc-navy"}`}>{initials(t.teacher)}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-800">{t.teacher}</p><p className="text-xs text-slate-400">{t.sessions} sessions · {t.marks} marks</p></div>
              <span className="text-xs font-semibold text-slate-500">{t.rate}% present</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
function DecileList({ title, rows, tone }: { title: string; rows: { admNo: string; name: string; classCode: string; rate: number }[]; tone: "good" | "bad" }) {
  return (
    <div className="card p-5">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {rows.length === 0 ? <Empty /> : (
        <ul className="divide-y divide-slate-100">
          {rows.map((s) => (
            <li key={s.admNo} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-800">{s.name}</p><p className="font-mono text-xs text-slate-400">{s.admNo} · {s.classCode}</p></div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${tone === "good" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{s.rate}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
function Empty() { return <p className="py-6 text-center text-sm text-slate-400">No data for this range.</p>; }
function dm(dateStr: string) { const [, m, dd] = dateStr.split("-"); return `${dd}/${m}`; }
function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?"; }
