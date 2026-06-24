import { getSession } from "@/lib/auth/session";
import { getGroupMessages } from "@/lib/data/groupChat";
import { GroupChat } from "@/components/chat/GroupChat";

export const dynamic = "force-dynamic";

export default async function TeacherSchoolChatPage() {
  const session = (await getSession())!;
  const messages = await getGroupMessages(session.schoolId);
  return <GroupChat initial={JSON.parse(JSON.stringify(messages))} currentUserId={session.sub} />;
}
