import { requireTeacher } from "@/lib/auth/guards";
import { ok, unauthorized } from "@/lib/api";
import { getAssignedClasses } from "@/lib/data/teacher";

export async function GET() {
  const session = await requireTeacher();
  if (!session) return unauthorized();
  return ok(await getAssignedClasses(session));
}
