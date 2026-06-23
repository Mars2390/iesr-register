// Session = signed JWT (HS256, via jose) in an httpOnly cookie. Edge-compatible
// (jose has no node:crypto dependency) so middleware can verify it.
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const COOKIE_NAME = "iesr_session";
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET!);
const MAX_AGE = Number(process.env.SESSION_MAX_AGE ?? 28800); // 8h

export type Role = "teacher" | "admin";
export interface SessionPayload {
  sub: string;           // teacher.id or admin.id
  role: Role;
  schoolId: string;
  name: string;
  classIds?: string[];   // teachers only (null = all, e.g. admin)
}

export async function signSession(p: SessionPayload): Promise<string> {
  return new SignJWT({ ...p })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// Server-component / route-handler helpers (Next 15: cookies() is async).
export async function setSessionCookie(token: string) {
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: MAX_AGE,
  });
}
export async function clearSessionCookie() {
  (await cookies()).delete(COOKIE_NAME);
}
export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  return token ? verifySessionToken(token) : null;
}
