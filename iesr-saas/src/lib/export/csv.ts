// CSV export builders — ported from legacy js/reports.js export functions.
// Pure string builders (no DOM/Blob); the export API route streams the result.
import type { AnalyticsRow } from "@/lib/analytics";
import { computeInsights, computeProblematic } from "@/lib/analytics";

const esc = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const row = (cells: unknown[]) => cells.map(esc).join(",");

interface Meta { title: string; range: string; schoolName?: string; }

/** Per-student attendance summary (used for Weekly / Monthly / Termly). */
export function buildSummaryCsv(rows: AnalyticsRow[], meta: Meta): string {
  const agg: Record<string, { name: string; classCode: string; present: number; absent: number; late: number; total: number }> = {};
  for (const r of rows) {
    const s = (agg[r.admNo] ??= { name: r.name, classCode: r.classCode, present: 0, absent: 0, late: 0, total: 0 });
    s.total++;
    if (r.status === "present") s.present++;
    else if (r.status === "late") s.late++;
    else if (r.status === "absent") s.absent++;
  }
  const out: string[] = [];
  out.push(`IESR ATTENDANCE — ${meta.title}`);
  out.push(`Range: ${meta.range}`);
  out.push(`Generated: ${new Date().toISOString()}`);
  out.push("");
  out.push(row(["Student Name", "Admission No", "Class", "Present", "Absent", "Late", "Total", "Attendance %"]));
  for (const [admNo, s] of Object.entries(agg).sort((a, b) => a[1].name.localeCompare(b[1].name))) {
    const attended = s.present + s.late;
    const pct = s.total ? Math.round((attended / s.total) * 100) : 0;
    out.push(row([s.name, admNo, s.classCode, s.present, s.absent, s.late, s.total, `${pct}%`]));
  }
  return out.join("\n");
}

/** Class comparison summary CSV (by-class rates). */
export function buildClassCsv(rows: AnalyticsRow[], meta: Meta): string {
  const { byClass } = computeInsights(rows);
  const out: string[] = [];
  out.push(`IESR CLASS COMPARISON — ${meta.title}`);
  out.push(`Range: ${meta.range}`);
  out.push("");
  out.push(row(["Class", "Sessions", "Attendance %"]));
  for (const c of byClass) out.push(row([c.classCode, c.total, `${c.rate}%`]));
  return out.join("\n");
}

/** Problematic students CSV (legacy exportProblematicStudentsCSV). */
export function buildProblematicCsv(rows: AnalyticsRow[], meta: Meta): string {
  const { students, subjectFlags } = computeProblematic(rows, 3);
  const out: string[] = [];
  out.push(`IESR PROBLEMATIC STUDENTS — ${meta.title}`);
  out.push(`Range: ${meta.range}`);
  out.push(`Students with 3+ missed classes`);
  out.push("");
  out.push(row(["Student Name", "Admission No", "Class", "Overall %", "Missed", "Missed Details", "Action Required"]));
  for (const s of students) {
    out.push(row([s.name, s.admission, s.classCode, `${s.overallPercentage}%`, s.missedCount, s.missedDetails.join("; "), s.action]));
  }
  out.push("");
  out.push("SUBJECT-SPECIFIC ISSUES");
  out.push(row(["Student Name", "Admission No", "Subject", "Teacher", "Times Missed", "Last Missed"]));
  for (const f of subjectFlags) {
    out.push(row([f.studentName, f.admission, f.subject, f.teacher, f.missedCount, f.lastMissed]));
  }
  return out.join("\n");
}
