// Attendance analytics — ported from legacy js/reports.js (_computeInsights,
// calculateTeacherAttendanceMomentum, problematic-student detection, by-class).
// Pure functions over normalized rows. EXACT legacy math preserved: a "present"
// session = present OR late; rate = round(present / total * 100).
import type { AttendanceStatus } from "@/types";
import { dayKeyFromDate, type DayKey } from "@/lib/dates";

export interface AnalyticsRow {
  admNo: string;
  name: string;
  classId: string;
  classCode: string;
  date: string;        // YYYY-MM-DD
  weekStart: string;   // ISO Monday
  status: AttendanceStatus;
  teacher: string;
  subject: string;
}

const present = (s: AttendanceStatus) => s === "present" || s === "late";
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

/* ------------------------------------------------------------------ overview */
export interface Overview { present: number; absent: number; late: number; total: number; rate: number; students: number; }
export function computeOverview(rows: AnalyticsRow[]): Overview {
  let p = 0, a = 0, l = 0;
  const students = new Set<string>();
  for (const r of rows) {
    students.add(r.admNo);
    if (r.status === "present") p++;
    else if (r.status === "late") l++;
    else if (r.status === "absent") a++;
  }
  const total = p + a + l;
  return { present: p, absent: a, late: l, total, rate: pct(p + l, total), students: students.size };
}

/* ------------------------------------------------------------------ insights (port of _computeInsights) */
export interface Insights {
  mostAbsent: Array<{ admNo: string; name: string; classCode: string; absent: number; total: number; rate: number }>;
  byClass: Array<{ classCode: string; present: number; total: number; rate: number }>;
  weeklyTrend: Array<{ week: string; present: number; total: number; rate: number }>;
  trendArrow: "↑" | "↓" | "→";
  trendDelta: number;
  perfect: Array<{ admNo: string; name: string; classCode: string; total: number }>;
  topTeachers: Array<{ teacher: string; submissions: number; marks: number }>;
  bottomTeachers: Array<{ teacher: string; submissions: number; marks: number }>;
  weeklySummary: { thisWeek: { week: string; present: number; total: number } | null; lastWeek: { week: string; present: number; total: number } | null };
  totalRows: number;
}

export function computeInsights(rows: AnalyticsRow[]): Insights {
  const studentAgg: Record<string, { admNo: string; name: string; classCode: string; present: number; absent: number; late: number; total: number }> = {};
  const classAgg: Record<string, { classCode: string; present: number; total: number }> = {};
  const weekAgg: Record<string, { week: string; present: number; total: number }> = {};
  const teacherAgg: Record<string, { teacher: string; submissions: Set<string>; marked: number }> = {};

  for (const r of rows) {
    const s = (studentAgg[r.admNo] ??= { admNo: r.admNo, name: r.name || r.admNo, classCode: r.classCode, present: 0, absent: 0, late: 0, total: 0 });
    s.total++;
    if (r.status === "present") s.present++;
    else if (r.status === "late") { s.late++; s.present++; }
    else if (r.status === "absent") s.absent++;

    if (r.classCode) {
      const c = (classAgg[r.classCode] ??= { classCode: r.classCode, present: 0, total: 0 });
      c.total++; if (present(r.status)) c.present++;
    }
    const w = (weekAgg[r.weekStart] ??= { week: r.weekStart, present: 0, total: 0 });
    w.total++; if (present(r.status)) w.present++;

    if (r.teacher) {
      const t = (teacherAgg[r.teacher] ??= { teacher: r.teacher, submissions: new Set<string>(), marked: 0 });
      t.submissions.add(`${r.weekStart}|${r.classCode}`); t.marked++;
    }
  }

  const mostAbsent = Object.values(studentAgg)
    .filter((s) => s.absent > 0)
    .map((s) => ({ admNo: s.admNo, name: s.name, classCode: s.classCode, absent: s.absent, total: s.total, rate: pct(s.absent, s.total) }))
    .sort((a, b) => b.absent - a.absent || b.rate - a.rate)
    .slice(0, 10);

  const byClass = Object.values(classAgg)
    .map((c) => ({ ...c, rate: pct(c.present, c.total) }))
    .sort((a, b) => b.rate - a.rate);

  const weeklyTrend = Object.values(weekAgg)
    .map((w) => ({ ...w, rate: pct(w.present, w.total) }))
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-8);
  let trendArrow: "↑" | "↓" | "→" = "→", trendDelta = 0;
  if (weeklyTrend.length >= 2) {
    trendDelta = weeklyTrend[weeklyTrend.length - 1].rate - weeklyTrend[0].rate;
    trendArrow = trendDelta > 1 ? "↑" : trendDelta < -1 ? "↓" : "→";
  }

  const perfect = Object.values(studentAgg)
    .filter((s) => s.absent === 0 && s.total >= 5)
    .sort((a, b) => b.total - a.total)
    .slice(0, 50)
    .map((s) => ({ admNo: s.admNo, name: s.name, classCode: s.classCode, total: s.total }));

  const teacherStats = Object.values(teacherAgg)
    .map((t) => ({ teacher: t.teacher, submissions: t.submissions.size, marks: t.marked }))
    .sort((a, b) => b.submissions - a.submissions);
  const topTeachers = teacherStats.slice(0, 5);
  const bottomTeachers = teacherStats.slice().sort((a, b) => a.submissions - b.submissions).slice(0, 5);

  const sortedWeeks = Object.values(weekAgg).sort((a, b) => a.week.localeCompare(b.week));
  const weeklySummary = {
    thisWeek: sortedWeeks[sortedWeeks.length - 1] ?? null,
    lastWeek: sortedWeeks[sortedWeeks.length - 2] ?? null,
  };

  return { mostAbsent, byClass, weeklyTrend, trendArrow, trendDelta, perfect, topTeachers, bottomTeachers, weeklySummary, totalRows: rows.length };
}

