// Server data for reports/analytics. Pulls attendance_records (joined to student/
// class/teacher/subject names) within optional filters, normalized to AnalyticsRow.
import { and, asc, eq, gte, lte, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { attendanceRecords, students, classes, teachers, subjects, timetables } from "@/db/schema";
import type { SessionPayload } from "@/lib/auth/session";
import type { AnalyticsRow } from "@/lib/analytics";
import { getWeekStartStr } from "@/lib/dates";

export interface ReportFilters {
  from?: string;       // YYYY-MM-DD
  to?: string;
  classId?: string;
  teacherId?: string;  // attendance teacher
  studentId?: string;  // single-student drill-down
}

export async function getAnalyticsRows(session: SessionPayload, f: ReportFilters): Promise<AnalyticsRow[]> {
  const where: SQL[] = [eq(attendanceRecords.schoolId, session.schoolId)];
  if (f.from) where.push(gte(attendanceRecords.date, f.from));
  if (f.to) where.push(lte(attendanceRecords.date, f.to));
  if (f.classId) where.push(eq(attendanceRecords.classId, f.classId));
  if (f.teacherId) where.push(eq(attendanceRecords.teacherId, f.teacherId));
  if (f.studentId) where.push(eq(attendanceRecords.studentId, f.studentId));

  const rows = await db
    .select({
      admNo: students.admissionNo, name: students.fullName,
      classId: attendanceRecords.classId, classCode: classes.code,
      classDisplayName: classes.displayName, classCategory: classes.category,
      date: attendanceRecords.date, status: attendanceRecords.status,
      sessionId: attendanceRecords.sessionId,
      teacher: teachers.name, subject: subjects.name,
    })
    .from(attendanceRecords)
    .leftJoin(students, eq(students.id, attendanceRecords.studentId))
    .leftJoin(classes, eq(classes.id, attendanceRecords.classId))
    .leftJoin(teachers, eq(teachers.id, attendanceRecords.teacherId))
    .leftJoin(subjects, eq(subjects.id, attendanceRecords.subjectId))
    .where(and(...where))
    .orderBy(asc(attendanceRecords.date));

  return rows.map((r) => ({
    admNo: r.admNo ?? "—",
    name: r.name ?? r.admNo ?? "—",
    classId: r.classId,
    classCode: r.classCode ?? "—",
    classDisplayName: r.classDisplayName ?? r.classCode ?? "—",
    classCategory: r.classCategory ?? "Other",
    date: r.date,
    weekStart: getWeekStartStr(r.date),
    sessionId: r.sessionId ?? "1",
    status: r.status,
    teacher: r.teacher ?? "",
    subject: r.subject ?? "",
  }));
}

/**
 * Teacher → units (subjects) + classes they teach, from the TIMETABLE (the
 * authoritative teacher↔subject link). This is what was missing from exports:
 * attendance rows often lack a subject, but the timetable always names the unit.
 * Filtered to the same class/teacher scope as the report when provided.
 */
export interface TeacherUnitInfo {
  teacherId: string;
  name: string;
  units: string[];   // distinct subject names, sorted
  classes: string[]; // distinct class codes, sorted
}

export async function getTeacherUnits(session: SessionPayload, f: ReportFilters = {}): Promise<TeacherUnitInfo[]> {
  const where: SQL[] = [eq(timetables.schoolId, session.schoolId)];
  if (f.classId) where.push(eq(timetables.classId, f.classId));
  if (f.teacherId) where.push(eq(timetables.teacherId, f.teacherId));

  const rows = await db
    .select({
      teacherId: teachers.id, name: teachers.name,
      unit: subjects.name, classCode: classes.code,
    })
    .from(timetables)
    .innerJoin(teachers, eq(teachers.id, timetables.teacherId))
    .leftJoin(subjects, eq(subjects.id, timetables.subjectId))
    .leftJoin(classes, eq(classes.id, timetables.classId))
    .where(and(...where));

  const agg: Record<string, { teacherId: string; name: string; units: Set<string>; classes: Set<string> }> = {};
  for (const r of rows) {
    const t = (agg[r.teacherId] ??= { teacherId: r.teacherId, name: r.name, units: new Set(), classes: new Set() });
    if (r.unit) t.units.add(r.unit);
    if (r.classCode) t.classes.add(r.classCode);
  }
  return Object.values(agg)
    .map((t) => ({ teacherId: t.teacherId, name: t.name, units: [...t.units].sort(), classes: [...t.classes].sort() }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Filter options for the reports UI. */
export async function getReportOptions(session: SessionPayload) {
  const [cls, tch] = await Promise.all([
    db.select({ id: classes.id, code: classes.code, displayName: classes.displayName })
      .from(classes).where(and(eq(classes.schoolId, session.schoolId), eq(classes.active, true))).orderBy(asc(classes.displayName)),
    db.select({ id: teachers.id, name: teachers.name })
      .from(teachers).where(and(eq(teachers.schoolId, session.schoolId), eq(teachers.active, true))).orderBy(asc(teachers.name)),
  ]);
  return { classes: cls, teachers: tch };
}
