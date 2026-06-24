// POST /api/admin/data — destructive + import operations. Admin only, each
// gated by an explicit confirmation. Roster (students/teachers/classes/timetable)
// is preserved; only attendance + presence are cleared.
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { attendanceRecords, markingPresence, students, classes, activityLog } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { ok, unauthorized, badRequest } from "@/lib/api";
import { updateSchoolSettings } from "@/lib/data/settings";

export const runtime = "nodejs";

async function countAttendance(schoolId: string, from?: string, to?: string) {
  const where = [eq(attendanceRecords.schoolId, schoolId)];
  if (from) where.push(gte(attendanceRecords.date, from));
  if (to) where.push(lte(attendanceRecords.date, to));
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(attendanceRecords).where(and(...where));
  return r?.n ?? 0;
}

export async function POST(req: Request) {
  const s = await requireAdmin();
  if (!s) return unauthorized();
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const action = String(b?.action ?? "");

  // ---- clear ALL attendance ------------------------------------------------
  if (action === "clear_attendance") {
    if (String(b?.confirm ?? "") !== "DELETE") return badRequest("confirm_required");
    const n = await countAttendance(s.schoolId);
    await db.delete(attendanceRecords).where(eq(attendanceRecords.schoolId, s.schoolId));
    await db.delete(markingPresence).where(eq(markingPresence.schoolId, s.schoolId));
    await db.insert(activityLog).values({ schoolId: s.schoolId, adminId: s.sub, action: "clear_attendance", meta: { deleted: n } });
    return ok({ deleted: n });
  }

  // ---- reset for a new term (optionally bounded by date range) -------------
  if (action === "reset_term") {
    if (String(b?.confirm ?? "") !== "RESET") return badRequest("confirm_required");
    const from = typeof b?.from === "string" && b.from ? b.from : undefined;
    const to = typeof b?.to === "string" && b.to ? b.to : undefined;
    const n = await countAttendance(s.schoolId, from, to);
    const where = [eq(attendanceRecords.schoolId, s.schoolId)];
    if (from) where.push(gte(attendanceRecords.date, from));
    if (to) where.push(lte(attendanceRecords.date, to));
    await db.delete(attendanceRecords).where(and(...where));
    await db.delete(markingPresence).where(eq(markingPresence.schoolId, s.schoolId));
    if (typeof b?.term === "string" && b.term.trim()) await updateSchoolSettings(s.schoolId, { term: b.term.trim() });
    await db.insert(activityLog).values({ schoolId: s.schoolId, adminId: s.sub, action: "reset_term", meta: { deleted: n, from, to, term: b?.term } });
    return ok({ deleted: n });
  }

  // ---- import students from parsed CSV rows --------------------------------
  if (action === "import_students") {
    const rows = Array.isArray(b?.rows) ? (b.rows as Array<Record<string, unknown>>) : null;
    if (!rows) return badRequest("no_rows");
    if (rows.length > 3000) return badRequest("too_many_rows");

    const cls = await db.select({ id: classes.id, code: classes.code }).from(classes).where(eq(classes.schoolId, s.schoolId));
    const codeToId = new Map(cls.map((c) => [c.code.toUpperCase(), c.id]));

    const values: Array<{ schoolId: string; admissionNo: string; fullName: string; classId: string | null }> = [];
    const errors: string[] = [];
    for (const [i, r] of rows.entries()) {
      const admissionNo = String(r.admissionNo ?? "").trim();
      const fullName = String(r.fullName ?? "").trim();
      const classCode = String(r.classCode ?? "").trim().toUpperCase();
      if (!admissionNo || !fullName) { errors.push(`Row ${i + 1}: missing admission no. or name`); continue; }
      const classId = classCode ? codeToId.get(classCode) ?? null : null;
      if (classCode && !classId) errors.push(`Row ${i + 1}: unknown class code "${classCode}" (student added without class)`);
      values.push({ schoolId: s.schoolId, admissionNo, fullName, classId });
    }
    if (values.length === 0) return ok({ processed: 0, errors });

    await db.insert(students).values(values).onConflictDoUpdate({
      target: [students.schoolId, students.admissionNo],
      set: { fullName: sql`excluded.full_name`, classId: sql`excluded.class_id`, active: true, updatedAt: sql`now()` },
    });
    await db.insert(activityLog).values({ schoolId: s.schoolId, adminId: s.sub, action: "import_students", meta: { processed: values.length, errors: errors.length } });
    return ok({ processed: values.length, errors });
  }

  return badRequest("unknown_action");
}
