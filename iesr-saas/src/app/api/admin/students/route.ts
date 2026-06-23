import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { students } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { ok, fail, unauthorized, badRequest } from "@/lib/api";
import { listStudents } from "@/lib/data/admin";

export async function GET() {
  const s = await requireAdmin();
  if (!s) return unauthorized();
  return ok(await listStudents(s));
}

export async function POST(req: Request) {
  const s = await requireAdmin();
  if (!s) return unauthorized();
  const b = await req.json().catch(() => null);
  const admissionNo = String(b?.admissionNo ?? "").trim();
  const fullName = String(b?.fullName ?? "").trim();
  const classId = b?.classId ? String(b.classId) : null;
  if (!admissionNo || !fullName) return badRequest("missing_fields");
  try {
    const [row] = await db.insert(students).values({ schoolId: s.schoolId, admissionNo, fullName, classId }).returning({ id: students.id });
    return ok({ id: row.id });
  } catch {
    return fail("save_failed_maybe_duplicate_admission", 409);
  }
}

export async function PATCH(req: Request) {
  const s = await requireAdmin();
  if (!s) return unauthorized();
  const b = await req.json().catch(() => null);
  const id = String(b?.id ?? "");
  if (!id) return badRequest("missing_id");
  const patch: Record<string, unknown> = {};
  if (typeof b.admissionNo === "string") patch.admissionNo = b.admissionNo.trim();
  if (typeof b.fullName === "string") patch.fullName = b.fullName.trim();
  if ("classId" in b) patch.classId = b.classId ? String(b.classId) : null;
  if (typeof b.active === "boolean") patch.active = b.active;
  if (!Object.keys(patch).length) return badRequest("nothing_to_update");
  try {
    await db.update(students).set(patch).where(and(eq(students.id, id), eq(students.schoolId, s.schoolId)));
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
  await db.update(students).set({ active: false }).where(and(eq(students.id, id), eq(students.schoolId, s.schoolId)));
  return ok({ deactivated: true });
}
