"use client";

import { useEffect, useState } from "react";
import type { PublicStats } from "@/lib/data/public";

/** Real, live-refreshing headline stats (polls every 5s — matching the claim). */
export function LiveStats({ initial }: { initial: PublicStats }) {
  const [stats, setStats] = useState<PublicStats>(initial);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch("/api/public/stats", { cache: "no-store" });
        const j = await r.json();
        if (alive && j.ok) { setStats(j.data as PublicStats); setPulse(true); setTimeout(() => alive && setPulse(false), 600); }
      } catch { /* offline — keep last values */ }
    };
    const t = setInterval(poll, 5000); // 5s live refresh
    return () => { alive = false; clearInterval(t); };
  }, []);

  const tiles = [
    { value: stats.students.toLocaleString(), label: "Students enrolled" },
    { value: stats.classes.toLocaleString(), label: "Active classes" },
    { value: `${stats.rate}%`, label: "Today's attendance" },
    { value: stats.todayMarked.toLocaleString(), label: "Marked today" },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-8 text-center text-white lg:grid-cols-4">
        {tiles.map((s) => (
          <div key={s.label}>
            <p className={`font-display text-5xl font-bold text-kplc-yellow transition sm:text-6xl ${pulse ? "scale-105" : ""}`}>{s.value}</p>
            <p className="mt-2 text-sm font-medium uppercase tracking-wide text-white/70">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium uppercase tracking-wide text-white/60">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 animate-pulse rounded-full bg-kplc-green" /> Live · refreshes every 5s</span>
        <span>100% Cloud-backed (Neon Postgres)</span>
        <span>24/7 Always available</span>
      </div>
    </div>
  );
}
