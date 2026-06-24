// Teacher flags/issues: GET (own flags) + POST (raise one).
import { db } from "@/db/client";
import { flagsIssues, activityLog } from "@/db/schema";
import { requireTeacher } from "@/lib/auth/guards";
import { ok, unauthorized, forbidden, badRequest } from "@/lib/api";
import { teacherOwnsClass, getTeacherFlags } from "@/lib/data/teacher";
import { getSubmissionCode } from "@/lib/data/settings";

export async function GET() {
  const session = await requireTeacher();
  if (!session) return unauthorized();
  return ok(await getTeacherFlags(session));
}

interface Body { classId?: unknown; issueType?: unknown; description?: unknown; submissionCode?: unknown; }

export async function POST(req: Request) {
  const session = await requireTeacher();
  if (!session) return unauthorized();

  const body = (await req.json().catch(() => null)) as Body | null;
  if (String(body?.submissionCode ?? "") !== (await getSubmissionCode(session.schoolId))) return badRequest("invalid_code");
  const issueType = String(body?.issueType ?? "").trim();
  const description = String(body?.description ?? "").trim();
  const classId = body?.classId ? String(body.classId) : null;

  if (!issueType) return badRequest("missing_issueType");
  if (classId && !teacherOwnsClass(session, classId)) return forbidden();

  const [row] = await db
    .insert(flagsIssues)
    .values({ schoolId: session.schoolId, teacherId: session.sub, classId, issueType, description })
    .returning({ id: flagsIssues.id });

  await db.insert(activityLog).values({
    schoolId: session.schoolId, teacherId: session.sub, action: "raise_flag", classId, meta: { issueType },
  });

  return ok({ id: row.id });
}
