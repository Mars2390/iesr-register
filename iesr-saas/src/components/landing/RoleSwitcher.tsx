"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

type Role = { key: string; tagline: string; img: string; points: string[] };

const ROLES: Role[] = [
  {
    key: "Trainers",
    tagline: "A focused register for your classes",
    img: "/images/iesr-2.jpg",
    points: [
      "Mark a full class in seconds — Present, Absent, Late.",
      "Raise issues from the register the moment they happen.",
      "Review your own marking history and momentum.",
    ],
  },
  {
    key: "Administrators",
    tagline: "A live command centre for the institute",
    img: "/images/iesr-6.jpg",
    points: [
      "Watch marking land in real time, class by class.",
      "Manage classes, trainees and timetables in one place.",
      "Triage flags and export clean reports on demand.",
    ],
  },
  {
    key: "Leadership",
    tagline: "Decisions backed by real attendance data",
    img: "/images/iesr-9.jpeg",
    points: [
      "School-wide attendance and class rankings at a glance.",
      "Top & at-risk students, unit performance, teacher compliance.",
      "One-click leadership report pack — brief, Excel & certificates.",
    ],
  },
];

const IconCheck = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export function RoleSwitcher({ adminImg }: { adminImg?: string }) {
  const [active, setActive] = useState(0);
  // when a real admin-dashboard screenshot is available, use it for the Administrators tab
  const roles = adminImg ? ROLES.map((r) => (r.key === "Administrators" ? { ...r, img: adminImg } : r)) : ROLES;
  const role = roles[active];

  return (
    <section id="who" className="bg-slate-50 py-20 sm:py-28">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-kplc-green">For everyone</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">One platform, every role</h2>
          <p className="mt-4 text-lg text-slate-600">From the classroom to the Dean&apos;s office — one live source of truth.</p>
        </div>

        {/* pill tabs */}
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {roles.map((r, i) => (
            <button
              key={r.key}
              onClick={() => setActive(i)}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                i === active ? "bg-kplc-navy text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              {r.key}
            </button>
          ))}
        </div>

        {/* swapping panel — fast crossfade (Zoom-style restraint) */}
        <div className="mt-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={role.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="grid items-center gap-8 rounded-3xl border border-slate-200 bg-white p-4 shadow-soft lg:grid-cols-2 lg:p-6"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                <Image src={role.img} alt={role.key} fill sizes="(max-width:1024px) 100vw, 50vw" className={`object-cover ${role.key === "Administrators" ? "object-top" : ""}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-kplc-navy/50 to-transparent" />
                <span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-wide text-kplc-navy backdrop-blur">{role.key}</span>
              </div>

              <div className="px-2 pb-2 lg:px-4">
                <h3 className="text-2xl font-bold sm:text-3xl">{role.tagline}</h3>
                <ul className="mt-6 space-y-3">
                  {role.points.map((p) => (
                    <li key={p} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-kplc-green/10 text-kplc-green">
                        <IconCheck className="h-4 w-4" />
                      </span>
                      <span className="text-slate-700">{p}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/login" className="btn-primary mt-8">
                  Get started
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
