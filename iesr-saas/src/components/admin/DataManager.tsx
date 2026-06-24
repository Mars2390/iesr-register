"use client";

import { useState } from "react";

interface ParsedStudent { admissionNo: string; fullName: string; classCode: string }

export function DataManager() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Data management</h1>
        <p className="mt-1 text-slate-600">Back up, import, reset for a new term, or clear attendance. Roster is always preserved unless you import over it.</p>
      </div>

      <ArchiveCard />
      <ImportCard />
      <ResetTermCard />
      <ClearCard />
    </div>
  );
}

/* ----------------------------------------------------------------- archive */
function ArchiveCard() {
  return (
    <section className="card p-5">
      <h2 className="font-semibold text-kplc-navy">Archive / backup</h2>
      <p className="mt-1 text-sm text-slate-500">Download a full JSON snapshot (roster + all attendance) before resetting a term.</p>
      <a href="/api/admin/data/archive" className="btn-primary mt-3 inline-flex">⬇ Download archive (.json)</a>
    </section>
  );
}

/* ----------------------------------------------------------------- import */
function ImportCard() {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedStudent[] | null>(null);
  const [parseErr, setParseErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ processed: number; errors: string[] } | null>(null);

  function parse() {
    setResult(null); setParseErr(null);
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) { setParseErr("Add a header row plus at least one student row."); setParsed(null); return; }
    const headers = lines[0].split(/[,\t]/).map((h) => h.trim().toLowerCase());
    const find = (...names: string[]) => headers.findIndex((h) => names.includes(h));
    const ai = find("admissionno", "admission_no", "admission no", "adm", "admno");
    const ni = find("fullname", "full_name", "name", "student", "student name");
    const ci = find("classcode", "class_code", "class", "class code");
    if (ai < 0 || ni < 0) { setParseErr("Headers must include an admission-number column and a name column."); setParsed(null); return; }
    const rows: ParsedStudent[] = [];
    for (const line of lines.slice(1)) {
      const cells = line.split(/[,\t]/);
      const admissionNo = (cells[ai] ?? "").trim();
      const fullName = (cells[ni] ?? "").trim();
      const classCode = ci >= 0 ? (cells[ci] ?? "").trim() : "";
      if (admissionNo || fullName) rows.push({ admissionNo, fullName, classCode });
    }
    setParsed(rows);
  }

  async function submit() {
    if (!parsed) return;
    setBusy(true); setResult(null);
    try {
      const r = await fetch("/api/admin/data", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import_students", rows: parsed }),
      });
      const j = await r.json();
      if (r.ok && j.ok) { setResult(j.data); setParsed(null); setText(""); }
      else setResult({ processed: 0, errors: [j.error ?? "import_failed"] });
    } finally { setBusy(false); }
  }

  return (
    <section className="card p-5">
      <h2 className="font-semibold text-kplc-navy">Import students (CSV)</h2>
      <p className="mt-1 text-sm text-slate-500">Paste CSV with headers <code className="rounded bg-slate-100 px-1">admissionNo, fullName, classCode</code>. Existing admission numbers are updated; new ones are added.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5}
        placeholder={"admissionNo,fullName,classCode\nADM001,Jane Doe,CEEMAY2025R\nADM002,John Kamau,CEEMAY2025R"}
        className="input mt-3 font-mono text-xs" />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button onClick={parse} className="btn-outline">Preview</button>
        {parsed && <button onClick={submit} disabled={busy} className="btn-primary">{busy ? "Importing…" : `Import ${parsed.length} students`}</button>}
        {parsed && <span className="text-sm text-slate-500">{parsed.length} rows parsed</span>}
      </div>
      {parseErr && <p className="mt-2 text-sm font-medium text-rose-600">{parseErr}</p>}
      {result && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
          <p className="font-medium text-emerald-700">Imported {result.processed} student{result.processed === 1 ? "" : "s"}.</p>
          {result.errors.length > 0 && (
            <ul className="mt-1 list-inside list-disc text-xs text-amber-700">{result.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}</ul>
          )}
        </div>
      )}
    </section>
  );
}

/* ----------------------------------------------------------------- reset term */
function ResetTermCard() {
  const [term, setTerm] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    if (confirm !== "RESET") return;
    if (!window.confirm("This permanently deletes attendance records for the selected range. Continue?")) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/admin/data", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_term", confirm: "RESET", term: term || undefined, from: from || undefined, to: to || undefined }),
      });
      const j = await r.json();
      setMsg(r.ok && j.ok ? `Reset complete — ${j.data.deleted} records deleted.` : "Reset failed.");
      if (r.ok && j.ok) setConfirm("");
    } finally { setBusy(false); }
  }

  return (
    <section className="card border-amber-200 p-5">
      <h2 className="font-semibold text-amber-700">Reset for a new term</h2>
      <p className="mt-1 text-sm text-slate-500">Deletes attendance (optionally within a date range) and keeps the roster &amp; timetable. Set the new term name to update it everywhere.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Field label="New term (optional)"><input className="input" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Term 2" /></Field>
        <Field label="From (optional)"><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To (optional)"><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input className="input w-40" placeholder='Type "RESET"' value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <button onClick={run} disabled={busy || confirm !== "RESET"} className="btn bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50">{busy ? "Resetting…" : "Reset term"}</button>
        {msg && <span className="text-sm font-medium text-slate-600">{msg}</span>}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- clear all */
function ClearCard() {
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    if (confirm !== "DELETE") return;
    if (!window.confirm("This permanently deletes ALL attendance records for the school. This cannot be undone. Continue?")) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/admin/data", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_attendance", confirm: "DELETE" }),
      });
      const j = await r.json();
      setMsg(r.ok && j.ok ? `Deleted ${j.data.deleted} attendance records.` : "Delete failed.");
      if (r.ok && j.ok) setConfirm("");
    } finally { setBusy(false); }
  }

  return (
    <section className="card border-rose-200 p-5">
      <h2 className="font-semibold text-rose-700">Clear all attendance data</h2>
      <p className="mt-1 text-sm text-slate-500">Irreversibly removes every attendance record (and live presence). Students, teachers, classes and timetable are kept. Archive first.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input className="input w-40" placeholder='Type "DELETE"' value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <button onClick={run} disabled={busy || confirm !== "DELETE"} className="btn bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50">{busy ? "Clearing…" : "Clear all data"}</button>
        {msg && <span className="text-sm font-medium text-slate-600">{msg}</span>}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>{children}</div>;
}