/* ------------------------------------------------------------------ momentum (port of calculateTeacherAttendanceMomentum) */
export interface MomentumStudent { name: string; admission: string; present: number; absent: number; late: number; total: number; percentage: number; }
export interface MomentumWeek { weekStart: string; present: number; absent: number; total: number; attendancePercentage: number; }
export interface Momentum {
  teacher: string; totalLessons: number; totalPresent: number; totalAbsent: number; totalLate: number;
  overallPercentage: number; studentDetails: MomentumStudent[]; weeklyTrends: MomentumWeek[];
}

export function computeMomentum(rows: AnalyticsRow[], teacherName: string): Momentum {
  const mine = rows.filter((r) => r.teacher === teacherName);
  const students: Record<string, MomentumStudent> = {};
  const m: Momentum = { teacher: teacherName, totalLessons: 0, totalPresent: 0, totalAbsent: 0, totalLate: 0, overallPercentage: 0, studentDetails: [], weeklyTrends: [] };

  for (const r of mine) {
    const st = (students[r.admNo] ??= { name: r.name, admission: r.admNo, present: 0, absent: 0, late: 0, total: 0, percentage: 0 });
    st.total++; m.totalLessons++;
    if (r.status === "present") { st.present++; m.totalPresent++; }
    else if (r.status === "late") { st.late++; m.totalLate++; m.totalPresent++; }
    else if (r.status === "absent") { st.absent++; m.totalAbsent++; }
  }
  for (const st of Object.values(students)) {
    if (st.total > 0) { st.percentage = pct(st.present + st.late, st.total); m.studentDetails.push(st); }
  }
  m.overallPercentage = pct(m.totalPresent, m.totalLessons);
  m.studentDetails.sort((a, b) => b.percentage - a.percentage);

  const weeks: Record<string, MomentumWeek> = {};
  for (const r of mine) {
    const w = (weeks[r.weekStart] ??= { weekStart: r.weekStart, present: 0, absent: 0, total: 0, attendancePercentage: 0 });
    w.total++;
    if (present(r.status)) w.present++; else if (r.status === "absent") w.absent++;
  }
  m.weeklyTrends = Object.values(weeks).map((w) => ({ ...w, attendancePercentage: pct(w.present, w.total) }))
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  return m;
}

/* ------------------------------------------------------------------ problematic students */
export interface ProblematicStudent { name: string; admission: string; classCode: string; overallPercentage: number; missedCount: number; missedDetails: string[]; action: string; }
export interface SubjectFlag { studentName: string; admission: string; subject: string; teacher: string; missedCount: number; lastMissed: string; }
export interface ProblematicResult { students: ProblematicStudent[]; subjectFlags: SubjectFlag[]; }

