import { getSession } from "@/lib/auth/session";
import { getSchoolSettings } from "@/lib/data/settings";
import { SettingsManager } from "@/components/admin/SettingsManager";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = (await getSession())!;
  const settings = await getSchoolSettings(session.schoolId);
  return <SettingsManager initial={settings} />;
}
