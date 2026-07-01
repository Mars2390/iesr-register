// Excel (.xlsx) export builders — real workbooks with frozen headers, coloured
// status cells, auto-filters and sized columns. Runs in the Node runtime.
// Mirrors the CSV reports but formatted for leadership to open and filter.
import ExcelJS from "exceljs";
import type { AnalyticsRow, LeadershipSummary } from "@/lib/analytics";
import {
  computeGroupedSummary, computeFullDataMatrix, computeTeacherPerformance,
  computeRegisterGrid, computePolicyCompliance, computeChronicAbsentees, statusBand, POLICY_THRESHOLD,
} from "@/lib/analytics";

export interface XlsxMeta { title: string; from: string; to: string; schoolName?: string; scope?: string; }

/* --------------------------------------------------------------- palette */
const NAVY = "FF0B2E63";
const BLUE = "FF1466B8";
const GREEN = "FF107A57";
const AMBER = "FFB4780A";
const RED = "FFB02A37";
const HEADER_TXT = "FFFFFFFF";
const ZEBRA = "FFF4F7FB";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const niceDate = (iso: string) => {
  const [y, m, d] = (iso ?? "").split("-");
  return y && m && d ? `${d} ${MONTHS_SHORT[Number(m) - 1] ?? m} ${y}` : iso ?? "";
};
const rateFill = (rate: number) => (rate >= 80 ? GREEN : rate >= 60 ? AMBER : RED);

type Cell = ExcelJS.Cell;
const fill = (c: Cell, argb: string) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb } }; };
const white = (c: Cell) => { c.font = { color: { argb: HEADER_TXT }, bold: true }; };

/** Branded title block on a sheet; returns the next free row index. */
function titleBlock(ws: ExcelJS.Worksheet, meta: XlsxMeta, span: number): number {
  const school = meta.schoolName ?? "Institute of Energy Studies & Research · Kenya Power";
  const put = (r: number, text: string, opts: Partial<ExcelJS.Font> = {}) => {
    ws.mergeCells(r, 1, r, Math.max(span, 2));
    const c = ws.getCell(r, 1);
    c.value = text; c.font = { name: "Calibri", ...opts };
    c.alignment = { vertical: "middle" };
    return c;
  };
  const t1 = put(1, school, { bold: true, size: 13, color: { argb: NAVY } });
  ws.getRow(1).height = 20; t1;
  put(2, meta.title.toUpperCase(), { bold: true, size: 11, color: { argb: BLUE } });
  put(3, `Period: ${niceDate(meta.from)} to ${niceDate(meta.to)}${meta.scope ? "   ·   " + meta.scope : ""}`, { size: 9, color: { argb: "FF555555" } });
  put(4, `Generated: ${new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`, { size: 9, color: { argb: "FF888888" } });
  return 6; // first content row
}

/** Write a header row (bold, navy, frozen) at `rowIdx`; sets column widths + autofilter. */
function headerRow(ws: ExcelJS.Worksheet, rowIdx: number, headers: string[], widths: number[]) {
  const row = ws.getRow(rowIdx);
  headers.forEach((h, i) => {
    const c = row.getCell(i + 1);
    c.value = h; white(c); fill(c, NAVY);
    c.alignment = { vertical: "middle", horizontal: i < 2 ? "left" : "center", wrapText: true };
    c.border = { bottom: { style: "thin", color: { argb: "FFBBBBBB" } } };
    ws.getColumn(i + 1).width = widths[i] ?? 14;
  });
  row.height = 22;
  ws.views = [{ state: "frozen", ySplit: rowIdx }];
  ws.autoFilter = { from: { row: rowIdx, column: 1 }, to: { row: rowIdx, column: headers.length } };
}

const buffer = async (wb: ExcelJS.Workbook): Promise<Uint8Array> => new Uint8Array(await wb.xlsx.writeBuffer() as ArrayBuffer);

