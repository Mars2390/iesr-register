"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

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

      // Success — cookie is set. Route by role, honouring ?next= if it's in-scope.
      const home = data.role === "admin" ? "/admin" : "/teacher";
      const next = new URLSearchParams(window.location.search).get("next");
      const dest = next && next.startsWith(home) ? next : home;
      router.replace(dest);
      router.refresh();
      // keep `loading` true while the navigation completes
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
    "flex h-16 select-none items-center justify-center rounded-2xl border border-slate-200 bg-white text-2xl font-semibold text-slate-800 transition active:scale-95 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:opacity-50";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-dots px-5 py-12">
      <div className="bg-hero-glow pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative w-full max-w-sm">
        {/* header */}
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Logo />
            <span className="text-lg font-bold tracking-tight text-slate-900">IESR</span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Enter your PIN to access your register</p>
        </div>

        {/* card */}
        <div className="card p-6 sm:p-7">
          {/* PIN display */}
          <div className="mb-1 flex h-12 items-center justify-center gap-2.5" aria-hidden>
            {pin.length === 0 ? (
              <span className="text-sm text-slate-400">• • • •</span>
            ) : (
              pin.split("").map((_, i) => (
                <span key={i} className="h-3 w-3 rounded-full bg-slate-800" />
              ))
            )}
          </div>

          {/* error */}
          <p
            role="alert"
            className={`min-h-[1.25rem] text-center text-sm font-medium ${error ? "text-rose-600" : "text-transparent"}`}
          >
            {error ?? "placeholder"}
          </p>

          {/* keypad */}
          <div className="mt-2 grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <button key={d} type="button" onClick={() => append(d)} disabled={loading} className={keyCls}>
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={clear}
              disabled={loading}
              className={`${keyCls} text-base font-medium text-slate-500`}
            >
              Clear
            </button>
            <button type="button" onClick={() => append("0")} disabled={loading} className={keyCls}>
              0
            </button>
            <button
              type="button"
              onClick={backspace}
              disabled={loading}
              aria-label="Backspace"
              className={`${keyCls} text-slate-500`}
            >
              ⌫
            </button>
          </div>

          {/* submit */}
          <button
            type="button"
            onClick={submit}
            disabled={loading || pin.length === 0}
            className="btn-primary btn-lg mt-4 w-full"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Teachers and admins sign in here — your PIN identifies you.
        </p>
        <div className="mt-2 text-center">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
