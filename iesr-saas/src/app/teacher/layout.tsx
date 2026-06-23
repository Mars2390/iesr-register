import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/teacher");
  if (session.role !== "teacher") redirect("/admin");

  return (
    <div className="min-h-screen bg-slate-50">
      <TeacherHeader name={session.name} />
      <main className="w-full px-3 py-5 sm:px-5 lg:px-6">{children}</main>
    </div>
  );
}