/* ================================================================== *
 * Grouped summary (weekly / monthly / termly) — flat + class summary   *
 * ================================================================== */
export async function buildGroupedSummaryXlsx(rows: AnalyticsRow[], meta: XlsxMeta): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "IESR Attendance System";
  const g = computeGroupedSummary(rows);

  // --- Students sheet (flat, filterable by class)
  const ws = wb.addWorksheet("Students", { views: [{ state: "frozen" }] });
  let r = titleBlock(ws, meta, 9);
  const headers = ["Class", "Student Name", "Admission No", "Present", "Absent", "Late", "Marked", "Attendance %", "Status", `Policy (≥${POLICY_THRESHOLD}%)`];
  headerRow(ws, r, headers, [16, 26, 20, 10, 10, 10, 10, 14, 12, 14]);
  r++;
  for (const c of g.classes) {
    for (const s of c.students) {
      const marked = s.present + s.late + s.absent;
      const row = ws.getRow(r++);
      row.values = [c.classCode, s.name, s.admNo, s.present, s.absent, s.late, marked, s.rate / 100, statusBand(s.rate), s.rate >= POLICY_THRESHOLD ? "PASS" : "FAIL"];
      row.getCell(8).numFmt = "0%";
      const rc = row.getCell(8); fill(rc, rateFill(s.rate)); rc.font = { color: { argb: HEADER_TXT }, bold: true }; rc.alignment = { horizontal: "center" };
      const pc = row.getCell(10); pc.font = { bold: true, color: { argb: s.rate >= POLICY_THRESHOLD ? GREEN : RED } }; pc.alignment = { horizontal: "center" };
      if (r % 2 === 0) for (let i = 1; i <= 7; i++) if (!row.getCell(i).fill) fill(row.getCell(i), ZEBRA);
    }
  }

  // --- Class Summary sheet
  const cs = wb.addWorksheet("Class Summary");
  let r2 = titleBlock(cs, { ...meta, title: `${meta.title} — Class Summary` }, 8);
  headerRow(cs, r2, ["Class", "Programme", "Category", "Students", "Present", "Absent", "Late", "Attendance %"], [16, 30, 18, 10, 10, 10, 10, 14]);
  r2++;
  for (const c of g.classes) {
    const row = cs.getRow(r2++);
    row.values = [c.classCode, c.displayName, c.category, c.studentCount, c.present, c.absent, c.late, c.rate / 100];
    row.getCell(8).numFmt = "0%";
    const rc = row.getCell(8); fill(rc, rateFill(c.rate)); rc.font = { color: { argb: HEADER_TXT }, bold: true }; rc.alignment = { horizontal: "center" };
  }
  const tot = cs.getRow(r2 + 1);
  tot.values = ["SCHOOL-WIDE", "", "", g.overall.students, g.overall.present, g.overall.absent, g.overall.late, g.overall.rate / 100];
  tot.font = { bold: true }; tot.getCell(8).numFmt = "0%";

  return buffer(wb);
}

/* ================================================================== *
 * Weekly register grid — one sheet per class, coloured P/A/L cells.    *
 * ================================================================== */
