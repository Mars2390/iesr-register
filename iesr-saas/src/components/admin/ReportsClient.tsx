"use client";

import { useState } from "react";
import type { Overview, Insights, ProblematicResult } from "@/lib/analytics";
import { statusBand } from "@/lib/analytics";
import { formatDate, getWeekStartStr, addDays, noon } from "@/lib/dates";

interface Options { classes: { id: string; code: string; displayName: string }[]; teachers: { id: string; name: string }[]; }
interface Analytics { overview: Overview; insights: Insights; problematic: ProblematicResult; }

export function ReportsClient({ options, initial, from, to }: { options: Options; initial: Analytics; from: string; to: string }) {
  const [filters, setFilters] = useState({ from, to, classId: "", teacherId: "" });
  const [data, setData] = useState<Analytics>(initial);
  const [loading, setLoading] = useState(false);

  const qs = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(o)) if (v) p.set(k, v);
    return p.toString();
  };

  async function apply() {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/reports/analytics?${qs(filters)}`, { cache: "no-store" });
      const j = await r.json();
      if (j.ok) setData(j.data);
    } finally { setLoading(false); }
  }

  const today = formatDate(new Date());
  const ranges = {
    weekly: { from: getWeekStartStr(new Date()), to: today },
    monthly: { from: `${today.slice(0, 8)}01`, to: today },
    termly: { from: formatDate(addDays(noon(today), -120)), to: today },
  };
  const href = (format: string, type: string, range?: { from: string; to: string }) =>
    `/api/admin/reports/export?${qs({
      format, type,
      from: range?.from ?? filters.from, to: range?.to ?? filters.to,
      classId: filters.classId, teacherId: filters.teacherId,
    })}`;

  const { overview, insights, problematic } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Reports &amp; analytics</h1>
        <p className="mt-1 text-slate-600">Attendance intelligence across the selected range.</p>
      </div>

      {/* filters */}
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <Field label="From"><input type="date" className="input" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} /></Field>
        <Field label="To"><input type="date" className="input" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} /></Field>
        <Field label="Class">
          <select className="input" value={filters.classId} onChange={(e) => setFilters({ ...filters, classId: e.target.value })}>
            <option value="">All classes</option>
            {options.classes.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
          </select>
        </Field>
        <Field label="Teacher">
          <select className="input" value={filters.teacherId} onChange={(e) => setFilters({ ...filters, teacherId: e.target.value })}>
            <option value="">All teachers</option>
            {options.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <button onClick={apply} disabled={loading} className="btn-primary">{loading ? "Loading…" : "Apply"}</button>
      </div>

      {/* overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Tile label="Attendance" value={`${overview.rate}%`} accent="navy" />
        <Tile label="Sessions" value={overview.total} />
        <Tile label="Present" value={overview.present} accent="emerald" />
        <Tile label="Absent" value={overview.absent} accent="rose" />
        <Tile label="Late" value={overview.late} accent="amber" />
        <Tile label="Students" value={overview.students} />
      </div>

      {/* class comparison */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Class performance</h2>
        <div className="card divide-y divide-slate-100">
          {insights.byClass.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No data for this range.</p>
          ) : (
            insights.byClass.map((c) => {
              const band = statusBand(c.rate);
              const color = band === "Good" ? "bg-emerald-500" : band === "Warning" ? "bg-amber-500" : "bg-rose-500";
              return (
                <div key={c.classCode} className="flex items-center gap-4 px-5 py-3">
                  <span className="w-32 shrink-0 truncate font-mono text-sm text-slate-700">{c.classCode}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${c.rate}%` }} />
                  </div>
                  <span className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums">{c.rate}%</span>
                  <span className="w-16 shrink-0 text-right text-xs text-slate-400">{c.total} sess.</span>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* problematic students */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Problematic students (3+ missed)</h2>
        <div className="card overflow-x-auto">
          {problematic.students.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No problematic students in this range. 🎉</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-2 font-medium">Student</th><th className="px-3 py-2 font-medium">Class</th>
                <th className="px-3 py-2 text-right font-medium">Overall %</th><th className="px-3 py-2 text-right font-medium">Missed</th>
                <th className="px-5 py-2 font-medium">Action</th>
              </tr></thead>
              <tbody>
                {problematic.students.slice(0, 25).map((s) => (
                  <tr key={s.admission} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-2"><div className="font-medium text-slate-800">{s.name}</div><div className="font-mono text-xs text-slate-400">{s.admission}</div></td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">{s.classCode}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{s.overallPercentage}%</td>
                    <td className="px-3 py-2 text-right tabular-nums text-rose-600">{s.missedCount}</td>
                    <td className="px-5 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.action.startsWith("URGENT") ? "bg-rose-100 text-rose-700" : s.action.startsWith("Warning") ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{s.action}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* exports */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Export reports</h2>

        {/* flagship leadership brief */}
        <div className="card mb-4 overflow-hidden">
          <div className="bg-gradient-to-r from-kplc-navy to-kplc-blue p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-kplc-yellow/90">For the Dean · HOA · HOD</p>
            <h3 className="mt-1 text-lg font-bold">Leadership brief</h3>
            <p className="mt-1 text-sm text-white/80">School-wide rate, class ranking (with charts), top/bottom units, students needing attention, top performers, 80% policy, chronic-absence watchlist, teacher compliance &amp; month trend — one document.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={href("zip", "all")} className="btn bg-kplc-yellow px-4 py-2 text-sm font-bold text-kplc-navy hover:brightness-95">⬇ Download everything (ZIP)</a>
              <a href={href("pdf", "leadership")} className="btn bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/25 hover:bg-white/25">📄 Brief (PDF + charts)</a>
              <a href={href("xlsx", "leadership")} className="btn bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/25 hover:bg-white/25">📊 Excel workbook</a>
              <a href={href("csv", "leadership")} className="btn bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/25 hover:bg-white/25">CSV</a>
            </div>
            <p className="mt-2 text-xs text-white/60">The ZIP bundles the brief, all Excel workbooks, register grid, policy, watchlist &amp; certificates — one dated pack.</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <p className="text-sm font-semibold text-slate-700">Period summaries</p>
            <p className="mb-3 text-xs text-slate-500">Grouped by class · per-student totals · class &amp; school totals.</p>
            <ExportRow label="Weekly" href={href} type="weekly" range={ranges.weekly} formats={["csv", "xlsx"]} />
            <ExportRow label="Monthly" href={href} type="monthly" range={ranges.monthly} formats={["csv", "xlsx"]} />
            <ExportRow label="Termly" href={href} type="termly" range={ranges.termly} formats={["csv", "xlsx"]} />
          </div>

          <div className="card p-5">
            <p className="text-sm font-semibold text-slate-700">Register &amp; certificates</p>
            <p className="mb-3 text-xs text-slate-500">The on-screen register + signable certificates.</p>
            <ExportRow label="Weekly register grid (P/A/L)" href={href} type="grid" range={ranges.weekly} formats={["csv", "xlsx"]} />
            <ExportRow label="Attendance certificates" href={href} type="certificates" formats={["pdf"]} />
          </div>

          <div className="card p-5">
            <p className="text-sm font-semibold text-slate-700">Compliance &amp; risk</p>
            <p className="mb-3 text-xs text-slate-500">Policy pass/fail &amp; chronic-absence detection.</p>
            <ExportRow label={`80% policy pass / fail`} href={href} type="policy" formats={["csv", "xlsx"]} />
            <ExportRow label="Chronic absentee watchlist" href={href} type="chronic" formats={["csv", "xlsx"]} />
            <ExportRow label="Problematic students (3+ missed)" href={href} type="problematic" formats={["csv", "pdf"]} />
          </div>

          <div className="card p-5">
            <p className="text-sm font-semibold text-slate-700">Detailed data</p>
            <p className="mb-3 text-xs text-slate-500">Uses the From/To range above.</p>
            <ExportRow label="Full data (student × unit)" href={href} type="full" formats={["csv", "xlsx"]} />
            <ExportRow label="Teacher performance (with units)" href={href} type="teachers" formats={["csv", "xlsx"]} />
            <ExportRow label="Class comparison" href={href} type="class" formats={["csv"]} />
          </div>
        </div>

        {/* PDFs */}
        <div className="card mt-4 p-5">
          <p className="mb-3 text-sm font-semibold text-slate-700">Other PDFs</p>
          <div className="flex flex-wrap gap-2">
            <a href={href("pdf", "hoa")} className="btn-primary px-3 py-1.5 text-sm">HOD overview</a>
            {filters.teacherId ? (
              <a href={href("pdf", "momentum")} className="btn-primary px-3 py-1.5 text-sm">Teacher momentum</a>
            ) : (
              <span className="btn-primary pointer-events-none px-3 py-1.5 text-sm opacity-40" title="Select a teacher first">Teacher momentum</span>
            )}
          </div>
          {!filters.teacherId && <p className="mt-2 text-xs text-slate-400">Select a teacher in the filters to enable the momentum PDF. Filter by class to scope certificates to one class.</p>}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>{children}</div>;
}

const FMT_STYLE: Record<string, string> = {
  csv: "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
  xlsx: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  pdf: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
};
function ExportRow({
  label, href, type, range, formats,
}: {
  label: string;
  href: (format: string, type: string, range?: { from: string; to: string }) => string;
  type: string; range?: { from: string; to: string }; formats: string[];
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 py-2 first:border-t-0">
      <span className="min-w-0 truncate text-sm text-slate-600">{label}</span>
      <span className="flex shrink-0 gap-1.5">
        {formats.map((f) => (
          <a key={f} href={href(f, type, range)} className={`rounded-lg border px-2.5 py-1 text-xs font-semibold uppercase transition-colors ${FMT_STYLE[f] ?? FMT_STYLE.csv}`}>{f}</a>
        ))}
      </span>
    </div>
  );
}
function Tile({ label, value, accent }: { label: string; value: string | number; accent?: "navy" | "emerald" | "rose" | "amber" }) {
  const c = accent ? { navy: "text-kplc-navy bg-kplc-navy/5", emerald: "text-emerald-700 bg-emerald-50", rose: "text-rose-700 bg-rose-50", amber: "text-amber-700 bg-amber-50" }[accent] : "text-slate-900 bg-white border border-slate-200";
  return <div className={`rounded-2xl px-4 py-3 ${c}`}><p className="font-display text-2xl font-bold">{value}</p><p className="text-xs font-medium opacity-80">{label}</p></div>;
}
