"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface ConfirmOptions {
  title?: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  tone?: "default" | "danger";
}

type ConfirmFn = (opts: ConfirmOptions | string) => Promise<boolean>;
const ConfirmCtx = createContext<ConfirmFn>(async () => false);

/** `const confirm = useConfirm(); if (await confirm({...})) { ... }` */
export const useConfirm = () => useContext(ConfirmCtx);

const IconWarn = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none"><path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const IconAsk = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const confirmBtn = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    setOpts(typeof o === "string" ? { message: o } : o);
    return new Promise<boolean>((resolve) => { resolver.current = resolve; });
  }, []);

  const settle = useCallback((v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setOpts(null);
  }, []);

  // ESC = cancel, Enter = confirm; focus the confirm button on open
  useEffect(() => {
    if (!opts) return;
    confirmBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); settle(false); }
      else if (e.key === "Enter") { e.preventDefault(); settle(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opts, settle]);

  const danger = opts?.tone === "danger";

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {opts && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            role="dialog" aria-modal="true"
          >
            {/* backdrop */}
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => settle(false)} />

            {/* card */}
            <motion.div
              className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* KPLC accent strip */}
              <div className="h-1.5 w-full bg-gradient-to-r from-kplc-blue via-kplc-green to-kplc-yellow" />

              <div className="p-6 sm:p-7">
                <div className="flex items-start gap-4">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${danger ? "bg-rose-100 text-rose-600" : "bg-kplc-blue/10 text-kplc-blue"}`}>
                    {danger ? <IconWarn className="h-6 w-6" /> : <IconAsk className="h-6 w-6" />}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <h2 className="text-lg font-bold text-kplc-navy">{opts.title ?? (danger ? "Please confirm" : "Confirm action")}</h2>
                    <div className="mt-2 text-sm leading-relaxed text-slate-600">{opts.message}</div>
                  </div>
                </div>

                <div className="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                  <button
                    onClick={() => settle(false)}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                  >
                    {opts.cancelText ?? "Cancel"}
                  </button>
                  <button
                    ref={confirmBtn}
                    onClick={() => settle(true)}
                    className={`inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                      danger
                        ? "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500/50"
                        : "bg-kplc-navy hover:bg-kplc-blue focus-visible:ring-kplc-blue/50"
                    }`}
                  >
                    {opts.confirmText ?? (danger ? "Confirm" : "Continue")}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmCtx.Provider>
  );
}
