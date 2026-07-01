"use client";

import { useRef, type ReactNode, type CSSProperties } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";

/**
 * 3D tilt card (Stripe/Linear feel): tracks the pointer to rotate on X/Y with
 * spring physics, lifts a moving shadow, and sweeps a glossy highlight that
 * follows the cursor. Falls back to a static wrapper on touch / reduced motion.
 */
export function TiltCard({
  children, className = "", max = 8, glow = true,
}: {
  children: ReactNode;
  className?: string;
  max?: number;   // max tilt in degrees
  glow?: boolean; // cursor-following gloss
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const px = useMotionValue(0.5); // 0..1 pointer position
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 200, damping: 20 });
  const sy = useSpring(py, { stiffness: 200, damping: 20 });

  const rotateY = useTransform(sx, [0, 1], [-max, max]);
  const rotateX = useTransform(sy, [0, 1], [max, -max]);
  const glossX = useTransform(sx, [0, 1], ["0%", "100%"]);
  const glossY = useTransform(sy, [0, 1], ["0%", "100%"]);

  if (reduce) return <div className={className}>{children}</div>;

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const reset = () => { px.set(0.5); py.set(0.5); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={`group gpu relative [perspective:1000px] ${className}`}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      {children}
      {glow && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 [background:radial-gradient(240px_circle_at_var(--gx)_var(--gy),rgba(255,255,255,0.35),transparent_60%)] group-hover:opacity-100"
          style={{ "--gx": glossX, "--gy": glossY } as unknown as CSSProperties}
        />
      )}
    </motion.div>
  );
}
