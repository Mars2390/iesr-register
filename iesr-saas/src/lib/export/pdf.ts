// PDF export builders — ported from legacy js/reports.js (jsPDF + autotable).
// Runs in the Node runtime (the export route sets runtime = "nodejs"); uses the
// jspdf-autotable functional API. Each builder returns the PDF bytes.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Momentum, ProblematicResult, Insights, Overview, LeadershipSummary, GroupedSummary } from "@/lib/analytics";
import { statusBand } from "@/lib/analytics";

const BRAND: [number, number, number] = [11, 46, 99];    // kplc navy
const ACCENT: [number, number, number] = [20, 102, 184]; // kplc blue
const YELLOW: [number, number, number] = [245, 197, 24]; // kplc yellow
const SCHOOL_NAME = "Institute of Energy Studies & Research";
const bytes = (doc: jsPDF) => new Uint8Array(doc.output("arraybuffer") as ArrayBuffer);
const finalY = (doc: jsPDF) => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

/* --------------------------------------------------- official IESR/KPLC chrome */
// Load the IESR wordmark once (Node runtime). Falls back gracefully if missing.
let LOGO: string | null | undefined;
function logoDataUri(): string | null {
  if (LOGO !== undefined) return LOGO;
  try {
    const b = readFileSync(join(process.cwd(), "public", "images", "iesr-4.jpg"));
    LOGO = `data:image/jpeg;base64,${b.toString("base64")}`;
  } catch { LOGO = null; }
  return LOGO;
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const niceDate = (iso: string) => {
  const [y, m, d] = (iso ?? "").split("-");
  return y && m && d ? `${d} ${MONTHS_SHORT[Number(m) - 1] ?? m} ${y}` : iso ?? "";
};

interface HeaderOpts { title: string; from?: string; to?: string; sub?: string; schoolName?: string; }

/**
 * Official IESR / Kenya Power report header: navy band, IESR logo top-left,
 * "An Initiative of Kenya Power" top-right, centred title, period + school name,
 * and a yellow accent divider. Returns the Y at which body content should start.
 */
function officialHeader(doc: jsPDF, o: HeaderOpts): number {
  const W = doc.internal.pageSize.getWidth();
  const school = o.schoolName ?? SCHOOL_NAME;
  const bandH = 34;

  doc.setFillColor(...BRAND); doc.rect(0, 0, W, bandH, "F");

  // logo on a white chip for contrast
  const logo = logoDataUri();
  if (logo) {
    doc.setFillColor(255, 255, 255); doc.roundedRect(12, 6, 22, 22, 2, 2, "F");
    try { doc.addImage(logo, "JPEG", 13.5, 7.5, 19, 19); } catch { /* skip on decode issue */ }
  }

  // school identity next to the logo
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("IESR", 40, 14);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(school, 40, 20);
  doc.setTextColor(...YELLOW); doc.setFontSize(7.5);
  doc.text("An Initiative of Kenya Power", 40, 26);

  // right-aligned institutional tag
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.text("Kenya Power · IESR", W - 12, 12, { align: "right" });
  doc.setFontSize(7); doc.setTextColor(210, 220, 235);
  doc.text("OFFICIAL ATTENDANCE DOCUMENT", W - 12, 18, { align: "right" });

  // centred title + period
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
  doc.text(o.title, W / 2, 15, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(225, 232, 245);
  const period = o.from && o.to ? `Period: ${niceDate(o.from)} to ${niceDate(o.to)}` : (o.sub ?? "");
  if (period) doc.text(period, W / 2, 24, { align: "center" });
  if (o.sub && o.from) doc.text(o.sub, W / 2, 30, { align: "center" });

  // yellow accent divider
  doc.setFillColor(...YELLOW); doc.rect(0, bandH, W, 1.6, "F");
  doc.setTextColor(0); doc.setFont("helvetica", "normal");
  return bandH + 10; // content start
}

/** Confidential footer + page numbers on every page. Call just before bytes(). */
function officialFooter(doc: jsPDF, schoolName?: string) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const school = schoolName ?? SCHOOL_NAME;
  const pages = doc.getNumberOfPages();
  const gen = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(210); doc.setLineWidth(0.2); doc.line(12, H - 12, W - 12, H - 12);
    doc.setFontSize(7.5); doc.setTextColor(140); doc.setFont("helvetica", "normal");
    doc.text(`${school} · Kenya Power  ·  Generated ${gen}`, 12, H - 7);
    doc.text(`Page ${p} of ${pages}`, W - 12, H - 7, { align: "right" });
  }
  doc.setTextColor(0);
}

