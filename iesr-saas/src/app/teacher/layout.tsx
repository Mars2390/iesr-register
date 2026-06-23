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
      <main className="container-page py-6 sm:py-8">{children}</main>
    </div>
  );
}
