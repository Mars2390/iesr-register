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
  const [mode, setMode] = useState<"teacher" | "admin">("teacher");

  const [classes, setClasses] = useState<ClassOpt[]>([]);
  const [teachers, setTeachers] = useState<TeacherOpt[]>([]);
  const [classId, setClassId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [pin, setPin] = useState("");
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/public/classes", { cache: "no-store" });
        const j = await r.json();
        if (j.ok) setClasses(j.data); else setError("Could not load classes.");
      } catch { setError("Could not reach the server. Check your connection."); }
      finally { setLoadingClasses(false); }
    })();
  }, []);

  useEffect(() => {
    setTeacherId(""); setTeachers([]); setPin("");
    if (!classId) return;
    setLoadingTeachers(true);
    (async () => {
      try {
        const r = await fetch(`/api/public/teachers?classId=${classId}`, { cache: "no-store" });
        const j = await r.json();
        if (j.ok) setTeachers(j.data);
      } catch { /* ignore */ } finally { setLoadingTeachers(false); }
    })();
  }, [classId]);

  async function login(body: Record<string, string>, dest: string) {
    setSubmitting(true); setError(null);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "failed");
      router.replace(dest); router.refresh();
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      setError(
        code === "invalid_pin" ? "Incorrect PIN. Please try again."
          : code === "too_many_attempts" ? "Too many attempts. Please wait a few minutes and try again."
          : "Could not sign in. Please try again.",
      );
      setSubmitting(false);
    }
  }

  const teacherReady = !!classId && !!teacherId && pin.length >= 3;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/iesr-11.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-kplc-navy/92 via-kplc-navy/90 to-kplc-navy/96" />
        <div className="absolute inset-0 bg-dots opacity-10" />
      </div>

      <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex flex-col items-center gap-3">
            <span className="relative h-16 w-16 overflow-hidden rounded-2xl ring-2 ring-white/30">
              <Image src="/images/iesr-4.jpg" alt="IESR" fill sizes="64px" className="object-cover" />
            </span>
            <span className="text-lg font-bold tracking-tight text-white">IESR <span className="text-kplc-yellow">Attendance System</span></span>
          </Link>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/55">Institute of Energy Studies &amp; Research</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white p-7 shadow-2xl shadow-black/40">
          {/* mode tabs */}
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            {(["teacher", "admin"] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(null); setPin(""); }}
                className={`rounded-lg py-2 text-sm font-semibold capitalize transition ${mode === m ? "bg-white text-kplc-navy shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                {m === "teacher" ? "Trainer" : "Administrator"}
              </button>
            ))}
          </div>

          {mode === "teacher" ? (
            <div className="space-y-4">
              <div className="text-center">
                <h1 className="text-xl font-bold text-kplc-navy">Access the register</h1>
                <p className="mt-1 text-sm text-slate-500">Class → your name → PIN.</p>
              </div>
              <Step n={1} label="Class">
                <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)} disabled={loadingClasses}>
                  <option value="">{loadingClasses ? "Loading classes…" : "Select a class"}</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
                </select>
              </Step>
              <Step n={2} label="Your name">
                <select className="input" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} disabled={!classId || loadingTeachers}>
                  <option value="">{!classId ? "Select a class first" : loadingTeachers ? "Loading…" : "Select your name"}</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {classId && !loadingTeachers && teachers.length === 0 && <p className="mt-1.5 text-xs text-amber-600">No trainers attached to this class.</p>}
              </Step>
              <Step n={3} label="PIN">
                <input className="input font-mono tracking-[0.4em]" type="password" inputMode="numeric" autoComplete="off"
                  value={pin} onChange={(e) => setPin(e.target.value)} disabled={!teacherId}
                  placeholder="••••" maxLength={12} onKeyDown={(e) => e.key === "Enter" && teacherReady && login({ teacherId, pin }, `/teacher/mark/${classId}`)} />
              </Step>

              {error && <p role="alert" className="text-center text-sm font-medium text-rose-600">{error}</p>}

              <button onClick={() => login({ teacherId, pin }, `/teacher/mark/${classId}`)} disabled={!teacherReady || submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-kplc-yellow px-6 py-3.5 text-base font-bold text-kplc-navy shadow-lg shadow-kplc-yellow/20 transition hover:brightness-95 disabled:opacity-50">
                {submitting ? "Signing in…" : "Enter the register"}
                {!submitting && <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <h1 className="text-xl font-bold text-kplc-navy">Administrator access</h1>
                <p className="mt-1 text-sm text-slate-500">Enter the admin PIN to continue.</p>
              </div>
              <Step n={1} label="Admin PIN">
                <input className="input font-mono tracking-[0.4em]" type="password" inputMode="numeric" autoComplete="off"
                  value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••" maxLength={12}
                  onKeyDown={(e) => e.key === "Enter" && pin.length >= 3 && login({ pin }, "/admin")} />
              </Step>
              {error && <p role="alert" className="text-center text-sm font-medium text-rose-600">{error}</p>}
              <button onClick={() => login({ pin }, "/admin")} disabled={pin.length < 3 || submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-kplc-navy px-6 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-kplc-blue disabled:opacity-50">
                {submitting ? "Verifying…" : "Unlock admin"}
              </button>
            </div>
          )}
        </div>

        <div className="mt-5 text-center">
          <Link href="/" className="text-sm font-medium text-white/70 transition-colors hover:text-white">← Back to home</Link>
        </div>
      </motion.div>
    </main>
  );
}

function Step({ n, label, children }: { n: number; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-kplc-navy text-[11px] font-bold text-white">{n}</span>
        {label}
      </label>
      {children}
    </div>
  );
}
