// POST /api/admin/timetable/apply { versionId }  — replace the entire school
// timetable with a saved version. Also used by "restore" from history.
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
    const r = await applyVersion(s, body.versionId);
    return ok(r);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "apply_failed", 400);
  }
}
