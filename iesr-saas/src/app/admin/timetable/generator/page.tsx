import { getSession } from "@/lib/auth/session";
import { listClasses } from "@/lib/data/admin";
import { TimetableGeneratorClient } from "@/components/admin/TimetableGeneratorClient";

export const dynamic = "force-dynamic";

export default async function GeneratorPage() {
  const session = (await getSession())!;
  const classes = (await listClasses(session)).filter((c) => c.active).map((c) => {
    const m = c.displayName.match(/\(([^)]+)\)\s*$/);
    return { id: c.id, code: c.code, name: m ? m[1].trim() : c.displayName };
  });
  return <TimetableGeneratorClient classes={JSON.parse(JSON.stringify(classes))} />;
}
