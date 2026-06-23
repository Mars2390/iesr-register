// Teacher CRUD. PIN is hashed server-side (PBKDF2) → needs the Node runtime.
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { teachers, activityLog } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { ok, fail, unauthorized, badRequest } from "@/lib/api";
import { listTeachers } from "@/lib/data/admin";
import { hashPin } from "@/lib/auth/pin";

export const runtime = "nodejs";

const asClassIds = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

export async function GET() {
  const s = await requireAdmin();
  if (!s) return unauthorized();
  return ok(await listTeachers(s));
}

export async function POST(req: Request) {
  const s = await requireAdmin();
  if (!s) return unauthorized();
  const b = await req.json().catch(() => null);
  const name = String(b?.name ?? "").trim();
  const pin = String(b?.pin ?? "").trim();
  const classIds = asClassIds(b?.classIds);
  if (!name || pin.length < 3) return badRequest("name_and_pin_required");
  try {
    const { hash, salt } = await hashPin(pin);
    const [row] = await db.insert(teachers)
      .values({ schoolId: s.schoolId, name, pinHash: hash, pinSalt: salt, classIds })
      .returning({ id: teachers.id });
    await db.insert(activityLog).values({ schoolId: s.schoolId, adminId: s.sub, action: "create_teacher", meta: { name } });
    return ok({ id: row.id });
  } catch {
    return fail("save_failed", 409);
  }
}

export async function PATCH(req: Request) {
  const s = await requireAdmin();
  if (!s) return unauthorized();
  const b = await req.json().catch(() => null);
  const id = String(b?.id ?? "");
  if (!id) return badRequest("missing_id");

  const patch: Record<string, unknown> = {};
  if (typeof b.name === "string") patch.name = b.name.trim();
  if ("classIds" in b) patch.classIds = asClassIds(b.classIds);
  if (typeof b.active === "boolean") patch.active = b.active;
  if (typeof b.pin === "string" && b.pin.trim().length >= 3) {
    const { hash, salt } = await hashPin(b.pin.trim());
    patch.pinHash = hash;
    patch.pinSalt = salt;
  }
  if (!Object.keys(patch).length) return badRequest("nothing_to_update");
  try {
    await db.update(teachers).set(patch).where(and(eq(teachers.id, id), eq(teachers.schoolId, s.schoolId)));
    return ok({ updated: true });
  } catch {
    return fail("save_failed", 409);
  }
}

export async function DELETE(req: Request) {
  const s = await requireAdmin();
  if (!s) return unauthorized();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return badRequest("missing_id");
  await db.update(teachers).set({ active: false }).where(and(eq(teachers.id, id), eq(teachers.schoolId, s.schoolId)));
  return ok({ deactivated: true });
}
