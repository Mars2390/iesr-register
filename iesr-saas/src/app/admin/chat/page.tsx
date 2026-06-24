import { getSession } from "@/lib/auth/session";
import { listConversations } from "@/lib/data/chat";
import { AdminChat } from "@/components/admin/AdminChat";

export const dynamic = "force-dynamic";

export default async function AdminChatPage() {
  const session = (await getSession())!;
  const conversations = await listConversations(session);
  return <AdminChat initial={JSON.parse(JSON.stringify(conversations))} />;
}