/** Shared meta for the branded builders. */
export interface ReportMeta { from?: string; to?: string; schoolName?: string; scope?: string; }
const sectionTitle = (doc: jsPDF, text: string, y: number) => {
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...BRAND);
  doc.text(text, 15, y); doc.setTextColor(0); doc.setFont("helvetica", "normal");
};

/** Teacher momentum (legacy exportTeacherMomentumPDF). */
export function buildMomentumPdf(m: Momentum, meta: ReportMeta = {}): Uint8Array {
  const doc = new jsPDF("landscape");
  let y = officialHeader(doc, { title: "Teacher Attendance Momentum Report", from: meta.from, to: meta.to, sub: `Teacher: ${m.teacher || "—"}`, schoolName: meta.schoolName });

  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...BRAND);
  doc.text(
    `Lessons: ${m.totalLessons}    Present: ${m.totalPresent}    Absent: ${m.totalAbsent}    Late: ${m.totalLate}    Overall: ${m.overallPercentage}%`,
    15, y,
  );
  doc.setTextColor(0); doc.setFont("helvetica", "normal"); y += 6;

  autoTable(doc, {
    startY: y,
    head: [["Student", "Admission", "Present", "Absent", "Late", "Total", "%", "Status"]],
    body: m.studentDetails.map((s) => [
      s.name.slice(0, 28), s.admission, s.present, s.absent, s.late, s.total, `${s.percentage}%`, statusBand(s.percentage),
    ]),
    theme: "grid", styles: { fontSize: 8 }, headStyles: { fillColor: BRAND },
  });

  y = finalY(doc) + 12;
  sectionTitle(doc, "Weekly trends", y);
  autoTable(doc, {
    startY: y + 4,
    head: [["Week of", "Present", "Absent", "Total", "Attendance %"]],
    body: m.weeklyTrends.map((w) => [niceDate(w.weekStart), w.present, w.absent, w.total, `${w.attendancePercentage}%`]),
    theme: "striped", styles: { fontSize: 9 }, headStyles: { fillColor: BRAND },
  });
  officialFooter(doc, meta.schoolName);
  return bytes(doc);
}

/** Problematic students (legacy exportProblematicStudentsCSV → PDF form). */
export function buildProblematicPdf(p: ProblematicResult, meta: ReportMeta = {}): Uint8Array {
  const doc = new jsPDF();
  const y = officialHeader(doc, { title: "Problematic Students Report", from: meta.from, to: meta.to, sub: "Students with 3+ missed sessions", schoolName: meta.schoolName });
  autoTable(doc, {
    startY: y,
    head: [["Student", "Admission", "Class", "Overall %", "Missed", "Action"]],
    body: p.students.map((s) => [s.name.slice(0, 26), s.admission, s.classCode, `${s.overallPercentage}%`, s.missedCount, s.action]),
    theme: "grid", styles: { fontSize: 8 }, headStyles: { fillColor: BRAND },
  });
  if (p.subjectFlags.length) {
    const y2 = finalY(doc) + 12;
    sectionTitle(doc, "Subject-specific issues", y2);
    autoTable(doc, {
      startY: y2 + 4,
      head: [["Student", "Unit / Subject", "Teacher", "Missed", "Last missed"]],
      body: p.subjectFlags.map((f) => [f.studentName.slice(0, 24), f.subject, f.teacher, f.missedCount, niceDate(f.lastMissed)]),
      theme: "striped", styles: { fontSize: 8 }, headStyles: { fillColor: BRAND },
    });
  }
  officialFooter(doc, meta.schoolName);
  return bytes(doc);
}

