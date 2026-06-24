"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatDateDisplay } from "@/lib/dates";

interface Note {
  id: string; date: string; status: string; notes: string; tags: unknown;
  studentId: string; studentName: string | null; admissionNo: string | null;
  classId: string; className: string | null; subject: string | null; teacherName: string | null;
}
interface ClassOpt { id: string; displayName: string }

const TAG_STYLE: Record<string, string> = {
  late: "bg-amber-100 text-amber-800", disruptive: "bg-rose-100 text-rose-800",
  helpful: "bg-sky-100 text-sky-800", attentive: "bg-emerald-100 text-emerald-800",
};
const STATUS_DOT: Record<string, string> = { present: "bg-emerald-500", late: "bg-amber-500", absent: "bg-rose-500", unmarked: "bg-slate-300" };

export function NotesView({ initial, classes }: { initial: Note[]; classes: ClassOpt[] }) {
  const [list, setList] = useState(initial);
  const [classId, setClassId] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/admin/notes${classId ? `?classId=${classId}` : ""}`, { cache: "no-store" })
      .then((r) => r.json()).then((j) => { if (alive && j.ok) setList(j.data as Note[]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [classId]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return list;
    return list.filter((n) =>
      (n.studentName ?? "").toLowerCase().includes(t) ||
      (n.notes ?? "").toLowerCase().includes(t) ||
      (n.admissionNo ?? "").toLowerCase().includes(t));
  }, [list, q]);

  const tagsOf = (n: Note) => (Array.isArray(n.tags) ? (n.tags as string[]) : []);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Notes &amp; observations</h1>
          <p className="mt-1 text-slate-600">{list.length} notes recorded by teachers during marking</p>
        </div>
        <div className="flex gap-2">
          <input className="input w-44" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="">All classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card p-10 text-center text-sm text-slate-500">Loading notes…</div>
      ) : shown.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">No notes found.</div>
      ) : (
        <div className="space-y-3">
          {shown.map((n) => (
            <div key={n.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${STATUS_DOT[n.status] ?? "bg-slate-300"}`} />
                    <Link href={`/admin/students/${n.studentId}`} className="font-semibold text-slate-800 hover:text-kplc-blue">{n.studentName ?? "—"}</Link>
                    <span className="font-mono text-xs text-slate-400">{n.admissionNo}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {n.className ?? "—"}{n.subject ? ` · ${n.subject}` : ""}{n.teacherName ? ` · ${n.teacherName}` : ""} · {formatDateDisplay(n.date)}
                  </p>
                </div>
                {tagsOf(n).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tagsOf(n).map((t) => <span key={t} className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${TAG_STYLE[t] ?? "bg-slate-100 text-slate-600"}`}>{t}</span>)}
                  </div>
                )}
              </div>
              {n.notes?.trim() && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{n.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
