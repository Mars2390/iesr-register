"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

interface ClassOpt { id: string; code: string; displayName: string }
interface TeacherOpt { id: string; name: string }

export default function LoginPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassOpt[]>([]);
  const [teachers, setTeachers] = useState<TeacherOpt[]>([]);
  const [classId, setClassId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // load classes
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/public/classes", { cache: "no-store" });
        const j = await r.json();
        if (j.ok) setClasses(j.data);
        else setError("Could not load classes.");
      } catch {
        setError("Could not reach the server. Check your connection.");
      } finally {
        setLoadingClasses(false);
      }
    })();
  }, []);

  // load teachers when class changes
  useEffect(() => {
    setTeacherId("");
    setTeachers([]);
    if (!classId) return;
    setLoadingTeachers(true);
    (async () => {
      try {
        const r = await fetch(`/api/public/teachers?classId=${classId}`, { cache: "no-store" });
        const j = await r.json();
        if (j.ok) setTeachers(j.data);
      } catch {
        /* ignore */
      } finally {
        setLoadingTeachers(false);
      }
    })();
  }, [classId]);

  async function enterRegister() {
    if (!classId || !teacherId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/login-free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error();
      router.replace(`/teacher/mark/${classId}`);
      router.refresh();
    } catch {
      setError("Could not enter the register. Please try again.");
      setSubmitting(false);
    }
  }

  async function enterAsAdmin() {
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/login-free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin: true }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error();
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Administrator access is not available yet.");
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
      {/* premium navy backdrop */}
      <div className="absolute inset-0 -z-10">
        <Image src="/images/iesr-11.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-kplc-navy/92 via-kplc-navy/90 to-kplc-navy/96" />
        <div className="absolute inset-0 bg-dots opacity-10" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        {/* brand */}
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex flex-col items-center gap-3">
            <span className="relative h-16 w-16 overflow-hidden rounded-full bg-white ring-2 ring-white/40">
              <Image src="/images/iesr-3.jpg" alt="IESR" fill sizes="64px" className="object-cover" />
            </span>
            <span className="text-lg font-bold tracking-tight text-white">
              IESR <span className="text-kplc-yellow">Attendance System</span>
            </span>
          </Link>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/55">
            Institute of Energy Studies &amp; Research
          </p>
        </div>

        {/* card */}
        <div className="rounded-3xl border border-white/10 bg-white p-7 shadow-2xl shadow-black/40">
          <div className="text-center">
            <h1 className="text-xl font-bold text-kplc-navy">Access the register</h1>
            <p className="mt-1 text-sm text-slate-500">Choose your class and name to begin marking.</p>
          </div>

          <div className="mt-6 space-y-4">
            {/* class */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Class</label>
              <select
                className="input"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                disabled={loadingClasses}
              >
                <option value="">{loadingClasses ? "Loading classes…" : "Select a class"}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.displayName}</option>
                ))}
              </select>
              {!loadingClasses && classes.length === 0 && (
                <p className="mt-1.5 text-xs text-amber-600">No classes found yet — the system needs to be set up with data.</p>
              )}
            </div>

            {/* name */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Your name</label>
              <select
                className="input"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                disabled={!classId || loadingTeachers}
              >
                <option value="">
                  {!classId ? "Select a class first" : loadingTeachers ? "Loading…" : "Select your name"}
                </option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {classId && !loadingTeachers && teachers.length === 0 && (
                <p className="mt-1.5 text-xs text-amber-600">No trainers attached to this class.</p>
              )}
            </div>

            {error && <p role="alert" className="text-center text-sm font-medium text-rose-600">{error}</p>}

            <button
              onClick={enterRegister}
              disabled={!classId || !teacherId || submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-kplc-yellow px-6 py-3.5 text-base font-bold text-kplc-navy shadow-lg shadow-kplc-yellow/20 transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-50"
            >
              {submitting ? "Entering…" : "Enter the register"}
              {!submitting && (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </button>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4 text-center">
            <button onClick={enterAsAdmin} disabled={submitting} className="text-sm font-medium text-slate-500 transition-colors hover:text-kplc-navy">
              Administrator access →
            </button>
          </div>
        </div>

        <div className="mt-5 text-center">
          <Link href="/" className="text-sm font-medium text-white/70 transition-colors hover:text-white">← Back to home</Link>
        </div>
      </motion.div>
    </main>
  );
}
