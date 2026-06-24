import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getStudentDetail, listNotes } from "@/lib/data/admin";
import { getAnalyticsRows } from "@/lib/data/reports";
import { computeOverview, computeSubjectStats, computeInsights, statusBand } from "@/lib/analytics";
import { TrendChart } from "@/components/admin/charts";
import { formatDateDisplay } from "@/lib/dates";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  present: "bg-emerald-100 text-emerald-700",
  late: "bg-amber-100 text-amber-700",
  absent: "bg-rose-100 text-rose-700",
  unmarked: "bg-slate-100 text-slate-500",
};

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = (await getSession())!;
  const student = await getStudentDetail(session, id);
  if (!student) notFound();

  const rows = await getAnalyticsRows(session, { studentId: id });
  const overview = computeOverview(rows);
  const band = statusBand(overview.rate);
  const subjects = computeSubjectStats(rows).map((s) => ({ ...s, missed: s.total - s.attended }));
  const mostAttended = subjects.slice().sort((a, b) => b.rate - a.rate || b.attended - a.attended).slice(0, 5);
  const mostMissed = subjects.filter((s) => s.missed > 0).sort((a, b) => b.missed - a.missed).slice(0, 5);
  const trend = computeInsights(rows).weeklyTrend.map((w) => ({ label: dm(w.week), value: w.rate }));
  const history = rows.slice().reverse().slice(0, 120); // most recent first
  const notes = await listNotes(session, { studentId: id, limit: 50 });

  const bandColor = band === "Good" ? "text-emerald-600" : band === "Warning" ? "text-amber-600" : "text-rose-600";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/students" className="text-sm text-slate-400 hover:text-kplc-blue">← All students</Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{student.fullName}</h1>
            <p className="mt-1 font-mono text-sm text-slate-500">
              {student.admissionNo} · {student.className ?? "No class"}
              {!student.active && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">inactive</span>}
            </p>
          </div>
          <div className={`rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center shadow-soft`}>
            <p className={`font-display text-3xl font-bold ${bandColor}`}>{overview.rate}%</p>
            <p className="text-xs font-medium text-slate-400">overall attendance · {band}</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Sessions" value={overview.total} />
        <Tile label="Present" value={overview.present} tone="emerald" />
        <Tile label="Absent" value={overview.absent} tone="rose" />
        <Tile label="Late" value={overview.late} tone="amber" />
      </div>

      {/* Trend */}
      <div className="card p-5">
        <h2 className="mb-2 font-semibold">Attendance trend (weekly)</h2>
        <TrendChart data={trend} />
      </div>

      {/* Subjects most/least attended */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SubjectCard title="Subjects attended most" rows={mostAttended} kind="good" />
        <SubjectCard title="Subjects missed most" rows={mostMissed} kind="bad" />
      </div>

      {/* Notes & observations */}
      {notes.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Notes &amp; observations ({notes.length})</h2>
          <div className="space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="card p-3">
                <p className="text-xs text-slate-400">{n.subject ? `${n.subject} · ` : ""}{n.teacherName ?? "—"} · {formatDateDisplay(n.date)}</p>
                {n.notes?.trim() && <p className="mt-1 text-sm text-slate-700">{n.notes}</p>}
                {Array.isArray(n.tags) && (n.tags as string[]).length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(n.tags as string[]).map((t) => <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600">{t}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Full history */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Full attendance history</h2>
        <div className="card overflow-x-auto">
          {history.length === 0 ? <p className="p-6 text-sm text-slate-500">No attendance recorded yet.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-2 font-medium">Date</th><th className="px-3 py-2 font-medium">Subject</th>
                <th className="px-3 py-2 font-medium">Lecturer</th><th className="px-5 py-2 font-medium">Status</th>
              </tr></thead>
              <tbody>
                {history.map((r, i) => (
                  <tr key={`${r.date}-${r.subject}-${i}`} className="border-b border-slate-50 last:border-0">
                    <td className="whitespace-nowrap px-5 py-2 text-slate-700">{formatDateDisplay(r.date)}</td>
                    <td className="px-3 py-2 text-slate-600">{r.subject || "—"}</td>
                    <td className="px-3 py-2 text-slate-500">{r.teacher || "—"}</td>
                    <td className="px-5 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[r.status]}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {rows.length > 120 && <p className="mt-2 text-xs text-slate-400">Showing the 120 most recent of {rows.length} records.</p>}
      </section>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone?: "emerald" | "rose" | "amber" }) {
  const c = tone === "emerald" ? "text-emerald-700 bg-emerald-50" : tone === "rose" ? "text-rose-700 bg-rose-50" : tone === "amber" ? "text-amber-700 bg-amber-50" : "text-kplc-navy bg-white border border-slate-200";
  return <div className={`rounded-2xl px-4 py-3 ${c}`}><p className="font-display text-2xl font-bold">{value}</p><p className="text-xs font-medium opacity-80">{label}</p></div>;
}
function SubjectCard({ title, rows, kind }: { title: string; rows: { subject: string; rate: number; attended: number; total: number; missed: number }[]; kind: "good" | "bad" }) {
  return (
    <div className="card p-5">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {rows.length === 0 ? <p className="py-4 text-sm text-slate-400">No data.</p> : (
        <ol className="space-y-2">
          {rows.map((r) => (
            <li key={r.subject} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{r.subject}</p>
                <p className="text-xs text-slate-400">{kind === "bad" ? `${r.missed} missed of ${r.total}` : `${r.attended} of ${r.total} attended`}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${r.rate >= 80 ? "bg-emerald-100 text-emerald-700" : r.rate >= 60 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>{r.rate}%</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
function dm(dateStr: string) { const [, m, d] = dateStr.split("-"); return `${d}/${m}`; }
