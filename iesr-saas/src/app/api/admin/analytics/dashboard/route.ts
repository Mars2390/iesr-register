// GET /api/admin/analytics/dashboard?from&to&classId&teacherId
// One call powering the world-class admin overview. Recomputes live as
// registers are marked (the client polls this every ~15s).
import { requireAdmin } from "@/lib/auth/guards";
import { ok, unauthorized } from "@/lib/api";
import { getDashboardData } from "@/lib/data/dashboard";
import type { ReportFilters } from "@/lib/data/reports";

export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const url = new URL(req.url);
  const g = (k: string) => url.searchParams.get(k) || undefined;
  const filters: ReportFilters = { from: g("from"), to: g("to"), classId: g("classId"), teacherId: g("teacherId") };

  return ok(await getDashboardData(session, filters));
}
