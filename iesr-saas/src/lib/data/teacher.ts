// Server-side data layer for the teacher area. Every function is scoped to the
// session's schoolId + assigned classIds, so a teacher can only ever read their
// own classes. Shared by the Server Components (direct call) and the thin
// /api/teacher/* routes (for client-side fetches).
import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  classes, students, subjects, teachers, timetables, attendanceRecords, flagsIssues,
} from "@/db/schema";
import type { SessionPayload } from "@/lib/auth/session";
import type { Session, AttendanceRow } from "@/lib/attendance";
import { getWeekDates, formatDate, addDays, noon } from "@/lib/dates";

const ids = (s: SessionPayload) => s.classIds ?? [];
export const teacherOwnsClass = (s: SessionPayload, classId: string) => ids(s).includes(classId);

export interface ClassCard {
  id: string; code: string; displayName: string; category: string; studentCount: number;
}

export async function getAssignedClasses(session: SessionPayload): Promise<ClassCard[]> {
  const classIds = ids(session);
  if (!classIds.length) return [];
  const rows = await db
    .select({
      id: classes.id, code: classes.code, displayName: classes.displayName, category: classes.category,
      studentCount: sql<number>`count(${students.id})::int`,
    })
    .from(classes)
    .leftJoin(students, and(eq(students.classId, classes.id), eq(students.active, true)))
    .where(and(eq(classes.schoolId, session.schoolId), inArray(classes.id, classIds), eq(classes.active, true)))
    .groupBy(classes.id)
    .orderBy(asc(classes.displayName));
  return rows;
}

export interface StudentRow { id: string; admissionNo: string; fullName: string; }

export async function getClassStudents(
  session: SessionPayload, classId: string,
): Promise<StudentRow[] | null> {
  if (!teacherOwnsClass(session, classId)) return null;
  return db
    .select({ id: students.id, admissionNo: students.admissionNo, fullName: students.fullName })
    .from(students)
    .where(and(eq(students.schoolId, session.schoolId), eq(students.classId, classId), eq(students.active, true)))
    .orderBy(asc(students.fullName));
}

export async function getClassInfo(session: SessionPayload, classId: string) {
  if (!teacherOwnsClass(session, classId)) return null;
  const [row] = await db
    .select({ id: classes.id, code: classes.code, displayName: classes.displayName, category: classes.category })
    .from(classes)
    .where(and(eq(classes.id, classId), eq(classes.schoolId, session.schoolId)))
    .limit(1);
  return row ?? null;
}

export async function getClassTimetable(
  session: SessionPayload, classId: string,
): Promise<Session[] | null> {
  if (!teacherOwnsClass(session, classId)) return null;
  const rows = await db
    .select({
      id: timetables.id, day: timetables.day, startTime: timetables.startTime, endTime: timetables.endTime,
      subjectId: timetables.subjectId, subject: subjects.name,
      teacherId: timetables.teacherId, teacher: teachers.name,
    })
    .from(timetables)
    .leftJoin(subjects, eq(subjects.id, timetables.subjectId))
    .leftJoin(teachers, eq(teachers.id, timetables.teacherId))
    .where(and(eq(timetables.schoolId, session.schoolId), eq(timetables.classId, classId)));
  return rows.map((r) => ({
    id: r.id, day: r.day, startTime: r.startTime, endTime: r.endTime,
    subject: r.subject ?? "", subjectId: r.subjectId,
    teacher: r.teacher ?? "", teacherId: r.teacherId,
  }));
}

export async function getWeekAttendance(
  session: SessionPayload, classId: string, weekStart: string,
): Promise<AttendanceRow[] | null> {
  if (!teacherOwnsClass(session, classId)) return null;
  const weekDates = getWeekDates(weekStart);
  const rows = await db
    .select({
      studentId: attendanceRecords.studentId, date: attendanceRecords.date,
      sessionId: attendanceRecords.sessionId, status: attendanceRecords.status,
      subjectId: attendanceRecords.subjectId, teacherId: attendanceRecords.teacherId,
      tags: attendanceRecords.tags, notes: attendanceRecords.notes,
    })
    .from(attendanceRecords)
    .where(and(
      eq(attendanceRecords.schoolId, session.schoolId),
      eq(attendanceRecords.classId, classId),
      inArray(attendanceRecords.date, weekDates),
    ));
  return rows as AttendanceRow[];
}

