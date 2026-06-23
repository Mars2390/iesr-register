"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";

interface StudentRow { id: string; admissionNo: string; fullName: string; classId: string | null; className: string | null; active: boolean; }
interface ClassOpt { id: string; displayName: string; }

export function StudentsManager({ initial, classes }: { initial: StudentRow[]; classes: ClassOpt[] }) {
  const [list, setList] = useState(initial);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [form, setForm] = useState({ admissionNo: "", fullName: "", classId: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return list;
    return list.filter((s) => s.fullName.toLowerCase().includes(t) || s.admissionNo.toLowerCase().includes(t));
  }, [list, q]);

  async function reload() {
    const r = await fetch("/api/admin/students");
    const j = await r.json();
    if (j.ok) setList(j.data);
  }
  function openNew() { setEditing(null); setForm({ admissionNo: "", fullName: "", classId: classes[0]?.id ?? "" }); setErr(null); setOpen(true); }
  function openEdit(s: StudentRow) { setEditing(s); setForm({ admissionNo: s.admissionNo, fullName: s.fullName, classId: s.classId ?? "" }); setErr(null); setOpen(true); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr(null);
    try {
      const payload = { ...form, classId: form.classId || null };
      const r = await fetch("/api/admin/students", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error();
      setOpen(false); await reload();
    } catch { setErr("Couldn't save — the admission number may already exist."); }
    finally { setSaving(false); }
  }

  async function toggle(s: StudentRow) {
    if (s.active && !confirm(`Deactivate ${s.fullName}? Attendance history is kept.`)) return;
    if (s.active) await fetch(`/api/admin/students?id=${s.id}`, { method: "DELETE" });
    else await fetch("/api/admin/students", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, active: true }) });
    await reload();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Students</h1>
          <p className="mt-1 text-slate-600">{list.length} students</p>
        </div>
        <div className="flex gap-2">
          <input className="input w-44" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button onClick={openNew} className="btn-primary whitespace-nowrap">+ Add</button>
        </div>
      </div>

      <div className="card divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No students found.</p>
        ) : (
          filtered.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-slate-800">{s.fullName}</p>
                  {!s.active && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">inactive</span>}
                </div>
                <p className="font-mono text-xs text-slate-400">{s.admissionNo}{s.className ? ` · ${s.className}` : " · no class"}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(s)} className="btn-outline px-3 py-1.5 text-sm">Edit</button>
                <button onClick={() => toggle(s)} className="btn-ghost px-3 py-1.5 text-sm">{s.active ? "Remove" : "Restore"}</button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit student" : "New student"}>
        <form onSubmit={save} className="space-y-4">
          <div><label className="mb-1 block text-sm font-medium text-slate-700">Admission no.</label>
            <input className="input" value={form.admissionNo} onChange={(e) => setForm({ ...form, admissionNo: e.target.value })} required /></div>
          <div><label className="mb-1 block text-sm font-medium text-slate-700">Full name</label>
            <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></div>
          <div><label className="mb-1 block text-sm font-medium text-slate-700">Class</label>
            <select className="input" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
              <option value="">— No class —</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
            </select></div>
          {err && <p className="text-sm font-medium text-rose-600">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