/** HOA/HOD overview: school totals + class comparison (legacy HOA report). */
export function buildHoaPdf(overview: Overview, insights: Insights, meta: ReportMeta = {}): Uint8Array {
  const doc = new jsPDF();
  let y = officialHeader(doc, { title: "Head of Department — Attendance Report", from: meta.from, to: meta.to, schoolName: meta.schoolName });

  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...BRAND);
  doc.text(
    `Students: ${overview.students}    Sessions: ${overview.total}    Present: ${overview.present}    Absent: ${overview.absent}    Late: ${overview.late}    Rate: ${overview.rate}%`,
    15, y,
  );
  doc.setTextColor(0); doc.setFont("helvetica", "normal"); y += 8;

  sectionTitle(doc, "Attendance by class", y);
  autoTable(doc, {
    startY: y + 4,
    head: [["Class", "Sessions", "Attendance %", "Status"]],
    body: insights.byClass.map((c) => [c.classCode, c.total, `${c.rate}%`, statusBand(c.rate)]),
    theme: "grid", styles: { fontSize: 9 }, headStyles: { fillColor: BRAND },
  });

  y = finalY(doc) + 12;
  sectionTitle(doc, "Most absent students", y);
  autoTable(doc, {
    startY: y + 4,
    head: [["Student", "Admission", "Class", "Absent", "Absence %"]],
    body: insights.mostAbsent.map((s) => [s.name.slice(0, 26), s.admNo, s.classCode, s.absent, `${s.rate}%`]),
    theme: "striped", styles: { fontSize: 8 }, headStyles: { fillColor: BRAND },
  });
  officialFooter(doc, meta.schoolName);
  return bytes(doc);
}

/* ================================================================== *
 * LEADERSHIP BRIEF (Dean / HOA / HOD) — the flagship one-document view *
 * ================================================================== */
const bandColor = (band: string): [number, number, number] =>
  band === "Good" ? [16, 122, 87] : band === "Warning" ? [180, 120, 10] : [176, 42, 55];

export interface LeadershipMeta { from: string; to: string; schoolName?: string; scope?: string; }

