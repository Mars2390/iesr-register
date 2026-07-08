// Public (pre-login) data for the free-access picker: classes for the school,
// and the trainers attached to a class. Scoped to DEFAULT_SCHOOL_ID. No session.
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { classes, teachers, students, attendanceRecords, subjects, timetables } from "@/db/schema";
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

/* ---------------------------------------------------------------- public timetable */
const DAY_ORDER: Record<string, number> = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };

export interface PublicSession { day: string; startTime: string; endTime: string; subject: string; teacher: string; }
export interface PublicTimetableClass {
  id: string; code: string; displayName: string; name: string; category: string;
  sessions: PublicSession[];
}

/** Whole-school timetable for the landing page — active classes only, grouped by
 *  class, joined to subject + lecturer names. No session (public). */
export async function getPublicTimetable(): Promise<PublicTimetableClass[]> {
  const sid = schoolId();
  if (!sid) return [];
  const rows = await db
    .select({
      classId: timetables.classId, code: classes.code, displayName: classes.displayName, category: classes.category,
      day: timetables.day, startTime: timetables.startTime, endTime: timetables.endTime,
      subject: subjects.name, teacher: teachers.name,
    })
    .from(timetables)
    .innerJoin(classes, and(eq(classes.id, timetables.classId), eq(classes.active, true)))
    .leftJoin(subjects, eq(subjects.id, timetables.subjectId))
    .leftJoin(teachers, eq(teachers.id, timetables.teacherId))
    .where(eq(timetables.schoolId, sid));

  const map = new Map<string, PublicTimetableClass>();
  for (const r of rows) {
    let c = map.get(r.classId);
    if (!c) {
      const m = r.displayName.match(/\(([^)]+)\)\s*$/);
      c = { id: r.classId, code: r.code, displayName: r.displayName, name: m ? m[1].trim() : r.displayName, category: r.category, sessions: [] };
      map.set(r.classId, c);
    }
    c.sessions.push({ day: r.day, startTime: r.startTime, endTime: r.endTime, subject: r.subject ?? "General", teacher: r.teacher ?? "—" });
  }
  const list = [...map.values()];
  for (const c of list) {
    c.sessions.sort((a, b) => (DAY_ORDER[a.day] ?? 9) - (DAY_ORDER[b.day] ?? 9) || a.startTime.localeCompare(b.startTime));
  }
  return list.sort((a, b) => a.displayName.localeCompare(b.displayName));
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
