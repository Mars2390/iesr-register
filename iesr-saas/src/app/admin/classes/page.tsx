import { getSession } from "@/lib/auth/session";
import { listClasses } from "@/lib/data/admin";
import { ClassesManager } from "@/components/admin/ClassesManager";

export default async function ClassesPage() {
  const session = (await getSession())!;
  const initial = await listClasses(session);
  return <ClassesManager initial={initial} />;
}
