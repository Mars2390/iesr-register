"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useConfirm } from "@/components/ui/ConfirmDialog";

interface ClassRow { id: string; code: string; displayName: string; category: string; active: boolean; studentCount: number; }

export function ClassesManager({ initial }: { initial: ClassRow[] }) {
  const [list, setList] = useState(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClassRow | null>(null);
  const [form, setForm] = useState({ code: "", displayName: "", category: "Craft" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const confirm = useConfirm();

  async function reload() {
    const r = await fetch("/api/admin/classes");
    const j = await r.json();
    if (j.ok) setList(j.data);
  }
  function openNew() { setEditing(null); setForm({ code: "", displayName: "", category: "Craft" }); setErr(null); setOpen(true); }
  function openEdit(c: ClassRow) { setEditing(c); setForm({ code: c.code, displayName: c.displayName, category: c.category }); setErr(null); setOpen(true); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr(null);
    try {
      const r = await fetch("/api/admin/classes", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: editing.id, ...form } : form),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error();
      setOpen(false); await reload();
    } catch { setErr("Couldn't save — the class code may already exist."); }
    finally { setSaving(false); }
  }

  async function toggle(c: ClassRow) {
    if (c.active && !(await confirm({ tone: "danger", title: "Deactivate class", message: <>Deactivate <b>{c.displayName}</b>? Students and history are kept — you can reactivate it anytime.</>, confirmText: "Deactivate" }))) return;
    if (c.active) await fetch(`/api/admin/classes?id=${c.id}`, { method: "DELETE" });
    else await fetch("/api/admin/classes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, active: true }) });
    await reload();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Classes</h1>
          <p className="mt-1 text-slate-600">{list.length} classes</p>
        </div>
        <button onClick={openNew} className="btn-primary">+ Add class</button>
      </div>

      <div className="card divide-y divide-slate-100">
        {list.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No classes yet.</p>
        ) : (
          list.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-800">{c.displayName}</p>
                  {!c.active && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">inactive</span>}
                </div>
                <p className="font-mono text-xs text-slate-400">{c.code} · {c.category} · {c.studentCount} students</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(c)} className="btn-outline px-3 py-1.5 text-sm">Edit</button>
                <button onClick={() => toggle(c)} className="btn-ghost px-3 py-1.5 text-sm">{c.active ? "Deactivate" : "Reactivate"}</button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit class" : "New class"}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Class code"><input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. CEEMAY2025R" required /></Field>
          <Field label="Display name"><input className="input" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="e.g. Craft Electrical" required /></Field>
          <Field label="Category">
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {["Craft", "Diploma", "Certificate", "Other"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}
