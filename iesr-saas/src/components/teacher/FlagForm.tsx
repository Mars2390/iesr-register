"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ISSUE_TYPES = ["Attendance dispute", "Student behaviour", "Timetable conflict", "System issue", "Other"];

export function FlagForm({ classes }: { classes: { id: string; displayName: string }[] }) {
  const router = useRouter();
  const [classId, setClassId] = useState("");
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0]);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/flags", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: classId || null, issueType, description: description.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error();
      setMsg({ type: "success", text: "Issue raised — your admin can now see it." });
      setDescription(""); setClassId("");
      router.refresh();
    } catch {
      setMsg({ type: "error", text: "Couldn't submit. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <h2 className="text-lg font-semibold">Raise an issue</h2>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Class (optional)</label>
        <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">— Not class-specific —</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Issue type</label>
        <select className="input" value={issueType} onChange={(e) => setIssueType(e.target.value)}>
          {ISSUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
        <textarea
          className="input min-h-[100px] resize-y"
          placeholder="Describe the issue…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {msg && (
        <p className={`text-sm font-medium ${msg.type === "success" ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</p>
      )}

      <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">
        {saving ? "Submitting…" : "Submit issue"}
      </button>
    </form>
  );
}
