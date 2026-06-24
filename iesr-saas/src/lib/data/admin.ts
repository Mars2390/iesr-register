// Server-side data layer for the admin area. Everything is scoped to
// session.schoolId (admins see the whole school). Reads only — writes live in
// the /api/admin/* route handlers.
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  classes, students, teachers, admins, subjects, timetables, attendanceRecords, flagsIssues, activityLog, markingPresence,
} from "@/db/schema";
import type { SessionPayload } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates";

const num = (e: ReturnType<typeof sql>) => sql<number>`${e}`;
const ACTIVE_WINDOW = sql`now() - interval '45 seconds'`;

export async function getOverviewStats(session: SessionPayload) {
  const schoolId = session.schoolId;
  const today = formatDate(new Date());

  const [[c], [s], [t], [todayAgg], [flags], [active]] = await Promise.all([
    db.select({ n: num(sql`count(*)::int`) }).from(classes).where(and(eq(classes.schoolId, schoolId), eq(classes.active, true))),
    db.select({ n: num(sql`count(*)::int`) }).from(students).where(and(eq(students.schoolId, schoolId), eq(students.active, true))),
    db.select({ n: num(sql`count(*)::int`) }).from(teachers).where(and(eq(teachers.schoolId, schoolId), eq(teachers.active, true))),
    db.select({
      present: num(sql`count(*) filter (where ${attendanceRecords.status} = 'present')::int`),
      absent: num(sql`count(*) filter (where ${attendanceRecords.status} = 'absent')::int`),
      late: num(sql`count(*) filter (where ${attendanceRecords.status} = 'late')::int`),
      marked: num(sql`count(*)::int`),
    }).from(attendanceRecords).where(and(eq(attendanceRecords.schoolId, schoolId), eq(attendanceRecords.date, today))),
    db.select({ n: num(sql`count(*)::int`) }).from(flagsIssues).where(and(eq(flagsIssues.schoolId, schoolId), eq(flagsIssues.resolved, false))),
    db.select({ n: num(sql`count(*)::int`) }).from(markingPresence).where(and(eq(markingPresence.schoolId, schoolId), sql`${markingPresence.lastSeenAt} > ${ACTIVE_WINDOW}`)),
  ]);

  return {
    classes: c.n, students: s.n, teachers: t.n,
    today: todayAgg, openFlags: flags.n, activeNow: active.n,
  };
}

/** Live "who's marking now" + today's totals — polled by the monitor. */
export async function getMonitorData(session: SessionPayload) {
  const schoolId = session.schoolId;
  const today = formatDate(new Date());

  const [active, todayAgg] = await Promise.all([
    db.select({
      teacherName: teachers.name, className: classes.displayName, classCode: classes.code,
      subject: subjects.name, startedAt: markingPresence.startedAt, lastSeenAt: markingPresence.lastSeenAt,
    })
      .from(markingPresence)
      .leftJoin(teachers, eq(teachers.id, markingPresence.teacherId))
      .leftJoin(classes, eq(classes.id, markingPresence.classId))
      .leftJoin(subjects, eq(subjects.id, markingPresence.subjectId))
      .where(and(eq(markingPresence.schoolId, schoolId), sql`${markingPresence.lastSeenAt} > ${ACTIVE_WINDOW}`))
      .orderBy(desc(markingPresence.lastSeenAt)),
    db.select({
      present: num(sql`count(*) filter (where ${attendanceRecords.status} = 'present')::int`),
      absent: num(sql`count(*) filter (where ${attendanceRecords.status} = 'absent')::int`),
      late: num(sql`count(*) filter (where ${attendanceRecords.status} = 'late')::int`),
      marked: num(sql`count(*)::int`),
    }).from(attendanceRecords).where(and(eq(attendanceRecords.schoolId, schoolId), eq(attendanceRecords.date, today))),
  ]);

  return { active, today: todayAgg[0], generatedAt: new Date().toISOString() };
}

export async function listClasses(session: SessionPayload) {
  return db.select({
    id: classes.id, code: classes.code, displayName: classes.displayName, category: classes.category, active: classes.active,
    studentCount: num(sql`count(${students.id})::int`),
  })
    .from(classes)
    .leftJoin(students, and(eq(students.classId, classes.id), eq(students.active, true)))
    .where(eq(classes.schoolId, session.schoolId))
    .groupBy(classes.id)
    .orderBy(desc(classes.active), classes.displayName);
}

export async function listStudents(session: SessionPayload) {
  return db.select({
    id: students.id, admissionNo: students.admissionNo, fullName: students.fullName,
    classId: students.classId, className: classes.displayName, active: students.active,
  })
    .from(students)
    .leftJoin(classes, eq(classes.id, students.classId))
    .where(eq(students.schoolId, session.schoolId))
    .orderBy(students.fullName);
}

export async function listTeachers(session: SessionPayload) {
  return db.select({
    id: teachers.id, name: teachers.name, classIds: teachers.classIds, active: teachers.active,
  })
    .from(teachers)
    .where(eq(teachers.schoolId, session.schoolId))
    .orderBy(desc(teachers.active), teachers.name);
}