/** Attendance rows for an arbitrary [from, to] date range (inclusive). */
export async function getRangeAttendance(
  session: SessionPayload, classId: string, from: string, to: string,
): Promise<AttendanceRow[] | null> {
  if (!teacherOwnsClass(session, classId)) return null;
  const rows = await db
    .select({
      studentId: attendanceRecords.studentId, date: attendanceRecords.date,
      sessionId: attendanceRecords.sessionId, status: attendanceRecords.status,
      subjectId: attendanceRecords.subjectId, teacherId: attendanceRecords.teacherId,
      tags: attendanceRecords.tags, notes: attendanceRecords.notes,
    })
    .from(attendanceRecords)
    .where(and(
      eq(attendanceRecords.schoolId, session.schoolId),
      eq(attendanceRecords.classId, classId),
      gte(attendanceRecords.date, from),
      lte(attendanceRecords.date, to),
    ));
  return rows as AttendanceRow[];
}

export interface MomentumRow {
  studentId: string;
  present: number;
  absent: number;
  late: number;
  marked: number;
  firstDate: string | null;
  lastDate: string | null;
}

/**
 * Cumulative per-student attendance momentum from DAY ONE to the latest record.
 * Never windowed — counts every record ever saved for the class, so the rate is
 * a continuous lifetime figure that doesn't reset week to week.
 */
export async function getStudentMomentum(
  session: SessionPayload, classId: string,
): Promise<MomentumRow[] | null> {
  if (!teacherOwnsClass(session, classId)) return null;
  const rows = await db
    .select({
      studentId: attendanceRecords.studentId,
      present: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'present')::int`,
      absent: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'absent')::int`,
      late: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'late')::int`,
      marked: sql<number>`count(*) filter (where ${attendanceRecords.status} <> 'unmarked')::int`,
      firstDate: sql<string | null>`min(${attendanceRecords.date})`,
      lastDate: sql<string | null>`max(${attendanceRecords.date})`,
    })
    .from(attendanceRecords)
    .where(and(eq(attendanceRecords.schoolId, session.schoolId), eq(attendanceRecords.classId, classId)))
    .groupBy(attendanceRecords.studentId);
  return rows.map((r) => ({
    studentId: r.studentId, present: r.present, absent: r.absent, late: r.late, marked: r.marked,
    firstDate: r.firstDate ? formatDate(r.firstDate) : null,
    lastDate: r.lastDate ? formatDate(r.lastDate) : null,
  }));
}

/** Per-day summary across the teacher's classes for the last `days` days. */
export async function getRecentHistory(session: SessionPayload, days = 21) {
  const classIds = ids(session);
  if (!classIds.length) return [];
  const since = formatDate(addDays(noon(formatDate(new Date())), -days));
  return db
    .select({
      date: attendanceRecords.date,
      classId: attendanceRecords.classId,
      className: classes.displayName,
      present: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'present')::int`,
      absent: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'absent')::int`,
      late: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'late')::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(attendanceRecords)
    .leftJoin(classes, eq(classes.id, attendanceRecords.classId))
    .where(and(
      eq(attendanceRecords.schoolId, session.schoolId),
      inArray(attendanceRecords.classId, classIds),
      gte(attendanceRecords.date, since),
    ))
    .groupBy(attendanceRecords.date, attendanceRecords.classId, classes.displayName)
    .orderBy(desc(attendanceRecords.date));
}

export async function getTeacherFlags(session: SessionPayload) {
  return db
    .select({
      id: flagsIssues.id, issueType: flagsIssues.issueType, description: flagsIssues.description,
      status: flagsIssues.status, resolved: flagsIssues.resolved, createdAt: flagsIssues.createdAt,
      className: classes.displayName,
    })
    .from(flagsIssues)
    .leftJoin(classes, eq(classes.id, flagsIssues.classId))
    .where(and(eq(flagsIssues.schoolId, session.schoolId), eq(flagsIssues.teacherId, session.sub)))
    .orderBy(desc(flagsIssues.createdAt))
    .limit(50);
}
