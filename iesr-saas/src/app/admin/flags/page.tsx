import { getSession } from "@/lib/auth/session";
import { listFlags } from "@/lib/data/admin";
import { FlagsTriage } from "@/components/admin/FlagsTriage";

export default async function AdminFlagsPage() {
  const session = (await getSession())!;
  const flags = await listFlags(session);
  return <FlagsTriage initial={JSON.parse(JSON.stringify(flags))} />;
}