export function computeProblematic(rows: AnalyticsRow[], minMissed = 3): ProblematicResult {
  const agg: Record<string, { name: string; classCode: string; present: number; absent: number; late: number; total: number; missed: Array<{ date: string; subject: string }> }> = {};
  const subj: Record<string, { studentName: string; admission: string; subject: string; teacher: string; missedCount: number; lastMissed: string }> = {};

  for (const r of rows) {
    const s = (agg[r.admNo] ??= { name: r.name, classCode: r.classCode, present: 0, absent: 0, late: 0, total: 0, missed: [] });
    s.total++;
    if (r.status === "present") s.present++;
    else if (r.status === "late") s.late++;
    else if (r.status === "absent") {
      s.absent++;
      s.missed.push({ date: r.date, subject: r.subject || "—" });
      const k = `${r.admNo}|${r.subject}`;
      const f = (subj[k] ??= { studentName: r.name, admission: r.admNo, subject: r.subject || "—", teacher: r.teacher || "—", missedCount: 0, lastMissed: r.date });
      f.missedCount++; if (r.date > f.lastMissed) f.lastMissed = r.date;
    }
  }

  const students: ProblematicStudent[] = Object.entries(agg)
    .filter(([, s]) => s.absent >= minMissed)
    .map(([admNo, s]) => ({
      name: s.name, admission: admNo, classCode: s.classCode,
      overallPercentage: pct(s.present + s.late, s.total),
      missedCount: s.absent,
      missedDetails: s.missed.sort((a, b) => b.date.localeCompare(a.date)).map((m) => `${m.date} (${m.subject})`),
      action: s.absent >= 5 ? "URGENT: Contact Parents" : s.absent >= 3 ? "Warning: Monitor Closely" : "Monitor",
    }))
    .sort((a, b) => b.missedCount - a.missedCount);

  const subjectFlags = Object.values(subj).filter((f) => f.missedCount >= 2).sort((a, b) => b.missedCount - a.missedCount);
  return { students, subjectFlags };
}

/** Status band shared by UI + PDF. */
export function statusBand(percentage: number): "Good" | "Warning" | "Critical" {
  return percentage >= 80 ? "Good" : percentage >= 60 ? "Warning" : "Critical";
}

/* ================================================================== *
 * Dashboard analytics (Section 1) — subject/day/teacher/risk blocks.  *
 * All reuse the same legacy math: present = present|late.             *
 * ================================================================== */

/* ----------------------------------------------------- subject (lesson) stats */
export interface SubjectStat { subject: string; teacher: string; attended: number; total: number; rate: number; }

/** Per-subject attendance — powers "most/least attended lessons". */
export function computeSubjectStats(rows: AnalyticsRow[]): SubjectStat[] {
  const agg: Record<string, { subject: string; attended: number; total: number; teachers: Record<string, number> }> = {};
  for (const r of rows) {
    const name = r.subject?.trim();
    if (!name) continue;
    const s = (agg[name] ??= { subject: name, attended: 0, total: 0, teachers: {} });
    s.total++;
    if (present(r.status)) s.attended++;
    if (r.teacher) s.teachers[r.teacher] = (s.teachers[r.teacher] ?? 0) + 1;
  }
  return Object.values(agg)
    .map((s) => ({
      subject: s.subject, attended: s.attended, total: s.total, rate: pct(s.attended, s.total),
      teacher: Object.entries(s.teachers).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—",
    }))
    .sort((a, b) => b.rate - a.rate || b.total - a.total);
}

/** Top-N most and least attended lessons (min sessions to avoid noise). */
export function topAndBottomSubjects(rows: AnalyticsRow[], n = 5, minSessions = 3) {
  const stats = computeSubjectStats(rows).filter((s) => s.total >= minSessions);
  return { most: stats.slice(0, n), least: stats.slice().reverse().slice(0, n) };
}

/* ----------------------------------------------------- day-of-week pattern */
export interface DayStat { day: DayKey; label: string; attended: number; total: number; rate: number; }
const DAY_LABEL: Record<DayKey, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
const WEEK_ORDER: DayKey[] = ["mon", "tue", "wed", "thu", "fri"];

/** Mon–Fri attendance pattern + an auto-generated insight string. */
export function computeDayPattern(rows: AnalyticsRow[]): { days: DayStat[]; insight: string | null } {
  const agg: Record<string, { attended: number; total: number }> = {};
  for (const r of rows) {
    const k = dayKeyFromDate(r.date);
    const d = (agg[k] ??= { attended: 0, total: 0 });
    d.total++; if (present(r.status)) d.attended++;
  }
  const days: DayStat[] = WEEK_ORDER.map((day) => {
    const d = agg[day] ?? { attended: 0, total: 0 };
    return { day, label: DAY_LABEL[day], attended: d.attended, total: d.total, rate: pct(d.attended, d.total) };
  });
  const withData = days.filter((d) => d.total > 0);
  let insight: string | null = null;
  if (withData.length >= 2) {
    const avg = Math.round(withData.reduce((s, d) => s + d.rate, 0) / withData.length);
    const worst = withData.slice().sort((a, b) => a.rate - b.rate)[0];
    const gap = avg - worst.rate;
    if (gap >= 5) insight = `${worst.label}s have ${gap}% lower attendance than the weekly average (${avg}%).`;
  }
  return { days, insight };
}