export async function buildRegisterGridXlsx(rows: AnalyticsRow[], meta: XlsxMeta): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  const grid = computeRegisterGrid(rows);
  if (grid.length === 0) { const ws = wb.addWorksheet("Register"); ws.getCell("A1").value = "No attendance recorded in this period."; return buffer(wb); }

  const cellFill: Record<string, string> = { P: GREEN, A: RED, L: AMBER };
  for (const c of grid) {
    const name = c.classCode.replace(/[\\/*?:[\]]/g, "-").slice(0, 28);
    const ws = wb.addWorksheet(name || "Class");
    let r = titleBlock(ws, { ...meta, title: `Register — ${c.classCode} · ${c.displayName}` }, 3 + c.columns.length);
    ws.getCell(r++, 1).value = "Legend: P = Present, A = Absent, L = Late, – = Not marked";
    r++;
    const headers = ["#", "Student Name", "Admission No", ...c.columns.map((col) => col.label), "P", "A", "L", "Rate %"];
    const widths = [4, 24, 18, ...c.columns.map(() => 7), 5, 5, 5, 9];
    headerRow(ws, r, headers, widths);
    // freeze first 3 columns + header
    ws.views = [{ state: "frozen", xSplit: 3, ySplit: r }];
    r++;
    c.students.forEach((s, i) => {
      const row = ws.getRow(r++);
      const base: (string | number)[] = [i + 1, s.name, s.admNo];
      c.columns.forEach((col) => base.push(s.cells[col.key] ?? "–"));
      base.push(s.present, s.absent, s.late, `${s.rate}%`);
      row.values = base;
      // colour the status cells
      c.columns.forEach((col, ci) => {
        const cell = row.getCell(4 + ci);
        const v = String(cell.value ?? "");
        cell.alignment = { horizontal: "center" };
        if (cellFill[v]) { fill(cell, cellFill[v]); cell.font = { color: { argb: HEADER_TXT }, bold: true }; }
      });
      const rc = row.getCell(4 + c.columns.length + 3); rc.alignment = { horizontal: "center" };
    });
  }
  return buffer(wb);
}

/* ================================================================== *
 * Full data — student × unit matrix (flat, filterable).               *
 * ================================================================== */
export async function buildFullDataXlsx(rows: AnalyticsRow[], meta: XlsxMeta): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  const matrix = computeFullDataMatrix(rows);
  const ws = wb.addWorksheet("Full Data");
  let r = titleBlock(ws, meta, 9);
  headerRow(ws, r, ["Class", "Student Name", "Admission No", "Unit / Subject", "Teacher", "Attended", "Total Lessons", "Unit %", "Overall %"], [16, 26, 20, 26, 18, 10, 12, 10, 10]);
  r++;
  for (const c of matrix.classes) {
    for (const s of c.students) {
      if (s.subjects.length === 0) { ws.getRow(r++).values = [c.classCode, s.name, s.admNo, "—", "—", 0, 0, 0, s.rate / 100]; continue; }
      for (const sub of s.subjects) {
        const row = ws.getRow(r++);
        row.values = [c.classCode, s.name, s.admNo, sub.subject, sub.teacher, sub.attended, sub.total, sub.rate / 100, s.rate / 100];
        row.getCell(8).numFmt = "0%"; row.getCell(9).numFmt = "0%";
        const uc = row.getCell(8); fill(uc, rateFill(sub.rate)); uc.font = { color: { argb: HEADER_TXT }, bold: true }; uc.alignment = { horizontal: "center" };
      }
    }
  }
  return buffer(wb);
}

/* ================================================================== *
 * Teacher performance — with UNITS.                                   *
 * ================================================================== */
export async function buildTeacherPerformanceXlsx(
  rows: AnalyticsRow[], dir: Record<string, { units: string[]; classes: string[] }>, meta: XlsxMeta,
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  const teachers = computeTeacherPerformance(rows, dir);
  const ws = wb.addWorksheet("Teachers");
  let r = titleBlock(ws, meta, 8);
  headerRow(ws, r, ["Teacher", "Units / Subjects Taught", "Classes", "Sessions Marked", "Records", "Compliance %", "Attendance %", "Last Marked"], [22, 40, 22, 14, 10, 14, 14, 16]);
  r++;
  for (const t of teachers) {
    const row = ws.getRow(r++);
    row.values = [t.teacher, t.units.length ? t.units.join(", ") : "—", t.classes.join(", "), t.sessionsMarked, t.records, t.complianceRate / 100, t.presentRate / 100, t.lastMarked ? niceDate(t.lastMarked) : "No marking"];
    row.getCell(6).numFmt = "0%"; row.getCell(7).numFmt = "0%";
    row.getCell(2).alignment = { wrapText: true };
  }
  return buffer(wb);
}

/* ================================================================== *
 * Policy compliance (80%) + Chronic absentees.                        *
 * ================================================================== */
export async function buildPolicyXlsx(rows: AnalyticsRow[], meta: XlsxMeta): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  const p = computePolicyCompliance(rows);

  const cs = wb.addWorksheet("By Class");
  let r = titleBlock(cs, { ...meta, title: `${meta.title} (≥ ${p.threshold}%)` }, 6);
  cs.getCell(r++, 1).value = `School compliance: ${p.pass}/${p.total} passing (${p.passRate}%)`;
  r++;
  headerRow(cs, r, ["Class", "Programme", "Students", "Pass", "Fail", "Pass Rate %"], [16, 30, 10, 8, 8, 12]);
  r++;
  for (const c of p.byClass) {
    const row = cs.getRow(r++);
    row.values = [c.classCode, c.displayName, c.total, c.pass, c.fail, c.passRate / 100];
    row.getCell(6).numFmt = "0%";
    const rc = row.getCell(6); fill(rc, rateFill(c.passRate)); rc.font = { color: { argb: HEADER_TXT }, bold: true }; rc.alignment = { horizontal: "center" };
  }

  const ss = wb.addWorksheet("All Students");
  let r2 = titleBlock(ss, { ...meta, title: `${meta.title} — Students` }, 5);
  headerRow(ss, r2, ["Class", "Student", "Admission No", "Attendance %", "Status"], [16, 26, 20, 14, 10]);
  r2++;
  for (const s of p.students) {
    const row = ss.getRow(r2++);
    row.values = [s.classCode, s.name, s.admNo, s.rate / 100, s.status];
    row.getCell(4).numFmt = "0%";
    const rc = row.getCell(4); fill(rc, rateFill(s.rate)); rc.font = { color: { argb: HEADER_TXT }, bold: true }; rc.alignment = { horizontal: "center" };
    const st = row.getCell(5); st.font = { bold: true, color: { argb: s.status === "PASS" ? GREEN : RED } }; st.alignment = { horizontal: "center" };
  }
  return buffer(wb);
}

export async function buildChronicXlsx(rows: AnalyticsRow[], meta: XlsxMeta, minStreak = 3): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  const list = computeChronicAbsentees(rows, minStreak);
  const ws = wb.addWorksheet("Watchlist");
  let r = titleBlock(ws, meta, 9);
  ws.getCell(r++, 1).value = `Trigger: ${minStreak}+ consecutive absences · On active watch: ${list.filter((c) => c.onWatch).length} · Flagged: ${list.length}`;
  r++;
  headerRow(ws, r, ["Class", "Student", "Admission No", "Current Streak", "Longest Streak", "From", "To", "Total Absences", "Attendance %"], [14, 26, 20, 14, 14, 14, 14, 14, 14]);
  r++;
  for (const c of list) {
    const row = ws.getRow(r++);
    row.values = [c.classCode, c.name, c.admNo, c.currentStreak, c.longestStreak, niceDate(c.streakStart), niceDate(c.streakEnd), c.totalAbsences, c.rate / 100];
    row.getCell(9).numFmt = "0%";
    if (c.onWatch) { const cc = row.getCell(4); fill(cc, RED); cc.font = { color: { argb: HEADER_TXT }, bold: true }; cc.alignment = { horizontal: "center" }; }
  }
  return buffer(wb);
}

