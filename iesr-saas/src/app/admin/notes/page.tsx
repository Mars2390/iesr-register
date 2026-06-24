import { getSession } from "@/lib/auth/session";
import { listNotes, listClasses } from "@/lib/data/admin";
import { NotesView } from "@/components/admin/NotesView";

export const dynamic = "force-dynamic";

export default async function AdminNotesPage() {
  const session = (await getSession())!;
  const [notes, classes] = await Promise.all([listNotes(session), listClasses(session)]);
  return (
    <NotesView
      initial={JSON.parse(JSON.stringify(notes))}
      classes={classes.filter((c) => c.active).map((c) => ({ id: c.id, displayName: c.displayName }))}
    />
  );
}
