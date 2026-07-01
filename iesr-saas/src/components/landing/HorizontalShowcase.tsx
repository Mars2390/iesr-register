"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  motion, useScroll, useTransform, useSpring, useMotionValueEvent, useReducedMotion,
} from "framer-motion";

export interface ShowcaseItem { img: string; eyebrow: string; title: string; body: string }

/**
 * Horizontal-on-vertical scroll (Apple-style): the section pins while the card
 * track slides sideways, with progress dots. On mobile / reduced-motion it
 * degrades to a clean vertical stack so nothing feels trapped.
 */
export function HorizontalShowcase({ items, heading, eyebrow }: { items: ShowcaseItem[]; heading: string; eyebrow: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 26, restDelta: 0.001 });
  const n = items.length;
  const x = useTransform(smooth, [0, 1], ["0%", `-${((n - 1) / n) * 100}%`]);

  useMotionValueEvent(smooth, "change", (v) => {
    setActive(Math.min(n - 1, Math.max(0, Math.round(v * (n - 1)))));
  });

  return (
    <section className="bg-transparent">
      {/* section heading */}
      <div className="container-page pt-20 text-center sm:pt-28">
        <p className="eyebrow text-kplc-blue">{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">{heading}</h2>
      </div>

      {/* desktop: pinned horizontal track */}
      <div ref={ref} className="relative hidden md:block" style={{ height: `${n * 100}vh` }}>
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <motion.div className="gpu flex flex-nowrap" style={reduce ? undefined : { x, width: `${n * 100}vw` }}>
            {items.map((s, i) => (
              <div key={s.title} className="flex h-screen w-screen shrink-0 items-center justify-center px-6">
                <Card item={s} index={i} total={n} />
              </div>
            ))}
          </motion.div>

          {/* progress dots */}
          <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 gap-2.5">
            {items.map((s, i) => (
              <span
                key={s.title}
                className={`h-2 rounded-full transition-all duration-300 ${i === active ? "w-8 bg-kplc-blue" : "w-2 bg-slate-300"}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* mobile: vertical stack */}
      <div className="container-page space-y-8 py-12 md:hidden">
        {items.map((s, i) => (
          <motion.div key={s.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5 }}>
            <Card item={s} index={i} total={n} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Card({ item, index, total }: { item: ShowcaseItem; index: number; total: number }) {
  return (
    <div className="mx-auto grid w-full max-w-5xl items-center gap-8 rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-soft backdrop-blur-sm lg:grid-cols-2 lg:p-10">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
        <Image src={item.img} alt={item.title} fill sizes="(max-width:1024px) 90vw, 45vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-kplc-navy/40 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 font-display text-xs font-bold text-kplc-navy">
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      </div>
      <div>
        <p className="eyebrow text-kplc-green">{item.eyebrow}</p>
        <h3 className="mt-3 text-2xl font-bold sm:text-3xl">{item.title}</h3>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">{item.body}</p>
      </div>
    </div>
  );
}
