// "Everything pack" — bundles the full leadership report set into one ZIP so the
// Dean/HOA/HOD can download a complete, dated evidence pack in a single click.
// Uses jszip (already present via exceljs). Runs in the Node runtime.
import JSZip from "jszip";
import type { AnalyticsRow } from "@/lib/analytics";
import { computeLeadershipSummary, computeGroupedSummary } from "@/lib/analytics";
import { buildLeadershipPdf, buildCertificatesPdf } from "@/lib/export/pdf";
import {
  buildLeadershipXlsx, buildGroupedSummaryXlsx, buildRegisterGridXlsx, buildFullDataXlsx,
  buildTeacherPerformanceXlsx, buildPolicyXlsx, buildChronicXlsx, type XlsxMeta,
} from "@/lib/export/xlsx";
import { buildLeadershipCsv, type Meta } from "@/lib/export/csv";

export interface BundleOptions {
  rows: AnalyticsRow[];
  dir: Record<string, { units: string[]; classes: string[] }>;
  meta: XlsxMeta & Meta;             // shared title/from/to/schoolName/scope
  term?: string;
  includeCertificates?: boolean;     // certificates can be large (1 page/student)
}

/** Build the full report set and return the .zip bytes. */
export async function buildAllReportsZip(o: BundleOptions): Promise<Uint8Array> {
  const { rows, dir, meta } = o;
  const summary = computeLeadershipSummary(rows, dir);
  const grouped = computeGroupedSummary(rows);
  const zip = new JSZip();

  // headline documents
  zip.file("00_Leadership_Brief.pdf", buildLeadershipPdf(summary, { from: meta.from, to: meta.to, schoolName: meta.schoolName, scope: meta.scope }));
  zip.file("00_Leadership_Workbook.xlsx", await buildLeadershipXlsx(summary, { ...meta, title: "Attendance Leadership Brief" }));
  zip.file("00_Leadership_Data.csv", buildLeadershipCsv(summary, { ...meta, title: "Attendance Leadership Brief" }));

  // detailed workbooks
  zip.file("01_Attendance_Summary_by_Class.xlsx", await buildGroupedSummaryXlsx(rows, { ...meta, title: "Attendance Summary" }));
  zip.file("02_Weekly_Register_Grid.xlsx", await buildRegisterGridXlsx(rows, { ...meta, title: "Weekly Register Grid" }));
  zip.file("03_Full_Data_Student_x_Unit.xlsx", await buildFullDataXlsx(rows, { ...meta, title: "Full Attendance Data" }));
  zip.file("04_Teacher_Performance.xlsx", await buildTeacherPerformanceXlsx(rows, dir, { ...meta, title: "Teacher Performance" }));
  zip.file("05_Policy_Pass_Fail.xlsx", await buildPolicyXlsx(rows, { ...meta, title: "Attendance Policy Compliance" }));
  zip.file("06_Chronic_Absentee_Watchlist.xlsx", await buildChronicXlsx(rows, { ...meta, title: "Chronic Absentee Watchlist" }));

  // certificates (optional — one page per student)
  if (o.includeCertificates !== false) {
    zip.file("07_Attendance_Certificates.pdf", buildCertificatesPdf(grouped, { from: meta.from, to: meta.to, schoolName: meta.schoolName, term: o.term }));
  }

  // a small manifest so the pack is self-describing
  const manifest = [
    `${meta.schoolName ?? "IESR"} — Attendance Report Pack`,
    `Period: ${meta.from} to ${meta.to}${meta.scope ? "  ·  " + meta.scope : ""}`,
    `Generated: ${new Date().toISOString()}`,
    `Students: ${grouped.overall.students}  ·  Classes: ${grouped.overall.classes}  ·  Overall attendance: ${grouped.overall.rate}%`,
    "",
    "Contents:",
    "  00_Leadership_Brief.pdf ............ one-document brief with charts (for the Dean)",
    "  00_Leadership_Workbook.xlsx ........ same, as a 9-tab Excel workbook",
    "  00_Leadership_Data.csv ............. same, as CSV",
    "  01_Attendance_Summary_by_Class.xlsx  per-student totals grouped by class",
    "  02_Weekly_Register_Grid.xlsx ....... day-by-day P/A/L register",
    "  03_Full_Data_Student_x_Unit.xlsx ... lessons attended per unit, per student",
    "  04_Teacher_Performance.xlsx ........ units taught, sessions, compliance",
    "  05_Policy_Pass_Fail.xlsx ........... 80% attendance policy pass/fail",
    "  06_Chronic_Absentee_Watchlist.xlsx  consecutive-absence detection",
    o.includeCertificates !== false ? "  07_Attendance_Certificates.pdf ..... one signable page per student" : "",
  ].filter(Boolean).join("\n");
  zip.file("README.txt", manifest);

  const buf = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
  return buf;
}
