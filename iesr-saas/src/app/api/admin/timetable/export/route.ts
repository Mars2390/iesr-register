// GET /api/admin/timetable/export?versionId=<uuid>&format=xlsx|pdf
// Downloads a generated/saved timetable version as a branded workbook or PDF.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { unauthorized, badRequest } from "@/lib/api";
import { getVersion, type VersionData } from "@/lib/data/timetableGen";
import { getSchoolSettings } from "@/lib/data/settings";
import { buildTimetableXlsx, buildTimetablePdf } from "@/lib/export/timetable";

export const runtime = "nodejs";
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET(req: Request) {
  const s = await requireAdmin();
  if (!s) return unauthorized();
  const url = new URL(req.url);
  const versionId = url.searchParams.get("versionId");
  const format = url.searchParams.get("format") ?? "xlsx";
  if (!versionId) return badRequest("missing_version");

  const [version, settings] = await Promise.all([getVersion(s, versionId), getSchoolSettings(s.schoolId)]);
  if (!version) return badRequest("not_found");
  const data = version.data as unknown as VersionData;
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "pdf") {
    const pdf = buildTimetablePdf(data, settings.schoolName);
    return new NextResponse(Buffer.from(pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="IESR_Timetable_${stamp}.pdf"` },
    });
  }
  const xlsx = await buildTimetableXlsx(data, settings.schoolName);
  return new NextResponse(Buffer.from(xlsx), {
    headers: { "Content-Type": XLSX_MIME, "Content-Disposition": `attachment; filename="IESR_Timetable_${stamp}.xlsx"` },
  });
}
