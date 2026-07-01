// CSV export builders for institutional leadership (Dean / HOA / HOD).
// Pure string builders (no DOM/Blob); the export API route streams the result.
// Design goals: grouped by CLASS first (never random), clear section headers,
// per-class totals, a school-wide total, teacher UNITS always shown, and dates
// formatted for humans. Ideas ported/upgraded from the legacy reports the Dean
// approved (class-grouped weekly, HOA full CSV, real subject names).
import type { AnalyticsRow, LeadershipSummary } from "@/lib/analytics";
import {
  computeGroupedSummary, computeFullDataMatrix, computeTeacherPerformance,
  computeInsights, computeProblematic, computeMonthlyTrend, statusBand,
  computeRegisterGrid, computeChronicAbsentees, computePolicyCompliance, POLICY_THRESHOLD,
} from "@/lib/analytics";

/* ------------------------------------------------------------------ helpers */
const esc = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const row = (cells: unknown[]) => cells.map(esc).join(",");
const rule = (label = "") => (label ? `═══════════  ${label}  ═══════════` : "");

const SCHOOL = "Institute of Energy Studies & Research · Kenya Power";

/** Human date "01 Jul 2026" from YYYY-MM-DD. */
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function niceDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS_SHORT[Number(m) - 1] ?? m} ${y}`;
}
const nowStamp = () => new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

export interface Meta { title: string; from: string; to: string; schoolName?: string; scope?: string; }

/** Professional report banner reused by every export. */
function banner(meta: Meta, extra: string[] = []): string[] {
  const out = [
    row([meta.schoolName ?? SCHOOL]),
    row([meta.title.toUpperCase()]),
    row([`Period:`, `${niceDate(meta.from)}  to  ${niceDate(meta.to)}`]),
  ];
  if (meta.scope) out.push(row(["Scope:", meta.scope]));
  out.push(row(["Generated:", nowStamp()]));
  for (const e of extra) out.push(e);
  out.push("");
  return out;
}

/* ================================================================== *
 * 1–3.  WEEKLY / MONTHLY / TERMLY — class-grouped student summary      *
 * ================================================================== */
interface GroupedOpts { showStatus?: boolean; weeklyTrend?: boolean; monthlyTrend?: boolean; policy?: boolean; }

export function buildGroupedSummaryCsv(rows: AnalyticsRow[], meta: Meta, opts: GroupedOpts = {}): string {
  const g = computeGroupedSummary(rows);
  const out: string[] = banner(meta, [
    row(["Overall attendance:", `${g.overall.rate}%`]),
    row(["Classes:", g.overall.classes, "Students:", g.overall.students, "Records:", g.overall.total]),
  ]);

  const head = ["#", "Student Name", "Admission No", "Present", "Absent", "Late", "Marked", "Attendance %"];
  if (opts.showStatus) head.push("Status");
  if (opts.policy) head.push(`Policy (≥${POLICY_THRESHOLD}%)`);

  if (g.classes.length === 0) {
    out.push("No attendance recorded in this period.");
    return out.join("\n");
  }

  for (const c of g.classes) {
    out.push(rule(`CLASS: ${c.classCode} — ${c.displayName}`));
    out.push(row([`Category: ${c.category}`, `Students: ${c.studentCount}`, `Class attendance: ${c.rate}%`]));
    out.push(row(head));
    c.students.forEach((s, i) => {
      const marked = s.present + s.late + s.absent;
      const line: unknown[] = [i + 1, s.name, s.admNo, s.present, s.absent, s.late, marked, `${s.rate}%`];
      if (opts.showStatus) line.push(statusBand(s.rate));
      if (opts.policy) line.push(s.rate >= POLICY_THRESHOLD ? "PASS" : "FAIL");
      out.push(row(line));
    });
    // per-class total
    const cMarked = c.present + c.late + c.absent;
    const totalLine: unknown[] = ["", "CLASS TOTAL", `${c.studentCount} students`, c.present, c.absent, c.late, cMarked, `${c.rate}%`];
    if (opts.showStatus) totalLine.push(statusBand(c.rate));
    if (opts.policy) totalLine.push(`${c.students.filter((s) => s.rate >= POLICY_THRESHOLD).length}/${c.studentCount} pass`);
    out.push(row(totalLine));
    out.push("");
  }

  // school-wide total
  out.push(rule("SCHOOL-WIDE TOTAL"));
  const oMarked = g.overall.present + g.overall.late + g.overall.absent;
  out.push(row(["Total Present", g.overall.present]));
  out.push(row(["Total Absent", g.overall.absent]));
  out.push(row(["Total Late", g.overall.late]));
  out.push(row(["Total Marked Sessions", oMarked]));
  out.push(row(["Students Covered", g.overall.students]));
  out.push(row(["Classes Covered", g.overall.classes]));
  out.push(row(["OVERALL ATTENDANCE %", `${g.overall.rate}%`]));

  // week-by-week aggregation (termly asks for this; weekly/monthly benefit too)
  if (opts.weeklyTrend) {
    out.push("");
    out.push(rule("WEEK-BY-WEEK AGGREGATION"));
    out.push(row(["Week Beginning", "Present", "Absent", "Late", "Marked", "Attendance %"]));
    for (const w of computeInsights(rows).weeklyTrend) {
      // weeklyTrend gives present/total/rate; recompute absent/late from rows for the week
      const wk = rows.filter((r) => r.weekStart === w.week && r.status !== "unmarked");
      const present = wk.filter((r) => r.status === "present").length;
      const late = wk.filter((r) => r.status === "late").length;
      const absent = wk.filter((r) => r.status === "absent").length;
      out.push(row([`Week of ${niceDate(w.week)}`, present, absent, late, w.total, `${w.rate}%`]));
    }
  }

  // month-over-month comparison (monthly + termly)
  if (opts.monthlyTrend) {
    out.push("");
    out.push(rule("MONTH-OVER-MONTH TREND"));
    out.push(row(["Month", "Present", "Marked", "Attendance %", "Change"]));
    const trend = computeMonthlyTrend(rows);
    trend.forEach((m, i) => {
      const prev = trend[i - 1];
      const change = prev ? `${m.rate - prev.rate >= 0 ? "+" : ""}${m.rate - prev.rate}%` : "—";
      out.push(row([m.label, m.present, m.total, `${m.rate}%`, change]));
    });
  }

  return out.join("\n");
}

/* ================================================================== *
 * 4.  FULL DATA — per student, per unit: lessons attended across all   *
 * units they study, with subject rate + overall rate.                 *
 * ================================================================== */
export function buildFullDataCsv(rows: AnalyticsRow[], meta: Meta): string {
  const matrix = computeFullDataMatrix(rows);
  const out: string[] = banner(meta, [
    row(["What this shows:", "Every student — how many lessons they attended in each unit they study, and overall."]),
    row(["Students:", matrix.studentCount, "Classes:", matrix.classes.length]),
  ]);

  if (matrix.classes.length === 0) {
    out.push("No attendance recorded in this period.");
    return out.join("\n");
  }

  const head = ["Class", "Student Name", "Admission No", "Unit / Subject", "Teacher", "Lessons Attended", "Total Lessons", "Unit %", "Student Overall %"];
  for (const c of matrix.classes) {
    out.push(rule(`CLASS: ${c.classCode} — ${c.displayName}  (${c.category})`));
    out.push(row(head));
    for (const s of c.students) {
      if (s.subjects.length === 0) {
        out.push(row([c.classCode, s.name, s.admNo, "—", "—", 0, 0, "0%", `${s.rate}%`]));
        continue;
      }
      for (const sub of s.subjects) {
        out.push(row([c.classCode, s.name, s.admNo, sub.subject, sub.teacher, sub.attended, sub.total, `${sub.rate}%`, `${s.rate}%`]));
      }
      // per-student subtotal across all units
      out.push(row(["", `→ ${s.name} — ALL UNITS`, s.admNo, `${s.subjects.length} units`, "", s.attended, s.total, "", `${s.rate}%`]));
    }
    out.push("");
  }
  return out.join("\n");
}

/* ================================================================== *
 * 5.  TEACHER PERFORMANCE — units MUST be present.                     *
 * ================================================================== */
export function buildTeacherPerformanceCsv(
  rows: AnalyticsRow[],
  dir: Record<string, { units: string[]; classes: string[] }>,
  meta: Meta,
): string {
  const teachers = computeTeacherPerformance(rows, dir);
  const out: string[] = banner(meta, [row(["Teachers active in period:", teachers.length])]);

  out.push(row(["#", "Teacher", "Units / Subjects Taught", "Classes Assigned", "Sessions Marked", "Records", "Marking Compliance %", "Attendance Recorded %", "Last Marking Date"]));
  teachers.forEach((t, i) => {
    out.push(row([
      i + 1,
      t.teacher,
      t.units.length ? t.units.join("; ") : "—",
      t.classes.length ? t.classes.join("; ") : "—",
      t.sessionsMarked,
      t.records,
      `${t.complianceRate}%`,
      `${t.presentRate}%`,
      t.lastMarked ? niceDate(t.lastMarked) : "No marking",
    ]));
  });

  if (teachers.length) {
    const totSessions = teachers.reduce((s, t) => s + t.sessionsMarked, 0);
    const avgCompliance = Math.round(teachers.reduce((s, t) => s + t.complianceRate, 0) / teachers.length);
    out.push("");
    out.push(rule("SUMMARY"));
    out.push(row(["Total sessions marked", totSessions]));
    out.push(row(["Average marking compliance", `${avgCompliance}%`]));
  }
  return out.join("\n");
}

/* ================================================================== *
 * 6.  LEADERSHIP SUMMARY — the flagship Dean/HOA/HOD brief.            *
 * ================================================================== */
export function buildLeadershipCsv(summary: LeadershipSummary, meta: Meta): string {
  const s = summary;
  const out: string[] = banner(meta, [row(["Prepared for:", "Dean · Head of Academics · Heads of Department"])]);

  // headline
  out.push(rule("SCHOOL-WIDE ATTENDANCE"));
  out.push(row(["Overall attendance rate", `${s.overview.rate}%`]));
  out.push(row(["Students", s.overview.students, "Sessions", s.overview.total]));
  out.push(row(["Present", s.overview.present, "Absent", s.overview.absent, "Late", s.overview.late]));
  if (s.trend.latest && s.trend.previous) {
    out.push(row(["Month-over-month", `${s.trend.arrow} ${s.trend.delta >= 0 ? "+" : ""}${s.trend.delta}%`, `(${s.trend.previous.label}: ${s.trend.previous.rate}% → ${s.trend.latest.label}: ${s.trend.latest.rate}%)`]));
  }
  out.push("");

  // classes ranked
  out.push(rule("CLASS ATTENDANCE — RANKED (best → worst)"));
  out.push(row(["Rank", "Class", "Programme", "Category", "Students", "Sessions", "Attendance %", "Status"]));
  s.byClassRanked.forEach((c, i) => out.push(row([i + 1, c.classCode, c.displayName, c.category, c.students, c.total, `${c.rate}%`, c.band])));
  out.push("");

  // top / bottom subjects
  out.push(rule("TOP 5 MOST-ATTENDED UNITS"));
  out.push(row(["Unit / Subject", "Teacher", "Attended", "Total", "Attendance %"]));
  s.topSubjects.forEach((u) => out.push(row([u.subject, u.teacher, u.attended, u.total, `${u.rate}%`])));
  out.push("");
  out.push(rule("BOTTOM 5 LEAST-ATTENDED UNITS"));
  out.push(row(["Unit / Subject", "Teacher", "Attended", "Total", "Attendance %"]));
  s.bottomSubjects.forEach((u) => out.push(row([u.subject, u.teacher, u.attended, u.total, `${u.rate}%`])));
  out.push("");

  // problematic students
  out.push(rule("STUDENTS NEEDING ATTENTION (below 60%)"));
  if (s.problematic.length === 0) out.push("None — every student is at or above 60%.");
  else {
    out.push(row(["Student", "Admission No", "Class", "Attendance %", "Absences", "Most-missed unit"]));
    s.problematic.forEach((p) => out.push(row([p.name, p.admNo, p.classCode, `${p.rate}%`, p.absent, p.mostMissed ?? "—"])));
  }
  out.push("");

  // top performers
  out.push(rule("TOP PERFORMING STUDENTS (90% and above)"));
  if (s.topPerformers.length === 0) out.push("None reached 90% in this period.");
  else {
    out.push(row(["Student", "Admission No", "Class", "Attendance %", "Sessions"]));
    s.topPerformers.slice(0, 25).forEach((p) => out.push(row([p.name, p.admNo, p.classCode, `${p.rate}%`, p.total])));
  }
  out.push("");

  // 80% policy compliance
  out.push(rule(`ATTENDANCE POLICY COMPLIANCE (≥ ${s.policy.threshold}%)`));
  out.push(row(["School-wide", `${s.policy.pass}/${s.policy.total} passing`, `${s.policy.passRate}%`]));
  out.push(row(["Class", "Programme", "Students", "Pass", "Fail", "Pass Rate %"]));
  s.policy.byClass.forEach((c) => out.push(row([c.classCode, c.displayName, c.total, c.pass, c.fail, `${c.passRate}%`])));
  out.push("");

  // chronic absentee watchlist
  out.push(rule("CHRONIC ABSENTEE WATCHLIST (3+ consecutive absences)"));
  if (s.chronic.length === 0) out.push("None flagged — no student had 3+ absences in a row.");
  else {
    out.push(row(["Class", "Student", "Admission No", "Current Streak", "Longest Streak", "Total Absences", "Attendance %", "On Watch"]));
    s.chronic.slice(0, 30).forEach((c) => out.push(row([c.classCode, c.name, c.admNo, c.currentStreak, c.longestStreak, c.totalAbsences, `${c.rate}%`, c.onWatch ? "YES" : "—"])));
  }
  out.push("");

  // teacher compliance
  out.push(rule("TEACHER MARKING COMPLIANCE"));
  out.push(row(["Teacher", "Units Taught", "Classes", "Sessions Marked", "Compliance %", "Last Marked"]));
  s.teachers.forEach((t) => out.push(row([t.teacher, t.units.length ? t.units.join("; ") : "—", t.classes.join("; "), t.sessionsMarked, `${t.complianceRate}%`, t.lastMarked ? niceDate(t.lastMarked) : "No marking"])));
  out.push("");

  // month-over-month
  out.push(rule("MONTH-OVER-MONTH TREND"));
  out.push(row(["Month", "Attendance %", "Change"]));
  s.monthlyTrend.forEach((m, i) => {
    const prev = s.monthlyTrend[i - 1];
    const change = prev ? `${m.rate - prev.rate >= 0 ? "+" : ""}${m.rate - prev.rate}%` : "—";
    out.push(row([m.label, `${m.rate}%`, change]));
  });

  return out.join("\n");
}

/* ================================================================== *
 * 7.  WEEKLY REGISTER GRID — the on-screen register, day-by-day P/A/L.  *
 * ================================================================== */
export function buildRegisterGridCsv(rows: AnalyticsRow[], meta: Meta): string {
  const grid = computeRegisterGrid(rows);
  const out: string[] = banner(meta, [row(["Legend:", "P = Present, A = Absent, L = Late, – = Not marked"])]);

  if (grid.length === 0) { out.push("No attendance recorded in this period."); return out.join("\n"); }

  for (const c of grid) {
    out.push(rule(`CLASS: ${c.classCode} — ${c.displayName}`));
    out.push(row(["Category:", c.category, "Students:", c.students.length, "Sessions:", c.columns.length]));
    const head = ["#", "Student Name", "Admission No", ...c.columns.map((col) => col.label), "P", "A", "L", "Rate %"];
    out.push(row(head));
    c.students.forEach((s, i) => {
      const cells = c.columns.map((col) => s.cells[col.key] ?? "–");
      out.push(row([i + 1, s.name, s.admNo, ...cells, s.present, s.absent, s.late, `${s.rate}%`]));
    });
    // column totals (present per session + session rate)
    const present = c.columns.map((col) => c.colTotals[col.key].present);
    const rates = c.columns.map((col) => `${c.colTotals[col.key].rate}%`);
    out.push(row(["", "PRESENT / SESSION", "", ...present, "", "", "", ""]));
    out.push(row(["", "SESSION ATTENDANCE %", "", ...rates, "", "", "", `${c.students.length ? Math.round(c.students.reduce((a, s) => a + s.rate, 0) / c.students.length) : 0}%`]));
    out.push("");
  }
  return out.join("\n");
}

/* ================================================================== *
 * 8.  80% POLICY PASS / FAIL.                                          *
 * ================================================================== */
export function buildPolicyCsv(rows: AnalyticsRow[], meta: Meta): string {
  const p = computePolicyCompliance(rows);
  const out: string[] = banner(meta, [
    row(["Attendance policy threshold:", `${p.threshold}%`]),
    row(["School compliance:", `${p.pass}/${p.total} passing (${p.passRate}%)`, "Failing:", p.fail]),
  ]);

  out.push(rule("PASS RATE BY CLASS"));
  out.push(row(["Class", "Programme", "Students", "Pass", "Fail", "Pass Rate %"]));
  for (const c of p.byClass) out.push(row([c.classCode, c.displayName, c.total, c.pass, c.fail, `${c.passRate}%`]));
  out.push("");

  out.push(rule(`STUDENTS BELOW POLICY (< ${p.threshold}%)`));
  const failing = p.students.filter((s) => s.status === "FAIL");
  if (failing.length === 0) out.push("None — every student meets the attendance policy.");
  else {
    out.push(row(["Class", "Student", "Admission No", "Attendance %", "Shortfall", "Status"]));
    for (const s of failing) out.push(row([s.classCode, s.name, s.admNo, `${s.rate}%`, `-${s.shortfall}%`, s.status]));
  }
  out.push("");

  out.push(rule("ALL STUDENTS — POLICY STATUS"));
  out.push(row(["Class", "Student", "Admission No", "Attendance %", "Status"]));
  for (const s of p.students) out.push(row([s.classCode, s.name, s.admNo, `${s.rate}%`, s.status]));
  return out.join("\n");
}

/* ================================================================== *
 * 9.  CHRONIC ABSENTEE WATCHLIST — consecutive-absence detection.      *
 * ================================================================== */
export function buildChronicAbsenteeCsv(rows: AnalyticsRow[], meta: Meta, minStreak = 3): string {
  const list = computeChronicAbsentees(rows, minStreak);
  const onWatch = list.filter((c) => c.onWatch);
  const out: string[] = banner(meta, [
    row(["Trigger:", `${minStreak}+ consecutive absences`]),
    row(["On active watch (currently absent streak):", onWatch.length, "Flagged in period:", list.length]),
  ]);

  out.push(rule("ACTIVE WATCHLIST — currently on an absence streak"));
  if (onWatch.length === 0) out.push("None currently on an active absence streak.");
  else {
    out.push(row(["Class", "Student", "Admission No", "Current Streak", "Longest Streak", "Total Absences", "Attendance %", "Action"]));
    for (const c of onWatch) {
      const action = c.currentStreak >= 5 ? "URGENT: Contact guardian" : c.currentStreak >= 3 ? "Follow up immediately" : "Monitor";
      out.push(row([c.classCode, c.name, c.admNo, c.currentStreak, c.longestStreak, c.totalAbsences, `${c.rate}%`, action]));
    }
  }
  out.push("");

  out.push(rule("ALL FLAGGED (had a run of consecutive absences)"));
  out.push(row(["Class", "Student", "Admission No", "Longest Streak", "From", "To", "Current Streak", "Total Absences", "Attendance %"]));
  for (const c of list) {
    out.push(row([c.classCode, c.name, c.admNo, c.longestStreak, niceDate(c.streakStart), niceDate(c.streakEnd), c.currentStreak, c.totalAbsences, `${c.rate}%`]));
  }
  return out.join("\n");
}

/* ================================================================== *
 * Legacy-compatible smaller exports (kept + lightly upgraded).         *
 * ================================================================== */

/** Class comparison summary CSV (by-class rates). */
export function buildClassCsv(rows: AnalyticsRow[], meta: Meta): string {
  const { byClass } = computeInsights(rows);
  const out: string[] = banner(meta);
  out.push(rule("CLASS COMPARISON"));
  out.push(row(["Rank", "Class", "Sessions", "Attendance %", "Status"]));
  byClass.forEach((c, i) => out.push(row([i + 1, c.classCode, c.total, `${c.rate}%`, statusBand(c.rate)])));
  return out.join("\n");
}

/** Problematic students CSV (legacy exportProblematicStudentsCSV, upgraded). */
export function buildProblematicCsv(rows: AnalyticsRow[], meta: Meta): string {
  const { students, subjectFlags } = computeProblematic(rows, 3);
  const out: string[] = banner(meta, [row(["Threshold:", "Students with 3+ missed sessions"])]);
  out.push(rule("STUDENTS WITH 3+ ABSENCES"));
  out.push(row(["Student Name", "Admission No", "Class", "Overall %", "Missed", "Missed Details", "Action Required"]));
  for (const s of students) {
    out.push(row([s.name, s.admission, s.classCode, `${s.overallPercentage}%`, s.missedCount, s.missedDetails.join("; "), s.action]));
  }
  out.push("");
  out.push(rule("SUBJECT-SPECIFIC ISSUES (missed 2+ in a unit)"));
  out.push(row(["Student Name", "Admission No", "Unit / Subject", "Teacher", "Times Missed", "Last Missed"]));
  for (const f of subjectFlags) {
    out.push(row([f.studentName, f.admission, f.subject, f.teacher, f.missedCount, niceDate(f.lastMissed)]));
  }
  return out.join("\n");
}
