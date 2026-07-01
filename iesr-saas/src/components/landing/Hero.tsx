"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion, useScroll, useTransform, useSpring, useMotionValue, useReducedMotion,
} from "framer-motion";
import { SplitText } from "./SplitText";
import { FloatingField } from "./FloatingField";

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  // scroll parallax: background drifts slower than the foreground text
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1.12, 1.28]);
  const midY = useTransform(scrollYProgress, [0, 1], ["0%", "45%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "-16%"]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  // mouse-aware tilt (subtle depth)
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [5, -5]), { stiffness: 150, damping: 18 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-5, 5]), { stiffness: 150, damping: 18 });
  const glowX = useSpring(useTransform(mx, [-0.5, 0.5], [-24, 24]), { stiffness: 120, damping: 20 });

  const onMove = (e: React.MouseEvent) => {
    if (reduce) return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.35 } } };
  const item = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  };

  return (
    <section
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative flex min-h-[92vh] items-center overflow-hidden [perspective:1200px]"
    >
      {/* layer 1 — background photo (deepest, slowest) */}
      <motion.div className="gpu absolute inset-0" style={reduce ? undefined : { y: bgY, scale: bgScale }}>
        <Image src="/images/iesr-11.jpg" alt="Kenya Power energy infrastructure" fill priority sizes="100vw" className="object-cover" />
      </motion.div>

      {/* layer 2 — gradient veils (mid depth) */}
      <motion.div className="absolute inset-0" style={reduce ? undefined : { y: midY }}>
        <div className="absolute inset-0 bg-gradient-to-r from-kplc-navy/95 via-kplc-navy/80 to-kplc-navy/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-kplc-navy/70 via-transparent to-transparent" />
        <motion.div
          aria-hidden
          className="absolute -inset-40 opacity-60"
          style={reduce ? undefined : { x: glowX, background: "radial-gradient(50% 40% at 30% 30%, rgba(20,102,184,0.35), transparent 70%)" }}
        />
      </motion.div>

      {/* layer 3 — floating particles */}
      <FloatingField />

      {/* layer 4 — foreground content (mouse tilt + scroll) */}
      <motion.div
        className="container-page relative pt-28 pb-20 text-white lg:pt-32"
        style={reduce ? undefined : { y: textY, opacity: textOpacity, rotateX, rotateY, transformStyle: "preserve-3d" }}
      >
        <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-2xl" style={{ transform: "translateZ(40px)" }}>
          <motion.span variants={item} className="eyebrow glass rounded-full px-3.5 py-1.5 text-white/90">
            <span className="h-1.5 w-1.5 rounded-full bg-kplc-green" /> Kenya Power · Institute of Energy Studies &amp; Research
          </motion.span>

          <h1 className="mt-6 text-5xl font-extrabold leading-[1.04] drop-shadow-sm sm:text-6xl lg:text-7xl">
            <SplitText text="IESR" className="block" />
            <SplitText text="Attendance System" className="block text-kplc-yellow" delay={0.25} />
          </h1>

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
      </motion.div>

      {/* scroll cue */}
      {!reduce && (
        <motion.div
          aria-hidden
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none"><path d="M12 5v14M6 13l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </motion.div>
      )}
    </section>
  );
}
