"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ElementType } from "react";

/**
 * Headline that splits into words and springs each in with a stagger — the
 * bouncy Apple/Linear reveal. Renders plain text (no split) for reduced motion.
 */
export function SplitText({
  text, as = "span", className, wordClassName, delay = 0, once = true,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  wordClassName?: string;
  delay?: number;
  once?: boolean;
}) {
  const reduce = useReducedMotion();
  const words = text.split(" ");

  if (reduce) {
    const Tag = as as ElementType;
    return <Tag className={className}>{text}</Tag>;
  }

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.055, delayChildren: delay } },
  };
  const word: Variants = {
    hidden: { opacity: 0, y: "0.5em", rotateX: 40, filter: "blur(6px)" },
    show: {
      opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)",
      transition: { type: "spring", stiffness: 320, damping: 22, mass: 0.7 },
    },
  };

  return (
    <motion.span
      className={`inline-block ${className ?? ""}`}
      style={{ perspective: 800 }}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-60px" }}
    >
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom" style={{ paddingBottom: "0.06em" }}>
          <motion.span variants={word} className={`inline-block ${wordClassName ?? ""}`} style={{ transformOrigin: "bottom" }}>
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}
