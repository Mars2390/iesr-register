"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

// Interactive image gallery (Zoom-style): arrow navigation + position dots +
// gentle auto-advance. Built on native scroll-snap — robust, responsive, and
// swipeable on touch. Real IESR / Kenya Power photography, matched to labels.
const SHOTS: { img: string; label: string }[] = [
  { img: "/images/iesr-11.jpg", label: "Field operations" },
  { img: "/images/iesr-13.jpg", label: "Practical labs" },
  { img: "/images/iesr-16.jpg", label: "Classroom training" },
  { img: "/images/iesr-2.jpg", label: "Trainees on campus" },
  { img: "/images/iesr-14.jpg", label: "Hands-on electronics" },
  { img: "/images/iesr-12.jpg", label: "High-voltage gear" },
  { img: "/images/iesr-10.jpg", label: "On the grid" },
  { img: "/images/iesr-1.jpg", label: "Substations" },
];

const Arrow = ({ dir }: { dir: "left" | "right" }) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
    <path d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function Gallery() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const pausedRef = useRef(false);
  const max = SHOTS.length - 1;

  // width of one card + gap, measured from the live DOM (responsive-safe)
  const step = useCallback(() => {
    const t = trackRef.current;
    const first = t?.firstElementChild as HTMLElement | null;
    if (!t || !first) return 0;
    const gap = parseFloat(getComputedStyle(t).columnGap || "20") || 20;
    return first.offsetWidth + gap;
  }, []);

  const goTo = useCallback((i: number) => {
    const t = trackRef.current;
    if (!t) return;
    const clamped = Math.max(0, Math.min(i, max));
    t.scrollTo({ left: clamped * step(), behavior: "smooth" });
  }, [max, step]);

  const onScroll = useCallback(() => {
    const t = trackRef.current;
    const s = step();
    if (!t || !s) return;
    setActive(Math.max(0, Math.min(Math.round(t.scrollLeft / s), max)));
  }, [max, step]);

  // gentle auto-advance that bounces at the ends (no jarring jump-back)
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let dir = 1;
    const id = setInterval(() => {
      const t = trackRef.current;
      const s = step();
      if (!t || !s || pausedRef.current) return;
      const cur = Math.round(t.scrollLeft / s);
      if (cur >= max) dir = -1;
      else if (cur <= 0) dir = 1;
      t.scrollTo({ left: (cur + dir) * s, behavior: "smooth" });
    }, 4500);
    return () => clearInterval(id);
  }, [max, step]);

  return (
    <section className="overflow-hidden py-20 sm:py-28">
      <div className="container-page">
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
          <div className="max-w-2xl">
            <p className="eyebrow text-kplc-blue">In the field</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">IESR, on the ground</h2>
            <p className="mt-4 text-lg text-slate-600">
              The crews, classrooms and infrastructure the register keeps visible — every day, across every programme.
            </p>
          </div>
          {/* arrow controls */}
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => goTo(active - 1)}
              disabled={active === 0}
              aria-label="Previous"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-kplc-navy transition hover:border-kplc-blue hover:text-kplc-blue disabled:opacity-30 disabled:hover:border-slate-200 disabled:hover:text-kplc-navy"
            >
              <Arrow dir="left" />
            </button>
            <button
              onClick={() => goTo(active + 1)}
              disabled={active === max}
              aria-label="Next"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-kplc-navy transition hover:border-kplc-blue hover:text-kplc-blue disabled:opacity-30 disabled:hover:border-slate-200 disabled:hover:text-kplc-navy"
            >
              <Arrow dir="right" />
            </button>
          </div>
        </div>
      </div>

      {/* scroll-snap track */}
      <div
        ref={trackRef}
        onScroll={onScroll}
        onMouseEnter={() => (pausedRef.current = true)}
        onMouseLeave={() => (pausedRef.current = false)}
        onTouchStart={() => (pausedRef.current = true)}
        className="scrollbar-hide mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-5 sm:px-8 lg:px-[max(2rem,calc((100vw-72rem)/2))]"
      >
        {SHOTS.map((s) => (
          <figure key={s.label} className="group relative h-56 w-72 shrink-0 snap-start overflow-hidden rounded-3xl shadow-soft ring-1 ring-black/5 sm:h-64 sm:w-80">
            <Image src={s.img} alt={s.label} fill sizes="320px" className="object-cover transition duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-kplc-navy/75 via-kplc-navy/10 to-transparent" />
            <figcaption className="absolute bottom-4 left-4 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-kplc-yellow" />
              <span className="text-sm font-semibold text-white drop-shadow">{s.label}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      {/* position dots */}
      <div className="container-page mt-8 flex justify-center gap-2">
        {SHOTS.map((s, i) => (
          <button
            key={s.label}
            onClick={() => goTo(i)}
            aria-label={`Go to ${s.label}`}
            className={`h-2 rounded-full transition-all duration-300 ${i === active ? "w-6 bg-kplc-blue" : "w-2 bg-slate-300 hover:bg-slate-400"}`}
          />
        ))}
      </div>
    </section>
  );
}
