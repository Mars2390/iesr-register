"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SchoolSettings } from "@/lib/data/settings";

export function SettingsManager({ initial }: { initial: SchoolSettings }) {
  const router = useRouter();
  const [form, setForm] = useState<SchoolSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const set = (k: keyof SchoolSettings) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null);
    try {
      const r = await fetch("/api/admin/settings", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "save_failed");
      setForm(j.data as SchoolSettings);
      setMsg({ type: "success", text: "Settings saved — changes apply everywhere immediately." });
      router.refresh();
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      setMsg({ type: "error", text: code === "invalid_code_format" ? "Submission code must be 3–12 letters/numbers." : "Couldn't save settings." });
    } finally { setSaving(false); }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">School settings</h1>
        <p className="mt-1 text-slate-600">Edit identity, academic period, and the submission code — no code changes needed.</p>
      </div>

      <form onSubmit={save} className="space-y-6">
        <section className="card p-5">
          <h2 className="mb-4 font-semibold text-kplc-navy">Identity</h2>
          <div className="space-y-4">
            <Field label="School name" hint="Shown on reports and exports.">
              <input className="input" value={form.schoolName} onChange={set("schoolName")} required />
            </Field>
            <Field label="Register / system name" hint="The wordmark shown in the admin header.">
              <input className="input" value={form.registerName} onChange={set("registerName")} placeholder="IESR Register" />
            </Field>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-semibold text-kplc-navy">Academic period</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Academic year"><input className="input" value={form.academicYear} onChange={set("academicYear")} placeholder="2025/2026" /></Field>
            <Field label="Term / semester"><input className="input" value={form.term} onChange={set("term")} placeholder="Term 2" /></Field>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-1 font-semibold text-kplc-navy">Submission code</h2>
          <p className="mb-4 text-sm text-slate-500">Teachers must send this code with every register save. Changing it re-keys writes instantly.</p>
          <Field label="Code (3–12 letters/numbers)">
            <input className="input font-mono text-lg tracking-widest" value={form.submissionCode}
              onChange={(e) => setForm({ ...form, submissionCode: e.target.value })} maxLength={12} required />
          </Field>
        </section>

        {msg && <p className={`text-sm font-medium ${msg.type === "success" ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</p>}

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save settings"}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
