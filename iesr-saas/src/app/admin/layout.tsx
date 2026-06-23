import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AdminHeader } from "@/components/admin/AdminHeader";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin");
  if (session.role !== "admin") redirect("/teacher");

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader name={session.name} />
      <main className="container-page py-6 sm:py-8">{children}</main>
    </div>
  );
}
