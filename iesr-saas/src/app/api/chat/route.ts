// Teacher messaging endpoint.
//   GET            → full thread (marks admin replies read)
//   GET ?peek=1    → just the unread count (does NOT mark read — for the badge)
//   POST { body }  → send a message to the admin
import { requireTeacher } from "@/lib/auth/guards";
import { ok, unauthorized, badRequest } from "@/lib/api";
import { getTeacherThread, getTeacherUnread, sendMessage } from "@/lib/data/chat";

export async function GET(req: Request) {
  const session = await requireTeacher();
  if (!session) return unauthorized();
  if (new URL(req.url).searchParams.get("peek")) return ok({ unread: await getTeacherUnread(session) });
  return ok({ messages: await getTeacherThread(session) });
}

export async function POST(req: Request) {
  const session = await requireTeacher();
  if (!session) return unauthorized();
  const b = await req.json().catch(() => null);
  const body = String(b?.body ?? "").trim().slice(0, 2000);
  if (!body) return badRequest("empty_message");
  const id = await sendMessage(session.schoolId, session.sub, "teacher", body);
  return ok({ id });
}
