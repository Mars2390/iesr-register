"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

const LINKS: [string, string][] = [
  ["Features", "#features"],
  ["How it works", "#how"],
  ["For teams", "#who"],
  ["About", "#about"],
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* solid institutional bar — styled after the IESR portal */}
      <div className={`bg-kplc-navy transition-shadow duration-300 ${scrolled ? "shadow-lg shadow-black/25" : ""}`}>
        <nav className="container-page flex h-16 items-center justify-between gap-4">
          {/* brand */}
          <Link href="/" className="flex items-center gap-3">
            <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white ring-2 ring-white/40">
              <Image src="/images/iesr-3.jpg" alt="IESR" fill sizes="40px" className="object-cover" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-extrabold tracking-tight text-white">
                I<span className="text-kplc-yellow">E</span>S<span className="text-kplc-green">R</span>
                <span className="ml-1 font-semibold text-white/90">Attendance</span>
              </span>
              <span className="hidden text-[11px] font-medium tracking-wide text-white/55 sm:block">
                Institute of Energy Studies &amp; Research
              </span>
            </span>
          </Link>

          {/* links */}
          <div className="hidden items-center gap-7 lg:flex">
            {LINKS.map(([label, href]) => (
              <a key={href} href={href} className="text-sm font-semibold text-white/85 transition-colors hover:text-kplc-yellow">{label}</a>
            ))}
          </div>

          {/* actions */}
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:inline-flex">Log in</Link>
            <Link href="/login" className="rounded-lg bg-kplc-yellow px-4 py-2 text-sm font-bold text-kplc-navy transition hover:brightness-95">Get started</Link>
            <button onClick={() => setOpen((o) => !o)} className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-white hover:bg-white/10 lg:hidden" aria-label="Menu">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none"><path d={open ? "M6 6l12 12M6 18L18 6" : "M4 7h16M4 12h16M4 17h16"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          </div>
        </nav>
      </div>

      {/* premium IESR accent strip */}
      <div className="h-1 w-full bg-gradient-to-r from-kplc-blue via-kplc-green to-kplc-yellow" />

      {/* mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-b border-white/10 bg-kplc-navy lg:hidden">
            <div className="container-page flex flex-col gap-1 py-4">
              {LINKS.map(([label, href]) => (
                <a key={href} href={href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/85 hover:bg-white/10">{label}</a>
              ))}
              <Link href="/login" className="mt-2 rounded-xl bg-kplc-yellow px-3 py-2.5 text-center text-sm font-bold text-kplc-navy">Log in</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
