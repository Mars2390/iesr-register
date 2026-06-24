"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/teacher", label: "Classes", exact: true },
  { href: "/teacher/history", label: "History" },
  { href: "/teacher/chat", label: "Messages", badge: true },
  { href: "/teacher/flags", label: "Flags" },
];

export function TeacherHeader({ name, registerName = "IESR Register" }: { name: string; registerName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;
    const poll = () => fetch("/api/chat?peek=1", { cache: "no-store" }).then((r) => r.json())
      .then((j) => { if (alive && j.ok) setUnread(j.data.unread); }).catch(() => {});
    poll();
    const t = setInterval(poll, 12000);
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
              {n.badge && unread > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unread}</span>
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
