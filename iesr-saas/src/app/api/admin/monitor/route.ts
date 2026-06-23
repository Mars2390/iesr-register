// GET /api/admin/monitor — polled by the live monitor (~5s). Returns active
// markers (teachers marking right now) + today's attendance totals.
import { requireAdmin } from "@/lib/auth/guards";
import { ok, unauthorized } from "@/lib/api";
import { getMonitorData } from "@/lib/data/admin";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return unauthorized();
  return ok(await getMonitorData(session));
}
