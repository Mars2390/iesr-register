// GET /api/teacher/export?classId=…&from=YYYY-MM-DD&to=YYYY-MM-DD&label=Weekly
// Streams a per-student attendance summary CSV for the chosen range. Backs the
// flexible export menu (Weekly / Monthly / Custom Range) on the marking grid.
import { requireTeacher } from "@/lib/auth/guards";
import { unauthorized, forbidden, badRequest } from "@/lib/api";
import { getClassStudents, getClassInfo, getRangeAttendance } from "@/lib/data/teacher";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const esc = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const line = (cells: unknown[]) => cells.map(esc).join(",");

export async function GET(req: Request) {
  const session = await requireTeacher();
  if (!session) return unauthorized();

  const url = new URL(req.url);
  const classId = url.searchParams.get("classId") ?? "";
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const label = (url.searchParams.get("label") ?? "Range").slice(0, 24);
  if (!classId || !DATE_RE.test(from) || !DATE_RE.test(to)) return badRequest("invalid_params");
  if (from > to) return badRequest("range_inverted");

  const [info, students, rows] = await Promise.all([
    getClassInfo(session, classId),
    getClassStudents(session, classId),
    getRangeAttendance(session, classId, from, to),
  ]);
  if (!info || students === null || rows === null) return forbidden();

  // Aggregate per student across every session/day in the range.
  type Agg = { present: number; absent: number; late: number; marked: number };
  const byStudent = new Map<string, Agg>();
  for (const r of rows) {
    if (r.status === "unmarked") continue;
    const a = byStudent.get(r.studentId) ?? { present: 0, absent: 0, late: 0, marked: 0 };
    if (r.status === "present") a.present++;
    else if (r.status === "absent") a.absent++;
    else if (r.status === "late") a.late++;
    a.marked++;
    byStudent.set(r.studentId, a);
  }

  const out: string[] = [];
  out.push(`IESR ATTENDANCE — ${label} Export`);
  out.push(`Class:,${esc(info.displayName)} (${info.code})`);
  out.push(`Range:,${from} to ${to}`);
  out.push(`Teacher:,${esc(session.name)}`);
  out.push(`Generated:,${new Date().toISOString()}`);
  out.push("");
  out.push(line(["#", "Adm No", "Student Name", "Present", "Absent", "Late", "Marked", "Attendance %"]));

  const totals = { present: 0, absent: 0, late: 0, marked: 0 };
  students.forEach((s, i) => {
    const a = byStudent.get(s.id) ?? { present: 0, absent: 0, late: 0, marked: 0 };
    const attended = a.present + a.late;
    const pct = a.marked ? Math.round((attended / a.marked) * 100) : 0;
    totals.present += a.present; totals.absent += a.absent; totals.late += a.late; totals.marked += a.marked;
    out.push(line([i + 1, s.admissionNo, s.fullName, a.present, a.absent, a.late, a.marked, `${pct}%`]));
  });

  const overallAttended = totals.present + totals.late;
  const overallPct = totals.marked ? Math.round((overallAttended / totals.marked) * 100) : 0;
  out.push("");
  out.push(line(["", "", "TOTAL", totals.present, totals.absent, totals.late, totals.marked, `${overallPct}%`]));

  const filename = `${info.code}_${label}_${from}_to_${to}.csv`.replace(/[^A-Za-z0-9._-]/g, "_");
  return new Response("﻿" + out.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
