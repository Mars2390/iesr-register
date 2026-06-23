import { requireTeacher } from "@/lib/auth/guards";
import { ok, unauthorized, forbidden, badRequest } from "@/lib/api";
import { getClassStudents } from "@/lib/data/teacher";

export async function GET(req: Request) {
  const session = await requireTeacher();
  if (!session) return unauthorized();
  const classId = new URL(req.url).searchParams.get("classId") ?? "";
  if (!classId) return badRequest("missing_classId");
  const rows = await getClassStudents(session, classId);
  if (rows === null) return forbidden();
  return ok(rows);
}