/* ----------------------------------------------------- teacher marking consistency */
export interface TeacherConsistency { teacher: string; marks: number; sessions: number; present: number; rate: number; lastMarked: string | null; }

/** Per-teacher marking volume + the present-rate they record. */
export function computeTeacherConsistency(rows: AnalyticsRow[]): TeacherConsistency[] {
  const agg: Record<string, { teacher: string; marks: number; present: number; sessions: Set<string>; last: string }> = {};
  for (const r of rows) {
    if (!r.teacher) continue;
    const t = (agg[r.teacher] ??= { teacher: r.teacher, marks: 0, present: 0, sessions: new Set(), last: "" });
    t.marks++; if (present(r.status)) t.present++;
    t.sessions.add(`${r.date}|${r.classCode}|${r.subject}`);
    if (r.date > t.last) t.last = r.date;
  }
  return Object.values(agg)
    .map((t) => ({ teacher: t.teacher, marks: t.marks, sessions: t.sessions.size, present: t.present, rate: pct(t.present, t.marks), lastMarked: t.last || null }))
    .sort((a, b) => b.sessions - a.sessions || b.marks - a.marks);
}

/* ----------------------------------------------------- per-student analytics */
export interface StudentAnalytics {
  admNo: string; name: string; classCode: string;
  present: number; absent: number; late: number; total: number; rate: number;
  band: "Good" | "Warning" | "Critical";
  mostMissed: string | null; mostAttended: string | null;
}

/** Full per-student roster with most-missed / most-attended subject. */
export function computeStudentAnalytics(rows: AnalyticsRow[]): StudentAnalytics[] {
  const agg: Record<string, {
    name: string; classCode: string; present: number; absent: number; late: number; total: number;
    subj: Record<string, { attended: number; absent: number }>;
  }> = {};
  for (const r of rows) {
    const s = (agg[r.admNo] ??= { name: r.name || r.admNo, classCode: r.classCode, present: 0, absent: 0, late: 0, total: 0, subj: {} });
    s.total++;
    if (r.status === "present") s.present++;
    else if (r.status === "late") { s.late++; s.present++; }
    else if (r.status === "absent") s.absent++;
    const name = r.subject?.trim();
    if (name) {
      const sj = (s.subj[name] ??= { attended: 0, absent: 0 });
      if (present(r.status)) sj.attended++; else if (r.status === "absent") sj.absent++;
    }
  }
  return Object.entries(agg).map(([admNo, s]) => {
    const rate = pct(s.present, s.total);
    const subjArr = Object.entries(s.subj);
    const mostMissed = subjArr.filter(([, v]) => v.absent > 0).sort((a, b) => b[1].absent - a[1].absent)[0]?.[0] ?? null;
    const mostAttended = subjArr.slice().sort((a, b) => b[1].attended - a[1].attended)[0]?.[0] ?? null;
    return {
      admNo, name: s.name, classCode: s.classCode,
      present: s.present, absent: s.absent, late: s.late, total: s.total, rate,
      band: statusBand(rate), mostMissed, mostAttended,
    };
  }).sort((a, b) => a.rate - b.rate);
}

/* ----------------------------------------------------- risk distribution + percentiles */
export interface RiskBands { critical: number; warning: number; good: number; atRisk: number; total: number; }

export function computeRiskBands(students: StudentAnalytics[]): RiskBands {
  let critical = 0, warning = 0, good = 0;
  for (const s of students) {
    if (s.band === "Critical") critical++;
    else if (s.band === "Warning") warning++;
    else good++;
  }
  return { critical, warning, good, atRisk: critical, total: students.length };
}

/** Bottom/top decile (Section 7 system flags). Needs ≥3 marked sessions to qualify. */
export function computePercentiles(students: StudentAnalytics[]) {
  const ranked = students.filter((s) => s.total >= 3).sort((a, b) => a.rate - b.rate);
  const k = Math.max(1, Math.ceil(ranked.length * 0.1));
  return { lowest: ranked.slice(0, k), highest: ranked.slice(-k).reverse() };
}