export function buildLeadershipPdf(s: LeadershipSummary, meta: LeadershipMeta): Uint8Array {
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();

  // ---- official IESR / Kenya Power header (logo + wordmark + divider)
  officialHeader(doc, { title: "Attendance Leadership Brief", from: meta.from, to: meta.to, sub: meta.scope, schoolName: meta.schoolName });

  // ---- headline KPI strip (just below the header divider)
  const kpis: Array<[string, string]> = [
    ["Overall attendance", `${s.overview.rate}%`],
    ["Students", `${s.overview.students}`],
    ["Sessions", `${s.overview.total}`],
    ["Below 60%", `${s.problematic.length}`],
  ];
  if (s.trend.latest && s.trend.previous) kpis.push(["Month trend", `${s.trend.arrow} ${s.trend.delta >= 0 ? "+" : ""}${s.trend.delta}%`]);
  const cardW = (W - 30) / kpis.length;
  kpis.forEach(([label, val], i) => {
    const x = 15 + i * cardW;
    doc.setDrawColor(225); doc.setFillColor(246, 248, 251);
    doc.roundedRect(x, 46, cardW - 4, 20, 2, 2, "FD");
    doc.setTextColor(...ACCENT); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text(val, x + 4, 56);
    doc.setTextColor(110); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
    doc.text(label.toUpperCase(), x + 4, 62);
  });
  doc.setTextColor(0);

  const section = (title: string, y: number) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...BRAND);
    doc.text(title, 15, y); doc.setTextColor(0); doc.setFont("helvetica", "normal");
  };

  // ---- class ranking
  section("Class attendance — ranked (best to worst)", 70);
  autoTable(doc, {
    startY: 74,
    head: [["#", "Class", "Programme", "Students", "Sessions", "Rate", "Status"]],
    body: s.byClassRanked.map((c, i) => [i + 1, c.classCode, c.displayName.slice(0, 34), c.students, c.total, `${c.rate}%`, c.band]),
    theme: "grid", styles: { fontSize: 8 }, headStyles: { fillColor: BRAND },
    didParseCell: (d) => { if (d.section === "body" && d.column.index === 6) d.cell.styles.textColor = bandColor(String(d.cell.raw)); },
  });

  // ---- top / bottom units side note
  let y = finalY(doc) + 10;
  section("Most-attended units", y);
  autoTable(doc, {
    startY: y + 4, margin: { right: W / 2 + 2 },
    head: [["Unit", "Rate"]],
    body: s.topSubjects.map((u) => [u.subject.slice(0, 26), `${u.rate}%`]),
    theme: "striped", styles: { fontSize: 7.5 }, headStyles: { fillColor: ACCENT },
  });
  const yTop = finalY(doc);
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...BRAND);
  doc.text("Least-attended units", W / 2 + 4, y); doc.setTextColor(0); doc.setFont("helvetica", "normal");
  autoTable(doc, {
    startY: y + 4, margin: { left: W / 2 + 2 },
    head: [["Unit", "Rate"]],
    body: s.bottomSubjects.map((u) => [u.subject.slice(0, 26), `${u.rate}%`]),
    theme: "striped", styles: { fontSize: 7.5 }, headStyles: { fillColor: ACCENT },
  });
  y = Math.max(yTop, finalY(doc)) + 10;

  // ---- students needing attention
  section("Students needing attention (below 60%)", y);
  autoTable(doc, {
    startY: y + 4,
    head: [["Student", "Admission", "Class", "Rate", "Absences", "Most-missed unit"]],
    body: s.problematic.length
      ? s.problematic.slice(0, 20).map((p) => [p.name.slice(0, 26), p.admNo, p.classCode, `${p.rate}%`, p.absent, (p.mostMissed ?? "—").slice(0, 22)])
      : [["None — every student is at or above 60%", "", "", "", "", ""]],
    theme: "grid", styles: { fontSize: 8 }, headStyles: { fillColor: [176, 42, 55] },
  });
  y = finalY(doc) + 10;

  // ---- top performers
  section("Top performing students (90%+)", y);
  autoTable(doc, {
    startY: y + 4,
    head: [["Student", "Admission", "Class", "Rate", "Sessions"]],
    body: s.topPerformers.length
      ? s.topPerformers.slice(0, 15).map((p) => [p.name.slice(0, 28), p.admNo, p.classCode, `${p.rate}%`, p.total])
      : [["None reached 90% this period", "", "", "", ""]],
    theme: "grid", styles: { fontSize: 8 }, headStyles: { fillColor: [16, 122, 87] },
  });
  y = finalY(doc) + 10;

  // ---- teacher compliance (with UNITS)
  section("Teacher marking compliance", y);
  autoTable(doc, {
    startY: y + 4,
    head: [["Teacher", "Units taught", "Classes", "Sessions", "Compliance", "Last marked"]],
    body: s.teachers.map((t) => [
      t.teacher.slice(0, 22),
      (t.units.length ? t.units.join(", ") : "—").slice(0, 40),
      t.classes.join(", ").slice(0, 24),
      t.sessionsMarked, `${t.complianceRate}%`, t.lastMarked ? niceDate(t.lastMarked) : "—",
    ]),
    theme: "grid", styles: { fontSize: 7.5 }, headStyles: { fillColor: BRAND },
  });

  // ---- 80% policy compliance
  y = finalY(doc) + 10;
  section(`Attendance policy compliance (${s.policy.threshold}% target)`, y);
  autoTable(doc, {
    startY: y + 4,
    head: [["Class", "Programme", "Students", "Pass", "Fail", "Pass rate"]],
    body: [
      ...s.policy.byClass.map((c) => [c.classCode, c.displayName.slice(0, 30), c.total, c.pass, c.fail, `${c.passRate}%`]),
      ["SCHOOL-WIDE", "", s.policy.total, s.policy.pass, s.policy.fail, `${s.policy.passRate}%`],
    ],
    theme: "grid", styles: { fontSize: 8 }, headStyles: { fillColor: BRAND },
    didParseCell: (d) => {
      if (d.section === "body" && d.row.index === s.policy.byClass.length) d.cell.styles.fontStyle = "bold";
      if (d.section === "body" && d.column.index === 5) d.cell.styles.textColor = Number(String(d.cell.raw).replace("%", "")) >= 50 ? [16, 122, 87] : [176, 42, 55];
    },
  });

  // ---- chronic absentee watchlist
  y = finalY(doc) + 10;
  section("Chronic absentee watchlist (3+ in a row)", y);
  autoTable(doc, {
    startY: y + 4,
    head: [["Class", "Student", "Admission", "Current", "Longest", "Absences", "Rate"]],
    body: s.chronic.length
      ? s.chronic.slice(0, 15).map((c) => [c.classCode, c.name.slice(0, 24), c.admNo, c.currentStreak, c.longestStreak, c.totalAbsences, `${c.rate}%`])
      : [["None — no student had 3+ consecutive absences", "", "", "", "", "", ""]],
    theme: "grid", styles: { fontSize: 8 }, headStyles: { fillColor: [180, 120, 10] },
    didParseCell: (d) => { if (d.section === "body" && d.column.index === 3 && Number(d.cell.raw) >= 3) d.cell.styles.textColor = [176, 42, 55]; },
  });

  // ---- CHARTS page: class-rate bars + month trend line
  doc.addPage();
  doc.setFillColor(...BRAND); doc.rect(0, 0, W, 20, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text("Visual summary", 15, 13); doc.setTextColor(0); doc.setFont("helvetica", "normal");

  drawBarChart(doc, "Attendance rate by class", 15, 32, W - 30, 90,
    s.byClassRanked.map((c) => ({ label: c.classCode, value: c.rate, band: c.band })));

  if (s.monthlyTrend.length >= 2) {
    drawLineChart(doc, "Attendance trend (month over month)", 15, 140, W - 30, 90,
      s.monthlyTrend.map((m) => ({ label: m.label, value: m.rate })));
  } else {
    doc.setFontSize(10); doc.setTextColor(120);
    doc.text("Trend chart needs at least two months of data.", 15, 150); doc.setTextColor(0);
  }

  // ---- month trend table (kept for exact numbers, on the charts page)
  if (s.monthlyTrend.length) {
    section("Month-over-month trend", 240);
    autoTable(doc, {
      startY: 244,
      head: [["Month", "Attendance %", "Change"]],
      body: s.monthlyTrend.map((m, i) => {
        const prev = s.monthlyTrend[i - 1];
        return [m.label, `${m.rate}%`, prev ? `${m.rate - prev.rate >= 0 ? "+" : ""}${m.rate - prev.rate}%` : "—"];
      }),
      theme: "striped", styles: { fontSize: 8 }, headStyles: { fillColor: ACCENT },
    });
  }

  officialFooter(doc, meta.schoolName);
  return bytes(doc);
}

