"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Msg { id: string; sender: "teacher" | "admin"; body: string; createdAt: string }

export function TeacherChat({ initial }: { initial: Msg[] }) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/chat", { cache: "no-store" });
    const j = await r.json();
    if (j.ok) setMessages(j.data.messages as Msg[]);
  }, []);

  useEffect(() => { const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    // optimistic
    setText("");
    try {
      await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
      await load();
    } finally { setSending(false); }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-12rem)] max-w-2xl flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold sm:text-3xl">Messages</h1>
        <p className="mt-1 text-slate-600">Chat directly with your administrator. Separate from flags.</p>
      </div>

      <div className="card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No messages yet. Say hello 👋</p>
          ) : messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender === "teacher" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${m.sender === "teacher" ? "bg-kplc-navy text-white" : "bg-slate-100 text-slate-800"}`}>
                {m.sender === "admin" && <p className="mb-0.5 text-[11px] font-semibold text-kplc-blue">Administrator</p>}
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-1 text-right text-[10px] ${m.sender === "teacher" ? "text-white/60" : "text-slate-400"}`}>{time(m.createdAt)}</p>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <form onSubmit={send} className="flex items-center gap-2 border-t border-slate-100 p-3">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…"
            className="input flex-1" maxLength={2000} />
          <button type="submit" disabled={sending || !text.trim()} className="btn-primary px-5">Send</button>
        </form>
      </div>
    </div>
  );
}

function time(iso: string) { return new Date(iso).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
