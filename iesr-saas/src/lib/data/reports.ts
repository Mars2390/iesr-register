// Server data for reports/analytics. Pulls attendance_records (joined to student/
// class/teacher/subject names) within optional filters, normalized to AnalyticsRow.
import { and, asc, eq, gte, lte, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { attendanceRecords, students, classes, teachers, subjects } from "@/db/schema";
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
      date: attendanceRecords.date, status: attendanceRecords.status,
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
    date: r.date,
    weekStart: getWeekStartStr(r.date),
    status: r.status,
    teacher: r.teacher ?? "",
    subject: r.subject ?? "",
  }));
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
