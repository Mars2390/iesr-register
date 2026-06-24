// GET/PATCH school settings (name, register name, academic year, term,
// submission code). Admin only. Stored in schools.name + schools.settings.
import { db } from "@/db/client";
import { activityLog } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { ok, unauthorized, badRequest } from "@/lib/api";
import { getSchoolSettings, updateSchoolSettings, type SettingsPatch } from "@/lib/data/settings";

const CODE_RE = /^[A-Za-z0-9]{3,12}$/;

export async function GET() {
  const s = await requireAdmin();
  if (!s) return unauthorized();
  return ok(await getSchoolSettings(s.schoolId));
}

export async function PATCH(req: Request) {
  const s = await requireAdmin();
  if (!s) return unauthorized();
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return badRequest("invalid_body");

  const patch: SettingsPatch = {};
  if (typeof b.schoolName === "string") patch.schoolName = b.schoolName.trim().slice(0, 120);
  if (typeof b.registerName === "string") patch.registerName = b.registerName.trim().slice(0, 80);
  if (typeof b.academicYear === "string") patch.academicYear = b.academicYear.trim().slice(0, 40);
  if (typeof b.term === "string") patch.term = b.term.trim().slice(0, 40);
  if (typeof b.submissionCode === "string") {
    const code = b.submissionCode.trim();
    if (!CODE_RE.test(code)) return badRequest("invalid_code_format"); // 3–12 alphanumerics
    patch.submissionCode = code;
  }
  if (typeof b.adminPin === "string") {
    const pin = b.adminPin.trim();
    if (!CODE_RE.test(pin)) return badRequest("invalid_pin_format"); // 3–12 alphanumerics
    patch.adminPin = pin;
  }
  if (patch.schoolName === "") return badRequest("school_name_required");
  if (!Object.keys(patch).length) return badRequest("nothing_to_update");

  await updateSchoolSettings(s.schoolId, patch);
  await db.insert(activityLog).values({ schoolId: s.schoolId, adminId: s.sub, action: "update_settings", meta: { keys: Object.keys(patch) } });
  return ok(await getSchoolSettings(s.schoolId));
}
