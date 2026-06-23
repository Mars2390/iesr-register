// Free (no-PIN) sign-in for the current phase. Pick a trainer (or admin) and go.
// Re-enable the PIN flow (/api/auth/login) once real PINs are migrated.
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { teachers, admins, activityLog } from "@/db/schema";
import { ok, fail, badRequest } from "@/lib/api";
import { signSession, setSessionCookie, type SessionPayload } from "@/lib/auth/session";

export const runtime = "nodejs";

interface Body { teacherId?: unknown; admin?: unknown; }

export async function POST(req: Request) {
  const schoolId = process.env.DEFAULT_SCHOOL_ID;
  if (!schoolId) return fail("school_not_configured", 500);

  const body = (await req.json().catch(() => null)) as Body | null;
  let session: SessionPayload | null = null;

  if (body?.admin === true) {
    const [a] = await db.select().from(admins)
      .where(and(eq(admins.schoolId, schoolId), eq(admins.active, true))).limit(1);
    if (!a) return fail("no_admin", 404);
    session = { sub: a.id, role: "admin", schoolId, name: a.name };
    await db.insert(activityLog).values({ schoolId, adminId: a.id, action: "login", meta: { free: true } });
  } else if (typeof body?.teacherId === "string") {
    const [t] = await db.select().from(teachers)
      .where(and(eq(teachers.id, body.teacherId), eq(teachers.schoolId, schoolId), eq(teachers.active, true))).limit(1);
    if (!t) return fail("teacher_not_found", 404);
    session = { sub: t.id, role: "teacher", schoolId, name: t.name, classIds: t.classIds };
    await db.insert(activityLog).values({ schoolId, teacherId: t.id, action: "login", meta: { free: true } });
  }

  if (!session) return badRequest("invalid_request");
  await setSessionCookie(await signSession(session));
  return ok({ role: session.role });
}
