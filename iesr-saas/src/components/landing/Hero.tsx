"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export function Hero() {
  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } } };
  const item = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  };

  return (
    <section className="relative flex min-h-[88vh] items-center overflow-hidden">
      {/* one clean background photo */}
      <Image src="/images/iesr-11.jpg" alt="Kenya Power energy infrastructure" fill priority sizes="100vw" className="object-cover" />
      {/* left-weighted gradient keeps the headline crisp while the photo stays visible */}
      <div className="absolute inset-0 bg-gradient-to-r from-kplc-navy/95 via-kplc-navy/80 to-kplc-navy/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-kplc-navy/70 via-transparent to-transparent" />

      <div className="container-page relative pt-28 pb-20 text-white lg:pt-32">
        <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-2xl">
          <motion.span variants={item} className="eyebrow glass rounded-full px-3.5 py-1.5 text-white/90">
            <span className="h-1.5 w-1.5 rounded-full bg-kplc-green" /> Kenya Power · Institute of Energy Studies &amp; Research
          </motion.span>

          <motion.h1 variants={item} className="mt-6 text-5xl font-extrabold leading-[1.04] drop-shadow-sm sm:text-6xl lg:text-7xl">
            IESR <span className="text-kplc-yellow">Attendance System</span>
          </motion.h1>

          <motion.p variants={item} className="mt-6 max-w-xl text-lg leading-relaxed text-white/85">
            The official register for the Institute of Energy Studies &amp; Research — mark attendance in seconds,
            monitor every class live, and turn registers into the reports leadership needs.
          </motion.p>

          <motion.div variants={item} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className="btn btn-lg bg-kplc-yellow text-kplc-navy shadow-lg hover:brightness-95">
              Access the register
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
            <a href="#features" className="btn btn-lg glass text-white hover:bg-white/20">Explore the platform</a>
          </motion.div>

          <motion.dl variants={item} className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/20 pt-7">
            {[["Real-time", "live monitoring"], ["Secure", "class access"], ["0", "spreadsheets"]].map(([k, v]) => (
              <div key={v}>
                <dt className="font-display text-2xl font-bold text-kplc-yellow sm:text-3xl">{k}</dt>
                <dd className="text-xs uppercase tracking-wide text-white/60">{v}</dd>
              </div>
            ))}
          </motion.dl>
        </motion.div>
      </div>
    </section>
  );
}
