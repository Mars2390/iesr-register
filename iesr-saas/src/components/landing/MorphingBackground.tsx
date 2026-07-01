"use client";

import { motion, useScroll, useTransform, useSpring } from "framer-motion";

/**
 * Fixed ambient background whose gradient slowly morphs navy → blue → yellow
 * hints as the page scrolls, with two aurora blobs drifting on their own loop.
 * Sits at z-[-1] behind everything; content sections paint their own bg on top.
 */
export function MorphingBackground() {
  const { scrollYProgress } = useScroll();
  const p = useSpring(scrollYProgress, { stiffness: 60, damping: 25, restDelta: 0.001 });

  // page-level hue journey (subtle — hints, not full washes)
  const background = useTransform(
    p,
    [0, 0.35, 0.7, 1],
    [
      "linear-gradient(180deg, #f7f9fc 0%, #eef3fb 100%)",
      "linear-gradient(180deg, #eef3fb 0%, #e6effb 100%)",
      "linear-gradient(180deg, #eef4fb 0%, #f3f6ec 100%)",
      "linear-gradient(180deg, #f5f8f0 0%, #fbf7e8 100%)",
    ],
  );
  const blobX = useTransform(p, [0, 1], ["-10%", "12%"]);
  const blobOpacity = useTransform(p, [0, 0.5, 1], [0.35, 0.5, 0.4]);

  return (
    <motion.div aria-hidden className="pointer-events-none fixed inset-0 -z-10" style={{ background }}>
      <motion.div
        className="animate-aurora gpu absolute -top-40 left-1/4 h-[45rem] w-[45rem] rounded-full blur-3xl"
        style={{ x: blobX, opacity: blobOpacity, background: "radial-gradient(circle, rgba(20,102,184,0.28), transparent 60%)" }}
      />
      <motion.div
        className="animate-aurora gpu absolute top-1/2 right-0 h-[38rem] w-[38rem] rounded-full blur-3xl"
        style={{ opacity: blobOpacity, background: "radial-gradient(circle, rgba(245,197,24,0.20), transparent 60%)" }}
      />
      <motion.div
        className="animate-aurora gpu absolute bottom-0 left-0 h-[34rem] w-[34rem] rounded-full blur-3xl"
        style={{ opacity: blobOpacity, background: "radial-gradient(circle, rgba(58,168,86,0.16), transparent 60%)" }}
      />
    </motion.div>
  );
}
