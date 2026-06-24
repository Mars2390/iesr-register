// Public (pre-login) data for the free-access picker: classes for the school,
// and the trainers attached to a class. Scoped to DEFAULT_SCHOOL_ID. No session.
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { classes, teachers, students, attendanceRecords } from "@/db/schema";
import { formatDate } from "@/lib/dates";

const schoolId = () => process.env.DEFAULT_SCHOOL_ID ?? "";

export interface PublicStats { students: number; classes: number; todayPresent: number; todayMarked: number; rate: number; }

/** Real, pre-login headline stats for the landing page (no session). */
export async function getPublicStats(): Promise<PublicStats> {
  const sid = schoolId();
  if (!sid) return { students: 0, classes: 0, todayPresent: 0, todayMarked: 0, rate: 0 };
  const today = formatDate(new Date());
  const [[s], [c], [t]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(students).where(and(eq(students.schoolId, sid), eq(students.active, true))),
    db.select({ n: sql<number>`count(*)::int` }).from(classes).where(and(eq(classes.schoolId, sid), eq(classes.active, true))),
    db.select({
      present: sql<number>`count(*) filter (where ${attendanceRecords.status} in ('present','late'))::int`,
      marked: sql<number>`count(*) filter (where ${attendanceRecords.status} <> 'unmarked')::int`,
    }).from(attendanceRecords).where(and(eq(attendanceRecords.schoolId, sid), eq(attendanceRecords.date, today))),
  ]);
  const todayPresent = t?.present ?? 0;
  const todayMarked = t?.marked ?? 0;
  return {
    students: s?.n ?? 0, classes: c?.n ?? 0,
    todayPresent, todayMarked,
    rate: todayMarked ? Math.round((todayPresent / todayMarked) * 100) : 0,
  };
}

export async function getPublicClasses() {
  const sid = schoolId();
  if (!sid) return [];
  return db
    .select({ id: classes.id, code: classes.code, displayName: classes.displayName })
    .from(classes)
    .where(and(eq(classes.schoolId, sid), eq(classes.active, true)))
    .orderBy(asc(classes.displayName));
}

export async function getPublicTeachers(classId: string) {
  const sid = schoolId();
  if (!sid || !classId) return [];
  return db
    .select({ id: teachers.id, name: teachers.name })
    .from(teachers)
    .where(and(
      eq(teachers.schoolId, sid),
      eq(teachers.active, true),
      sql`${classId}::uuid = ANY(${teachers.classIds})`,
    ))
    .orderBy(asc(teachers.name));
}
