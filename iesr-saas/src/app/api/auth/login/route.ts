// PIN login — locked-down flow.
//   Teacher: { teacherId, pin } → verifies THAT teacher's PIN (3-step picker).
//   Admin:   { pin }            → verifies against the configurable admin PIN
//                                 (Settings → default "2003") or the admin hash.
//
// SECURITY: PINs are low-entropy. Add edge rate-limiting/lockout before
// production. PBKDF2 cost slows brute force.
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { admins, teachers, activityLog } from "@/db/schema";
import { verifyPin } from "@/lib/auth/pin";
import { getAdminPin } from "@/lib/data/settings";
import { signSession, setSessionCookie, type SessionPayload } from "@/lib/auth/session";

export const runtime = "nodejs"; // node:crypto (PBKDF2) needs the Node runtime

const Body = z.object({ pin: z.string().min(3).max(12), teacherId: z.string().uuid().optional() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });

  const { pin, teacherId } = parsed.data;
  const schoolId = process.env.DEFAULT_SCHOOL_ID!;
  if (!schoolId) return NextResponse.json({ ok: false, error: "school_not_configured" }, { status: 500 });

  let session: SessionPayload | null = null;

  if (teacherId) {
    // ---- teacher: verify this specific teacher's PIN ----
    const [t] = await db.select().from(teachers)
      .where(and(eq(teachers.id, teacherId), eq(teachers.schoolId, schoolId), eq(teachers.active, true))).limit(1);
    if (t && await verifyPin(pin, t.pinHash, t.pinSalt, t.pinIterations)) {
      session = { sub: t.id, role: "teacher", schoolId, name: t.name, classIds: t.classIds };
      await db.insert(activityLog).values({ schoolId, teacherId: t.id, action: "login", meta: { role: "teacher" } });
    }
  } else {
    // ---- admin: configurable PIN (Settings) or the stored admin hash ----
    const adminPin = await getAdminPin(schoolId);
    const [a] = await db.select().from(admins)
      .where(and(eq(admins.schoolId, schoolId), eq(admins.active, true))).limit(1);
    if (a && (pin === adminPin || await verifyPin(pin, a.pinHash, a.pinSalt, a.pinIterations))) {
      session = { sub: a.id, role: "admin", schoolId, name: a.name };
      await db.insert(activityLog).values({ schoolId, adminId: a.id, action: "login", meta: { role: "admin" } });
    }
  }

  if (!session) return NextResponse.json({ ok: false, error: "invalid_pin" }, { status: 401 });

  await setSessionCookie(await signSession(session));
  return NextResponse.json({ ok: true, role: session.role, name: session.name });
}
