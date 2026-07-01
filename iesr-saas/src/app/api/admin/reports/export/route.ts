// GET /api/admin/reports/export?format=csv|pdf|xlsx&type=...&from&to&classId&teacherId
// Streams a downloadable CSV / PDF / XLSX. PDF+XLSX use Node runtime.
//
// CSV  types: weekly | monthly | termly | full | teachers | leadership | grid | policy | chronic | class | problematic
// XLSX types: weekly | monthly | termly | full | teachers | leadership | grid | policy | chronic
// PDF  types: leadership | certificates | hoa | problematic | momentum
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { unauthorized, badRequest } from "@/lib/api";
import { getAnalyticsRows, getTeacherUnits, type ReportFilters } from "@/lib/data/reports";
import { getSchoolSettings } from "@/lib/data/settings";
import {
  computeOverview, computeInsights, computeProblematic, computeMomentum,
  computeLeadershipSummary, computeGroupedSummary,
} from "@/lib/analytics";
import {
  buildGroupedSummaryCsv, buildFullDataCsv, buildTeacherPerformanceCsv, buildLeadershipCsv,
  buildRegisterGridCsv, buildPolicyCsv, buildChronicAbsenteeCsv, buildClassCsv, buildProblematicCsv, type Meta,
} from "@/lib/export/csv";
import {
  buildMomentumPdf, buildProblematicPdf, buildHoaPdf, buildLeadershipPdf, buildCertificatesPdf,
} from "@/lib/export/pdf";
import {
  buildGroupedSummaryXlsx, buildRegisterGridXlsx, buildFullDataXlsx, buildTeacherPerformanceXlsx,
  buildPolicyXlsx, buildChronicXlsx, buildLeadershipXlsx, type XlsxMeta,
} from "@/lib/export/xlsx";
import { buildAllReportsZip } from "@/lib/export/bundle";
import { formatDate, addDays, noon } from "@/lib/dates";

export const runtime = "nodejs";

