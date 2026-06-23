import { requireAdmin } from "@/lib/auth/guards";
import { ok, unauthorized } from "@/lib/api";
import { getAnalyticsRows, type ReportFilters } from "@/lib/data/reports";
import { computeOverview, computeInsights, computeProblematic, computeMomentum } from "@/lib/analytics";

function filtersFrom(url: URL): ReportFilters {
  const g = (k: string) => url.searchParams.get(k) || undefined;
  return { from: g("from"), to: g("to"), classId: g("classId"), teacherId: g("teacherId") };
}

export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const filters = filtersFrom(new URL(req.url));
  const rows = await getAnalyticsRows(session, filters);

  return ok({
    overview: computeOverview(rows),
    insights: computeInsights(rows),
    problematic: computeProblematic(rows, 3),
    momentum: filters.teacherId ? computeMomentum(rows, rows[0]?.teacher ?? "") : null,
    filters,
  });
}
