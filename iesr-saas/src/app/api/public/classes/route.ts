import { ok } from "@/lib/api";
import { getPublicClasses } from "@/lib/data/public";

export async function GET() {
  return ok(await getPublicClasses());
}
