// Attendance analytics — ported from legacy js/reports.js (_computeInsights,
// calculateTeacherAttendanceMomentum, problematic-student detection, by-class).
// Pure functions over normalized rows. EXACT legacy math preserved: a "present"
// session = present OR late; rate = round(present / total * 100).
import type { AttendanceStatus } from "@/types";

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
