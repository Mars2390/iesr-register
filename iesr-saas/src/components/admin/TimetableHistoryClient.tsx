"use client";

import Link from "next/link";
import { useState } from "react";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { TimetableVersionView, type VersionView } from "@/components/admin/TimetableVersionView";

interface VersionRow { id: string; name: string; term: string; sessionCount: number; applied: boolean; createdAt: string; }

export function TimetableHistoryClient({ initial }: { initial: VersionRow[] }) {
  const confirm = useConfirm();
  const [rows, setRows] = useState(initial);
  const [preview, setPreview] = useState<(VersionView & { name: string }) | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

  async function openPreview(id: string) {
    setBusy(id);
    try {
      const r = await fetch(`/api/admin/timetable/versions?id=${id}`);
      const j = await r.json();
      if (j.ok) setPreview({ ...(j.data.data as VersionView), name: j.data.name });
    } finally { setBusy(null); }
  }

  async function restore(row: VersionRow) {
    const ok = await confirm({ tone: "danger", title: "Restore this timetable", confirmText: "Restore & apply", message: <>Roll the <b>entire school timetable</b> back to <b>{row.name}</b> ({row.sessionCount} sessions)? This replaces the current live schedule.</> });
    if (!ok) return;
    setBusy(row.id); setMsg(null);
    try {
      const r = await fetch("/api/admin/timetable/restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ versionId: row.id }) });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error();
      setRows((prev) => prev.map((x) => ({ ...x, applied: x.id === row.id })));
      setMsg(`Restored “${row.name}” — ${j.data.applied} sessions are now live.`);
    } catch { setMsg("Restore failed."); }
    finally { setBusy(null); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Timetable history</h1>
          <p className="mt-1 text-slate-600">Every generated timetable is saved here (last 20). Preview, restore, or export any version.</p>
        </div>
        <Link href="/admin/timetable/generator" className="btn-primary">⚡ Generate new</Link>
      </div>

      {msg && <p className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">{msg}</p>}

      {rows.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">No timetables generated yet. <Link href="/admin/timetable/generator" className="font-semibold text-kplc-blue">Generate your first</Link>.</div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {rows.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-slate-800">{row.name}</p>
                  {row.applied && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Live</span>}
                </div>
                <p className="text-xs text-slate-500">{row.sessionCount} sessions{row.term ? ` · ${row.term}` : ""} · {fmt(row.createdAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => openPreview(row.id)} disabled={busy === row.id} className="btn-outline px-3 py-1.5 text-sm">{busy === row.id ? "…" : "Preview"}</button>
                <a href={`/api/admin/timetable/export?versionId=${row.id}&format=xlsx`} className="btn-outline px-3 py-1.5 text-sm">Excel</a>
                <a href={`/api/admin/timetable/export?versionId=${row.id}&format=pdf`} className="btn-outline px-3 py-1.5 text-sm">PDF</a>
                <button onClick={() => restore(row)} disabled={busy === row.id || row.applied} className="btn px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40 bg-kplc-navy hover:bg-kplc-blue">Restore</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* preview overlay */}
      {preview && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setPreview(null)}>
          <div className="my-8 w-full max-w-5xl rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-kplc-navy">{preview.name}</h2>
              <button onClick={() => setPreview(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none"><path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></button>
            </div>
            <TimetableVersionView v={preview} />
          </div>
        </div>
      )}
    </div>
  );
}
