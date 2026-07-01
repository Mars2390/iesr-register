"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Momentum smooth-scroll (Lenis) — the modern Locomotive successor. Unlike
 * scroll-hijacking libraries it scrolls the real window, so `position: sticky`,
 * `fixed` navbars and framer-motion `useScroll` all keep working.
 *
 * Guards: disabled on touch / small screens and when the user prefers reduced
 * motion, so mobile keeps native inertia and accessibility is respected.
 */
export function SmoothScroll() {
  useEffect(() => {
    const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (mqReduce.matches || isTouch || window.innerWidth < 768) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo-out
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });
    document.documentElement.classList.add("lenis");

    let raf = 0;
    const loop = (time: number) => { lenis.raf(time); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);

    // smooth-scroll in-page anchor links (#features, #how, …)
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const el = document.querySelector(id);
      if (el) { e.preventDefault(); lenis.scrollTo(el as HTMLElement, { offset: -72, duration: 1.2 }); }
    };
    document.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("click", onClick);
      lenis.destroy();
      document.documentElement.classList.remove("lenis");
    };
  }, []);

  return null;
}
