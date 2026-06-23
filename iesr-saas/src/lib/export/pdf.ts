// PDF export builders — ported from legacy js/reports.js (jsPDF + autotable).
// Runs in the Node runtime (the export route sets runtime = "nodejs"); uses the
// jspdf-autotable functional API. Each builder returns the PDF bytes.
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Momentum, ProblematicResult, Insights, Overview } from "@/lib/analytics";
import { statusBand } from "@/lib/analytics";

const BRAND: [number, number, number] = [11, 102, 255];
const stamp = (doc: jsPDF, title: string, sub: string) => {
  doc.setFontSize(18); doc.text(title, 15, 16);
  doc.setFontSize(11); doc.setTextColor(110);
  doc.text(sub, 15, 24);
  doc.text(`Generated: ${new Date().toISOString()}`, 15, 30);
  doc.setTextColor(0);
};
const bytes = (doc: jsPDF) => new Uint8Array(doc.output("arraybuffer") as ArrayBuffer);

/** Teacher momentum (legacy exportTeacherMomentumPDF). */
export function buildMomentumPdf(m: Momentum, range: string): Uint8Array {
  const doc = new jsPDF("landscape");
  stamp(doc, "Teacher Attendance Momentum", `Teacher: ${m.teacher}   ·   ${range}`);

  doc.setFontSize(12);
  doc.text(
    `Lessons: ${m.totalLessons}   Present: ${m.totalPresent}   Absent: ${m.totalAbsent}   Late: ${m.totalLate}   Overall: ${m.overallPercentage}%`,
    15, 40,
  );

  autoTable(doc, {
    startY: 46,
    head: [["Student", "Admission", "Present", "Absent", "Late", "Total", "%", "Status"]],
    body: m.studentDetails.map((s) => [
      s.name.slice(0, 28), s.admission, s.present, s.absent, s.late, s.total, `${s.percentage}%`, statusBand(s.percentage),
    ]),
    theme: "grid", styles: { fontSize: 8 }, headStyles: { fillColor: BRAND },
  });

  const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  doc.setFontSize(13); doc.text("Weekly Trends", 15, y);
  autoTable(doc, {
    startY: y + 4,
    head: [["Week of", "Present", "Absent", "Total", "Attendance %"]],
    body: m.weeklyTrends.map((w) => [w.weekStart, w.present, w.absent, w.total, `${w.attendancePercentage}%`]),
    theme: "striped", styles: { fontSize: 9 }, headStyles: { fillColor: BRAND },
  });
  return bytes(doc);
}

/** Problematic students (legacy exportProblematicStudentsCSV → PDF form). */
export function buildProblematicPdf(p: ProblematicResult, range: string): Uint8Array {
  const doc = new jsPDF();
  stamp(doc, "Problematic Students", `Students with 3+ missed classes   ·   ${range}`);
  autoTable(doc, {
    startY: 38,
    head: [["Student", "Admission", "Class", "Overall %", "Missed", "Action"]],
    body: p.students.map((s) => [s.name.slice(0, 26), s.admission, s.classCode, `${s.overallPercentage}%`, s.missedCount, s.action]),
    theme: "grid", styles: { fontSize: 8 }, headStyles: { fillColor: BRAND },
  });
  if (p.subjectFlags.length) {
    const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
    doc.setFontSize(13); doc.text("Subject-specific issues", 15, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Student", "Subject", "Teacher", "Missed", "Last missed"]],
      body: p.subjectFlags.map((f) => [f.studentName.slice(0, 24), f.subject, f.teacher, f.missedCount, f.lastMissed]),
      theme: "striped", styles: { fontSize: 8 }, headStyles: { fillColor: BRAND },
    });
  }
  return bytes(doc);
}

/** HOA/HOD overview: school totals + class comparison (legacy HOA report). */
export function buildHoaPdf(overview: Overview, insights: Insights, range: string): Uint8Array {
  const doc = new jsPDF();
  stamp(doc, "Head of Department — Attendance Report", range);
  doc.setFontSize(12);
  doc.text(
    `Students: ${overview.students}   Sessions: ${overview.total}   Present: ${overview.present}   Absent: ${overview.absent}   Late: ${overview.late}   Rate: ${overview.rate}%`,
    15, 40,
  );

  doc.setFontSize(13); doc.text("Attendance by class", 15, 50);
  autoTable(doc, {
    startY: 54,
    head: [["Class", "Sessions", "Attendance %", "Status"]],
    body: insights.byClass.map((c) => [c.classCode, c.total, `${c.rate}%`, statusBand(c.rate)]),
    theme: "grid", styles: { fontSize: 9 }, headStyles: { fillColor: BRAND },
  });

  const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  doc.setFontSize(13); doc.text("Most absent students", 15, y);
  autoTable(doc, {
    startY: y + 4,
    head: [["Student", "Admission", "Class", "Absent", "Absence %"]],
    body: insights.mostAbsent.map((s) => [s.name.slice(0, 26), s.admNo, s.classCode, s.absent, `${s.rate}%`]),
    theme: "striped", styles: { fontSize: 8 }, headStyles: { fillColor: BRAND },
  });
  return bytes(doc);
}
