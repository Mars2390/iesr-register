// POST /api/presence — teacher heartbeat while a register is open. Upserts the
// teacher's marking_presence row (one per teacher+class+day); the admin monitor
// reads rows whose last_seen_at is within the active window.
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { markingPresence } from "@/db/schema";
import { requireTeacher } from "@/lib/auth/guards";
import { ok, unauthorized, forbidden, badRequest } from "@/lib/api";
import { teacherOwnsClass } from "@/lib/data/teacher";
import { formatDate } from "@/lib/dates";

interface Body { classId?: unknown; date?: unknown; sessionId?: unknown; subjectId?: unknown; }

export async function POST(req: Request) {
  const session = await requireTeacher();
  if (!session) return unauthorized();

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body || typeof body.classId !== "string") return badRequest("invalid_body");
  if (!teacherOwnsClass(session, body.classId)) return forbidden();

  const date = typeof body.date === "string" ? body.date : formatDate(new Date());
  const subjectId = typeof body.subjectId === "string" ? body.subjectId : null;
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : null;

  await db.insert(markingPresence).values({
    schoolId: session.schoolId, teacherId: session.sub, classId: body.classId,
    subjectId, date, sessionId,
  }).onConflictDoUpdate({
    target: [markingPresence.schoolId, markingPresence.teacherId, markingPresence.classId, markingPresence.date],
    set: { lastSeenAt: sql`now()`, subjectId: sql`excluded.subject_id`, sessionId: sql`excluded.session_id` },
  });

  return ok({ heartbeat: true });
}
