// POST /api/attendance — teacher submits a week's marking grid.
// Server is authoritative: re-derives records from the cells, drops any student
// id not in the class, validates, then upserts (idempotent on the unique key).
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { attendanceRecords, activityLog } from "@/db/schema";
import { requireTeacher } from "@/lib/auth/guards";
import { ok, unauthorized, forbidden, badRequest } from "@/lib/api";
import { teacherOwnsClass, getClassStudents } from "@/lib/data/teacher";
import { weekToRecords, SUBMISSION_CODE, type WeekAttendance } from "@/lib/attendance";
import { validateAttendanceRecords } from "@/lib/validation";
import { getWeekDates } from "@/lib/dates";

interface Body { classId?: unknown; weekStart?: unknown; cells?: unknown; submissionCode?: unknown; }

export async function POST(req: Request) {
  const session = await requireTeacher();
  if (!session) return unauthorized();

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body || typeof body.classId !== "string" || typeof body.weekStart !== "string" || typeof body.cells !== "object" || body.cells === null) {
    return badRequest("invalid_body");
  }
  if (String(body.submissionCode ?? "") !== SUBMISSION_CODE) return badRequest("invalid_code");
  const classId = body.classId;
  const weekStart = body.weekStart;
  if (!teacherOwnsClass(session, classId)) return forbidden();

  const studentRows = await getClassStudents(session, classId);
  const allowed = new Set((studentRows ?? []).map((s) => s.id));
  const weekDates = getWeekDates(weekStart);

  let records = weekToRecords(
    body.cells as WeekAttendance,
    { schoolId: session.schoolId, classId, teacherId: session.sub },
    { weekDates },
  ).filter((r) => allowed.has(r.studentId)); // never trust client-sent student ids

  const integrity = validateAttendanceRecords(records, weekDates);
  if (!integrity.valid) return badRequest("invalid_data");
  if (records.length === 0) return ok({ written: 0 });

  await db.insert(attendanceRecords).values(records).onConflictDoUpdate({
    target: [attendanceRecords.schoolId, attendanceRecords.studentId, attendanceRecords.date, attendanceRecords.sessionId],
    set: {
      status: sql`excluded.status`,
      subjectId: sql`excluded.subject_id`,
      teacherId: sql`excluded.teacher_id`,
      tags: sql`excluded.tags`,
      notes: sql`excluded.notes`,
      updatedAt: sql`now()`,
    },
  });

  await db.insert(activityLog).values({
    schoolId: session.schoolId, teacherId: session.sub, action: "submit_attendance",
    classId, meta: { weekStart, count: records.length },
  });

  return ok({ written: records.length });
}
