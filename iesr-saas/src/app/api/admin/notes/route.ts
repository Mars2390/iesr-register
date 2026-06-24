// GET /api/admin/notes?classId= — all teacher-entered attendance notes/tags.
import { requireAdmin } from "@/lib/auth/guards";
import { ok, unauthorized } from "@/lib/api";
import { listNotes } from "@/lib/data/admin";

export async function GET(req: Request) {
  const s = await requireAdmin();
  if (!s) return unauthorized();
  const classId = new URL(req.url).searchParams.get("classId") || undefined;
  return ok(await listNotes(s, { classId }));
}
