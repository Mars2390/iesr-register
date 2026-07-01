"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

/**
 * Subtle floating dots/rings that drift at different parallax speeds as you
 * scroll past the section. Purely decorative (aria-hidden), disabled on reduced
 * motion. Sits behind content with `pointer-events-none`.
 */
const SEEDS = [
  { x: "8%", y: "18%", size: 10, depth: -60, color: "bg-kplc-blue/30" },
  { x: "82%", y: "12%", size: 14, depth: -120, color: "bg-kplc-yellow/40" },
  { x: "20%", y: "72%", size: 8, depth: -40, color: "bg-kplc-green/30" },
  { x: "70%", y: "68%", size: 18, depth: -150, color: "bg-kplc-blue/20" },
  { x: "46%", y: "30%", size: 6, depth: -90, color: "bg-white/40" },
  { x: "92%", y: "48%", size: 10, depth: -70, color: "bg-kplc-yellow/30" },
  { x: "34%", y: "52%", size: 12, depth: -110, color: "bg-kplc-blue/20" },
];

export function FloatingField({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  return (
    <div ref={ref} aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {SEEDS.map((s, i) => (
        <Dot key={i} seed={s} progress={scrollYProgress} reduce={!!reduce} index={i} />
      ))}
    </div>
  );
}

function Dot({
  seed, progress, reduce, index,
}: {
  seed: (typeof SEEDS)[number];
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  reduce: boolean;
  index: number;
}) {
  const y = useTransform(progress, [0, 1], [0, reduce ? 0 : seed.depth]);
  // negative delay starts each dot mid-cycle so they don't bob in unison
  const animationDelay = `${-(index * 0.8).toFixed(2)}s`;
  return (
    <motion.span
      style={{ left: seed.x, top: seed.y, width: seed.size, height: seed.size, y, animationDelay }}
      className={`gpu absolute rounded-full ${seed.color} ${reduce ? "" : "animate-float"}`}
    />
  );
}
