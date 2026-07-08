// GET /api/public/timetable — whole-school timetable for the landing page (no
// auth). Reads the same table as the admin timetable, so any admin edit shows up
// here on the next poll. force-dynamic → never cached.
import { ok } from "@/lib/api";
import { getPublicTimetable } from "@/lib/data/public";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok(await getPublicTimetable());
}