/* ------------------------------------------------- drawn charts (no chart lib) */
function drawBarChart(
  doc: jsPDF, title: string, x: number, y: number, w: number, h: number,
  data: Array<{ label: string; value: number; band?: string }>,
) {
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...BRAND);
  doc.text(title, x, y - 3); doc.setTextColor(0); doc.setFont("helvetica", "normal");
  const plotX = x + 12, plotY = y, plotW = w - 12, plotH = h - 12;
  // gridlines + y labels (0,50,100)
  doc.setDrawColor(230); doc.setFontSize(7); doc.setTextColor(150);
  for (const g of [0, 25, 50, 75, 100]) {
    const gy = plotY + plotH - (g / 100) * plotH;
    doc.line(plotX, gy, plotX + plotW, gy);
    doc.text(String(g), x, gy + 2);
  }
  doc.setTextColor(0);
  const n = Math.min(data.length, 14);
  const slot = plotW / Math.max(n, 1);
  const bw = Math.min(slot * 0.6, 22);
  for (let i = 0; i < n; i++) {
    const d = data[i];
    const bx = plotX + i * slot + (slot - bw) / 2;
    const bh = (d.value / 100) * plotH;
    const col: [number, number, number] = d.band ? bandColor(d.band) : ACCENT;
    doc.setFillColor(...col);
    doc.rect(bx, plotY + plotH - bh, bw, bh, "F");
    doc.setFontSize(7); doc.setTextColor(60);
    doc.text(`${d.value}%`, bx + bw / 2, plotY + plotH - bh - 2, { align: "center" });
    doc.setTextColor(90);
    doc.text(String(d.label).slice(0, 10), bx + bw / 2, plotY + plotH + 5, { align: "center", angle: 0 });
  }
  doc.setDrawColor(180); doc.line(plotX, plotY + plotH, plotX + plotW, plotY + plotH);
  doc.setTextColor(0);
}

