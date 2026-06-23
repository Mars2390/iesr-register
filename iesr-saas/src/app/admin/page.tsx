import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getOverviewStats, listActivity, listFlags } from "@/lib/data/admin";
import { actionLabel } from "@/lib/labels";

export default async function AdminOverview() {
  const session = (await getSession())!;
  const [stats, activity, flags] = await Promise.all([
    getOverviewStats(session),
    listActivity(session, 8),
    listFlags(session),
  ]);
  const openFlags = flags.filter((f) => !f.resolved).slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Overview</h1>
          <p className="mt-1 text-slate-600">Live snapshot of attendance across the school.</p>
        </div>
        <Link
          href="/admin/monitor"
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${
            stats.activeNow > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${stats.activeNow > 0 ? "animate-pulse bg-emerald-500" : "bg-slate-400"}`} />
          {stats.activeNow > 0 ? `${stats.activeNow} marking now` : "No one marking"}
        </Link>
      </div>

      {/* stat grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Students" value={stats.students} href="/admin/students" />
        <Stat label="Classes" value={stats.classes} href="/admin/classes" />
        <Stat label="Teachers" value={stats.teachers} href="/admin/teachers" />
        <Stat label="Open flags" value={stats.openFlags} href="/admin/flags" accent={stats.openFlags > 0 ? "amber" : undefined} />
      </div>

      {/* today */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Today&apos;s attendance</h2>
          <span className="text-sm text-slate-500">{stats.today.marked} records</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Mini color="emerald" label="Present" n={stats.today.present} />
          <Mini color="rose" label="Absent" n={stats.today.absent} />
          <Mini color="amber" label="Late" n={stats.today.late} />
        </div>
      </div>

      {/* two columns */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Recent activity</h2>
            <Link href="/admin/activity" className="text-sm font-medium text-kplc-blue hover:text-kplc-navy">View all</Link>
          </div>
          <div className="card divide-y divide-slate-100">
            {activity.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">No activity yet.</p>
            ) : (
              activity.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <p className="min-w-0 truncate text-sm text-slate-700">
                    <span className="font-medium">{a.teacherName ?? a.adminName ?? "Someone"}</span>{" "}
                    <span className="text-slate-500">{actionLabel(a.action)}</span>
                    {a.className ? <span className="text-slate-400"> · {a.className}</span> : null}
                  </p>
                  <time className="shrink-0 text-xs text-slate-400">
                    {new Date(a.createdAt as unknown as string).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </time>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Open flags</h2>
            <Link href="/admin/flags" className="text-sm font-medium text-kplc-blue hover:text-kplc-navy">Triage</Link>
          </div>
          <div className="card divide-y divide-slate-100">
            {openFlags.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">No open issues. 🎉</p>
            ) : (
              openFlags.map((f) => (
                <div key={f.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-800">{f.issueType}</p>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold capitalize text-amber-700">{f.status}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{f.teacherName ?? "—"}{f.className ? ` · ${f.className}` : ""}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, href, accent }: { label: string; value: number; href: string; accent?: "amber" }) {
  return (
    <Link href={href} className="card p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 font-display text-3xl font-bold ${accent === "amber" ? "text-amber-600" : "text-kplc-navy"}`}>{value}</p>
    </Link>
  );
}

function Mini({ color, label, n }: { color: "emerald" | "rose" | "amber"; label: string; n: number }) {
  const bg = { emerald: "bg-emerald-50 text-emerald-700", rose: "bg-rose-50 text-rose-700", amber: "bg-amber-50 text-amber-700" }[color];
  return (
    <div className={`rounded-xl px-4 py-3 ${bg}`}>
      <p className="font-display text-2xl font-bold">{n}</p>
      <p className="text-xs font-medium">{label}</p>
    </div>
  );
}
