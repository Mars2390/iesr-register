// School-wide group chat — open to any signed-in user (teacher OR admin).
//   GET                 → all messages (chronological)
//   GET ?peek=<iso>     → count of unread (messages after <iso> not sent by me)
//   POST { message }    → post to the room as the current user
import { getSession } from "@/lib/auth/session";
import { ok, unauthorized, badRequest } from "@/lib/api";
import { getGroupMessages, getGroupUnread, sendGroupMessage, type ChatRole } from "@/lib/data/groupChat";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  const peek = new URL(req.url).searchParams.get("peek");
  if (peek !== null) {
    const since = peek && peek !== "1" ? peek : null;
    return ok({ unread: await getGroupUnread(session.schoolId, since, session.sub) });
  }
  return ok({ messages: await getGroupMessages(session.schoolId) });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  const b = await req.json().catch(() => null);
  const message = String(b?.message ?? "").trim().slice(0, 2000);
  if (!message) return badRequest("empty_message");
  const id = await sendGroupMessage(session.schoolId, session.sub, session.name, session.role as ChatRole, message);
  return ok({ id });
}
