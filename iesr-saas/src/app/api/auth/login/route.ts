// PIN login. "Enter any valid PIN, no name needed" — we resolve which person
// owns the PIN by verifying against the admin PIN first, then every active
// teacher (per-salt hashes require iteration; fine for a single school's staff).
//
// SECURITY: PINs are low-entropy (4 digits). The real protection is rate
// limiting + lockout, which you should add at the edge (e.g. Upstash Ratelimit)
// before production. PBKDF2 cost here also slows brute force.
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { admins, teachers, activityLog } from "@/db/schema";
import { verifyPin } from "@/lib/auth/pin";
import { signSession, setSessionCookie, type SessionPayload } from "@/lib/auth/session";

export const runtime = "nodejs"; // node:crypto (PBKDF2) needs the Node runtime

const Body = z.object({ pin: z.string().min(3).max(12) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });

  const { pin } = parsed.data;
  const schoolId = process.env.DEFAULT_SCHOOL_ID!;
  if (!schoolId) return NextResponse.json({ ok: false, error: "school_not_configured" }, { status: 500 });

  let session: SessionPayload | null = null;

  // 1) admin PIN(s)
  const adminRows = await db.select().from(admins).where(and(eq(admins.schoolId, schoolId), eq(admins.active, true)));
  for (const a of adminRows) {
    if (await verifyPin(pin, a.pinHash, a.pinSalt, a.pinIterations)) {
      session = { sub: a.id, role: "admin", schoolId, name: a.name };
      await db.insert(activityLog).values({ schoolId, adminId: a.id, action: "login", meta: { role: "admin" } });
      break;
    }
  }

  // 2) teacher PINs
  if (!session) {
    const teacherRows = await db.select().from(teachers).where(and(eq(teachers.schoolId, schoolId), eq(teachers.active, true)));
    for (const t of teacherRows) {
      if (await verifyPin(pin, t.pinHash, t.pinSalt, t.pinIterations)) {
        session = { sub: t.id, role: "teacher", schoolId, name: t.name, classIds: t.classIds };
        await db.insert(activityLog).values({ schoolId, teacherId: t.id, action: "login", meta: { role: "teacher" } });
        break;
      }
    }
  }

  if (!session) return NextResponse.json({ ok: false, error: "invalid_pin" }, { status: 401 });

  await setSessionCookie(await signSession(session));
  return NextResponse.json({ ok: true, role: session.role, name: session.name });
}
