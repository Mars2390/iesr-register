// Whole-school timetable CRUD. Changes here propagate automatically to teacher
// dashboards — the marking grid reads getClassTimetable() from this table on
// every load, so there's nothing extra to push.
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { timetables, activityLog } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { ok, fail, unauthorized, badRequest } from "@/lib/api";
import { listTimetable, listClasses, listSubjects, listTeachers } from "@/lib/data/admin";

const DAYS = new Set(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

type DayValue = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
interface ParsedEntry { classId: string; day: DayValue; startTime: string; endTime: string; subjectId: string | null; teacherId: string | null; }

function parseEntry(b: Record<string, unknown>): { error: string } | { value: ParsedEntry } {
  const classId = String(b.classId ?? "");
  const day = String(b.day ?? "").toLowerCase();
  const startTime = String(b.startTime ?? "");
  const endTime = String(b.endTime ?? "");
  const subjectId = b.subjectId ? String(b.subjectId) : null;
  const teacherId = b.teacherId ? String(b.teacherId) : null;
  if (!classId) return { error: "missing_class" };
  if (!DAYS.has(day)) return { error: "invalid_day" };
  if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) return { error: "invalid_time" };
  if (endTime <= startTime) return { error: "end_before_start" };
  return { value: { classId, day: day as DayValue, startTime, endTime, subjectId, teacherId } };
}

export async function GET() {
  const s = await requireAdmin();
  if (!s) return unauthorized();
  const [entries, classes, subjects, teachers] = await Promise.all([
    listTimetable(s), listClasses(s), listSubjects(s), listTeachers(s),
  ]);
  return ok({ entries, options: { classes, subjects, teachers } });
}

export async function POST(req: Request) {
  const s = await requireAdmin();
  if (!s) return unauthorized();
  const b = await req.json().catch(() => null);
  if (!b) return badRequest("invalid_body");
  const p = parseEntry(b);
  if ("error" in p) return badRequest(p.error);
  try {
    const [row] = await db.insert(timetables)
      .values({ schoolId: s.schoolId, ...p.value })
      .returning({ id: timetables.id });
    await db.insert(activityLog).values({ schoolId: s.schoolId, adminId: s.sub, action: "create_timetable", classId: p.value.classId, meta: { day: p.value.day, startTime: p.value.startTime } });
    return ok({ id: row.id });
  } catch {
    return fail("save_failed", 409);
  }
}

export async function PATCH(req: Request) {
  const s = await requireAdmin();
  if (!s) return unauthorized();
  const b = await req.json().catch(() => null);
  const id = String(b?.id ?? "");
  if (!id) return badRequest("missing_id");
  const p = parseEntry(b);
  if ("error" in p) return badRequest(p.error);
  try {
    await db.update(timetables)
      .set({ ...p.value, updatedAt: new Date() })
      .where(and(eq(timetables.id, id), eq(timetables.schoolId, s.schoolId)));
    return ok({ updated: true });
  } catch {
    return fail("save_failed", 409);
  }
}

export async function DELETE(req: Request) {
  const s = await requireAdmin();
  if (!s) return unauthorized();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return badRequest("missing_id");
  // Hard delete — timetable rows are config; attendance stores its own sessionId
  // + subjectId, so removing a slot never orphans history.
  await db.delete(timetables).where(and(eq(timetables.id, id), eq(timetables.schoolId, s.schoolId)));
  await db.insert(activityLog).values({ schoolId: s.schoolId, adminId: s.sub, action: "delete_timetable", meta: { id } });
  return ok({ deleted: true });
}
