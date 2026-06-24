import { getSession } from "@/lib/auth/session";
import { getTeacherThread } from "@/lib/data/chat";
import { TeacherChat } from "@/components/teacher/TeacherChat";

export const dynamic = "force-dynamic";

export default async function TeacherChatPage() {
  const session = (await getSession())!;
  const messages = await getTeacherThread(session);
  return <TeacherChat initial={messages} />;
}
