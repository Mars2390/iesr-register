import { ok, badRequest } from "@/lib/api";
import { getPublicTeachers } from "@/lib/data/public";

export async function GET(req: Request) {
  const classId = new URL(req.url).searchParams.get("classId") ?? "";
  if (!classId) return badRequest("missing_classId");
  return ok(await getPublicTeachers(classId));
}
