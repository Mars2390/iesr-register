// Admin messaging endpoint.
//   GET                    → conversation list (every teacher) + total unread
//   GET ?teacherId=…       → one teacher's thread (marks their messages read)
//   GET ?peek=1            → total unread count (for the header badge; no marking)
//   POST { teacherId, body } → reply to a teacher
import { requireAdmin } from "@/lib/auth/guards";
import { ok, unauthorized, badRequest, forbidden } from "@/lib/api";
import { listConversations, getAdminThread, getAdminUnread, sendMessage, teacherInSchool } from "@/lib/data/chat";

export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return unauthorized();
  const url = new URL(req.url);
  if (url.searchParams.get("peek")) return ok({ unread: await getAdminUnread(session) });
  const teacherId = url.searchParams.get("teacherId");
  if (teacherId) {
    if (!(await teacherInSchool(session, teacherId))) return forbidden();
    return ok({ messages: await getAdminThread(session, teacherId) });
  }
  return ok({ conversations: await listConversations(session), unread: await getAdminUnread(session) });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return unauthorized();
  const b = await req.json().catch(() => null);
  const teacherId = String(b?.teacherId ?? "");
  const body = String(b?.body ?? "").trim().slice(0, 2000);
  if (!teacherId || !body) return badRequest("missing_fields");
  if (!(await teacherInSchool(session, teacherId))) return forbidden();
  const id = await sendMessage(session.schoolId, teacherId, "admin", body);
  return ok({ id });
}
