// GET /api/admin/reports/export?format=csv|pdf&type=...&from&to&classId&teacherId
// Streams a downloadable CSV or PDF. PDF uses jsPDF → Node runtime.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { unauthorized, badRequest } from "@/lib/api";
import { getAnalyticsRows, type ReportFilters } from "@/lib/data/reports";
import { computeOverview, computeInsights, computeProblematic, computeMomentum } from "@/lib/analytics";
import { buildSummaryCsv, buildClassCsv, buildProblematicCsv } from "@/lib/export/csv";
import { buildMomentumPdf, buildProblematicPdf, buildHoaPdf } from "@/lib/export/pdf";
import { formatDate, addDays, noon } from "@/lib/dates";

export const runtime = "nodejs";

function filtersFrom(url: URL): ReportFilters {
  const g = (k: string) => url.searchParams.get(k) || undefined;
  return { from: g("from"), to: g("to"), classId: g("classId"), teacherId: g("teacherId") };
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "csv";
  const type = url.searchParams.get("type") ?? "weekly";
  const filters = filtersFrom(url);

  // default range = last 30 days
  const to = filters.to ?? formatDate(new Date());
  const from = filters.from ?? formatDate(addDays(noon(to), -30));
  const range = `${from} to ${to}`;
  const rows = await getAnalyticsRows(session, { ...filters, from, to });
  const stamp = formatDate(new Date());

  if (format === "csv") {
    let csv: string;
    if (type === "class") csv = buildClassCsv(rows, { title: "Class comparison", range });
    else if (type === "problematic") csv = buildProblematicCsv(rows, { title: "Problematic students", range });
    else csv = buildSummaryCsv(rows, { title: `${cap(type)} summary`, range });
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="IESR_${type}_${stamp}.csv"`,
      },
    });
  }

  if (format === "pdf") {
    let pdf: Uint8Array;
    if (type === "momentum") {
      if (!filters.teacherId) return badRequest("momentum_requires_teacher");
      pdf = buildMomentumPdf(computeMomentum(rows, rows[0]?.teacher ?? ""), range);
    } else if (type === "problematic") {
      pdf = buildProblematicPdf(computeProblematic(rows, 3), range);
    } else {
      pdf = buildHoaPdf(computeOverview(rows), computeInsights(rows), range);
    }
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="IESR_${type}_${stamp}.pdf"`,
      },
    });
  }

  return badRequest("invalid_format");
}
