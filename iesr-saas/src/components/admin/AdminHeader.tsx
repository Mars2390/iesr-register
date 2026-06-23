"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

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
    <header className="sticky top-0 z-40 border-b border-white/10 bg-kplc-navy">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/admin" className="flex shrink-0 items-center gap-2.5">
          <span className="relative h-8 w-8 overflow-hidden rounded-lg ring-1 ring-white/25">
            <Image src="/images/iesr-4.jpg" alt="IESR" fill sizes="32px" className="object-cover" />
          </span>
          <span className="font-bold tracking-tight text-white">
            IESR<span className="text-kplc-yellow">·Register</span>
          </span>
          <span className="hidden rounded-full bg-kplc-yellow px-2 py-0.5 text-xs font-bold text-kplc-navy sm:inline">Admin</span>
        </Link>

        <nav className="flex min-w-0 items-center gap-1 overflow-x-auto">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive(n.href, n.exact)
                  ? "bg-white/15 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <button onClick={logout} className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white">
          Sign out
        </button>
      </div>
    </header>
  );
}
