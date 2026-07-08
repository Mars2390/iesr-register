// POST /api/admin/timetable/restore { versionId }  — roll back the whole-school
// timetable to a previous saved version (same effect as apply).
import { requireAdmin } from "@/lib/auth/guards";
import { ok, fail, unauthorized, badRequest } from "@/lib/api";
import { applyVersion } from "@/lib/data/timetableGen";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const s = await requireAdmin();
  if (!s) return unauthorized();
  const body = (await req.json().catch(() => null)) as { versionId?: string } | null;
  if (!body?.versionId) return badRequest("missing_version");
  try {
    return ok(await applyVersion(s, body.versionId));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "restore_failed", 400);
  }
}
