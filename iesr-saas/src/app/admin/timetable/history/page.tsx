import { getSession } from "@/lib/auth/session";
import { listVersions } from "@/lib/data/timetableGen";
import { TimetableHistoryClient } from "@/components/admin/TimetableHistoryClient";

export const dynamic = "force-dynamic";

export default async function TimetableHistoryPage() {
  const session = (await getSession())!;
  const versions = await listVersions(session);
  return <TimetableHistoryClient initial={JSON.parse(JSON.stringify(versions))} />;
}
