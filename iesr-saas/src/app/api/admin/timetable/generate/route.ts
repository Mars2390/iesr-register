// POST /api/admin/timetable/generate
// { classIds?, name?, term?, maxPerClassPerDay?, teacherMaxDaily? }
// Builds inputs from the live register, runs the solver, saves a version
// (applied:false) and returns the preview result.
import { requireAdmin } from "@/lib/auth/guards";
import { ok, unauthorized } from "@/lib/api";
import { getGeneratorInputs, saveVersion, type VersionData } from "@/lib/data/timetableGen";
import { generateTimetable, defaultConfig } from "@/lib/timetable/generate";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const s = await requireAdmin();
  if (!s) return unauthorized();
  const body = (await req.json().catch(() => ({}))) as {
    classIds?: string[]; name?: string; term?: string;
    maxPerClassPerDay?: number; teacherMaxDaily?: number;
  };

  const inputs = await getGeneratorInputs(s, body.classIds?.length ? body.classIds : undefined);
  const config = defaultConfig();
  if (body.maxPerClassPerDay && body.maxPerClassPerDay > 0) config.maxPerClassPerDay = Math.min(body.maxPerClassPerDay, config.slots.length);
  if (body.teacherMaxDaily && body.teacherMaxDaily > 0) config.teacherMaxDaily = Math.min(body.teacherMaxDaily, config.slots.length);

  const result = generateTimetable(inputs, config);
  const name = (body.name?.trim()) || `Generated ${new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`;
  const term = body.term?.trim() ?? "";

  const data: VersionData = {
    name, term, generatedAt: new Date().toISOString(),
    classes: inputs.classes, sessions: result.sessions, unplaced: result.unplaced,
    teacherLoad: result.teacherLoad, stats: result.stats,
  };
  const versionId = await saveVersion(s, name, term, data);

  return ok({ versionId, name, term, classes: inputs.classes, ...result });
}
