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
  classDisplayName: string; // human class name for section headers
  classCategory: string;    // e.g. "Diploma Electrical" — groups classes
  date: string;        // YYYY-MM-DD
  weekStart: string;   // ISO Monday
  sessionId: string;   // per-day session key (for register-grid columns)
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

/* ================================================================== *
 * LEADERSHIP REPORTS (Dean / HOA / HOD)                              *
 * Class-grouped summaries, per-subject matrices, teacher performance *
 * and a school-wide leadership brief. Same math: present = P|L.      *
 * ================================================================== */

/** Natural sort for admission numbers ("ADM2" < "ADM10") and mixed codes. */
const natCmp = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

/* ------------------------------------------------- class-grouped summary */
export interface StudentLine {
  admNo: string; name: string; present: number; absent: number; late: number; unmarked: number; total: number; rate: number;
}
export interface ClassGroup {
  classCode: string; displayName: string; category: string;
  students: StudentLine[];
  present: number; absent: number; late: number; unmarked: number; total: number; rate: number;
  studentCount: number;
}
export interface GroupedSummary {
  classes: ClassGroup[];
  overall: { present: number; absent: number; late: number; unmarked: number; total: number; rate: number; students: number; classes: number };
}

/**
 * Group attendance by CLASS first (never random), each class sorted by student
 * name, with per-class totals and a school-wide total. Powers Weekly / Monthly /
 * Termly exports so leadership sees clean, categorized sections.
 */
export function computeGroupedSummary(rows: AnalyticsRow[]): GroupedSummary {
  const classMap: Record<string, {
    classCode: string; displayName: string; category: string;
    students: Record<string, StudentLine>;
  }> = {};

  for (const r of rows) {
    const cm = (classMap[r.classCode] ??= { classCode: r.classCode, displayName: r.classDisplayName, category: r.classCategory, students: {} });
    const s = (cm.students[r.admNo] ??= { admNo: r.admNo, name: r.name, present: 0, absent: 0, late: 0, unmarked: 0, total: 0, rate: 0 });
    s.total++;
    if (r.status === "present") s.present++;
    else if (r.status === "late") s.late++;
    else if (r.status === "absent") s.absent++;
    else s.unmarked++;
  }

  const classes: ClassGroup[] = Object.values(classMap).map((cm) => {
    const students = Object.values(cm.students)
      .map((s) => ({ ...s, rate: pct(s.present + s.late, s.present + s.late + s.absent) }))
      .sort((a, b) => natCmp(a.name, b.name));
    const agg = students.reduce((o, s) => {
      o.present += s.present; o.absent += s.absent; o.late += s.late; o.unmarked += s.unmarked; o.total += s.total; return o;
    }, { present: 0, absent: 0, late: 0, unmarked: 0, total: 0 });
    const marked = agg.present + agg.late + agg.absent;
    return { classCode: cm.classCode, displayName: cm.displayName, category: cm.category, students, ...agg, rate: pct(agg.present + agg.late, marked), studentCount: students.length };
  })
    // order by category, then class code — categorized, deterministic (never random)
    .sort((a, b) => natCmp(a.category, b.category) || natCmp(a.classCode, b.classCode));

  const o = classes.reduce((acc, c) => {
    acc.present += c.present; acc.absent += c.absent; acc.late += c.late; acc.unmarked += c.unmarked; acc.total += c.total; acc.students += c.studentCount; return acc;
  }, { present: 0, absent: 0, late: 0, unmarked: 0, total: 0, students: 0 });
  const oMarked = o.present + o.late + o.absent;

  return { classes, overall: { ...o, rate: pct(o.present + o.late, oMarked), classes: classes.length } };
}

/* ------------------------------------------------- per-student × subject matrix */
export interface StudentSubjectLine { subject: string; teacher: string; attended: number; total: number; rate: number; }
export interface StudentSubjectBlock {
  admNo: string; name: string; classCode: string; classDisplayName: string; category: string;
  subjects: StudentSubjectLine[];
  attended: number; total: number; rate: number;
}
export interface FullDataMatrix {
  classes: Array<{ classCode: string; displayName: string; category: string; students: StudentSubjectBlock[] }>;
  studentCount: number;
}

