import Image from "next/image";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getSchoolSettings } from "@/lib/data/settings";
import { AdminHeader } from "@/components/admin/AdminHeader";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin");
  if (session.role !== "admin") redirect("/teacher");

  const settings = await getSchoolSettings(session.schoolId);
  const period = [settings.academicYear, settings.term].filter(Boolean).join(" · ");

  return (
    <div className="relative min-h-screen bg-slate-50">
      {/* premium, subtle backdrop — fixed so it stays put while content scrolls */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <Image src="/images/iesr-11.jpg" alt="" fill priority sizes="100vw" className="object-cover opacity-[0.06]" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/70 via-slate-50/92 to-slate-50" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(60% 40% at 50% -5%, rgba(11,46,99,0.10), rgba(255,255,255,0) 70%)" }} />
      </div>
      <AdminHeader name={session.name} registerName={settings.registerName} period={period} />
      <main className="container-page py-6 sm:py-8">{children}</main>
    </div>
  );
}
