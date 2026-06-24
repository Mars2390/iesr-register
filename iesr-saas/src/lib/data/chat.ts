// Teacher ↔ admin direct messaging. One conversation per teacher (single-school
// system → the admin is always the other party). Separate from flags_issues.
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { chatMessages, teachers } from "@/db/schema";
import type { SessionPayload } from "@/lib/auth/session";

export type ChatSender = "teacher" | "admin";
export interface ChatMessage { id: string; sender: ChatSender; body: string; createdAt: string; }

// The Neon HTTP driver returns timestamptz columns as ISO strings, not Date
// objects — so never call Date methods on them directly.
const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : String(v ?? ""));

/** Insert a message; the sender's own side is marked read immediately. */
export async function sendMessage(schoolId: string, teacherId: string, sender: ChatSender, body: string) {
  const [row] = await db.insert(chatMessages).values({
    schoolId, teacherId, sender, body,
    readByAdmin: sender === "admin", readByTeacher: sender === "teacher",
  }).returning({ id: chatMessages.id });
  return row.id;
}

/* ----------------------------------------------------------------- teacher side */

/** Teacher's own thread. Marks admin replies as read. */
export async function getTeacherThread(session: SessionPayload): Promise<ChatMessage[]> {
  await db.update(chatMessages)
    .set({ readByTeacher: true })
    .where(and(eq(chatMessages.schoolId, session.schoolId), eq(chatMessages.teacherId, session.sub),
      eq(chatMessages.sender, "admin"), eq(chatMessages.readByTeacher, false)));
  const rows = await db.select({ id: chatMessages.id, sender: chatMessages.sender, body: chatMessages.body, createdAt: chatMessages.createdAt })
    .from(chatMessages)
    .where(and(eq(chatMessages.schoolId, session.schoolId), eq(chatMessages.teacherId, session.sub)))
    .orderBy(asc(chatMessages.createdAt));
  return rows.map((r) => ({ ...r, createdAt: iso(r.createdAt) }));
}

export async function getTeacherUnread(session: SessionPayload): Promise<number> {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(chatMessages)
    .where(and(eq(chatMessages.schoolId, session.schoolId), eq(chatMessages.teacherId, session.sub),
      eq(chatMessages.sender, "admin"), eq(chatMessages.readByTeacher, false)));
  return r?.n ?? 0;
}

/* ----------------------------------------------------------------- admin side */

export interface Conversation {
  teacherId: string; teacherName: string; active: boolean;
  lastBody: string | null; lastAt: string | null; unread: number; total: number;
}

/** All teachers as conversations (even with no messages yet), newest activity first. */
export async function listConversations(session: SessionPayload): Promise<Conversation[]> {
  const [tchs, agg, recent] = await Promise.all([
    db.select({ id: teachers.id, name: teachers.name, active: teachers.active })
      .from(teachers).where(eq(teachers.schoolId, session.schoolId)).orderBy(asc(teachers.name)),
    db.select({
      teacherId: chatMessages.teacherId,
      lastAt: sql<string>`max(${chatMessages.createdAt})`,
      total: sql<number>`count(*)::int`,
      unread: sql<number>`count(*) filter (where ${chatMessages.sender} = 'teacher' and ${chatMessages.readByAdmin} = false)::int`,
    }).from(chatMessages).where(eq(chatMessages.schoolId, session.schoolId)).groupBy(chatMessages.teacherId),
    db.select({ teacherId: chatMessages.teacherId, body: chatMessages.body, createdAt: chatMessages.createdAt })
      .from(chatMessages).where(eq(chatMessages.schoolId, session.schoolId))
      .orderBy(desc(chatMessages.createdAt)).limit(500),
  ]);

  const aggMap = new Map(agg.map((a) => [a.teacherId, a]));
  const lastBody = new Map<string, string>();
  for (const m of recent) if (!lastBody.has(m.teacherId)) lastBody.set(m.teacherId, m.body);

  return tchs.map((t) => {
    const a = aggMap.get(t.id);
    return {
      teacherId: t.id, teacherName: t.name, active: t.active,
      lastBody: lastBody.get(t.id) ?? null,
      lastAt: a?.lastAt ? iso(a.lastAt) : null,
      unread: a?.unread ?? 0, total: a?.total ?? 0,
    };
  }).sort((x, y) => (y.lastAt ?? "").localeCompare(x.lastAt ?? ""));
}

/** One teacher's thread (admin view). Marks teacher messages as read. */
export async function getAdminThread(session: SessionPayload, teacherId: string): Promise<ChatMessage[]> {
  await db.update(chatMessages)
    .set({ readByAdmin: true })
    .where(and(eq(chatMessages.schoolId, session.schoolId), eq(chatMessages.teacherId, teacherId),
      eq(chatMessages.sender, "teacher"), eq(chatMessages.readByAdmin, false)));
  const rows = await db.select({ id: chatMessages.id, sender: chatMessages.sender, body: chatMessages.body, createdAt: chatMessages.createdAt })
    .from(chatMessages)
    .where(and(eq(chatMessages.schoolId, session.schoolId), eq(chatMessages.teacherId, teacherId)))
    .orderBy(asc(chatMessages.createdAt));
  return rows.map((r) => ({ ...r, createdAt: iso(r.createdAt) }));
}

export async function getAdminUnread(session: SessionPayload): Promise<number> {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(chatMessages)
    .where(and(eq(chatMessages.schoolId, session.schoolId), eq(chatMessages.sender, "teacher"), eq(chatMessages.readByAdmin, false)));
  return r?.n ?? 0;
}

/** Validate a teacher belongs to this school (admin sending to a teacher). */
export async function teacherInSchool(session: SessionPayload, teacherId: string): Promise<boolean> {
  const [r] = await db.select({ id: teachers.id }).from(teachers)
    .where(and(eq(teachers.id, teacherId), eq(teachers.schoolId, session.schoolId))).limit(1);
  return !!r;
}
