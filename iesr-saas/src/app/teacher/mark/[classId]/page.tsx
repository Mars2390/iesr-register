import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getClassInfo, getClassStudents, getClassTimetable, getWeekAttendance } from "@/lib/data/teacher";
import { recordsToWeek } from "@/lib/attendance";
import { getSubmissionCode } from "@/lib/data/settings";
import { getWeekStartStr, getCurrentDayIndex } from "@/lib/dates";
import { MarkingGrid } from "@/components/teacher/MarkingGrid";

export default async function MarkPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  const session = (await getSession())!; // guaranteed by layout

  const info = await getClassInfo(session, classId);
  if (!info) notFound(); // not assigned to this teacher, or doesn't exist

  const weekStart = getWeekStartStr(new Date());
  const [students, timetable, rows, submissionCode] = await Promise.all([
    getClassStudents(session, classId),
    getClassTimetable(session, classId),
    getWeekAttendance(session, classId, weekStart),
    getSubmissionCode(session.schoolId),
  ]);

  return (
    <MarkingGrid
      classInfo={info}
      teacherName={session.name}
      teacherId={session.sub}
      students={students ?? []}
      timetable={timetable ?? []}
      initialWeekStart={weekStart}
      initialDayIndex={getCurrentDayIndex()}
      initialCells={recordsToWeek(rows ?? [])}
      submissionCode={submissionCode}
    />
  );
}
