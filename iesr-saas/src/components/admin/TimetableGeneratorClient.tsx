"use client";

import Link from "next/link";
import { useState } from "react";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { TimetableVersionView, type VersionView } from "@/components/admin/TimetableVersionView";

interface ClassOpt { id: string; code: string; name: string; }
interface GenResult extends VersionView { versionId: string; name: string; term: string; }

export function TimetableGeneratorClient({ classes }: { classes: ClassOpt[] }) {
  const confirm = useConfirm();
  const [picked, setPicked] = useState<Set<string>>(new Set(classes.map((c) => c.id)));
  const [term, setTerm] = useState("");
  const [maxPerDay, setMaxPerDay] = useState(4);
  const [teacherMax, setTeacherMax] = useState(4);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GenResult | null>(null);
  const [applied, setApplied] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allOn = picked.size === classes.length;

  async function generate() {
    if (picked.size === 0) { setMsg("Select at least one class."); return; }
    setBusy(true); setMsg(null); setApplied(false); setResult(null);
    try {
      const r = await fetch("/api/admin/timetable/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classIds: allOn ? undefined : [...picked], term, maxPerClassPerDay: maxPerDay, teacherMaxDaily: teacherMax }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "generate_failed");
      setResult(j.data as GenResult);
    } catch { setMsg("Generation failed. Please try again."); }
    finally { setBusy(false); }
  }

  async function apply() {
    if (!result) return;
    const ok = await confirm({
      tone: "danger", title: "Apply this timetable to the whole school", confirmText: "Apply timetable",
      message: <>This <b>replaces the entire school timetable</b> — {result.stats.sessions} sessions across {result.stats.classes} classes. Teacher registers and the landing page update immediately. You can roll back from History.</>,
    });
    if (!ok) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/admin/timetable/apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ versionId: result.versionId }) });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error();
      setApplied(true); setMsg(`Applied — ${j.data.applied} sessions are now live across the school.`);
    } catch { setMsg("Apply failed. Please try again."); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Timetable generator</h1>
          <p className="mt-1 text-slate-600">Auto-build a conflict-free school timetable from the current register &amp; teacher availability.</p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href="/admin/timetable/availability" className="btn-outline px-3 py-1.5">Availability</Link>
          <Link href="/admin/timetable/history" className="btn-outline px-3 py-1.5">History</Link>
          <Link href="/admin/timetable" className="btn-outline px-3 py-1.5">Manual editor</Link>
        </div>
      </div>

      {/* controls */}
      <div className="card space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Term / Semester"><input className="input" placeholder="e.g. Jan–Mar 2026" value={term} onChange={(e) => setTerm(e.target.value)} /></Field>
          <Field label="Max sessions / class / day"><input type="number" min={1} max={4} className="input" value={maxPerDay} onChange={(e) => setMaxPerDay(Number(e.target.value) || 4)} /></Field>
          <Field label="Teacher max / day"><input type="number" min={1} max={4} className="input" value={teacherMax} onChange={(e) => setTeacherMax(Number(e.target.value) || 4)} /></Field>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">Classes to include ({picked.size}/{classes.length})</p>
            <button onClick={() => setPicked(allOn ? new Set() : new Set(classes.map((c) => c.id)))} className="text-xs font-semibold text-kplc-blue">{allOn ? "Clear all" : "Select all"}</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {classes.map((c) => (
              <button key={c.id} onClick={() => toggle(c.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${picked.has(c.id) ? "border-kplc-navy bg-kplc-navy text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
                {c.code}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <button onClick={generate} disabled={busy} className="btn-primary">{busy && !result ? "Generating…" : "⚡ Generate timetable"}</button>
          <p className="text-xs text-slate-400">Adding a new class in the register automatically includes it here.</p>
        </div>
        {msg && <p className={`text-sm font-medium ${applied ? "text-emerald-700" : "text-slate-600"}`}>{msg}</p>}
      </div>

      {/* preview + apply */}
      {result && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="font-bold text-slate-900">Preview — {result.name}</p>
              <p className="text-sm text-slate-500">Nothing is live yet. Review the grids below, then apply.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={`/api/admin/timetable/export?versionId=${result.versionId}&format=xlsx`} className="btn-outline px-3 py-1.5 text-sm">Export Excel</a>
              <a href={`/api/admin/timetable/export?versionId=${result.versionId}&format=pdf`} className="btn-outline px-3 py-1.5 text-sm">Export PDF</a>
              <button onClick={apply} disabled={busy || applied} className={`btn px-4 py-2 text-sm font-bold text-white ${applied ? "bg-emerald-600" : "bg-kplc-navy hover:bg-kplc-blue"}`}>
                {applied ? "✓ Applied" : busy ? "Applying…" : "Apply this timetable"}
              </button>
            </div>
          </div>
          <TimetableVersionView v={result} />
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>{children}</div>;
}
