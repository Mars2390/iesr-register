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
    <div className="relative min-h-screen">
      {/* premium branded backdrop — fixed photo with a light wash so it reads as a
          subtle textured background while keeping all text crisp on top. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <Image src="/images/iesr-11.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
        {/* light wash: lets ~25% of the photo show, keeps luminance high for dark text */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/82 via-slate-50/74 to-slate-100/88" />
        {/* brand depth: soft navy glow at the top, faint yellow warmth bottom-right */}
        <div className="absolute inset-0 bg-[radial-gradient(75%_55%_at_50%_-12%,rgba(11,46,99,0.20),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(45%_40%_at_100%_100%,rgba(245,197,24,0.10),transparent_70%)]" />
      </div>

      {/* content sits above the backdrop */}
      <div className="relative z-10">
        <AdminHeader name={session.name} registerName={settings.registerName} period={period} />
        <main className="container-page py-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
