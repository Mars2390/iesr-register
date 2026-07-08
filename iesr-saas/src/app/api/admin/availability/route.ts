// GET  /api/admin/availability            → teachers + their unavailable slots
// POST /api/admin/availability { teacherId, unavailable:[{day,slotIndex}] }
import { requireAdmin } from "@/lib/auth/guards";
import { ok, unauthorized, badRequest } from "@/lib/api";
import { getAvailability, setAvailability } from "@/lib/data/timetableGen";

export const runtime = "nodejs";

export async function GET() {
  const s = await requireAdmin();
  if (!s) return unauthorized();
  return ok(await getAvailability(s));
}

export async function POST(req: Request) {
  const s = await requireAdmin();
  if (!s) return unauthorized();
  const body = await req.json().catch(() => null) as { teacherId?: string; unavailable?: { day: string; slotIndex: number }[] } | null;
  if (!body?.teacherId || !Array.isArray(body.unavailable)) return badRequest("invalid_request");
  await setAvailability(s, body.teacherId, body.unavailable);
  return ok({ saved: true });
}
