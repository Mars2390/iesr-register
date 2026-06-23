import { requireTeacher } from "@/lib/auth/guards";
import { ok, unauthorized, forbidden, badRequest } from "@/lib/api";
import { getWeekAttendance } from "@/lib/data/teacher";
import { recordsToWeek } from "@/lib/attendance";

export async function GET(req: Request) {
  const session = await requireTeacher();
  if (!session) return unauthorized();
  const url = new URL(req.url);
  const classId = url.searchParams.get("classId") ?? "";
  const weekStart = url.searchParams.get("weekStart") ?? "";
  if (!classId || !weekStart) return badRequest("missing_params");
  const rows = await getWeekAttendance(session, classId, weekStart);
  if (rows === null) return forbidden();
  // Return both the raw rows and the ready-to-render grid map.
  return ok({ rows, cells: recordsToWeek(rows) });
}
