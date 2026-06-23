"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

const MAX_LEN = 10; // server accepts 3–12; cap input for sanity

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const append = useCallback((d: string) => {
    setError(null);
    setPin((p) => (p.length >= MAX_LEN ? p : p + d));
  }, []);
  const backspace = useCallback(() => {
    setError(null);
    setPin((p) => p.slice(0, -1));
  }, []);
  const clear = useCallback(() => {
    setError(null);
    setPin("");
  }, []);

  const submit = useCallback(async () => {
    if (loading) return;
    if (pin.length < 3) {
      setError("Please enter your PIN.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        role?: "teacher" | "admin";
        error?: string;
      };

      if (!res.ok || !data.ok) {
        setError(
          data.error === "invalid_pin"
            ? "Incorrect PIN. Please try again."
            : "Sign in failed. Please try again.",
        );
        setPin("");
        setLoading(false);
        return;
      }

      const home = data.role === "admin" ? "/admin" : "/teacher";
      const next = new URLSearchParams(window.location.search).get("next");
      const dest = next && next.startsWith(home) ? next : home;
      router.replace(dest);
      router.refresh();
    } catch {
      setError("Network error. Please check your connection.");
      setLoading(false);
    }
  }, [pin, loading, router]);

  // Hardware-keyboard support: digits, Backspace, Enter, Esc.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") append(e.key);
      else if (e.key === "Backspace") backspace();
      else if (e.key === "Enter") submit();
      else if (e.key === "Escape") clear();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [append, backspace, clear, submit]);

  const keyCls =
    "flex h-16 select-none items-center justify-center rounded-2xl border border-slate-200 bg-white text-2xl font-semibold text-kplc-navy shadow-sm transition-colors hover:border-kplc-blue hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-kplc-blue/40 disabled:opacity-50";

  const grid = { hidden: {}, show: { transition: { staggerChildren: 0.03 } } };
  const keyItem = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
      {/* premium navy backdrop with darkened power imagery */}
      <div className="absolute inset-0 -z-10">
        <Image src="/images/iesr-1.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-kplc-navy/92 via-kplc-navy/88 to-kplc-navy/96" />
        <div className="absolute inset-0 bg-dots opacity-10" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm"
      >
        {/* brand header */}
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex flex-col items-center gap-3">
            <span className="relative h-16 w-16 overflow-hidden rounded-full ring-2 ring-white/40">
              <Image src="/images/iesr-3.jpg" alt="Kenya Power IESR" fill sizes="64px" className="object-cover" />
            </span>
            <span className="text-lg font-bold tracking-tight text-white">
              IESR<span className="text-kplc-yellow">·Register</span>
            </span>
          </Link>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/55">
            Kenya Power · Institute of Energy Studies &amp; Research
          </p>
        </div>

        {/* card */}
        <div className="rounded-3xl border border-white/10 bg-white p-6 shadow-2xl shadow-black/40 sm:p-7">
          <div className="text-center">
            <h1 className="text-xl font-bold text-kplc-navy">Welcome back</h1>
            <p className="mt-1 text-sm text-slate-500">Enter your PIN to access your register</p>
          </div>

          {/* PIN display */}
          <div className="mb-1 mt-5 flex h-12 items-center justify-center gap-3" aria-hidden>
            {pin.length === 0
              ? [0, 1, 2, 3].map((i) => (
                  <span key={i} className="h-3.5 w-3.5 rounded-full border-2 border-slate-200" />
                ))
              : pin.split("").map((_, i) => (
                  <motion.span
                    key={i}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 28 }}
                    className="h-3.5 w-3.5 rounded-full bg-kplc-navy"
                  />
                ))}
          </div>

          {/* error (reserved height to avoid layout shift) */}
          <p
            role="alert"
            className={`min-h-[1.25rem] text-center text-sm font-medium ${error ? "text-rose-600" : "text-transparent"}`}
          >
            {error ?? "placeholder"}
          </p>

          {/* keypad */}
          <motion.div variants={grid} initial="hidden" animate="show" className="mt-2 grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <motion.button key={d} variants={keyItem} whileTap={{ scale: 0.92 }} type="button" onClick={() => append(d)} disabled={loading} className={keyCls}>
                {d}
              </motion.button>
            ))}
            <motion.button variants={keyItem} whileTap={{ scale: 0.92 }} type="button" onClick={clear} disabled={loading} className={`${keyCls} text-base font-medium text-slate-500`}>
              Clear
            </motion.button>
            <motion.button variants={keyItem} whileTap={{ scale: 0.92 }} type="button" onClick={() => append("0")} disabled={loading} className={keyCls}>
              0
            </motion.button>
            <motion.button variants={keyItem} whileTap={{ scale: 0.92 }} type="button" onClick={backspace} disabled={loading} aria-label="Backspace" className={`${keyCls} text-slate-500`}>
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none"><path d="M9 6h11v12H9l-5-6 5-6zM13 9.5l5 5M18 9.5l-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </motion.button>
          </motion.div>

          {/* submit */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={submit}
            disabled={loading || pin.length === 0}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-kplc-yellow px-6 py-3.5 text-base font-bold text-kplc-navy shadow-lg shadow-kplc-yellow/20 transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
            {!loading && (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            )}
          </motion.button>
        </div>

        <p className="mt-5 text-center text-xs text-white/55">
          Trainers and admins sign in here — your PIN identifies you.
        </p>
        <div className="mt-2 text-center">
          <Link href="/" className="text-sm font-medium text-white/70 transition-colors hover:text-white">
            ← Back to home
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
