// Role guards for route handlers + server components.
import { getSession, type SessionPayload, type Role } from "@/lib/auth/session";

/** Returns the session iff it exists and matches `role`, else null. */
export async function requireRole(role: Role): Promise<SessionPayload | null> {
  const s = await getSession();
  return s && s.role === role ? s : null;
}

export const requireTeacher = () => requireRole("teacher");
export const requireAdmin = () => requireRole("admin");
