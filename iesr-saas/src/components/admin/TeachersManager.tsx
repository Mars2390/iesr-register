"use client";

import Link from "next/link";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useConfirm } from "@/components/ui/ConfirmDialog";

interface TeacherRow { id: string; name: string; classIds: string[]; active: boolean; }
interface ClassOpt { id: string; displayName: string; }

export function TeachersManager({ initial, classes }: { initial: TeacherRow[]; classes: ClassOpt[] }) {
  const [list, setList] = useState(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherRow | null>(null);
  const [form, setForm] = useState<{ name: string; pin: string; classIds: string[] }>({ name: "", pin: "", classIds: [] });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const confirm = useConfirm();

  const classNames = (ids: string[]) =>
    ids.map((id) => classes.find((c) => c.id === id)?.displayName).filter(Boolean) as string[];

  async function reload() {
    const r = await fetch("/api/admin/teachers");
    const j = await r.json();
    if (j.ok) setList(j.data);
  }
  function openNew() { setEditing(null); setForm({ name: "", pin: "", classIds: [] }); setErr(null); setOpen(true); }
  function openEdit(t: TeacherRow) { setEditing(t); setForm({ name: t.name, pin: "", classIds: t.classIds ?? [] }); setErr(null); setOpen(true); }
  function toggleClass(id: string) {
    setForm((f) => ({ ...f, classIds: f.classIds.includes(id) ? f.classIds.filter((x) => x !== id) : [...f.classIds, id] }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr(null);
    if (!editing && form.pin.trim().length < 3) { setErr("A PIN of at least 3 digits is required."); setSaving(false); return; }
    try {
      const body: Record<string, unknown> = { name: form.name, classIds: form.classIds };
      if (form.pin.trim()) body.pin = form.pin.trim();
      const r = await fetch("/api/admin/teachers", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: editing.id, ...body } : body),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error();
      setOpen(false); await reload();
    } catch { setErr("Couldn't save. Please try again."); }
    finally { setSaving(false); }
  }

  async function toggle(t: TeacherRow) {
    if (t.active && !(await confirm({ tone: "danger", title: "Deactivate teacher", message: <>Deactivate <b>{t.name}</b>? They won&apos;t be able to sign in until reactivated.</>, confirmText: "Deactivate" }))) return;
    if (t.active) await fetch(`/api/admin/teachers?id=${t.id}`, { method: "DELETE" });
    else await fetch("/api/admin/teachers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: t.id, active: true }) });
    await reload();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Teachers</h1>
          <p className="mt-1 text-slate-600">{list.length} teachers</p>
        </div>
        <button onClick={openNew} className="btn-primary">+ Add teacher</button>
      </div>

      <div className="card divide-y divide-slate-100">
        {list.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No teachers yet.</p>
        ) : (
          list.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-800">{t.name}</p>
                  {!t.active && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">inactive</span>}
                </div>
                <p className="truncate text-xs text-slate-400">
                  {classNames(t.classIds).length ? classNames(t.classIds).join(", ") : "No classes assigned"}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/teachers/${t.id}`} className="btn-outline px-3 py-1.5 text-sm">Compliance</Link>
                <button onClick={() => openEdit(t)} className="btn-outline px-3 py-1.5 text-sm">Edit</button>
                <button onClick={() => toggle(t)} className="btn-ghost px-3 py-1.5 text-sm">{t.active ? "Deactivate" : "Reactivate"}</button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit teacher" : "New teacher"}>
        <form onSubmit={save} className="space-y-4">
          <div><label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className={editing ? "rounded-xl border border-slate-200 bg-slate-50 p-3" : ""}>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {editing ? "Change PIN" : "PIN"} {editing && <span className="font-normal text-slate-400">(leave blank to keep current)</span>}
            </label>
            <input className="input" inputMode="numeric" type="password" autoComplete="off" value={form.pin}
              onChange={(e) => setForm({ ...form, pin: e.target.value })} placeholder={editing ? "Enter a new PIN…" : "e.g. 4810"} />
            {editing && <p className="mt-1 text-xs text-slate-400">Sets a new sign-in PIN for {form.name || "this teacher"} immediately.</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Assigned classes</label>
            {classes.length === 0 ? (
              <p className="text-sm text-slate-400">No classes yet — create classes first.</p>
            ) : (
              <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 p-3">
                {classes.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.classIds.includes(c.id)} onChange={() => toggleClass(c.id)} className="h-4 w-4 rounded border-slate-300 text-kplc-navy" />
                    {c.displayName}
                  </label>
                ))}
              </div>
            )}
          </div>
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
