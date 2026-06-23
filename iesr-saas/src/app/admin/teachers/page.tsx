import { getSession } from "@/lib/auth/session";
import { listTeachers, listClasses } from "@/lib/data/admin";
import { TeachersManager } from "@/components/admin/TeachersManager";

export default async function TeachersPage() {
  const session = (await getSession())!;
  const [initial, classes] = await Promise.all([listTeachers(session), listClasses(session)]);
  return (
    <TeachersManager
      initial={initial}
      classes={classes.filter((c) => c.active).map((c) => ({ id: c.id, displayName: c.displayName }))}
    />
  );
}
