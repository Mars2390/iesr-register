import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getTeacherDetail } from "@/lib/data/admin";
import { getAnalyticsRows } from "@/lib/data/reports";
import { computeTeacherConsistency, computeInsights } from "@/lib/analytics";
import { TrendChart } from "@/components/admin/charts";
import { formatDateDisplay } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function TeacherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = (await getSession())!;
  const teacher = await getTeacherDetail(session, id);
  if (!teacher) notFound();

  const rows = await getAnalyticsRows(session, { teacherId: id });
  const consistency = computeTeacherConsistency(rows)[0] ?? null;
  const trend = computeInsights(rows).weeklyTrend.map((w) => ({ label: dm(w.week), value: w.rate }));

  // Marking log — one row per (date, class, subject) with marked/present counts.
  const sessionMap = new Map<string, { date: string; classCode: string; subject: string; marked: number; present: number }>();
  for (const r of rows) {
    const key = `${r.date}|${r.classCode}|${r.subject}`;
    const s = sessionMap.get(key) ?? { date: r.date, classCode: r.classCode, subject: r.subject || "—", marked: 0, present: 0 };
    s.marked++; if (r.status === "present" || r.status === "late") s.present++;
    sessionMap.set(key, s);
  }
  const log = [...sessionMap.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 80);
  const distinctDays = new Set(rows.map((r) => r.date)).size;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/teachers" className="text-sm text-slate-400 hover:text-kplc-blue">← All teachers</Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{teacher.name}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {teacher.classes.length ? teacher.classes.map((c) => c.displayName).join(", ") : "No classes assigned"}
              {!teacher.active && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">inactive</span>}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center shadow-soft">
            <p className="font-display text-3xl font-bold text-kplc-navy">{consistency?.sessions ?? 0}</p>
            <p className="text-xs font-medium text-slate-400">sessions marked</p>
          </div>
        </div>
      </div>

      {/* compliance KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Total marks" value={consistency?.marks ?? 0} />
        <Tile label="Days active" value={distinctDays} />
        <Tile label="Present recorded" value={`${consistency?.rate ?? 0}%`} tone="emerald" />
        <Tile label="Last marked" value={consistency?.lastMarked ? formatDateDisplay(consistency.lastMarked) : "—"} small />
      </div>

      {/* trend */}
      <div className="card p-5">
        <h2 className="mb-2 font-semibold">Recorded attendance trend (weekly)</h2>
        <TrendChart data={trend} />
      </div>

      {/* marking log */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Marking history</h2>
        <div className="card overflow-x-auto">
          {log.length === 0 ? <p className="p-6 text-sm text-slate-500">This teacher hasn&apos;t marked any sessions yet.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-2 font-medium">Date</th><th className="px-3 py-2 font-medium">Class</th>
                <th className="px-3 py-2 font-medium">Subject</th><th className="px-3 py-2 text-right font-medium">Marked</th>
                <th className="px-5 py-2 text-right font-medium">Present</th>
              </tr></thead>
              <tbody>
                {log.map((s, i) => (
                  <tr key={`${s.date}-${s.classCode}-${s.subject}-${i}`} className="border-b border-slate-50 last:border-0">
                    <td className="whitespace-nowrap px-5 py-2 text-slate-700">{formatDateDisplay(s.date)}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">{s.classCode}</td>
                    <td className="px-3 py-2 text-slate-600">{s.subject}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-700">{s.marked}</td>
                    <td className="px-5 py-2 text-right tabular-nums font-semibold text-emerald-600">{Math.round((s.present / s.marked) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function Tile({ label, value, tone, small }: { label: string; value: string | number; tone?: "emerald"; small?: boolean }) {
  const c = tone === "emerald" ? "text-emerald-700 bg-emerald-50" : "text-kplc-navy bg-white border border-slate-200";
  return <div className={`rounded-2xl px-4 py-3 ${c}`}><p className={`font-display font-bold ${small ? "text-lg" : "text-2xl"}`}>{value}</p><p className="text-xs font-medium opacity-80">{label}</p></div>;
}
function dm(dateStr: string) { const [, m, d] = dateStr.split("-"); return `${d}/${m}`; }
