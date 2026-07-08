"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DEFAULT_DAYS, DEFAULT_SLOTS } from "@/lib/timetable/generate";
import type { AvailabilityData } from "@/lib/data/timetableGen";

const DAY_LABEL: Record<string, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri" };
const hhmm = (t: string) => t.slice(0, 5);
const keyOf = (day: string, slot: number) => `${day}#${slot}`;

export function AvailabilityClient({ initial }: { initial: AvailabilityData }) {
  const [teacherId, setTeacherId] = useState(initial.teachers[0]?.id ?? "");
  const [overrides, setOverrides] = useState<Record<string, Set<string>>>(() => {
    const m: Record<string, Set<string>> = {};
    for (const [tid, slots] of Object.entries(initial.unavailable)) m[tid] = new Set(slots.map((s) => keyOf(s.day, s.slotIndex)));
    return m;
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const current = overrides[teacherId] ?? new Set<string>();
  const teacherName = initial.teachers.find((t) => t.id === teacherId)?.name ?? "";

  const withOverrides = useMemo(() => new Set(Object.entries(overrides).filter(([, s]) => s.size > 0).map(([id]) => id)), [overrides]);

  const toggle = (day: string, slot: number) => {
    setOverrides((prev) => {
      const set = new Set(prev[teacherId] ?? []);
      const k = keyOf(day, slot);
      if (set.has(k)) set.delete(k); else set.add(k);
      return { ...prev, [teacherId]: set };
    });
    setMsg(null);
  };

  async function save() {
    setBusy(true); setMsg(null);
    try {
      const unavailable = [...(overrides[teacherId] ?? [])].map((k) => { const [day, slot] = k.split("#"); return { day, slotIndex: Number(slot) }; });
      const r = await fetch("/api/admin/availability", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teacherId, unavailable }) });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error();
      setMsg(`Saved ${teacherName}'s availability.`);
    } catch { setMsg("Couldn't save. Try again."); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Teacher availability</h1>
          <p className="mt-1 text-slate-600">Mark the slots each teacher is <b>unavailable</b>. The generator respects these — no teacher is ever scheduled when they can&apos;t teach.</p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href="/admin/timetable/generator" className="btn-outline px-3 py-1.5">Generator</Link>
          <Link href="/admin/timetable/history" className="btn-outline px-3 py-1.5">History</Link>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-slate-600">Teacher</label>
          <select className="input max-w-xs" value={teacherId} onChange={(e) => { setTeacherId(e.target.value); setMsg(null); }}>
            {initial.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}{withOverrides.has(t.id) ? " •" : ""}</option>)}
          </select>
          <span className="text-xs text-slate-400">Teachers with a “•” have unavailable slots set.</span>
        </div>

        {/* grid */}
        <div className="mt-5 overflow-x-auto">
          <div className="grid min-w-[560px] gap-2" style={{ gridTemplateColumns: "6rem repeat(4, 1fr)" }}>
            <div />
            {DEFAULT_SLOTS.map((s, i) => <div key={i} className="rounded-lg bg-slate-100 py-2 text-center text-[11px] font-bold text-slate-500">{hhmm(s.start)}–{hhmm(s.end)}</div>)}
            {DEFAULT_DAYS.map((day) => (
              <RowFragment key={day} label={DAY_LABEL[day]}>
                {DEFAULT_SLOTS.map((_, si) => {
                  const unavail = current.has(keyOf(day, si));
                  return (
                    <button key={si} onClick={() => toggle(day, si)}
                      className={`h-14 rounded-lg border text-xs font-bold transition ${unavail ? "border-rose-300 bg-rose-100 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}>
                      {unavail ? "Unavailable" : "Available"}
                    </button>
                  );
                })}
              </RowFragment>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <button onClick={save} disabled={busy} className="btn-primary">{busy ? "Saving…" : "Save availability"}</button>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><span className="h-3 w-3 rounded bg-emerald-100 ring-1 ring-emerald-300" /> Available</span>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><span className="h-3 w-3 rounded bg-rose-100 ring-1 ring-rose-300" /> Unavailable</span>
          {msg && <span className="text-sm font-medium text-emerald-700">{msg}</span>}
        </div>
      </div>
    </div>
  );
}

function RowFragment({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <div className="flex items-center justify-center rounded-lg bg-kplc-navy/5 text-sm font-bold text-kplc-navy">{label}</div>
      {children}
    </>
  );
}
