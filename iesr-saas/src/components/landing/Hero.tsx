"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";

// Headline words — each rises from behind a mask, staggered (title-sequence feel).
const WORDS: { text: string; color: string }[] = [
  { text: "IESR", color: "text-white" },
  { text: "Attendance", color: "text-kplc-yellow" },
  { text: "System", color: "text-kplc-yellow" },
];

export function Hero() {
  const reduce = useReducedMotion();

  const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.14, delayChildren: 0.15 } } };
  const item: Variants = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
  };
  // the headline is its own stagger container for the word-by-word rise
  const line: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } } };
  const word: Variants = reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.5 } } }
    : { hidden: { y: "115%" }, show: { y: 0, transition: { type: "spring", damping: 15, stiffness: 130 } } };

  return (
    <section className="relative flex min-h-[92vh] items-center overflow-hidden">
      {/* background photo with a slow Ken Burns zoom */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 animate-kenburns">
          <Image src="/images/iesr-11.jpg" alt="Kenya Power energy infrastructure" fill priority sizes="100vw" className="object-cover" />
        </div>
      </div>

      {/* cinematic grading */}
      <div className="absolute inset-0 bg-gradient-to-r from-kplc-navy/95 via-kplc-navy/80 to-kplc-navy/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-kplc-navy/70 via-transparent to-transparent" />
      {/* vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_35%,transparent_55%,rgba(3,10,30,0.6)_100%)]" />
      {/* film grain */}
      <div className="film-grain pointer-events-none absolute inset-0" />

      <div className="container-page relative pt-28 pb-20 text-white lg:pt-32">
        <motion.div variants={container} initial="hidden" animate="show" className="max-w-2xl">
          <motion.span variants={item} className="eyebrow glass rounded-full px-3.5 py-1.5 text-white/90">
            <span className="h-1.5 w-1.5 rounded-full bg-kplc-green" /> Kenya Power · Institute of Energy Studies &amp; Research
          </motion.span>

          {/* masked, word-by-word rise */}
          <motion.h1 variants={line} className="mt-6 flex flex-wrap text-5xl font-extrabold leading-[1.04] drop-shadow-sm sm:text-6xl lg:text-7xl">
            {WORDS.map((w) => (
              <span key={w.text} className="mr-[0.28em] inline-flex overflow-hidden pb-[0.15em] -mb-[0.15em]">
                <motion.span variants={word} className={`inline-block ${w.color}`}>{w.text}</motion.span>
              </span>
            ))}
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

      {/* subtle scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 sm:block"
      >
        <span className="flex h-9 w-6 items-start justify-center rounded-full border border-white/30 p-1.5">
          <motion.span
            animate={reduce ? {} : { y: [0, 8, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="h-1.5 w-1.5 rounded-full bg-white/70"
          />
        </span>
      </motion.div>
    </section>
  );
}
