"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatDateDisplay } from "@/lib/dates";

interface Flag {
  id: string; issueType: string; description: string; status: string; resolved: boolean;
  createdAt: string; teacherName: string | null; className: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  open: "bg-amber-100 text-amber-700",
  acknowledged: "bg-kplc-navy/10 text-kplc-navy",
  resolved: "bg-emerald-100 text-emerald-700",
};

export function FlagsTriage({ initial }: { initial: Flag[] }) {
  const [list, setList] = useState(initial);
  const [tab, setTab] = useState<"open" | "all">("open");
  const [busy, setBusy] = useState<string | null>(null);
  const [newCount, setNewCount] = useState(0);
  const knownIds = useRef(new Set(initial.map((f) => f.id)));

  const shown = useMemo(() => (tab === "open" ? list.filter((f) => !f.resolved) : list), [list, tab]);

  // Real-time: poll for new/changed flags so teacher-raised issues appear
  // without a manual page refresh.
  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const r = await fetch("/api/admin/flags", { cache: "no-store" });
        const j = await r.json();
        if (!alive || !r.ok || !j.ok) return;
        const fresh = j.data as Flag[];
        const incoming = fresh.filter((f) => !knownIds.current.has(f.id));
        if (incoming.length) setNewCount((n) => n + incoming.length);
        fresh.forEach((f) => knownIds.current.add(f.id));
        setList(fresh);
      } catch { /* offline — keep showing current list */ }
    }
    const t = setInterval(poll, 8000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  async function setStatus(id: string, status: string) {
    setBusy(id);
    try {
      const r = await fetch("/api/admin/flags", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const j = await r.json();
      if (r.ok && j.ok) {
        setList((prev) => prev.map((f) => (f.id === id ? { ...f, status, resolved: status === "resolved" } : f)));
      }
    } finally { setBusy(null); }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold sm:text-3xl">Flags &amp; issues</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live
            </span>
            {newCount > 0 && (
              <button onClick={() => setNewCount(0)}
                className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-bold text-white">
                {newCount} new · dismiss
              </button>
            )}
          </div>
          <p className="mt-1 text-slate-600">{list.filter((f) => !f.resolved).length} open · {list.length} total</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {(["open", "all"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>{t}</button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="card p-12 text-center text-sm text-slate-500">{tab === "open" ? "No open issues. 🎉" : "No issues."}</div>
      ) : (
        <div className="space-y-3">
          {shown.map((f) => (
            <div key={f.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800">{f.issueType}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[f.status] ?? "bg-slate-100 text-slate-600"}`}>{f.status}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {f.teacherName ?? "—"}{f.className ? ` · ${f.className}` : ""} · {formatDateDisplay(f.createdAt)}
                  </p>
                  {f.description && <p className="mt-2 text-sm text-slate-600">{f.description}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  {f.status !== "acknowledged" && !f.resolved && (
                    <button disabled={busy === f.id} onClick={() => setStatus(f.id, "acknowledged")} className="btn-outline px-3 py-1.5 text-sm">Acknowledge</button>
                  )}
                  {!f.resolved ? (
                    <button disabled={busy === f.id} onClick={() => setStatus(f.id, "resolved")} className="btn-primary px-3 py-1.5 text-sm">Resolve</button>
                  ) : (
                    <button disabled={busy === f.id} onClick={() => setStatus(f.id, "open")} className="btn-ghost px-3 py-1.5 text-sm">Reopen</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
