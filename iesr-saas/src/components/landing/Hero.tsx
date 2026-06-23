"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export function Hero() {
  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } } };
  const item = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  };

  return (
    <section className="relative overflow-hidden bg-kplc-navy text-white">
      {/* depth / texture — solid navy base means the headline is never invisible */}
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-[0.06]" />
      <div className="pointer-events-none absolute -right-32 -top-24 h-[28rem] w-[28rem] rounded-full bg-kplc-blue/25 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-kplc-green/10 blur-3xl" />

      <div className="container-page relative grid items-center gap-12 pt-28 pb-20 lg:grid-cols-2 lg:gap-16 lg:pt-32 lg:pb-28">
        {/* left — copy */}
        <motion.div variants={stagger} initial="hidden" animate="show">
          <motion.span variants={item} className="eyebrow glass rounded-full px-3.5 py-1.5 text-white/90">
            <span className="h-1.5 w-1.5 rounded-full bg-kplc-green" /> Kenya Power · Institute of Energy Studies &amp; Research
          </motion.span>

          <motion.h1 variants={item} className="mt-6 text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
            IESR <span className="kplc-gradient-text">Attendance System</span>
          </motion.h1>

          <motion.p variants={item} className="mt-5 max-w-xl text-lg leading-relaxed text-white/80">
            The official register for the Institute of Energy Studies &amp; Research — mark attendance in seconds,
            monitor every class live, and turn registers into the reports leadership needs.
          </motion.p>

          <motion.div variants={item} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className="btn btn-lg bg-kplc-yellow text-kplc-navy shadow-lg hover:brightness-95">
              Log in to the register
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
            <a href="#features" className="btn btn-lg glass text-white hover:bg-white/20">Explore the platform</a>
          </motion.div>

          <motion.dl variants={item} className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/15 pt-7">
            {[["Real-time", "live monitoring"], ["Secure", "PIN access"], ["0", "spreadsheets"]].map(([k, v]) => (
              <div key={v}>
                <dt className="font-display text-2xl font-bold text-kplc-yellow sm:text-3xl">{k}</dt>
                <dd className="text-xs uppercase tracking-wide text-white/55">{v}</dd>
              </div>
            ))}
          </motion.dl>
        </motion.div>

        {/* right — clean image panel + access card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div className="relative aspect-[5/4] overflow-hidden rounded-3xl bg-kplc-blue/20 shadow-2xl ring-1 ring-white/15">
            <Image src="/images/iesr-7.jpg" alt="IESR Attendance System dashboard" fill priority sizes="(max-width:1024px) 100vw, 50vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-kplc-navy/75 via-transparent to-transparent" />
            <span className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-kplc-navy/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live attendance monitoring
            </span>
          </div>

          {/* access card — echoes the institute portal's sign-in box */}
          <div className="glass mt-5 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-white">Access the register</p>
                <p className="mt-0.5 text-xs text-white/70">Secure PIN sign-in for trainers &amp; administrators.</p>
              </div>
              <Link href="/login" className="shrink-0 rounded-xl bg-kplc-yellow px-4 py-2.5 text-sm font-bold text-kplc-navy hover:brightness-95">
                Log in
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
