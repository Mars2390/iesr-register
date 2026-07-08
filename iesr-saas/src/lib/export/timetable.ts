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

/* --------------------------------------------------------------- XLSX */
export async function buildTimetableXlsx(data: VersionData, schoolName: string): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "IESR Attendance System";

  // Overview
  const ov = wb.addWorksheet("Overview");
  ov.mergeCells("A1:F1"); ov.getCell("A1").value = `${schoolName} — School Timetable`;
  ov.getCell("A1").font = { bold: true, size: 14, color: { argb: NAVY } };
  ov.mergeCells("A2:F2"); ov.getCell("A2").value = `${data.name}${data.term ? " · " + data.term : ""} · Generated ${new Date(data.generatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`;
  ov.getCell("A2").font = { size: 10, color: { argb: "FF666666" } };
  const head = ov.getRow(4); head.values = ["Class", "Code", "Category", "Room", "Sessions/week"];
  head.eachCell((c) => { c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }; });
  [16, 20, 14, 8, 14].forEach((w, i) => (ov.getColumn(i + 1).width = w));
  let r = 5;
  for (const c of data.classes) {
    const count = data.sessions.filter((s) => s.classId === c.id).length;
    ov.getRow(r++).values = [c.name, c.code, c.category, c.room, count];
  }
  r += 1;
  ov.getCell(`A${r}`).value = "Teacher load (sessions/week)"; ov.getCell(`A${r}`).font = { bold: true, color: { argb: NAVY } }; r++;
  const th = ov.getRow(r++); th.values = ["Teacher", "Load"];
  th.eachCell((c) => { c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }; });
  for (const t of data.teacherLoad) ov.getRow(r++).values = [t.teacher, t.total];

  // per-class grids
  for (const c of data.classes) {
    const sessions = data.sessions.filter((s) => s.classId === c.id);
    const name = c.code.replace(/[\\/*?:[\]]/g, "-").slice(0, 28) || "Class";
    const ws = wb.addWorksheet(name);
    ws.mergeCells("A1:F1"); ws.getCell("A1").value = `${c.name} (${c.code}) · Room ${c.room}`;
    ws.getCell("A1").font = { bold: true, size: 13, color: { argb: NAVY } };
    ws.mergeCells("A2:F2"); ws.getCell("A2").value = `${schoolName}${data.term ? " · " + data.term : ""}`;
    ws.getCell("A2").font = { size: 9, color: { argb: "FF888888" } };

    const hr = ws.getRow(4); hr.values = ["TIME", ...DAY_LABEL.map(([, l]) => l)];
    hr.eachCell((cell) => { cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.alignment = { horizontal: "center" }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }; });
    ws.getColumn(1).width = 16; for (let i = 2; i <= 6; i++) ws.getColumn(i).width = 26;

    let row = 5;
    for (const slot of classSlots(sessions)) {
      const rr = ws.getRow(row++);
      rr.getCell(1).value = `${hhmm(slot.start)}–${hhmm(slot.end)}`;
      rr.getCell(1).font = { bold: true, color: { argb: NAVY } }; rr.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
      DAY_LABEL.forEach(([day], i) => {
        const s = cellAt(sessions, day, slot.key);
        const cell = rr.getCell(i + 2);
        cell.value = s ? `${s.subject}\n${s.teacher}` : "";
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        if (s) cell.font = { bold: true, size: 9 };
      });
      rr.height = 34;
    }
  }
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
