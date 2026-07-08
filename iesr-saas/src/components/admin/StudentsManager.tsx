"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useConfirm } from "@/components/ui/ConfirmDialog";

interface StudentRow { id: string; admissionNo: string; fullName: string; classId: string | null; className: string | null; active: boolean; }
interface ClassOpt { id: string; displayName: string; }

export function StudentsManager({ initial, classes }: { initial: StudentRow[]; classes: ClassOpt[] }) {
  const [list, setList] = useState(initial);
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [form, setForm] = useState({ admissionNo: "", fullName: "", classId: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const confirm = useConfirm();

  const term = q.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!term) return list;
    return list.filter((s) => s.fullName.toLowerCase().includes(term) || s.admissionNo.toLowerCase().includes(term));
  }, [list, term]);

  // Group by class (preserve a stable order: known classes first, then "No class").
  const groups = useMemo(() => {
    const m = new Map<string, { key: string; name: string; students: StudentRow[] }>();
    for (const c of classes) m.set(c.id, { key: c.id, name: c.displayName, students: [] });
    m.set("__none__", { key: "__none__", name: "No class", students: [] });
    for (const s of filtered) {
      const k = s.classId && m.has(s.classId) ? s.classId : "__none__";
      m.get(k)!.students.push(s);
    }
    return [...m.values()].filter((g) => g.students.length > 0)
      .map((g) => ({ ...g, students: g.students.sort((a, b) => a.fullName.localeCompare(b.fullName)) }));
  }, [filtered, classes]);

  const isOpen = (key: string) => expanded.has(key) || term.length > 0; // auto-expand while searching
  function toggleGroup(key: string) {
    setExpanded((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

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
    if (s.active && !(await confirm({ tone: "danger", title: "Deactivate student", message: <>Deactivate <b>{s.fullName}</b>? Attendance history is kept — you can restore them anytime.</>, confirmText: "Deactivate" }))) return;
    if (!s.active && !(await confirm({ title: "Restore student", message: <>Restore <b>{s.fullName}</b> to the active roster?</>, confirmText: "Restore" }))) return;
    if (s.active) await fetch(`/api/admin/students?id=${s.id}`, { method: "DELETE" });
    else await fetch("/api/admin/students", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, active: true }) });
    await reload();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Students</h1>
          <p className="mt-1 text-slate-600">{list.length} students across {groups.length || classes.length} classes</p>
        </div>
        <div className="flex gap-2">
          <input className="input w-48" placeholder="Search all students…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button onClick={openNew} className="btn-primary whitespace-nowrap">+ Add</button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">No students found.</div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {
            const opened = isOpen(g.key);
            return (
              <div key={g.key} className="card overflow-hidden">
                <button onClick={() => toggleGroup(g.key)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <span className={`grid h-7 w-7 place-items-center rounded-lg bg-kplc-navy/10 text-kplc-navy transition ${opened ? "rotate-90" : ""}`}>›</span>
                    <span className="font-semibold text-slate-800">{g.name}</span>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{g.students.length} student{g.students.length === 1 ? "" : "s"}</span>
                </button>
                {opened && (
                  <ul className="divide-y divide-slate-100 border-t border-slate-100">
                    {g.students.map((s) => (
                      <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium text-slate-800">{s.fullName}</p>
                            {!s.active && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">inactive</span>}
                          </div>
                          <p className="font-mono text-xs text-slate-400">{s.admissionNo}</p>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/admin/students/${s.id}`} className="btn-outline px-3 py-1.5 text-sm">History</Link>
                          <button onClick={() => openEdit(s)} className="btn-outline px-3 py-1.5 text-sm">Edit</button>
                          <button onClick={() => toggle(s)} className="btn-ghost px-3 py-1.5 text-sm">{s.active ? "Remove" : "Restore"}</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

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