function drawLineChart(
  doc: jsPDF, title: string, x: number, y: number, w: number, h: number,
  data: Array<{ label: string; value: number }>,
) {
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...BRAND);
  doc.text(title, x, y - 3); doc.setTextColor(0); doc.setFont("helvetica", "normal");
  const plotX = x + 12, plotY = y, plotW = w - 12, plotH = h - 12;
  doc.setDrawColor(230); doc.setFontSize(7); doc.setTextColor(150);
  for (const g of [0, 25, 50, 75, 100]) {
    const gy = plotY + plotH - (g / 100) * plotH;
    doc.line(plotX, gy, plotX + plotW, gy);
    doc.text(String(g), x, gy + 2);
  }
  doc.setTextColor(0);
  const n = data.length;
  const step = plotW / Math.max(n - 1, 1);
  const px = (i: number) => plotX + i * step;
  const py = (v: number) => plotY + plotH - (v / 100) * plotH;
  doc.setDrawColor(...ACCENT); doc.setLineWidth(0.8);
  for (let i = 1; i < n; i++) doc.line(px(i - 1), py(data[i - 1].value), px(i), py(data[i].value));
  doc.setLineWidth(0.2);
  for (let i = 0; i < n; i++) {
    doc.setFillColor(...BRAND); doc.circle(px(i), py(data[i].value), 1.3, "F");
    doc.setFontSize(7); doc.setTextColor(60);
    doc.text(`${data[i].value}%`, px(i), py(data[i].value) - 3, { align: "center" });
    doc.setTextColor(90);
    doc.text(String(data[i].label).replace(/ \d{4}$/, "").slice(0, 8), px(i), plotY + plotH + 5, { align: "center" });
  }
  doc.setDrawColor(180); doc.line(plotX, plotY + plotH, plotX + plotW, plotY + plotH);
  doc.setTextColor(0);
}

/* ================================================================== *
 * ATTENDANCE CERTIFICATES — one signable page per student.            *
 * ================================================================== */
export interface CertificateMeta { from: string; to: string; schoolName?: string; term?: string; threshold?: number; }

