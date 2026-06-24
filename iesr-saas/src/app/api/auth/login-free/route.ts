// DISABLED. The free (no-PIN) sign-in was a bootstrap convenience and is now a
// security hole — all access goes through the PIN flow (/api/auth/login).
import { fail } from "@/lib/api";

export async function POST() {
  return fail("pin_required", 410);
}
