import { getSession } from "@/lib/auth/session";
import { listActivity } from "@/lib/data/admin";
import { actionLabel } from "@/lib/labels";

export default async function ActivityPage() {
  const session = (await getSession())!;
  const rows = await listActivity(session, 150);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Activity log</h1>
        <p className="mt-1 text-slate-600">Recent teacher and admin actions across the school.</p>
      </div>

      {rows.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">No activity recorded yet.</div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {rows.map((a) => {
            const who = a.teacherName ?? a.adminName ?? "Someone";
            const meta = (a.meta ?? {}) as Record<string, unknown>;
            return (
              <div key={a.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-700">
                    <span className="font-medium">{who}</span> <span className="text-slate-500">{actionLabel(a.action)}</span>
                    {a.className ? <span className="text-slate-400"> · {a.className}</span> : null}
                    {typeof meta.count === "number" ? <span className="text-slate-400"> · {meta.count} records</span> : null}
                  </p>
                </div>
                <time className="shrink-0 text-xs text-slate-400">
                  {new Date(a.createdAt as unknown as string).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </time>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
