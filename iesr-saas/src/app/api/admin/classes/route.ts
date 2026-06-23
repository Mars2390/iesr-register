import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { classes, activityLog } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { ok, fail, unauthorized, badRequest } from "@/lib/api";
import { listClasses } from "@/lib/data/admin";

export async function GET() {
  const s = await requireAdmin();
  if (!s) return unauthorized();
  return ok(await listClasses(s));
}

export async function POST(req: Request) {
  const s = await requireAdmin();
  if (!s) return unauthorized();
  const b = await req.json().catch(() => null);
  const code = String(b?.code ?? "").trim();
  const displayName = String(b?.displayName ?? "").trim();
  const category = String(b?.category ?? "Other").trim() || "Other";
  if (!code || !displayName) return badRequest("missing_fields");
  try {
    const [row] = await db.insert(classes).values({ schoolId: s.schoolId, code, displayName, category }).returning({ id: classes.id });
    await db.insert(activityLog).values({ schoolId: s.schoolId, adminId: s.sub, action: "create_class", classId: row.id, meta: { code } });
    return ok({ id: row.id });
  } catch {
    return fail("save_failed_maybe_duplicate_code", 409);
  }
}

export async function PATCH(req: Request) {
  const s = await requireAdmin();
  if (!s) return unauthorized();
  const b = await req.json().catch(() => null);
  const id = String(b?.id ?? "");
  if (!id) return badRequest("missing_id");
  const patch: Record<string, unknown> = {};
  if (typeof b.code === "string") patch.code = b.code.trim();
  if (typeof b.displayName === "string") patch.displayName = b.displayName.trim();
  if (typeof b.category === "string") patch.category = b.category.trim();
  if (typeof b.active === "boolean") patch.active = b.active;
  if (!Object.keys(patch).length) return badRequest("nothing_to_update");
  try {
    await db.update(classes).set(patch).where(and(eq(classes.id, id), eq(classes.schoolId, s.schoolId)));
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
  // soft delete — preserves students/timetable/attendance history
  await db.update(classes).set({ active: false }).where(and(eq(classes.id, id), eq(classes.schoolId, s.schoolId)));
  return ok({ deactivated: true });
}
