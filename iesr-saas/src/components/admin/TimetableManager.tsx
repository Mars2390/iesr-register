"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useConfirm } from "@/components/ui/ConfirmDialog";

interface Entry {
  id: string; classId: string; className: string | null; classCode: string | null;
  day: string; startTime: string; endTime: string;
  subjectId: string | null; subjectName: string | null;
  teacherId: string | null; teacherName: string | null;
}
interface ClassOpt { id: string; code: string; displayName: string; active: boolean }
interface SubjectOpt { id: string; name: string; classId: string | null; active: boolean }
interface TeacherOpt { id: string; name: string; classIds: string[]; active: boolean }
interface Options { classes: ClassOpt[]; subjects: SubjectOpt[]; teachers: TeacherOpt[] }

const DAYS = [
  { key: "mon", label: "Monday" }, { key: "tue", label: "Tuesday" }, { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" }, { key: "fri", label: "Friday" }, { key: "sat", label: "Saturday" }, { key: "sun", label: "Sunday" },
];
const hhmm = (t: string) => t.slice(0, 5);
const blank = { id: "", classId: "", day: "mon", startTime: "08:00", endTime: "10:00", subjectId: "", teacherId: "" };

export function TimetableManager({ initial, options }: { initial: Entry[]; options: Options }) {
  const [list, setList] = useState<Entry[]>(initial);
  const [filterClass, setFilterClass] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...blank });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const confirm = useConfirm();

  async function reload() {
    const r = await fetch("/api/admin/timetable", { cache: "no-store" });
    const j = await r.json();
    if (j.ok) setList(j.data.entries as Entry[]);
  }

  function openNew() { setEditingId(null); setForm({ ...blank, classId: filterClass || options.classes[0]?.id || "" }); setErr(null); setOpen(true); }
  function openEdit(e: Entry) {
    setEditingId(e.id);
    setForm({ id: e.id, classId: e.classId, day: e.day, startTime: hhmm(e.startTime), endTime: hhmm(e.endTime), subjectId: e.subjectId ?? "", teacherId: e.teacherId ?? "" });
    setErr(null); setOpen(true);
  }

  async function save(ev: React.FormEvent) {
    ev.preventDefault(); setSaving(true); setErr(null);
    try {
      const body = { ...form, subjectId: form.subjectId || null, teacherId: form.teacherId || null };
      const r = await fetch("/api/admin/timetable", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { ...body, id: editingId } : body),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "save_failed");
      setOpen(false); await reload();
    } catch (e) {
      const code = e instanceof Error ? e.message : "save_failed";
      setErr(code === "end_before_start" ? "End time must be after the start time." : code === "invalid_time" ? "Enter valid times." : "Couldn't save the entry.");
    } finally { setSaving(false); }
  }

  async function remove(e: Entry) {
    if (!(await confirm({ tone: "danger", title: "Delete timetable slot", message: <>Delete <b>{e.subjectName ?? "this slot"}</b> ({DAYS.find((d) => d.key === e.day)?.label}, {hhmm(e.startTime)})? This change reaches teachers immediately.</>, confirmText: "Delete" }))) return;
    await fetch(`/api/admin/timetable?id=${e.id}`, { method: "DELETE" });
    await reload();
  }

  const shownClasses = useMemo(
    () => options.classes.filter((c) => (!filterClass || c.id === filterClass)),
    [options.classes, filterClass],
  );
  const byClass = useMemo(() => {
    const m = new Map<string, Entry[]>();
    for (const e of list) { if (filterClass && e.classId !== filterClass) continue; (m.get(e.classId) ?? m.set(e.classId, []).get(e.classId)!).push(e); }
    return m;
  }, [list, filterClass]);
  // Which weekday columns to show: Mon–Fri always, plus any weekend slots in use.
  const activeDays = useMemo(() => {
    const present = new Set(list.map((e) => e.day));
    return DAYS.filter((d) => ["mon", "tue", "wed", "thu", "fri"].includes(d.key) || present.has(d.key));
  }, [list]);

  // Subjects/teachers scoped to the class chosen in the form (with sensible fallbacks).
  const formSubjects = options.subjects.filter((s) => !s.classId || s.classId === form.classId);
  const formTeachers = options.teachers.filter((t) => t.active && (t.classIds.length === 0 || t.classIds.includes(form.classId)));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Timetable</h1>
          <p className="mt-1 text-slate-600">{list.length} sessions · changes reach teacher dashboards instantly</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="">All classes</option>
            {options.classes.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
          </select>
          <button onClick={openNew} className="btn-primary">+ Add entry</button>
        </div>
      </div>

      {shownClasses.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">No classes yet — add a class first.</div>
      ) : (
        <div className="space-y-6">
          {shownClasses.map((c) => {
            const entries = (byClass.get(c.id) ?? []);
            return (
              <div key={c.id} className="card overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                  <div>
                    <h2 className="font-semibold text-kplc-navy">{c.displayName}</h2>
                    <p className="font-mono text-xs text-slate-400">{c.code} · {entries.length} sessions</p>
                  </div>
                  <button onClick={() => { setFilterClass(c.id); openNew(); }} className="btn-outline px-3 py-1.5 text-sm">+ Add</button>
                </div>
                <div className="overflow-x-auto">
                  <div className="grid min-w-[760px]" style={{ gridTemplateColumns: `repeat(${activeDays.length}, minmax(0,1fr))` }}>
                    {activeDays.map((d) => {
                      const slots = entries.filter((e) => e.day === d.key).sort((a, b) => a.startTime.localeCompare(b.startTime));
                      return (
                        <div key={d.key} className="border-r border-slate-100 last:border-r-0">
                          <div className="bg-kplc-navy/5 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-kplc-navy">{d.label.slice(0, 3)}</div>
                          <div className="space-y-2 p-2">
                            {slots.length === 0 ? (
                              <p className="py-4 text-center text-[11px] text-slate-300">—</p>
                            ) : slots.map((e) => (
                              <div key={e.id} className="group rounded-lg border-l-2 border-kplc-blue bg-white p-2 shadow-sm ring-1 ring-slate-100">
                                <p className="text-[11px] font-bold text-slate-700">{hhmm(e.startTime)}–{hhmm(e.endTime)}</p>
                                <p className="truncate text-xs font-medium text-kplc-navy">{e.subjectName ?? "—"}</p>
                                <p className="truncate text-[11px] text-slate-400">{e.teacherName ?? "Unassigned"}</p>
                                <div className="mt-1 flex gap-1 opacity-0 transition group-hover:opacity-100">
                                  <button onClick={() => openEdit(e)} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-200">Edit</button>
                                  <button onClick={() => remove(e)} className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 hover:bg-rose-100">Del</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editingId ? "Edit timetable entry" : "New timetable entry"}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Class">
            <select className="input" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value, subjectId: "", teacherId: "" })} required>
              <option value="" disabled>Select class…</option>
              {options.classes.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
            </select>
          </Field>
          <Field label="Day">
            <select className="input" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>
              {DAYS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start time"><input type="time" className="input" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required /></Field>
            <Field label="End time"><input type="time" className="input" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required /></Field>
          </div>
          <Field label="Subject">
            <select className="input" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
              <option value="">— None —</option>
              {formSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Lecturer">
            <select className="input" value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}>
              <option value="">— Unassigned —</option>
              {formTeachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          {err && <p className="text-sm font-medium text-rose-600">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save entry"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>{children}</div>;
}
