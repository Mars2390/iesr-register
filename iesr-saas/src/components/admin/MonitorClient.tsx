"use client";

import { useEffect, useState } from "react";

interface Marker {
  teacherName: string | null;
  className: string | null;
  classCode: string | null;
  subject: string | null;
  startedAt: string;
  lastSeenAt: string;
}
interface Data {
  active: Marker[];
  today: { present: number; absent: number; late: number; marked: number };
  generatedAt: string;
}

function secondsAgo(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
}

export function MonitorClient({ initial }: { initial: Data }) {
  const [data, setData] = useState<Data>(initial);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/admin/monitor", { cache: "no-store" });
        const j = await r.json();
        if (alive && j.ok) { setData(j.data); setStale(false); }
      } catch {
        if (alive) setStale(true);
      }
    };
    const t = setInterval(load, 5000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Live monitor</h1>
          <p className="mt-1 text-slate-600">Who&apos;s marking attendance right now — refreshes every 5 seconds.</p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${stale ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"}`}>
          <span className={`h-2 w-2 rounded-full ${stale ? "bg-slate-400" : "animate-pulse bg-emerald-500"}`} />
          {stale ? "Reconnecting…" : "Live"}
        </span>
      </div>

      {/* today's totals */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Tile label="Marking now" n={data.active.length} accent="brand" />
        <Tile label="Present today" n={data.today.present} accent="emerald" />
        <Tile label="Absent today" n={data.today.absent} accent="rose" />
        <Tile label="Late today" n={data.today.late} accent="amber" />
      </div>

      {/* active markers */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Active registers</h2>
        {data.active.length === 0 ? (
          <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
            <span className="mb-3 h-3 w-3 rounded-full bg-slate-300" />
            <p className="font-medium text-slate-600">No one is marking right now</p>
            <p className="mt-1 text-sm text-slate-400">Active registers will appear here as teachers open them.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.active.map((m, i) => (
              <div key={i} className="card p-5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Marking now
                  </span>
                  <span className="text-xs text-slate-400">{secondsAgo(m.lastSeenAt)}s ago</span>
                </div>
                <p className="mt-3 text-lg font-semibold text-slate-900">{m.teacherName ?? "Unknown"}</p>
                <p className="text-sm text-slate-600">{m.className ?? m.classCode ?? "—"}</p>
                {m.subject && <p className="mt-1 text-sm text-brand-600">{m.subject}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Tile({ label, n, accent }: { label: string; n: number; accent: "brand" | "emerald" | "rose" | "amber" }) {
  const c = {
    brand: "text-brand-700 bg-brand-50",
    emerald: "text-emerald-700 bg-emerald-50",
    rose: "text-rose-700 bg-rose-50",
    amber: "text-amber-700 bg-amber-50",
  }[accent];
  return (
    <div className={`rounded-2xl px-5 py-4 ${c}`}>
      <p className="font-display text-3xl font-bold">{n}</p>
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
