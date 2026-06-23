import { getSession } from "@/lib/auth/session";
import { getRecentHistory } from "@/lib/data/teacher";
import { formatDateDisplay } from "@/lib/dates";

export default async function HistoryPage() {
  const session = (await getSession())!;
  const rows = await getRecentHistory(session, 28);

  // group by date (rows already ordered newest-first)
  const byDate = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byDate.get(r.date) ?? [];
    list.push(r);
    byDate.set(r.date, list);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Attendance history</h1>
        <p className="mt-1 text-slate-600">Your submitted marking over the last 4 weeks.</p>
      </div>

      {byDate.size === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">No attendance submitted yet.</div>
      ) : (
        <div className="space-y-5">
          {[...byDate.entries()].map(([date, list]) => (
            <div key={date} className="card overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                <h2 className="font-semibold text-slate-800">{formatDateDisplay(date)}</h2>
              </div>
              <div>
                {list.map((r) => (
                  <div key={r.classId} className="flex items-center justify-between gap-4 px-5 py-3 border-t border-slate-100 first:border-t-0">
                    <p className="truncate font-medium text-slate-700">{r.className ?? "—"}</p>
                    <div className="flex items-center gap-3 text-sm tabular-nums">
                      <span className="text-emerald-600">{r.present} P</span>
                      <span className="text-rose-600">{r.absent} A</span>
                      <span className="text-amber-600">{r.late} L</span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">{r.total} total</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
