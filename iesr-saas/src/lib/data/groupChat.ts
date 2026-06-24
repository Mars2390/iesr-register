// School-wide group chat data layer. One room per school; teachers + admin all
// post into it. Resilient: read paths never throw to the page.
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { groupChatMessages } from "@/db/schema";

export type ChatRole = "teacher" | "admin";
export interface GroupMessage {
  id: string; senderId: string; senderName: string; senderRole: ChatRole; message: string; createdAt: string;
}

const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : String(v ?? ""));

export async function sendGroupMessage(schoolId: string, senderId: string, senderName: string, senderRole: ChatRole, message: string) {
  const [row] = await db.insert(groupChatMessages)
    .values({ schoolId, senderId, senderName, senderRole, message })
    .returning({ id: groupChatMessages.id });
  return row.id;
}

/** Last `limit` messages in chronological order. Never throws. */
export async function getGroupMessages(schoolId: string, limit = 300): Promise<GroupMessage[]> {
  try {
    const rows = await db.select({
      id: groupChatMessages.id, senderId: groupChatMessages.senderId, senderName: groupChatMessages.senderName,
      senderRole: groupChatMessages.senderRole, message: groupChatMessages.message, createdAt: groupChatMessages.createdAt,
    })
      .from(groupChatMessages)
      .where(eq(groupChatMessages.schoolId, schoolId))
      .orderBy(asc(groupChatMessages.createdAt))
      .limit(limit);
    return rows.map((r) => ({ ...r, createdAt: iso(r.createdAt) }));
  } catch (e) {
    console.error("getGroupMessages failed:", (e as Error).message);
    return [];
  }
}

/** Count of messages after `sinceIso` not sent by `excludeSenderId` (for the unread badge). */
export async function getGroupUnread(schoolId: string, sinceIso: string | null, excludeSenderId: string): Promise<number> {
  try {
    const conds = [eq(groupChatMessages.schoolId, schoolId), ne(groupChatMessages.senderId, excludeSenderId)];
    if (sinceIso) conds.push(sql`${groupChatMessages.createdAt} > ${sinceIso}::timestamptz`);
    const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(groupChatMessages).where(and(...conds));
    return r?.n ?? 0;
  } catch { return 0; }
}
