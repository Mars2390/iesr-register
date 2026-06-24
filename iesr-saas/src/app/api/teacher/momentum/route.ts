// GET /api/teacher/momentum?classId=… — cumulative per-student attendance
// momentum from day one (present/absent/late/rate). Powers the "Attendance
// Momentum" modal; never windowed, so the figures are lifetime totals.
import { requireTeacher } from "@/lib/auth/guards";
import { ok, unauthorized, forbidden, badRequest } from "@/lib/api";
import { getStudentMomentum } from "@/lib/data/teacher";

export async function GET(req: Request) {
  const session = await requireTeacher();
  if (!session) return unauthorized();
  const classId = new URL(req.url).searchParams.get("classId") ?? "";
  if (!classId) return badRequest("missing_classId");
  const rows = await getStudentMomentum(session, classId);
  if (rows === null) return forbidden();
  return ok({ momentum: rows });
}
