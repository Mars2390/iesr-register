"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";

const NAV = [
  { href: "/teacher", label: "Classes", exact: true },
  { href: "/teacher/history", label: "History" },
  { href: "/teacher/flags", label: "Flags" },
];

export function TeacherHeader({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/teacher" className="flex items-center gap-2.5">
          <Logo className="h-7 w-7" />
          <span className="font-bold tracking-tight text-slate-900">IESR</span>
          <span className="hidden rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700 sm:inline">
            Teacher
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive(n.href, n.exact)
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm font-medium text-slate-600 sm:inline">{name}</span>
          <button onClick={logout} className="btn-ghost px-3 py-1.5 text-sm">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
