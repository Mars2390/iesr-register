"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type NavItem = { href: string; label: string; exact?: boolean; badge?: "private" | "group" };
const NAV: NavItem[] = [
  { href: "/teacher", label: "Classes", exact: true },
  { href: "/teacher/history", label: "History" },
  { href: "/teacher/chat", label: "Chat", badge: "private" },
  { href: "/teacher/school-chat", label: "School Chat", badge: "group" },
  { href: "/teacher/flags", label: "Flags" },
];

export function TeacherHeader({ name, registerName = "IESR Register" }: { name: string; registerName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [unreadGroup, setUnreadGroup] = useState(0);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const r1 = await fetch("/api/chat?peek=1", { cache: "no-store" }).then((r) => r.json());
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

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-kplc-navy">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/teacher" className="flex items-center gap-2.5">
          <span className="relative h-8 w-8 overflow-hidden rounded-lg ring-1 ring-white/25">
            <Image src="/images/iesr-4.jpg" alt="IESR" fill sizes="32px" className="object-cover" />
          </span>
          <span className="font-bold tracking-tight text-white">{registerName}</span>
          <span className="hidden rounded-full bg-kplc-yellow px-2 py-0.5 text-xs font-bold text-kplc-navy sm:inline">
            Teacher
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`relative rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
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

        <div className="flex items-center gap-3">
          <span className="hidden text-sm font-medium text-white/70 sm:inline">{name}</span>
          <button onClick={logout} className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
