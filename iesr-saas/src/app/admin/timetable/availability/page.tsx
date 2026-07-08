import { getSession } from "@/lib/auth/session";
import { getAvailability } from "@/lib/data/timetableGen";
import { AvailabilityClient } from "@/components/admin/AvailabilityClient";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  const session = (await getSession())!;
  const data = await getAvailability(session);
  return <AvailabilityClient initial={JSON.parse(JSON.stringify(data))} />;
}
