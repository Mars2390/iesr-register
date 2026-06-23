import { getSession } from "@/lib/auth/session";
import { getAssignedClasses, getTeacherFlags } from "@/lib/data/teacher";
import { FlagForm } from "@/components/teacher/FlagForm";
import { formatDateDisplay } from "@/lib/dates";

const STATUS_STYLE: Record<string, string> = {
  open: "bg-amber-100 text-amber-700",
  acknowledged: "bg-kplc-navy/10 text-kplc-navy",
  resolved: "bg-emerald-100 text-emerald-700",
};

export default async function FlagsPage() {
  const session = (await getSession())!;
  const [classes, flags] = await Promise.all([getAssignedClasses(session), getTeacherFlags(session)]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Flags & issues</h1>
        <p className="mt-1 text-slate-600">Raise issues for your administrator and track their status.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        <FlagForm classes={classes.map((c) => ({ id: c.id, displayName: c.displayName }))} />

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Your issues</h2>
          {flags.length === 0 ? (
            <div className="card p-10 text-center text-sm text-slate-500">You haven&apos;t raised any issues.</div>
          ) : (
            <div className="space-y-3">
              {flags.map((f) => (
                <div key={f.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800">{f.issueType}</p>
                      <p className="text-xs text-slate-400">
                        {f.className ? `${f.className} · ` : ""}{formatDateDisplay(f.createdAt as unknown as string)}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[f.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {f.status}
                    </span>
                  </div>
                  {f.description && <p className="mt-2 text-sm text-slate-600">{f.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
