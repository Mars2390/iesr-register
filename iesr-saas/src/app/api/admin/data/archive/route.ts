// GET /api/admin/data/archive — full JSON backup (download) of the school's
// roster + attendance. Use this to archive a term before resetting.
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { attendanceRecords, students, classes, teachers, subjects, timetables } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { unauthorized } from "@/lib/api";
import { formatDate } from "@/lib/dates";

export async function GET() {
  const s = await requireAdmin();
  if (!s) return unauthorized();
  const school = s.schoolId;

  const [att, std, cls, tch, subj, tt] = await Promise.all([
    db.select({
      date: attendanceRecords.date, status: attendanceRecords.status, sessionId: attendanceRecords.sessionId,
      admissionNo: students.admissionNo, student: students.fullName, classCode: classes.code,
      subject: subjects.name, teacher: teachers.name, notes: attendanceRecords.notes, tags: attendanceRecords.tags,
    }).from(attendanceRecords)
      .leftJoin(students, eq(students.id, attendanceRecords.studentId))
      .leftJoin(classes, eq(classes.id, attendanceRecords.classId))
      .leftJoin(subjects, eq(subjects.id, attendanceRecords.subjectId))
      .leftJoin(teachers, eq(teachers.id, attendanceRecords.teacherId))
      .where(eq(attendanceRecords.schoolId, school)),
    db.select({ admissionNo: students.admissionNo, fullName: students.fullName, classId: students.classId, active: students.active })
      .from(students).where(eq(students.schoolId, school)),
    db.select({ id: classes.id, code: classes.code, displayName: classes.displayName, category: classes.category, active: classes.active })
      .from(classes).where(eq(classes.schoolId, school)),
    db.select({ name: teachers.name, classIds: teachers.classIds, active: teachers.active })
      .from(teachers).where(eq(teachers.schoolId, school)),
    db.select({ code: subjects.code, name: subjects.name, classId: subjects.classId })
      .from(subjects).where(eq(subjects.schoolId, school)),
    db.select({ classId: timetables.classId, day: timetables.day, startTime: timetables.startTime, endTime: timetables.endTime, subjectId: timetables.subjectId, teacherId: timetables.teacherId })
      .from(timetables).where(eq(timetables.schoolId, school)),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    schoolId: school,
    counts: { attendance: att.length, students: std.length, classes: cls.length, teachers: tch.length },
    classes: cls, teachers: tch, subjects: subj, timetables: tt, students: std, attendance: att,
  };
  const filename = `iesr_archive_${formatDate(new Date())}.json`;
  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" },
  });
}
