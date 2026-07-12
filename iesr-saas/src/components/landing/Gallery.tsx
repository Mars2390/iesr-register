"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

// Cinematic center-focus carousel (Zoom hero style): the active image is large
// and bright, neighbours peek in dimmed, and it auto-advances. Native scroll-snap
// (snap-center) keeps it smooth + swipeable; a scroll listener drives the emphasis.
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
    <path d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function Gallery() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const pausedRef = useRef(false);
  const max = SHOTS.length - 1;

  const goTo = useCallback((i: number) => {
    const t = trackRef.current;
    if (!t) return;
    const clamped = Math.max(0, Math.min(i, max));
    const child = t.children[clamped] as HTMLElement | undefined;
    if (!child) return;
    // Scroll ONLY the horizontal track — never the page. scrollIntoView() would
    // scroll every scrollable ancestor (incl. the window), which on mobile yanks
    // the whole page down to the gallery while the user is still up in the hero.
    const left = child.offsetLeft - (t.clientWidth - child.offsetWidth) / 2;
    t.scrollTo({ left, behavior: "smooth" });
  }, [max]);

  // active = the slide whose centre is nearest the viewport centre
  const onScroll = useCallback(() => {
    const t = trackRef.current;
    if (!t) return;
    const mid = t.getBoundingClientRect().left + t.clientWidth / 2;
    let best = 0, bestDist = Infinity;
    Array.from(t.children).forEach((c, i) => {
      const r = (c as HTMLElement).getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - mid);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    setActive(best);
  }, []);

  // gentle auto-advance that bounces at the ends
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let dir = 1;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      setActive((cur) => {
        let next = cur + dir;
        if (next > max) { dir = -1; next = cur - 1; }
        else if (next < 0) { dir = 1; next = cur + 1; }
        goTo(next);
        return cur; // real active comes from onScroll
      });
    }, 4000);
    return () => clearInterval(id);
  }, [max, goTo]);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-kplc-navy via-[#0a2550] to-kplc-navy py-20 text-white sm:py-28">
      {/* soft cinematic glow */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 -z-0 h-96 -translate-y-1/2 bg-[radial-gradient(60%_60%_at_50%_50%,rgba(20,102,184,0.35),transparent_70%)]" />

      <div className="container-page relative">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-kplc-yellow">In the field</p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">IESR, on the ground</h2>
          <p className="mt-4 text-lg text-white/70">
            The crews, classrooms and infrastructure the register keeps visible — every day, across every programme.
          </p>
        </div>
      </div>

      {/* center-focus track */}
      <div
        ref={trackRef}
        onScroll={onScroll}
        onMouseEnter={() => (pausedRef.current = true)}
        onMouseLeave={() => (pausedRef.current = false)}
        onTouchStart={() => (pausedRef.current = true)}
        onTouchEnd={() => (pausedRef.current = false)}
        className="scrollbar-hide relative z-10 mt-12 flex snap-x snap-mandatory items-center gap-6 overflow-x-auto scroll-smooth px-[calc(50vw-11rem)] py-6 sm:px-[calc(50vw-13rem)]"
      >
        {SHOTS.map((s, i) => {
          const on = i === active;
          return (
            <figure
              key={s.label}
              className={`relative h-56 w-72 shrink-0 snap-center overflow-hidden rounded-3xl transition-all duration-500 ease-out sm:h-72 sm:w-[26rem] ${
                on ? "scale-100 opacity-100 shadow-2xl ring-2 ring-kplc-yellow/60" : "scale-[0.82] opacity-40"
              }`}
            >
              <Image src={s.img} alt={s.label} fill sizes="416px" className="object-cover" />
              <div className={`absolute inset-0 bg-gradient-to-t from-kplc-navy/80 via-transparent to-transparent transition-opacity duration-500 ${on ? "opacity-100" : "opacity-60"}`} />
              <figcaption className={`absolute bottom-5 left-5 flex items-center gap-2 transition-all duration-500 ${on ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-kplc-yellow" />
                <span className="text-base font-semibold text-white drop-shadow">{s.label}</span>
              </figcaption>
            </figure>
          );
        })}
      </div>

      {/* controls */}
      <div className="container-page relative z-10 mt-6 flex items-center justify-center gap-5">
        <button onClick={() => goTo(active - 1)} disabled={active === 0} aria-label="Previous"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition hover:border-kplc-yellow hover:text-kplc-yellow disabled:opacity-25">
          <Arrow dir="left" />
        </button>
        <div className="flex items-center gap-2">
          {SHOTS.map((s, i) => (
            <button key={s.label} onClick={() => goTo(i)} aria-label={`Go to ${s.label}`}
              className={`h-2 rounded-full transition-all duration-300 ${i === active ? "w-7 bg-kplc-yellow" : "w-2 bg-white/30 hover:bg-white/50"}`} />
          ))}
        </div>
        <button onClick={() => goTo(active + 1)} disabled={active === max} aria-label="Next"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition hover:border-kplc-yellow hover:text-kplc-yellow disabled:opacity-25">
          <Arrow dir="right" />
        </button>
      </div>
    </section>
  );
}
