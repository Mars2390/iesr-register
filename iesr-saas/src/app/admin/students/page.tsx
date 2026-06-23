import { getSession } from "@/lib/auth/session";
import { listStudents, listClasses } from "@/lib/data/admin";
import { StudentsManager } from "@/components/admin/StudentsManager";

export default async function StudentsPage() {
  const session = (await getSession())!;
  const [initial, classes] = await Promise.all([listStudents(session), listClasses(session)]);
  return (
    <StudentsManager
      initial={initial}
      classes={classes.filter((c) => c.active).map((c) => ({ id: c.id, displayName: c.displayName }))}
    />
  );
}
