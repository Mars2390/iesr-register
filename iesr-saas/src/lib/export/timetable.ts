// Timetable exports for a generated/saved version:
//   • XLSX — an "Overview" sheet + one grid sheet per class (print-ready).
//   • PDF  — IESR/KPLC branded, landscape, one grid per class.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { VersionData } from "@/lib/data/timetableGen";
import type { PlacedSession } from "@/lib/timetable/generate";

const DAY_LABEL = [["mon", "Mon"], ["tue", "Tue"], ["wed", "Wed"], ["thu", "Thu"], ["fri", "Fri"]] as const;
const NAVY = "FF0B2E63";
const hhmm = (t: string) => t.slice(0, 5);

function classSlots(sessions: PlacedSession[]) {
  const keys = [...new Set(sessions.map((s) => `${s.startTime}|${s.endTime}`))].sort();
  return keys.map((k) => { const [start, end] = k.split("|"); return { key: k, start, end }; });
}
const cellAt = (sessions: PlacedSession[], day: string, key: string) =>
  sessions.find((s) => s.day === day && `${s.startTime}|${s.endTime}` === key);

/* --------------------------------------------------------------- XLSX
 * ONE master "DAY TIMETABLE" sheet — identical layout to the institute's file:
 * DAY | TIME | then every class as a 3-column block (SUBJECT · LECTURER · RM),
 * days × 4 time-slots down. Full-day (Level 5/6) sessions merge vertically. */
const DAYS_UP: [string, string][] = [["mon", "MON"], ["tue", "TUE"], ["wed", "WED"], ["thu", "THU"], ["fri", "FRI"]];
const SLOT_LABELS = ["8:00AM – 10:00AM", "10:30AM – 12:30PM", "1:30PM – 3:30PM", "3:30PM – 5:30PM"];
const RED = "FFC00000", GREEN = "FF107A57", BLUE = "FF1466B8";
const thin = { style: "thin" as const, color: { argb: "FFB0B0B0" } };
const BORDER = { top: thin, left: thin, bottom: thin, right: thin };
const catColor = (cat: string) => (/diploma/i.test(cat) ? GREEN : /knqf|level/i.test(cat) ? BLUE : NAVY);

export async function buildTimetableXlsx(data: VersionData, schoolName: string): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "IESR Attendance System";
  const ws = wb.addWorksheet("DAY TIMETABLE", { views: [{ state: "frozen", xSplit: 2, ySplit: 3 }] });

  const classes = data.classes;
  const N = classes.length;
  const lastCol = 2 + N * 3;                          // DAY, TIME, then 3 per class
  const subCol = (i: number) => 3 + i * 3;

  // per-class lookup: grid[classId][dayIdx][slotIdx]
  const grid: Record<string, (PlacedSession | undefined)[][]> = {};
  for (const c of classes) grid[c.id] = Array.from({ length: 5 }, () => Array(4).fill(undefined));
  for (const s of data.sessions) {
    const di = DAYS_UP.findIndex(([k]) => k === s.day);
    if (di < 0 || !grid[s.classId]) continue;
    grid[s.classId][di][Math.max(0, Math.min(3, s.slotIndex))] = s;
  }

  // Row 1 — title (+ logo)
  ws.mergeCells(1, 1, 1, lastCol);
  const title = ws.getCell(1, 1);
  title.value = `${schoolName.toUpperCase()}${data.term ? ` — ${data.term.toUpperCase()}` : ""} — DAY TIMETABLE`;
  title.font = { bold: true, size: 13, color: { argb: NAVY } };
  title.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 40;
  const uri = logo();
  if (uri) { const id = wb.addImage({ base64: uri.split(",")[1], extension: "jpeg" }); ws.addImage(id, { tl: { col: 0.15, row: 0.15 }, ext: { width: 46, height: 46 } }); }

  // Row 2 — class name headers (merged across each class's 3 columns)
  for (let i = 0; i < N; i++) {
    ws.mergeCells(2, subCol(i), 2, subCol(i) + 2);
    const cell = ws.getCell(2, subCol(i));
    cell.value = `${classes[i].name}  (${classes[i].code})`;
    cell.font = { bold: true, size: 10, color: { argb: catColor(classes[i].category) } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  }

  // Row 3 — sub-headers
  const h = ws.getRow(3);
  h.getCell(1).value = "DAY"; h.getCell(2).value = "TIME";
  for (let i = 0; i < N; i++) { h.getCell(subCol(i)).value = "SUBJECT"; h.getCell(subCol(i) + 1).value = "LECTURER"; h.getCell(subCol(i) + 2).value = "RM"; }
  h.eachCell((c) => { c.font = { bold: true, size: 9, color: { argb: RED } }; c.alignment = { horizontal: "center", vertical: "middle" }; });
  h.getCell(1).font = { bold: true, size: 9, color: { argb: NAVY } }; h.getCell(2).font = { bold: true, size: 9, color: { argb: NAVY } };

  // Data rows 4..23 (5 days × 4 slots)
  const merges: [number, number, number, number][] = [];
  for (let di = 0; di < 5; di++) {
    const top = 4 + di * 4;
    // DAY cell merged down 4 rows
    ws.getCell(top, 1).value = DAYS_UP[di][1];
    ws.getCell(top, 1).font = { bold: true, size: 11, color: { argb: NAVY } };
    ws.getCell(top, 1).alignment = { horizontal: "center", vertical: "middle" };
    merges.push([top, 1, top + 3, 1]);
    for (let si = 0; si < 4; si++) {
      const row = top + si;
      ws.getRow(row).height = 30;
      ws.getCell(row, 2).value = SLOT_LABELS[si];
      ws.getCell(row, 2).font = { size: 8, color: { argb: NAVY } };
      ws.getCell(row, 2).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      for (let i = 0; i < N; i++) {
        const s = grid[classes[i].id][di][si];
        const cSub = subCol(i);
        if (s && s.fullDay && si === 0) {
          ws.getCell(row, cSub).value = s.subject;
          ws.getCell(row, cSub + 1).value = s.teacher;
          ws.getCell(row, cSub + 2).value = classes[i].room;
          merges.push([row, cSub, row + 3, cSub], [row, cSub + 1, row + 3, cSub + 1], [row, cSub + 2, row + 3, cSub + 2]);
        } else if (s && !s.fullDay) {
          ws.getCell(row, cSub).value = s.subject;
          ws.getCell(row, cSub + 1).value = s.teacher;
          ws.getCell(row, cSub + 2).value = classes[i].room;
        }
        // style the 3 class cells
        ws.getCell(row, cSub).font = { bold: true, size: 8 };
        ws.getCell(row, cSub).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        ws.getCell(row, cSub + 1).font = { size: 8 };
        ws.getCell(row, cSub + 1).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        ws.getCell(row, cSub + 2).font = { size: 8, color: { argb: RED } };
        ws.getCell(row, cSub + 2).alignment = { horizontal: "center", vertical: "middle" };
      }
    }
  }

  // borders across the whole grid (rows 2..23)
  for (let row = 2; row <= 3 + 5 * 4; row++) for (let col = 1; col <= lastCol; col++) ws.getCell(row, col).border = BORDER;
  // apply merges last
  for (const m of merges) ws.mergeCells(...m);

  // widths
  ws.getColumn(1).width = 6; ws.getColumn(2).width = 15;
  for (let i = 0; i < N; i++) { ws.getColumn(subCol(i)).width = 20; ws.getColumn(subCol(i) + 1).width = 13; ws.getColumn(subCol(i) + 2).width = 5; }

  return new Uint8Array(await wb.xlsx.writeBuffer() as ArrayBuffer);
}

