// Public (pre-login) data for the free-access picker: classes for the school,
// and the trainers attached to a class. Scoped to DEFAULT_SCHOOL_ID. No session.
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { classes, teachers } from "@/db/schema";

const schoolId = () => process.env.DEFAULT_SCHOOL_ID ?? "";

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