/** One certificate page per student (grouped by class, sorted by name). */
export function buildCertificatesPdf(grouped: GroupedSummary, meta: CertificateMeta): Uint8Array {
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const school = meta.schoolName ?? "Institute of Energy Studies & Research";
  const threshold = meta.threshold ?? 80;

  const students = grouped.classes.flatMap((c) => c.students.map((s) => ({ ...s, classCode: c.classCode, className: c.displayName })));
  if (students.length === 0) {
    doc.setFontSize(14); doc.text("No students with attendance in this period.", 20, 40);
    return bytes(doc);
  }

  students.forEach((s, idx) => {
    if (idx > 0) doc.addPage();
    const cy = 20;
    // decorative border
    doc.setDrawColor(...BRAND); doc.setLineWidth(1.2); doc.rect(10, 10, W - 20, H - 20);
    doc.setDrawColor(...ACCENT); doc.setLineWidth(0.4); doc.rect(14, 14, W - 28, H - 28);
    doc.setLineWidth(0.2);

    // header band + IESR logo
    doc.setFillColor(...BRAND); doc.rect(14, 14, W - 28, 24, "F");
    const logo = logoDataUri();
    if (logo) {
      doc.setFillColor(255, 255, 255); doc.roundedRect(20, 17, 18, 18, 2, 2, "F");
      try { doc.addImage(logo, "JPEG", 21.5, 18.5, 15, 15); } catch { /* skip */ }
    }
    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
    doc.text(school, W / 2, cy + 4, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.setTextColor(...YELLOW);
    doc.text("An Initiative of Kenya Power · Institute of Energy Studies & Research", W / 2, cy + 11, { align: "center" });
    doc.setTextColor(0);

    // title
    doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(...BRAND);
    doc.text("Certificate of Attendance", W / 2, 60, { align: "center" });
    doc.setDrawColor(...ACCENT); doc.line(W / 2 - 40, 64, W / 2 + 40, 64);
    doc.setTextColor(0); doc.setFont("helvetica", "normal"); doc.setFontSize(11);
    doc.text("This is to certify that", W / 2, 78, { align: "center" });

    // student name
    doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(...ACCENT);
    doc.text(s.name, W / 2, 92, { align: "center" });
    doc.setTextColor(0); doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(`Admission No: ${s.admNo}   ·   Class: ${s.classCode} (${s.className})`, W / 2, 100, { align: "center" });

    const marked = s.present + s.late + s.absent;
    const band = s.rate >= threshold ? "meets" : "is below";
    doc.setFontSize(11);
    doc.text(
      `recorded an attendance of ${s.rate}% during the period`,
      W / 2, 114, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.text(`${niceDate(meta.from)}  to  ${niceDate(meta.to)}${meta.term ? "  ·  " + meta.term : ""}`, W / 2, 122, { align: "center" });
    doc.setFont("helvetica", "normal");

    // stat cards
    const cards: Array<[string, string, [number, number, number]]> = [
      ["Attendance", `${s.rate}%`, s.rate >= threshold ? [16, 122, 87] : [176, 42, 55]],
      ["Present", `${s.present}`, [16, 122, 87]],
      ["Late", `${s.late}`, [180, 120, 10]],
      ["Absent", `${s.absent}`, [176, 42, 55]],
      ["Sessions", `${marked}`, BRAND],
    ];
    const cw = (W - 60) / cards.length;
    cards.forEach(([label, val, col], i) => {
      const x = 30 + i * cw;
      doc.setDrawColor(220); doc.setFillColor(248, 250, 252); doc.roundedRect(x, 132, cw - 4, 24, 2, 2, "FD");
      doc.setTextColor(...col); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
      doc.text(val, x + (cw - 4) / 2, 144, { align: "center" });
      doc.setTextColor(110); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
      doc.text(label.toUpperCase(), x + (cw - 4) / 2, 151, { align: "center" });
    });
    doc.setTextColor(0);

    // policy note
    doc.setFontSize(10);
    doc.text(`This ${band} the institute's ${threshold}% attendance policy.`, W / 2, 170, { align: "center" });

    // signatures
    const sy = H - 55;
    doc.setDrawColor(120);
    doc.line(35, sy, 95, sy); doc.line(W - 95, sy, W - 35, sy);
    doc.setFontSize(9); doc.setTextColor(90);
    doc.text("Dean of Students", 65, sy + 6, { align: "center" });
    doc.text("Registrar / HOD", W - 65, sy + 6, { align: "center" });
    doc.setTextColor(140); doc.setFontSize(8);
    doc.text(`Issued ${niceDate(new Date().toISOString().slice(0, 10))}  ·  ${school}  ·  Not valid without official signature`, W / 2, H - 24, { align: "center" });
    doc.setTextColor(0);
  });

  return bytes(doc);
}