/**
 * "How many lessons you attended across every unit you study." Per student,
 * per subject: attended / total lessons + rate, plus the student's overall.
 * Grouped by class → categorized, no confusion. Powers the Full Data export.
 */
export function computeFullDataMatrix(rows: AnalyticsRow[]): FullDataMatrix {
  const students: Record<string, {
    admNo: string; name: string; classCode: string; classDisplayName: string; category: string;
    subj: Record<string, { attended: number; total: number; teachers: Record<string, number> }>;
    attended: number; total: number;
  }> = {};

  for (const r of rows) {
    const s = (students[r.admNo] ??= { admNo: r.admNo, name: r.name, classCode: r.classCode, classDisplayName: r.classDisplayName, category: r.classCategory, subj: {}, attended: 0, total: 0 });
    const subjName = r.subject?.trim() || "General / Unassigned";
    const sj = (s.subj[subjName] ??= { attended: 0, total: 0, teachers: {} });
    // count only real (marked) sessions towards lesson totals
    if (r.status === "unmarked") continue;
    sj.total++; s.total++;
    if (present(r.status)) { sj.attended++; s.attended++; }
    if (r.teacher) sj.teachers[r.teacher] = (sj.teachers[r.teacher] ?? 0) + 1;
  }

  const byClass: Record<string, { classCode: string; displayName: string; category: string; students: StudentSubjectBlock[] }> = {};
  for (const s of Object.values(students)) {
    const subjects = Object.entries(s.subj)
      .map(([subject, v]) => ({
        subject, attended: v.attended, total: v.total, rate: pct(v.attended, v.total),
        teacher: Object.entries(v.teachers).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—",
      }))
      .sort((a, b) => natCmp(a.subject, b.subject));
    const block: StudentSubjectBlock = {
      admNo: s.admNo, name: s.name, classCode: s.classCode, classDisplayName: s.classDisplayName, category: s.category,
      subjects, attended: s.attended, total: s.total, rate: pct(s.attended, s.total),
    };
    const c = (byClass[s.classCode] ??= { classCode: s.classCode, displayName: s.classDisplayName, category: s.category, students: [] });
    c.students.push(block);
  }
  const classes = Object.values(byClass)
    .map((c) => ({ ...c, students: c.students.sort((a, b) => natCmp(a.name, b.name)) }))
    .sort((a, b) => natCmp(a.category, b.category) || natCmp(a.classCode, b.classCode));

  return { classes, studentCount: Object.keys(students).length };
}

/* ------------------------------------------------- teacher performance (with UNITS) */
export interface TeacherPerformance {
  teacher: string; units: string[]; classes: string[];
  sessionsMarked: number;   // distinct (date, class, subject) sessions
  records: number;          // student-rows they touched
  completed: number;        // non-unmarked records
  complianceRate: number;   // completed / records — marking completeness
  presentRate: number;      // present|late / completed — attendance they record
  lastMarked: string | null;
}

/**
 * Teacher performance for leadership — CRUCIALLY includes the units/subjects each
 * teacher teaches (from the timetable directory, merged with subjects seen in
 * attendance). `dir` maps teacherName → {units, classes}.
 */
export function computeTeacherPerformance(
  rows: AnalyticsRow[],
  dir: Record<string, { units: string[]; classes: string[] }> = {},
): TeacherPerformance[] {
  const agg: Record<string, {
    teacher: string; sessions: Set<string>; records: number; completed: number; present: number;
    units: Set<string>; classes: Set<string>; last: string;
  }> = {};

  for (const r of rows) {
    if (!r.teacher) continue;
    const t = (agg[r.teacher] ??= { teacher: r.teacher, sessions: new Set(), records: 0, completed: 0, present: 0, units: new Set(), classes: new Set(), last: "" });
    t.records++;
    if (r.classCode) t.classes.add(r.classCode);
    if (r.subject?.trim()) t.units.add(r.subject.trim());
    if (r.status !== "unmarked") {
      t.completed++;
      // a "session" = one class marked on one day (robust to missing subject ids)
      t.sessions.add(`${r.date}|${r.classCode}`);
      if (present(r.status)) t.present++;
      if (r.date > t.last) t.last = r.date;
    }
  }

  return Object.values(agg)
    .map((t) => {
      const fromDir = dir[t.teacher];
      // prefer timetable units (authoritative); union with attendance-seen units
      const units = [...new Set([...(fromDir?.units ?? []), ...t.units])].sort();
      const classes = [...new Set([...(fromDir?.classes ?? []), ...t.classes])].sort();
      return {
        teacher: t.teacher, units, classes,
        sessionsMarked: t.sessions.size, records: t.records, completed: t.completed,
        complianceRate: pct(t.completed, t.records), presentRate: pct(t.present, t.completed),
        lastMarked: t.last || null,
      };
    })
    .sort((a, b) => b.sessionsMarked - a.sessionsMarked || b.records - a.records);
}