/* --------------------------------------------------------------- PDF */
let LOGO: string | null | undefined;
function logo(): string | null {
  if (LOGO !== undefined) return LOGO;
  try { LOGO = `data:image/jpeg;base64,${readFileSync(join(process.cwd(), "public", "images", "iesr-4.jpg")).toString("base64")}`; }
  catch { LOGO = null; }
  return LOGO;
}

export function buildTimetablePdf(data: VersionData, schoolName: string): Uint8Array {
  const doc = new jsPDF("landscape");
  const W = doc.internal.pageSize.getWidth();
  const navy: [number, number, number] = [11, 46, 99];
  const yellow: [number, number, number] = [245, 197, 24];

  const header = (title: string) => {
    doc.setFillColor(...navy); doc.rect(0, 0, W, 26, "F");
    const lg = logo();
    if (lg) { doc.setFillColor(255, 255, 255); doc.roundedRect(10, 5, 16, 16, 2, 2, "F"); try { doc.addImage(lg, "JPEG", 11, 6, 14, 14); } catch { /* skip */ } }
    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text(schoolName, 30, 11);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...yellow); doc.text("An Initiative of Kenya Power", 30, 17);
    doc.setTextColor(255); doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text(title, W / 2, 12, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(225, 232, 245);
    doc.text(`${data.name}${data.term ? " · " + data.term : ""}`, W / 2, 18, { align: "center" });
    doc.setFillColor(...yellow); doc.rect(0, 26, W, 1.4, "F"); doc.setTextColor(0);
  };

  data.classes.forEach((c, idx) => {
    if (idx > 0) doc.addPage();
    header(`${c.name} (${c.code})`);
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...navy);
    doc.text(`Room ${c.room}`, 12, 36); doc.setTextColor(0); doc.setFont("helvetica", "normal");

    const sessions = data.sessions.filter((s) => s.classId === c.id);
    const slots = classSlots(sessions);
    autoTable(doc, {
      startY: 40,
      head: [["Time", ...DAY_LABEL.map(([, l]) => l)]],
      body: slots.map((slot) => [
        `${hhmm(slot.start)}\n${hhmm(slot.end)}`,
        ...DAY_LABEL.map(([day]) => { const s = cellAt(sessions, day, slot.key); return s ? `${s.subject}\n${s.teacher}` : ""; }),
      ]),
      theme: "grid", styles: { fontSize: 8, valign: "middle", halign: "center", cellPadding: 2.5 },
      headStyles: { fillColor: navy, halign: "center" },
      columnStyles: { 0: { fontStyle: "bold", textColor: navy, cellWidth: 24 } },
    });
  });

  // footer page numbers
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p); doc.setFontSize(7.5); doc.setTextColor(150);
    doc.text(`${schoolName} · Kenya Power · Generated ${new Date(data.generatedAt).toLocaleDateString("en-GB")}`, 12, doc.internal.pageSize.getHeight() - 7);
    doc.text(`Page ${p} of ${pages}`, W - 30, doc.internal.pageSize.getHeight() - 7);
  }
  return new Uint8Array(doc.output("arraybuffer") as ArrayBuffer);
}
