import { getSession } from "@/lib/auth/session";
import { listTimetable, listClasses, listSubjects, listTeachers } from "@/lib/data/admin";
import { TimetableManager } from "@/components/admin/TimetableManager";

export const dynamic = "force-dynamic";

export default async function AdminTimetablePage() {
  const session = (await getSession())!;
  const [entries, classes, subjects, teachers] = await Promise.all([
    listTimetable(session), listClasses(session), listSubjects(session), listTeachers(session),
  ]);
  return (
    <TimetableManager
      initial={JSON.parse(JSON.stringify(entries))}
      options={JSON.parse(JSON.stringify({ classes, subjects, teachers }))}
    />
  );
}
