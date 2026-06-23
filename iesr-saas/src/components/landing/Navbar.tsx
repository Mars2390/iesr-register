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
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? "border-b border-white/10 bg-kplc-navy/85 backdrop-blur-md" : "bg-transparent"}`}>
      <nav className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="relative h-9 w-9 overflow-hidden rounded-full ring-2 ring-white/40">
            <Image src="/images/iesr-3.jpg" alt="IESR" fill sizes="36px" className="object-cover" />
          </span>
          <span className="text-lg font-bold tracking-tight text-white">
            IESR<span className="text-kplc-yellow">·Register</span>
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map(([label, href]) => (
            <a key={href} href={href} className="text-sm font-medium text-white/80 transition-colors hover:text-white">{label}</a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:inline-flex">Log in</Link>
          <Link href="/login" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-kplc-navy shadow-sm transition-colors hover:bg-white/90">Get started</Link>
          <button onClick={() => setOpen((o) => !o)} className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-white hover:bg-white/10 md:hidden" aria-label="Menu">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none"><path d={open ? "M6 6l12 12M6 18L18 6" : "M4 7h16M4 12h16M4 17h16"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-white/10 bg-kplc-navy/95 backdrop-blur-md md:hidden"
          >
            <div className="container-page flex flex-col gap-1 py-4">
              {LINKS.map(([label, href]) => (
                <a key={href} href={href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/85 hover:bg-white/10">{label}</a>
              ))}
              <Link href="/login" className="mt-2 rounded-xl bg-white px-3 py-2.5 text-center text-sm font-semibold text-kplc-navy">Log in</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