export async function listFlags(session: SessionPayload) {
  return db.select({
    id: flagsIssues.id, issueType: flagsIssues.issueType, description: flagsIssues.description,
    status: flagsIssues.status, resolved: flagsIssues.resolved, createdAt: flagsIssues.createdAt,
    teacherName: teachers.name, className: classes.displayName,
  })
    .from(flagsIssues)
    .leftJoin(teachers, eq(teachers.id, flagsIssues.teacherId))
    .leftJoin(classes, eq(classes.id, flagsIssues.classId))
    .where(eq(flagsIssues.schoolId, session.schoolId))
    .orderBy(flagsIssues.resolved, desc(flagsIssues.createdAt)) // open first, newest first
    .limit(200);
}

/** All attendance notes/tags across the school (teacher-entered during marking). */
export async function listNotes(
  session: SessionPayload, opts: { classId?: string; studentId?: string; limit?: number } = {},
) {
  const where = [
    eq(attendanceRecords.schoolId, session.schoolId),
    sql`(btrim(${attendanceRecords.notes}) <> '' OR jsonb_array_length(${attendanceRecords.tags}) > 0)`,
  ];
  if (opts.classId) where.push(eq(attendanceRecords.classId, opts.classId));
  if (opts.studentId) where.push(eq(attendanceRecords.studentId, opts.studentId));
  return db.select({
    id: attendanceRecords.id, date: attendanceRecords.date, status: attendanceRecords.status,
    notes: attendanceRecords.notes, tags: attendanceRecords.tags,
    studentId: attendanceRecords.studentId, studentName: students.fullName, admissionNo: students.admissionNo,
    classId: attendanceRecords.classId, className: classes.displayName,
    subject: subjects.name, teacherName: teachers.name,
  })
    .from(attendanceRecords)
    .leftJoin(students, eq(students.id, attendanceRecords.studentId))
    .leftJoin(classes, eq(classes.id, attendanceRecords.classId))
    .leftJoin(subjects, eq(subjects.id, attendanceRecords.subjectId))
    .leftJoin(teachers, eq(teachers.id, attendanceRecords.teacherId))
    .where(and(...where))
    .orderBy(desc(attendanceRecords.date), desc(attendanceRecords.updatedAt))
    .limit(opts.limit ?? 300);
}

/** Single student header (with class). Null if not in this school. */
export async function getStudentDetail(session: SessionPayload, studentId: string) {
  const [row] = await db.select({
    id: students.id, admissionNo: students.admissionNo, fullName: students.fullName,
    classId: students.classId, className: classes.displayName, classCode: classes.code, active: students.active,
  })
    .from(students)
    .leftJoin(classes, eq(classes.id, students.classId))
    .where(and(eq(students.id, studentId), eq(students.schoolId, session.schoolId)))
    .limit(1);
  return row ?? null;
}

/** Single teacher header (name + assigned classes). Null if not in this school. */
export async function getTeacherDetail(session: SessionPayload, teacherId: string) {
  const [row] = await db.select({
    id: teachers.id, name: teachers.name, classIds: teachers.classIds, active: teachers.active,
    createdAt: teachers.createdAt,
  })
    .from(teachers)
    .where(and(eq(teachers.id, teacherId), eq(teachers.schoolId, session.schoolId)))
    .limit(1);
  if (!row) return null;
  const cls = row.classIds.length
    ? await db.select({ id: classes.id, displayName: classes.displayName, code: classes.code })
        .from(classes).where(and(eq(classes.schoolId, session.schoolId), inArray(classes.id, row.classIds)))
    : [];
  return { ...row, classes: cls };
}

const DAY_ORDER: Record<string, number> = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 7 };

/** Whole-school timetable, joined to class/subject/teacher names. */
export async function listTimetable(session: SessionPayload) {
  const rows = await db.select({
    id: timetables.id,
    classId: timetables.classId, className: classes.displayName, classCode: classes.code,
    day: timetables.day, startTime: timetables.startTime, endTime: timetables.endTime,
    subjectId: timetables.subjectId, subjectName: subjects.name,
    teacherId: timetables.teacherId, teacherName: teachers.name,
  })
    .from(timetables)
    .leftJoin(classes, eq(classes.id, timetables.classId))
    .leftJoin(subjects, eq(subjects.id, timetables.subjectId))
    .leftJoin(teachers, eq(teachers.id, timetables.teacherId))
    .where(eq(timetables.schoolId, session.schoolId));
  return rows.sort((a, b) =>
    (a.className ?? "").localeCompare(b.className ?? "") ||
    (DAY_ORDER[a.day] ?? 9) - (DAY_ORDER[b.day] ?? 9) ||
    a.startTime.localeCompare(b.startTime));
}

/** Subjects (optionally per class) for the timetable form. */
export async function listSubjects(session: SessionPayload) {
  return db.select({ id: subjects.id, code: subjects.code, name: subjects.name, classId: subjects.classId, active: subjects.active })
    .from(subjects)
    .where(eq(subjects.schoolId, session.schoolId))
    .orderBy(subjects.name);
}

export async function listActivity(session: SessionPayload, limit = 100) {
  return db.select({
    id: activityLog.id, action: activityLog.action, meta: activityLog.meta, createdAt: activityLog.createdAt,
    teacherName: teachers.name, adminName: admins.name, className: classes.displayName,
  })
    .from(activityLog)
    .leftJoin(teachers, eq(teachers.id, activityLog.teacherId))
    .leftJoin(admins, eq(admins.id, activityLog.adminId))
    .leftJoin(classes, eq(classes.id, activityLog.classId))
    .where(eq(activityLog.schoolId, session.schoolId))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}
