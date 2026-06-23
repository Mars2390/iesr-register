"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "28%"]); // parallax
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
  };
  const item = {
    hidden: { opacity: 0, y: 26 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  };

  return (
    <section ref={ref} className="relative flex min-h-[94vh] items-center overflow-hidden">
      {/* parallax background */}
      <motion.div style={{ y }} className="absolute inset-0 -z-10">
        <Image src="/images/iesr-1.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-kplc-navy/90 via-kplc-navy/75 to-kplc-navy/95" />
        <div className="absolute inset-0 bg-dots opacity-10" />
      </motion.div>

      <motion.div style={{ opacity: fade }} variants={stagger} initial="hidden" animate="show" className="container-page py-28 text-white">
        <motion.span variants={item} className="eyebrow glass rounded-full px-3.5 py-1.5 text-white/90">
          <span className="h-1.5 w-1.5 rounded-full bg-kplc-green" /> Kenya Power · Institute of Energy Studies &amp; Research
        </motion.span>

        <motion.h1 variants={item} className="mt-6 max-w-4xl text-4xl font-extrabold leading-[1.05] text-white sm:text-6xl lg:text-7xl">
          Attendance that powers a <span className="kplc-gradient-text">national institution.</span>
        </motion.h1>

        <motion.p variants={item} className="mt-6 max-w-2xl text-lg leading-relaxed text-white/80">
          The IESR Register replaces paper sheets and spreadsheets with a secure, cloud-backed platform —
          mark in seconds, monitor every class live, and turn registers into the reports leadership needs.
        </motion.p>

        <motion.div variants={item} className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link href="/login" className="btn btn-lg bg-white text-kplc-navy shadow-lg hover:bg-white/90">
            Log in to the register
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          <a href="#features" className="btn btn-lg glass text-white hover:bg-white/20">Explore the platform</a>
        </motion.div>

        <motion.dl variants={item} className="mt-14 grid max-w-xl grid-cols-3 gap-6 border-t border-white/15 pt-8">
          {[["Real-time", "live monitoring"], ["4", "status types"], ["0", "spreadsheets"]].map(([k, v]) => (
            <div key={v}>
              <dt className="font-display text-3xl font-bold text-white">{k}</dt>
              <dd className="text-xs uppercase tracking-wide text-white/60">{v}</dd>
            </div>
          ))}
        </motion.dl>
      </motion.div>

      {/* scroll cue */}
      <motion.div style={{ opacity: fade }} className="absolute inset-x-0 bottom-6 flex justify-center">
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.8 }} className="text-white/50">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none"><path d="M12 5v14M6 13l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </motion.div>
      </motion.div>
    </section>
  );
}
