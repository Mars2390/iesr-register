"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

/* ---------------------------------------------------------------- icons */
type I = { className?: string };
const IconCheck = ({ className }: I) => (<svg viewBox="0 0 24 24" className={className} fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const IconPulse = ({ className }: I) => (<svg viewBox="0 0 24 24" className={className} fill="none"><path d="M3 12h4l2 6 4-14 2 8h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const IconChart = ({ className }: I) => (<svg viewBox="0 0 24 24" className={className} fill="none"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const IconDoc = ({ className }: I) => (<svg viewBox="0 0 24 24" className={className} fill="none"><path d="M7 3h7l5 5v13H7zM14 3v5h5M9 13h6M9 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const IconKey = ({ className }: I) => (<svg viewBox="0 0 24 24" className={className} fill="none"><path d="M15 7a4 4 0 11-3.9 5H8v3H5v3H2v-3l6.1-6.1A4 4 0 0115 7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const IconEye = ({ className }: I) => (<svg viewBox="0 0 24 24" className={className} fill="none"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" /></svg>);
const IconUsers = ({ className }: I) => (<svg viewBox="0 0 24 24" className={className} fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.9M16 3.1A4 4 0 0116 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const IconShield = ({ className }: I) => (<svg viewBox="0 0 24 24" className={className} fill="none"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>);
const IconBuilding = ({ className }: I) => (<svg viewBox="0 0 24 24" className={className} fill="none"><path d="M3 21h18M5 21V5a2 2 0 012-2h6a2 2 0 012 2v16M15 21V9h2a2 2 0 012 2v10M8 7h2M8 11h2M8 15h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>);

/* ------------------------------------------------------ menu structure */
type MenuItem = { icon: (p: I) => JSX.Element; label: string; blurb: string; href: string };
type Nav = { label: string; href: string; tagline?: string; items?: MenuItem[] };

const NAV: Nav[] = [
  {
    label: "Features",
    href: "#features",
    tagline: "Everything a modern register should be — the speed of paper, the power of the cloud.",
    items: [
      { icon: IconCheck, label: "One-tap marking", blurb: "Present, Absent, Late per session — on any device.", href: "#features" },
      { icon: IconPulse, label: "Live monitoring", blurb: "See who is marking which class, right now.", href: "#features" },
      { icon: IconChart, label: "Insight & momentum", blurb: "At-risk learners and class trends, computed for you.", href: "#features" },
      { icon: IconDoc, label: "PDF & CSV reports", blurb: "Branded reports straight from the dashboard.", href: "#features" },
    ],
  },
  {
    label: "How it works",
    href: "#how",
    tagline: "From PIN to report in three simple steps.",
    items: [
      { icon: IconKey, label: "Sign in with a PIN", blurb: "A valid PIN identifies the trainer — nothing to remember.", href: "#how" },
      { icon: IconCheck, label: "Mark the register", blurb: "Pick the day and session, tap statuses, submit.", href: "#how" },
      { icon: IconEye, label: "Monitor & report", blurb: "Admins watch live, triage flags, export reports.", href: "#how" },
    ],
  },
  {
    label: "For teams",
    href: "#who",
    tagline: "One platform, every role at the institute.",
    items: [
      { icon: IconUsers, label: "Trainers", blurb: "A focused register for your assigned classes.", href: "#who" },
      { icon: IconShield, label: "Administrators", blurb: "A live command centre for the whole institute.", href: "#who" },
      { icon: IconEye, label: "Parents & sponsors", blurb: "Clear visibility into a trainee's attendance.", href: "#who" },
    ],
  },
  {
    label: "About",
    href: "#about",
    tagline: "Kenya Power's training arm since 1957.",
    items: [
      { icon: IconBuilding, label: "The Institute", blurb: "Building the engineers behind the national grid.", href: "#about" },
      { icon: IconShield, label: "Trusted & secure", blurb: "Cloud-backed, accountable, built to scale.", href: "#about" },
    ],
  },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* solid institutional bar — styled after the IESR portal */}
      <div className={`bg-gradient-to-b from-[#274083] to-[#28478a] transition-shadow duration-300 ${scrolled ? "shadow-lg shadow-black/25" : ""}`}>
        <nav className="container-page flex h-16 items-center justify-between gap-4">
          {/* brand */}
          <Link href="/" className="flex items-center gap-3">
            <span className="relative h-12 w-12 shrink-0 overflow-hidden">
              <Image src="/images/iesr-4.jpg" alt="IESR — Institute of Energy Studies & Research" fill sizes="48px" className="object-cover" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-extrabold tracking-tight text-white">
                IESR <span className="font-semibold text-white/80">Attendance</span>
              </span>
              <span className="hidden text-[11px] font-medium tracking-wide text-white/55 sm:block">
                Institute of Energy Studies &amp; Research
              </span>
            </span>
          </Link>

          {/* links — hover reveals a rich detail panel (KPLC-Sight style) */}
          <div className="hidden items-center gap-1 lg:flex" onMouseLeave={() => setActive(null)}>
            {NAV.map((nav) => (
              <div key={nav.href} className="relative" onMouseEnter={() => setActive(nav.label)}>
                <a
                  href={nav.href}
                  className={`group inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${active === nav.label ? "text-kplc-yellow" : "text-white/85 hover:text-white"}`}
                >
                  {nav.label}
                  {nav.items && (
                    <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 transition-transform duration-200 ${active === nav.label ? "rotate-180" : ""}`} fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  )}
                </a>

                <AnimatePresence>
                  {active === nav.label && nav.items && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute left-1/2 top-full z-50 mt-3 w-[26rem] -translate-x-1/2"
                    >
                      {/* little pointer */}
                      <div className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 rounded-sm border-l border-t border-slate-200 bg-white" />
                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
                        <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-kplc-blue">{nav.label}</p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-500">{nav.tagline}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-0.5 p-2">
                          {nav.items.map((it) => (
                            <a key={it.label} href={it.href} className="group/item flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50">
                              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-kplc-blue to-kplc-navy text-white">
                                <it.icon className="h-[18px] w-[18px]" />
                              </span>
                              <span>
                                <span className="block text-sm font-semibold text-slate-800 group-hover/item:text-kplc-navy">{it.label}</span>
                                <span className="block text-xs leading-snug text-slate-500">{it.blurb}</span>
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-b border-white/10 bg-[#28478a] lg:hidden">
            <div className="container-page flex flex-col gap-1 py-4">
              {NAV.map((nav) => (
                <a key={nav.href} href={nav.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/85 hover:bg-white/10">{nav.label}</a>
              ))}
              <Link href="/login" className="mt-2 rounded-xl bg-kplc-yellow px-3 py-2.5 text-center text-sm font-bold text-kplc-navy">Log in</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
