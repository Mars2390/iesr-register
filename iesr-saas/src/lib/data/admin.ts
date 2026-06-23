// Server-side data layer for the admin area. Everything is scoped to
// session.schoolId (admins see the whole school). Reads only — writes live in
// the /api/admin/* route handlers.
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  classes, students, teachers, admins, subjects, attendanceRecords, flagsIssues, activityLog, markingPresence,
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
