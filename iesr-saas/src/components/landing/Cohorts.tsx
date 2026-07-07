"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

type Programme = { name: string; tag: string; shot: string | null };

const Arrow = ({ dir }: { dir: "left" | "right" }) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
    <path d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const pad = (n: number) => String(n).padStart(2, "0");

// Page-turn animation — the spread swings in/out like a real page flip.
const variants = {
  enter: (dir: number) => ({ rotateY: dir >= 0 ? 45 : -45, x: dir >= 0 ? 90 : -90, opacity: 0 }),
  center: { rotateY: 0, x: 0, opacity: 1 },
  exit: (dir: number) => ({ rotateY: dir >= 0 ? -45 : 45, x: dir >= 0 ? -90 : 90, opacity: 0 }),
};

export function Cohorts({ programmes, live }: { programmes: Programme[]; live: boolean }) {
  const total = programmes.length;
  const pages = total + 1; // page 0 = cover
  const [[page, dir], setPage] = useState<[number, number]>([0, 0]);
  const pausedRef = useRef(false);

  const go = useCallback((to: number, d: number) => {
    if (to < 0 || to >= pages) return;
    setPage([to, d]);
  }, [pages]);

  // gentle auto-flip, pausable, loops back to the cover
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      setPage(([p]) => [p + 1 >= pages ? 0 : p + 1, 1]);
    }, 5000);
    return () => clearInterval(id);
  }, [pages]);

  const prog = page > 0 ? programmes[page - 1] : null;

  return (
    <section className="bg-slate-50 py-20 sm:py-28">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-kplc-blue">{live ? "Active cohorts" : "Programmes"}</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Every programme, one register</h2>
          <p className="mt-4 text-lg text-slate-600">Flip through the classes marking attendance right now — like turning the pages of the institute&apos;s register.</p>
        </div>

        <div
          className="relative mx-auto mt-12 max-w-4xl"
          onMouseEnter={() => (pausedRef.current = true)}
          onMouseLeave={() => (pausedRef.current = false)}
        >
          {/* stacked-paper depth behind the book */}
          <div className="absolute inset-x-6 -bottom-2 top-2 -z-10 rounded-3xl bg-white/70 shadow-lg" />
          <div className="absolute inset-x-3 -bottom-1 top-1 -z-10 rounded-3xl bg-white/80 shadow-md" />

          <div className="relative [perspective:1800px]">
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div
                key={page}
                custom={dir}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="[transform-style:preserve-3d]"
              >
                {page === 0 ? (
                  /* ---------- cover ---------- */
                  <div className="flex min-h-[24rem] flex-col items-center justify-center gap-5 rounded-3xl border border-slate-200 bg-gradient-to-br from-kplc-navy to-kplc-blue px-8 py-16 text-center text-white shadow-2xl sm:min-h-[28rem]">
                    <span className="relative h-24 w-24 overflow-hidden rounded-3xl ring-4 ring-white/20">
                      <Image src="/images/iesr-4.jpg" alt="IESR" fill sizes="96px" className="object-cover" />
                    </span>
                    <h3 className="text-3xl font-extrabold sm:text-4xl">IESR Programmes</h3>
                    <p className="max-w-md text-white/75">
                      {live ? `${total} active ${total === 1 ? "cohort" : "cohorts"} on the register` : "The institute's live programmes"} · Institute of Energy Studies &amp; Research
                    </p>
                    <button onClick={() => go(1, 1)} className="mt-2 inline-flex items-center gap-2 rounded-full bg-kplc-yellow px-5 py-2.5 text-sm font-bold text-kplc-navy transition hover:brightness-95">
                      Open the register <Arrow dir="right" />
                    </button>
                  </div>
                ) : (
                  /* ---------- a class "spread" ---------- */
                  <div className="grid min-h-[24rem] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl sm:min-h-[28rem] lg:grid-cols-2">
                    {/* left page — the live register */}
                    <div className="relative min-h-[16rem] bg-slate-100 lg:min-h-full">
                      {prog?.shot ? (
                        <>
                          <Image src={prog.shot} alt={`${prog.tag} register`} fill sizes="(max-width:1024px) 100vw, 50vw" className="object-cover object-top" />
                          <span className="absolute left-4 top-4 flex gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-white/70" />
                            <span className="h-2 w-2 rounded-full bg-white/70" />
                            <span className="h-2 w-2 rounded-full bg-white/70" />
                          </span>
                        </>
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-kplc-navy to-kplc-blue">
                          <span className="relative h-16 w-16 overflow-hidden rounded-2xl ring-2 ring-white/25">
                            <Image src="/images/iesr-4.jpg" alt="IESR" fill sizes="64px" className="object-cover" />
                          </span>
                        </div>
                      )}
                    </div>

                    {/* spine */}
                    <div className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-6 -translate-x-1/2 bg-gradient-to-r from-black/10 via-transparent to-black/10 lg:block" />

                    {/* right page — class details */}
                    <div className="flex flex-col justify-center gap-4 p-8 sm:p-10">
                      <span className="font-display text-5xl font-extrabold text-transparent [-webkit-text-stroke:1.5px_#1466b8]">{pad(page)}<span className="text-lg text-slate-300"> / {pad(total)}</span></span>
                      <div>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-kplc-blue/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-kplc-blue">{prog?.tag}</span>
                        <h3 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">{prog?.name}</h3>
                      </div>
                      <p className="text-slate-600">A live cohort on the IESR register — attendance marked every session, per student, per subject.</p>
                      {live && (
                        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Marking active
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* side arrows */}
            <button onClick={() => go(page - 1, -1)} disabled={page === 0} aria-label="Previous page"
              className="absolute -left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-kplc-navy shadow-lg transition hover:border-kplc-blue hover:text-kplc-blue disabled:opacity-30 sm:-left-5">
              <Arrow dir="left" />
            </button>
            <button onClick={() => go(page + 1, 1)} disabled={page === pages - 1} aria-label="Next page"
              className="absolute -right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-kplc-navy shadow-lg transition hover:border-kplc-blue hover:text-kplc-blue disabled:opacity-30 sm:-right-5">
              <Arrow dir="right" />
            </button>
          </div>

          {/* page dots + label */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {Array.from({ length: pages }).map((_, i) => (
                <button key={i} onClick={() => go(i, i >= page ? 1 : -1)} aria-label={i === 0 ? "Cover" : `Cohort ${i}`}
                  className={`h-2 rounded-full transition-all duration-300 ${i === page ? "w-6 bg-kplc-blue" : "w-2 bg-slate-300 hover:bg-slate-400"}`} />
              ))}
            </div>
            <p className="text-sm text-slate-500">
              {page === 0 ? "Cover" : <>Cohort <span className="font-semibold text-slate-700">{pad(page)}</span> of {pad(total)} · {prog?.tag}</>}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
