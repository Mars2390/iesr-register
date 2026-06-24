// Composes the admin analytics dashboard payload from raw attendance rows +
// school counts. Shared by the SSR page and the live-polling API route so both
// always return the exact same shape.
import type { SessionPayload } from "@/lib/auth/session";
import { getOverviewStats } from "@/lib/data/admin";
import { getAnalyticsRows, type ReportFilters } from "@/lib/data/reports";
import {
  computeOverview, computeInsights, computeDayPattern, topAndBottomSubjects,
  computeTeacherConsistency, computeStudentAnalytics, computeRiskBands, computePercentiles,
} from "@/lib/analytics";

export async function getDashboardData(session: SessionPayload, filters: ReportFilters) {
  const [stats, rows] = await Promise.all([
    getOverviewStats(session),
    getAnalyticsRows(session, filters),
  ]);

  const insights = computeInsights(rows);
  const studentAnalytics = computeStudentAnalytics(rows);
  const risk = computeRiskBands(studentAnalytics);
  const { lowest, highest } = computePercentiles(studentAnalytics);
  const teachers = computeTeacherConsistency(rows);

  return {
    generatedAt: new Date().toISOString(),
    filters,
    counts: { students: stats.students, classes: stats.classes, teachers: stats.teachers },
    today: stats.today,
    activeNow: stats.activeNow,
    openFlags: stats.openFlags,
    overview: computeOverview(rows),
    weeklyTrend: insights.weeklyTrend,
    trendArrow: insights.trendArrow,
    trendDelta: insights.trendDelta,
    byClass: insights.byClass,
    subjects: topAndBottomSubjects(rows, 5),
    dayPattern: computeDayPattern(rows),
    teacherConsistency: { top: teachers.slice(0, 5), bottom: teachers.slice().reverse().slice(0, 5) },
    risk,
    atRiskStudents: studentAnalytics.filter((s) => s.band !== "Good").slice(0, 12),
    lowestStudents: lowest,
    highestStudents: highest,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