/* ================================================================== *
 * LEADERSHIP WORKBOOK — one file, every angle, ready for the Dean.     *
 * ================================================================== */
export async function buildLeadershipXlsx(s: LeadershipSummary, meta: XlsxMeta): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "IESR Attendance System";

  // 1) Overview
  const ov = wb.addWorksheet("Overview");
  titleBlock(ov, meta, 4);
  ov.getColumn(1).width = 34; ov.getColumn(2).width = 20;
  const kv: Array<[string, string | number]> = [
    ["Overall attendance rate", `${s.overview.rate}%`],
    ["Students", s.overview.students],
    ["Sessions", s.overview.total],
    ["Present", s.overview.present],
    ["Absent", s.overview.absent],
    ["Late", s.overview.late],
    [`Policy pass rate (≥${s.policy.threshold}%)`, `${s.policy.passRate}% (${s.policy.pass}/${s.policy.total})`],
    ["On chronic-absence watch", s.chronic.filter((c) => c.onWatch).length],
  ];
  if (s.trend.latest && s.trend.previous) kv.push(["Month-over-month", `${s.trend.arrow} ${s.trend.delta >= 0 ? "+" : ""}${s.trend.delta}%`]);
  let r = 6;
  for (const [k, v] of kv) { const row = ov.getRow(r++); row.getCell(1).value = k; row.getCell(1).font = { bold: true, color: { argb: NAVY } }; row.getCell(2).value = v; }

  // 2) Class ranking
  const cr = wb.addWorksheet("Class Ranking");
  let rr = titleBlock(cr, { ...meta, title: "Class attendance — ranked" }, 7);
  headerRow(cr, rr, ["Rank", "Class", "Programme", "Students", "Sessions", "Attendance %", "Status"], [6, 16, 30, 10, 10, 14, 12]);
  rr++;
  s.byClassRanked.forEach((c, i) => {
    const row = cr.getRow(rr++);
    row.values = [i + 1, c.classCode, c.displayName, c.students, c.total, c.rate / 100, c.band];
    row.getCell(6).numFmt = "0%";
    const rc = row.getCell(6); fill(rc, rateFill(c.rate)); rc.font = { color: { argb: HEADER_TXT }, bold: true }; rc.alignment = { horizontal: "center" };
  });

  // 3) Units
  const un = wb.addWorksheet("Units");
  let ru = titleBlock(un, { ...meta, title: "Unit attendance (most & least attended)" }, 5);
  headerRow(un, ru, ["Unit / Subject", "Teacher", "Attended", "Total", "Attendance %"], [30, 20, 12, 12, 14]);
  ru++;
  const seen = new Set<string>();
  for (const u of [...s.topSubjects, ...s.bottomSubjects]) {
    if (seen.has(u.subject)) continue; seen.add(u.subject);
    const row = un.getRow(ru++);
    row.values = [u.subject, u.teacher, u.attended, u.total, u.rate / 100];
    row.getCell(5).numFmt = "0%";
    const rc = row.getCell(5); fill(rc, rateFill(u.rate)); rc.font = { color: { argb: HEADER_TXT }, bold: true }; rc.alignment = { horizontal: "center" };
  }

  // 4) Students <60%
  const pr = wb.addWorksheet("Needs Attention");
  let rp = titleBlock(pr, { ...meta, title: "Students below 60%" }, 6);
  headerRow(pr, rp, ["Student", "Admission No", "Class", "Attendance %", "Absences", "Most-missed unit"], [26, 20, 16, 14, 10, 24]);
  rp++;
  for (const p of s.problematic) {
    const row = pr.getRow(rp++);
    row.values = [p.name, p.admNo, p.classCode, p.rate / 100, p.absent, p.mostMissed ?? "—"];
    row.getCell(4).numFmt = "0%"; const rc = row.getCell(4); fill(rc, RED); rc.font = { color: { argb: HEADER_TXT }, bold: true }; rc.alignment = { horizontal: "center" };
  }

  // 5) Top performers
  const tp = wb.addWorksheet("Top Performers");
  let rt = titleBlock(tp, { ...meta, title: "Top performers (90%+)" }, 5);
  headerRow(tp, rt, ["Student", "Admission No", "Class", "Attendance %", "Sessions"], [26, 20, 16, 14, 10]);
  rt++;
  for (const p of s.topPerformers) {
    const row = tp.getRow(rt++);
    row.values = [p.name, p.admNo, p.classCode, p.rate / 100, p.total];
    row.getCell(4).numFmt = "0%"; const rc = row.getCell(4); fill(rc, GREEN); rc.font = { color: { argb: HEADER_TXT }, bold: true }; rc.alignment = { horizontal: "center" };
  }

  // 6) Policy
  const po = wb.addWorksheet("Policy");
  let rpo = titleBlock(po, { ...meta, title: `Attendance policy (≥${s.policy.threshold}%)` }, 6);
  po.getCell(rpo++, 1).value = `School: ${s.policy.pass}/${s.policy.total} passing (${s.policy.passRate}%)`; rpo++;
  headerRow(po, rpo, ["Class", "Programme", "Students", "Pass", "Fail", "Pass Rate %"], [16, 30, 10, 8, 8, 12]);
  rpo++;
  for (const c of s.policy.byClass) {
    const row = po.getRow(rpo++);
    row.values = [c.classCode, c.displayName, c.total, c.pass, c.fail, c.passRate / 100];
    row.getCell(6).numFmt = "0%"; const rc = row.getCell(6); fill(rc, rateFill(c.passRate)); rc.font = { color: { argb: HEADER_TXT }, bold: true }; rc.alignment = { horizontal: "center" };
  }

  // 7) Chronic watchlist
  const ch = wb.addWorksheet("Chronic Watchlist");
  let rch = titleBlock(ch, { ...meta, title: "Chronic absentee watchlist" }, 8);
  headerRow(ch, rch, ["Class", "Student", "Admission No", "Current Streak", "Longest Streak", "Absences", "Attendance %", "On Watch"], [14, 26, 20, 14, 14, 12, 14, 10]);
  rch++;
  for (const c of s.chronic) {
    const row = ch.getRow(rch++);
    row.values = [c.classCode, c.name, c.admNo, c.currentStreak, c.longestStreak, c.totalAbsences, c.rate / 100, c.onWatch ? "YES" : "—"];
    row.getCell(7).numFmt = "0%";
    if (c.onWatch) { const cc = row.getCell(4); fill(cc, RED); cc.font = { color: { argb: HEADER_TXT }, bold: true }; cc.alignment = { horizontal: "center" }; }
  }

  // 8) Teachers
  const te = wb.addWorksheet("Teachers");
  let rte = titleBlock(te, { ...meta, title: "Teacher marking compliance" }, 6);
  headerRow(te, rte, ["Teacher", "Units Taught", "Classes", "Sessions", "Compliance %", "Last Marked"], [22, 40, 22, 12, 14, 16]);
  rte++;
  for (const t of s.teachers) {
    const row = te.getRow(rte++);
    row.values = [t.teacher, t.units.length ? t.units.join(", ") : "—", t.classes.join(", "), t.sessionsMarked, t.complianceRate / 100, t.lastMarked ? niceDate(t.lastMarked) : "No marking"];
    row.getCell(5).numFmt = "0%"; row.getCell(2).alignment = { wrapText: true };
  }

  // 9) Monthly trend
  const mt = wb.addWorksheet("Trend");
  let rm = titleBlock(mt, { ...meta, title: "Month-over-month trend" }, 3);
  headerRow(mt, rm, ["Month", "Attendance %", "Change"], [22, 14, 12]);
  rm++;
  s.monthlyTrend.forEach((m, i) => {
    const prev = s.monthlyTrend[i - 1];
    const row = mt.getRow(rm++);
    row.values = [m.label, m.rate / 100, prev ? `${m.rate - prev.rate >= 0 ? "+" : ""}${m.rate - prev.rate}%` : "—"];
    row.getCell(2).numFmt = "0%";
  });

  return buffer(wb);
}