function filtersFrom(url: URL): ReportFilters {
  const g = (k: string) => url.searchParams.get(k) || undefined;
  return { from: g("from"), to: g("to"), classId: g("classId"), teacherId: g("teacherId") };
}
const TITLES: Record<string, string> = {
  weekly: "Weekly Attendance Report", monthly: "Monthly Attendance Report", termly: "Termly Attendance Report",
  full: "Full Attendance Data — by Student & Unit", teachers: "Teacher Performance Report",
  leadership: "Attendance Leadership Brief", grid: "Weekly Register Grid", policy: "Attendance Policy Compliance",
  chronic: "Chronic Absentee Watchlist", certificates: "Attendance Certificates",
  class: "Class Comparison", problematic: "Problematic Students Report",
};
/** teacherName → {units, classes} directory for teacher-performance/leadership. */
function dirOf(units: Awaited<ReturnType<typeof getTeacherUnits>>) {
  return Object.fromEntries(units.map((t) => [t.name, { units: t.units, classes: t.classes }]));
}
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "csv";
  const type = url.searchParams.get("type") ?? "weekly";
  const filters = filtersFrom(url);

  const to = filters.to ?? formatDate(new Date());
  const from = filters.from ?? formatDate(addDays(noon(to), -30));

  const [rows, settings] = await Promise.all([
    getAnalyticsRows(session, { ...filters, from, to }),
    getSchoolSettings(session.schoolId),
  ]);
  const scopeParts: string[] = [];
  if (filters.classId && rows[0]) scopeParts.push(`Class ${rows[0].classCode}`);
  if (filters.teacherId && rows[0]?.teacher) scopeParts.push(`Teacher ${rows[0].teacher}`);
  const scope = scopeParts.join(" · ") || undefined;
  const title = TITLES[type] ?? "Attendance Report";
  const meta: Meta & XlsxMeta = { title, from, to, schoolName: settings.schoolName, scope };
  const stamp = formatDate(new Date());
  const needsDir = type === "teachers" || type === "leadership" || format === "zip";
  const dir = needsDir ? dirOf(await getTeacherUnits(session, filters)) : {};

  /* -------------------------------------------------- ZIP (everything pack) */
  if (format === "zip") {
    const buf = await buildAllReportsZip({
      rows, dir, meta, term: settings.term,
      includeCertificates: url.searchParams.get("certs") !== "0",
    });
    return new NextResponse(Buffer.from(buf), {
      headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="IESR_Report_Pack_${stamp}.zip"` },
    });
  }

  /* --------------------------------------------------------------- CSV */
  if (format === "csv") {
    let csv: string;
    switch (type) {
      case "weekly": csv = buildGroupedSummaryCsv(rows, meta, { weeklyTrend: true }); break;
      case "monthly": csv = buildGroupedSummaryCsv(rows, meta, { showStatus: true, policy: true, monthlyTrend: true }); break;
      case "termly": csv = buildGroupedSummaryCsv(rows, meta, { showStatus: true, policy: true, weeklyTrend: true, monthlyTrend: true }); break;
      case "full": csv = buildFullDataCsv(rows, meta); break;
      case "teachers": csv = buildTeacherPerformanceCsv(rows, dir, meta); break;
      case "leadership": csv = buildLeadershipCsv(computeLeadershipSummary(rows, dir), meta); break;
      case "grid": csv = buildRegisterGridCsv(rows, meta); break;
      case "policy": csv = buildPolicyCsv(rows, meta); break;
      case "chronic": csv = buildChronicAbsenteeCsv(rows, meta); break;
      case "class": csv = buildClassCsv(rows, meta); break;
      case "problematic": csv = buildProblematicCsv(rows, meta); break;
      default: csv = buildGroupedSummaryCsv(rows, meta); break;
    }
    return new NextResponse(csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="IESR_${type}_${stamp}.csv"` },
    });
  }

  /* -------------------------------------------------------------- XLSX */
  if (format === "xlsx") {
    let buf: Uint8Array;
    switch (type) {
      case "weekly": case "monthly": case "termly": buf = await buildGroupedSummaryXlsx(rows, meta); break;
      case "full": buf = await buildFullDataXlsx(rows, meta); break;
      case "teachers": buf = await buildTeacherPerformanceXlsx(rows, dir, meta); break;
      case "grid": buf = await buildRegisterGridXlsx(rows, meta); break;
      case "policy": buf = await buildPolicyXlsx(rows, meta); break;
      case "chronic": buf = await buildChronicXlsx(rows, meta); break;
      case "leadership": buf = await buildLeadershipXlsx(computeLeadershipSummary(rows, dir), meta); break;
      default: buf = await buildGroupedSummaryXlsx(rows, meta); break;
    }
    return new NextResponse(Buffer.from(buf), {
      headers: { "Content-Type": XLSX_MIME, "Content-Disposition": `attachment; filename="IESR_${type}_${stamp}.xlsx"` },
    });
  }

  /* --------------------------------------------------------------- PDF */
  if (format === "pdf") {
    let pdf: Uint8Array;
    if (type === "leadership") {
      pdf = buildLeadershipPdf(computeLeadershipSummary(rows, dirOf(await getTeacherUnits(session, filters))), { from, to, schoolName: settings.schoolName, scope });
    } else if (type === "certificates") {
      pdf = buildCertificatesPdf(computeGroupedSummary(rows), { from, to, schoolName: settings.schoolName, term: settings.term });
    } else if (type === "momentum") {
      if (!filters.teacherId) return badRequest("momentum_requires_teacher");
      pdf = buildMomentumPdf(computeMomentum(rows, rows[0]?.teacher ?? ""), `${from} to ${to}`);
    } else if (type === "problematic") {
      pdf = buildProblematicPdf(computeProblematic(rows, 3), `${from} to ${to}`);
    } else {
      pdf = buildHoaPdf(computeOverview(rows), computeInsights(rows), `${from} to ${to}`);
    }
    return new NextResponse(Buffer.from(pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="IESR_${type}_${stamp}.pdf"` },
    });
  }

  return badRequest("invalid_format");
}