/* ------------------------------------------------- month-over-month trend */
export interface MonthStat { month: string; label: string; present: number; total: number; rate: number; }
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function computeMonthlyTrend(rows: AnalyticsRow[]): MonthStat[] {
  const agg: Record<string, { month: string; present: number; total: number }> = {};
  for (const r of rows) {
    if (r.status === "unmarked") continue;
    const key = r.date.slice(0, 7); // YYYY-MM
    const m = (agg[key] ??= { month: key, present: 0, total: 0 });
    m.total++; if (present(r.status)) m.present++;
  }
  return Object.values(agg)
    .map((m) => {
      const [y, mm] = m.month.split("-");
      return { ...m, label: `${MONTHS[Number(mm) - 1]} ${y}`, rate: pct(m.present, m.total) };
    })
    .sort((a, b) => a.month.localeCompare(b.month));
}

/* ------------------------------------------------- 80% attendance policy */
export const POLICY_THRESHOLD = 80; // institute attendance policy (%)

export interface PolicyRow { admNo: string; name: string; classCode: string; rate: number; total: number; status: "PASS" | "FAIL"; shortfall: number; }
export interface PolicyClass { classCode: string; displayName: string; category: string; pass: number; fail: number; total: number; passRate: number; }
export interface PolicyCompliance {
  threshold: number;
  students: PolicyRow[];
  pass: number; fail: number; total: number; passRate: number;
  byClass: PolicyClass[];
}

/** Flag every student PASS/FAIL against the attendance policy (default 80%). */
export function computePolicyCompliance(rows: AnalyticsRow[], threshold = POLICY_THRESHOLD): PolicyCompliance {
  const sa = computeStudentAnalytics(rows).filter((s) => s.total > 0);
  const grouped = computeGroupedSummary(rows);
  const meta = Object.fromEntries(grouped.classes.map((c) => [c.classCode, { displayName: c.displayName, category: c.category }]));

  const students: PolicyRow[] = sa
    .map((s) => ({ admNo: s.admNo, name: s.name, classCode: s.classCode, rate: s.rate, total: s.total, status: (s.rate >= threshold ? "PASS" : "FAIL") as "PASS" | "FAIL", shortfall: Math.max(0, threshold - s.rate) }))
    .sort((a, b) => natCmp(a.classCode, b.classCode) || a.rate - b.rate);

  const classAgg: Record<string, { classCode: string; pass: number; fail: number; total: number }> = {};
  for (const s of students) {
    const c = (classAgg[s.classCode] ??= { classCode: s.classCode, pass: 0, fail: 0, total: 0 });
    c.total++; if (s.status === "PASS") c.pass++; else c.fail++;
  }
  const byClass: PolicyClass[] = Object.values(classAgg)
    .map((c) => ({ ...c, displayName: meta[c.classCode]?.displayName ?? c.classCode, category: meta[c.classCode]?.category ?? "Other", passRate: pct(c.pass, c.total) }))
    .sort((a, b) => b.passRate - a.passRate);

  const pass = students.filter((s) => s.status === "PASS").length;
  return { threshold, students, pass, fail: students.length - pass, total: students.length, passRate: pct(pass, students.length), byClass };
}

/* ------------------------------------------------- chronic absentee watchlist */
export interface ChronicAbsentee {
  admNo: string; name: string; classCode: string;
  longestStreak: number;      // max consecutive absences ever in range
  currentStreak: number;      // consecutive absences ending on their latest session
  streakStart: string; streakEnd: string; // dates bounding the longest streak
  totalAbsences: number; total: number; rate: number;
  onWatch: boolean;           // currently absent for ≥ minStreak in a row
}

