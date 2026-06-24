"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type NavItem = { href: string; label: string; exact?: boolean; badge?: "private" | "group" };
const NAV: NavItem[] = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/monitor", label: "Monitor" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/classes", label: "Classes" },
  { href: "/admin/teachers", label: "Teachers" },
  { href: "/admin/timetable", label: "Timetable" },
  { href: "/admin/chat", label: "Messages", badge: "private" as const },
  { href: "/admin/school-chat", label: "School Chat", badge: "group" as const },
  { href: "/admin/flags", label: "Flags" },
  { href: "/admin/notes", label: "Notes" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/activity", label: "Activity" },
  { href: "/admin/data", label: "Data" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminHeader({ name, registerName = "IESR Register", period = "" }: { name: string; registerName?: string; period?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [unreadGroup, setUnreadGroup] = useState(0);
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const r1 = await fetch("/api/admin/chat?peek=1", { cache: "no-store" }).then((r) => r.json());
        if (alive && r1.ok) setUnread(r1.data.unread);
        const since = (() => { try { return localStorage.getItem("iesr_group_lastseen") ?? "1"; } catch { return "1"; } })();
        const r2 = await fetch(`/api/chat/group?peek=${encodeURIComponent(since)}`, { cache: "no-store" }).then((r) => r.json());
        if (alive && r2.ok) setUnreadGroup(r2.data.unread);
      } catch { /* offline */ }
    };
    poll();
    const t = setInterval(poll, 8000);
    return () => { alive = false; clearInterval(t); };
  }, [pathname]);

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
          <span className="font-bold tracking-tight text-white">{registerName}</span>
          <span className="hidden rounded-full bg-kplc-yellow px-2 py-0.5 text-xs font-bold text-kplc-navy sm:inline">Admin</span>
          {period && <span className="hidden rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/80 lg:inline">{period}</span>}
        </Link>

        <nav className="flex min-w-0 items-center gap-1 overflow-x-auto">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`relative whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive(n.href, n.exact)
                  ? "bg-white/15 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {n.label}
              {((n.badge === "private" && unread > 0) || (n.badge === "group" && unreadGroup > 0)) && (
                <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{n.badge === "private" ? unread : unreadGroup}</span>
              )}
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
