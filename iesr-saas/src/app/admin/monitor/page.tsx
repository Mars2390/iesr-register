import { getSession } from "@/lib/auth/session";
import { getMonitorData } from "@/lib/data/admin";
import { MonitorClient } from "@/components/admin/MonitorClient";

export default async function MonitorPage() {
  const session = (await getSession())!;
  const initial = await getMonitorData(session);
  // serialize Dates to strings for the client component
  return <MonitorClient initial={JSON.parse(JSON.stringify(initial))} />;
}
