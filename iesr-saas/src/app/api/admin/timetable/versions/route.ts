// GET /api/admin/timetable/versions            → list saved versions (no data blob)
// GET /api/admin/timetable/versions?id=<uuid>  → one full version (with data)
import { requireAdmin } from "@/lib/auth/guards";
import { ok, unauthorized, badRequest } from "@/lib/api";
import { listVersions, getVersion } from "@/lib/data/timetableGen";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const s = await requireAdmin();
  if (!s) return unauthorized();
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const v = await getVersion(s, id);
    if (!v) return badRequest("not_found");
    return ok(v);
  }
  return ok(await listVersions(s));
}