/**
 * Detect consecutive-absence runs per student (chronological, session by session).
 * `minStreak` (default 3) is the watchlist trigger. A late/present breaks a run.
 */
export function computeChronicAbsentees(rows: AnalyticsRow[], minStreak = 3): ChronicAbsentee[] {
  const byStudent: Record<string, { name: string; classCode: string; events: Array<{ date: string; sessionId: string; status: AttendanceStatus }> }> = {};
  for (const r of rows) {
    if (r.status === "unmarked") continue;
    const s = (byStudent[r.admNo] ??= { name: r.name, classCode: r.classCode, events: [] });
    s.events.push({ date: r.date, sessionId: r.sessionId, status: r.status });
  }

  const out: ChronicAbsentee[] = [];
  for (const [admNo, s] of Object.entries(byStudent)) {
    s.events.sort((a, b) => a.date.localeCompare(b.date) || natCmp(a.sessionId, b.sessionId));
    let longest = 0, cur = 0, longStart = "", longEnd = "", runStart = "";
    let present = 0, absences = 0;
    for (const e of s.events) {
      if (e.status === "absent") {
        absences++;
        if (cur === 0) runStart = e.date;
        cur++;
        if (cur > longest) { longest = cur; longStart = runStart; longEnd = e.date; }
      } else { present++; cur = 0; } // present or late — breaks the absence run
    }
    // currentStreak = trailing run of absences at the end of their timeline
    let currentStreak = 0;
    for (let i = s.events.length - 1; i >= 0; i--) { if (s.events[i].status === "absent") currentStreak++; else break; }
    const total = s.events.length;
    out.push({
      admNo, name: s.name, classCode: s.classCode,
      longestStreak: longest, currentStreak,
      streakStart: longStart, streakEnd: longEnd,
      totalAbsences: absences, total, rate: pct(present, total),
      onWatch: currentStreak >= minStreak,
    });
  }
  return out
    .filter((c) => c.longestStreak >= minStreak)
    .sort((a, b) => Number(b.onWatch) - Number(a.onWatch) || b.currentStreak - a.currentStreak || b.longestStreak - a.longestStreak);
}

/* ------------------------------------------------- register grid (day-by-day) */
export interface GridCol { key: string; date: string; sessionId: string; label: string; }
export interface GridStudentRow { admNo: string; name: string; cells: Record<string, string>; present: number; absent: number; late: number; marked: number; rate: number; }
export interface RegisterGridClass {
  classCode: string; displayName: string; category: string;
  columns: GridCol[];
  students: GridStudentRow[];
  colTotals: Record<string, { present: number; absent: number; late: number; marked: number; rate: number }>;
}

const LETTER: Record<AttendanceStatus, string> = { present: "P", absent: "A", late: "L", unmarked: "–" };

/**
 * The on-screen register, exported: per class a grid of students × (date+session)
 * columns filled with P/A/L/–, per-student totals, and per-column column totals.
 */
export function computeRegisterGrid(rows: AnalyticsRow[]): RegisterGridClass[] {
  const classes: Record<string, {
    classCode: string; displayName: string; category: string;
    cols: Map<string, GridCol>;
    students: Record<string, { admNo: string; name: string; cells: Record<string, string>; present: number; absent: number; late: number; marked: number }>;
  }> = {};

  for (const r of rows) {
    const c = (classes[r.classCode] ??= { classCode: r.classCode, displayName: r.classDisplayName, category: r.classCategory, cols: new Map(), students: {} });
    const key = `${r.date}#${r.sessionId}`;
    if (!c.cols.has(key)) c.cols.set(key, { key, date: r.date, sessionId: r.sessionId, label: gridLabel(r.date, r.sessionId) });
    const s = (c.students[r.admNo] ??= { admNo: r.admNo, name: r.name, cells: {}, present: 0, absent: 0, late: 0, marked: 0 });
    s.cells[key] = LETTER[r.status];
    if (r.status === "present") { s.present++; s.marked++; }
    else if (r.status === "late") { s.late++; s.marked++; }
    else if (r.status === "absent") { s.absent++; s.marked++; }
  }

  return Object.values(classes)
    .map((c) => {
      const columns = [...c.cols.values()].sort((a, b) => a.date.localeCompare(b.date) || natCmp(a.sessionId, b.sessionId));
      // clean labels: single session/day → just the date; multiple → date + S1/S2…
      const perDate: Record<string, GridCol[]> = {};
      for (const col of columns) (perDate[col.date] ??= []).push(col);
      for (const cols of Object.values(perDate)) {
        cols.forEach((col, i) => { col.label = cols.length > 1 ? `${dayDateLabel(col.date)} S${i + 1}` : dayDateLabel(col.date); });
      }
      const students: GridStudentRow[] = Object.values(c.students)
        .map((s) => ({ ...s, rate: pct(s.present + s.late, s.marked) }))
        .sort((a, b) => natCmp(a.name, b.name));
      const colTotals: RegisterGridClass["colTotals"] = {};
      for (const col of columns) {
        let p = 0, a = 0, l = 0;
        for (const s of students) {
          const v = s.cells[col.key];
          if (v === "P") p++; else if (v === "A") a++; else if (v === "L") l++;
        }
        const marked = p + a + l;
        colTotals[col.key] = { present: p, absent: a, late: l, marked, rate: pct(p + l, marked) };
      }
      return { classCode: c.classCode, displayName: c.displayName, category: c.category, columns, students, colTotals };
    })
    .sort((a, b) => natCmp(a.category, b.category) || natCmp(a.classCode, b.classCode));
}

