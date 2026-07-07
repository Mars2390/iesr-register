// PIN login — locked-down flow.
//   Teacher: { teacherId, pin } → verifies THAT teacher's PIN (3-step picker).
//   Admin:   { pin }            → verifies against the configurable admin PIN
//                                 (Settings → default "2003") or the admin hash.
//
// SECURITY:
//   • PINs are low-entropy → DB-backed rate limiting (below) locks an IP out
//     after MAX_ATTEMPTS failures within WINDOW_MS. PBKDF2 cost slows brute force.
//   • The configurable admin PIN is compared in CONSTANT TIME (no `===` timing leak).
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { eq, and, gte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { admins, teachers, activityLog } from "@/db/schema";
import { verifyPin } from "@/lib/auth/pin";
import { getAdminPin } from "@/lib/data/settings";
import { signSession, setSessionCookie, type SessionPayload } from "@/lib/auth/session";

export const runtime = "nodejs"; // node:crypto (PBKDF2) needs the Node runtime

const Body = z.object({ pin: z.string().min(3).max(12), teacherId: z.string().uuid().optional() });

// Lock an IP out after 8 failed attempts in a 15-minute rolling window.
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

/** Constant-time string compare (avoids the timing side-channel of `===`). */
function constEq(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  // always run timingSafeEqual on equal-length buffers so timing doesn't leak length
  const same = timingSafeEqual(ab, ab.length === bb.length ? bb : ab);
  return ab.length === bb.length && same;
}

const ipOf = (req: Request) =>
  (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()) ||
  req.headers.get("x-real-ip") || "unknown";

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });

  const { pin, teacherId } = parsed.data;
  const schoolId = process.env.DEFAULT_SCHOOL_ID!;
  if (!schoolId) return NextResponse.json({ ok: false, error: "school_not_configured" }, { status: 500 });

  const ip = ipOf(req);
  const role = teacherId ? "teacher" : "admin";

  // ---- rate limit: too many recent failures from this IP → lock out ----
  const since = new Date(Date.now() - WINDOW_MS);
  const [fails] = await db.select({ n: sql<number>`count(*)::int` }).from(activityLog).where(and(
    eq(activityLog.schoolId, schoolId),
    eq(activityLog.action, "login_failed"),
    gte(activityLog.createdAt, since),
    sql`${activityLog.meta}->>'ip' = ${ip}`,
  ));
  if ((fails?.n ?? 0) >= MAX_ATTEMPTS) {
    return NextResponse.json({ ok: false, error: "too_many_attempts" }, { status: 429 });
  }

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
    // ---- admin: configurable PIN (Settings, constant-time) or the stored admin hash ----
    const adminPin = await getAdminPin(schoolId);
    const [a] = await db.select().from(admins)
      .where(and(eq(admins.schoolId, schoolId), eq(admins.active, true))).limit(1);
    if (a && (constEq(pin, adminPin) || await verifyPin(pin, a.pinHash, a.pinSalt, a.pinIterations))) {
      session = { sub: a.id, role: "admin", schoolId, name: a.name };
      await db.insert(activityLog).values({ schoolId, adminId: a.id, action: "login", meta: { role: "admin" } });
    }
  }

  if (!session) {
    // record the failed attempt so the rate limiter can see it
    await db.insert(activityLog).values({ schoolId, action: "login_failed", meta: { ip, role } });
    return NextResponse.json({ ok: false, error: "invalid_pin" }, { status: 401 });
  }

  await setSessionCookie(await signSession(session));
  return NextResponse.json({ ok: true, role: session.role, name: session.name });
}
