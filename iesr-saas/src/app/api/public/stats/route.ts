// GET /api/public/stats — real headline numbers for the landing page (no auth).
import { ok } from "@/lib/api";
import { getPublicStats } from "@/lib/data/public";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok(await getPublicStats());
}
