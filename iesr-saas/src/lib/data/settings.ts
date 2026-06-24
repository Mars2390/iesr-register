// School settings live in schools.name + schools.settings (jsonb) — no dedicated
// table, so these are editable from the admin UI with zero schema changes. The
// submission code is read from here at request time, so changing it in Settings
// instantly re-keys every teacher write without touching code.
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { schools } from "@/db/schema";
import { SUBMISSION_CODE } from "@/lib/attendance";

export interface SchoolSettings {
  schoolName: string;
  registerName: string;
  academicYear: string;
  term: string;
  submissionCode: string;
  adminPin: string;
}

/** Default administrator PIN if none has been set in Settings yet. */
export const DEFAULT_ADMIN_PIN = "2003";

const str = (v: unknown, fallback: string) => (typeof v === "string" && v.trim() ? v : fallback);

export async function getSchoolSettings(schoolId: string): Promise<SchoolSettings> {
  const [row] = await db.select({ name: schools.name, settings: schools.settings })
    .from(schools).where(eq(schools.id, schoolId)).limit(1);
  const s = (row?.settings ?? {}) as Record<string, unknown>;
  return {
    schoolName: row?.name ?? "KPLC IESR",
    registerName: str(s.registerName, "IESR Register"),
    academicYear: typeof s.academicYear === "string" ? s.academicYear : "",
    term: typeof s.term === "string" ? s.term : "",
    submissionCode: str(s.submissionCode, SUBMISSION_CODE),
    adminPin: str(s.adminPin, DEFAULT_ADMIN_PIN),
  };
}

/** Submission code for a school (fallback to the built-in default). */
export async function getSubmissionCode(schoolId: string): Promise<string> {
  return (await getSchoolSettings(schoolId)).submissionCode;
}

/** Administrator PIN for a school (fallback to the default 2003). */
export async function getAdminPin(schoolId: string): Promise<string> {
  return (await getSchoolSettings(schoolId)).adminPin;
}

export interface SettingsPatch {
  schoolName?: string; registerName?: string; academicYear?: string; term?: string; submissionCode?: string; adminPin?: string;
}

export async function updateSchoolSettings(schoolId: string, patch: SettingsPatch): Promise<void> {
  const [row] = await db.select({ settings: schools.settings }).from(schools).where(eq(schools.id, schoolId)).limit(1);
  const cur = (row?.settings ?? {}) as Record<string, unknown>;
  const next = { ...cur };
  if (patch.registerName !== undefined) next.registerName = patch.registerName;
  if (patch.academicYear !== undefined) next.academicYear = patch.academicYear;
  if (patch.term !== undefined) next.term = patch.term;
  if (patch.submissionCode !== undefined) next.submissionCode = patch.submissionCode;
  if (patch.adminPin !== undefined) next.adminPin = patch.adminPin;

  const set: Record<string, unknown> = { settings: next, updatedAt: new Date() };
  if (patch.schoolName !== undefined) set.name = patch.schoolName;
  await db.update(schools).set(set).where(eq(schools.id, schoolId));
}
