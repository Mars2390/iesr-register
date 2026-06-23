"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";

const NAV = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/monitor", label: "Monitor" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/classes", label: "Classes" },
  { href: "/admin/teachers", label: "Teachers" },
  { href: "/admin/flags", label: "Flags" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/activity", label: "Activity" },
];

export function AdminHeader({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/admin" className="flex shrink-0 items-center gap-2.5">
          <Logo className="h-7 w-7" />
          <span className="font-bold tracking-tight text-slate-900">IESR</span>
          <span className="hidden rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white sm:inline">Admin</span>
        </Link>

        <nav className="flex min-w-0 items-center gap-1 overflow-x-auto">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive(n.href, n.exact) ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <button onClick={logout} className="btn-ghost shrink-0 px-3 py-1.5 text-sm">Sign out</button>
      </div>
    </header>
  );
}
