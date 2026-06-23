import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { flagsIssues } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { ok, unauthorized, badRequest } from "@/lib/api";
import { listFlags } from "@/lib/data/admin";

const STATUSES = new Set(["open", "acknowledged", "resolved"]);

export async function GET() {
  const s = await requireAdmin();
  if (!s) return unauthorized();
  return ok(await listFlags(s));
}

export async function PATCH(req: Request) {
  const s = await requireAdmin();
  if (!s) return unauthorized();
  const b = await req.json().catch(() => null);
  const id = String(b?.id ?? "");
  const status = String(b?.status ?? "");
  if (!id || !STATUSES.has(status)) return badRequest("invalid_request");

  const resolved = status === "resolved";
  await db.update(flagsIssues)
    .set({
      status: status as "open" | "acknowledged" | "resolved",
      resolved,
      resolvedAt: resolved ? sql`now()` : null,
    })
    .where(and(eq(flagsIssues.id, id), eq(flagsIssues.schoolId, s.schoolId)));
  return ok({ updated: true });
}