const DAY3 = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** "Tue 23/06" — weekday + day/month, from an ISO date. */
function dayDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = DAY3[new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1)).getUTCDay()];
  return `${wd} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}
/** initial column label (refined per-day inside computeRegisterGrid). */
function gridLabel(iso: string, _sessionId: string): string { return dayDateLabel(iso); }

/* ------------------------------------------------- leadership brief */
export interface LeadershipSummary {
  overview: Overview;
  byClassRanked: Array<{ classCode: string; displayName: string; category: string; rate: number; total: number; students: number; band: "Good" | "Warning" | "Critical" }>;
  topSubjects: SubjectStat[];
  bottomSubjects: SubjectStat[];
  problematic: StudentAnalytics[];   // < 60%, ≥3 sessions
  topPerformers: StudentAnalytics[]; // ≥ 90%, ≥5 sessions
  teachers: TeacherPerformance[];
  monthlyTrend: MonthStat[];
  trend: { delta: number; arrow: "↑" | "↓" | "→"; latest: MonthStat | null; previous: MonthStat | null };
  policy: PolicyCompliance;
  chronic: ChronicAbsentee[];
}

export function computeLeadershipSummary(
  rows: AnalyticsRow[],
  dir: Record<string, { units: string[]; classes: string[] }> = {},
): LeadershipSummary {
  const overview = computeOverview(rows);
  const grouped = computeGroupedSummary(rows);
  const byClassRanked = grouped.classes
    .map((c) => ({ classCode: c.classCode, displayName: c.displayName, category: c.category, rate: c.rate, total: c.total, students: c.studentCount, band: statusBand(c.rate) }))
    .sort((a, b) => b.rate - a.rate);
  const { most, least } = topAndBottomSubjects(rows, 5, 3);
  const studentAnalytics = computeStudentAnalytics(rows);
  const problematic = studentAnalytics.filter((s) => s.total >= 3 && s.rate < 60).sort((a, b) => a.rate - b.rate);
  const topPerformers = studentAnalytics.filter((s) => s.total >= 5 && s.rate >= 90).sort((a, b) => b.rate - a.rate || b.total - a.total);
  const teachers = computeTeacherPerformance(rows, dir);
  const monthlyTrend = computeMonthlyTrend(rows);
  const latest = monthlyTrend[monthlyTrend.length - 1] ?? null;
  const previous = monthlyTrend[monthlyTrend.length - 2] ?? null;
  const delta = latest && previous ? latest.rate - previous.rate : 0;
  const arrow: "↑" | "↓" | "→" = delta > 1 ? "↑" : delta < -1 ? "↓" : "→";
  const policy = computePolicyCompliance(rows);
  const chronic = computeChronicAbsentees(rows, 3);

  return { overview, byClassRanked, topSubjects: most, bottomSubjects: least, problematic, topPerformers, teachers, monthlyTrend, trend: { delta, arrow, latest, previous }, policy, chronic };
}
