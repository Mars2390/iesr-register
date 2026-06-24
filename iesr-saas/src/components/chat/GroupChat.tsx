"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Msg { id: string; senderId: string; senderName: string; senderRole: "teacher" | "admin"; message: string; createdAt: string }

const LAST_SEEN_KEY = "iesr_group_lastseen";

export function GroupChat({ initial, currentUserId }: { initial: Msg[]; currentUserId: string }) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const markSeen = useCallback((msgs: Msg[]) => {
    const last = msgs[msgs.length - 1]?.createdAt;
    if (last) { try { localStorage.setItem(LAST_SEEN_KEY, last); } catch { /* ignore */ } }
  }, []);

  const load = useCallback(async () => {
    const r = await fetch("/api/chat/group", { cache: "no-store" });
    const j = await r.json();
    if (j.ok) { setMessages(j.data.messages as Msg[]); markSeen(j.data.messages as Msg[]); }
  }, [markSeen]);

  useEffect(() => { markSeen(initial); }, [initial, markSeen]);
  useEffect(() => { const t = setInterval(load, 4000); return () => clearInterval(t); }, [load]); // real-time
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const message = text.trim();
    if (!message) return;
    setSending(true); setText("");
    try {
      await fetch("/api/chat/group", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
      await load();
    } finally { setSending(false); }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-12rem)] max-w-3xl flex-col">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-kplc-navy to-kplc-blue text-lg text-white">💬</span>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">School Chat</h1>
          <p className="text-sm text-slate-500">One room for the whole school — every trainer and the admin.</p>
        </div>
      </div>

      <div className="card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/40 p-4">
          {messages.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">No messages yet. Start the conversation 👋</p>
          ) : messages.map((m, i) => {
            const mine = m.senderId === currentUserId;
            const isAdmin = m.senderRole === "admin";
            const showName = i === 0 || messages[i - 1].senderId !== m.senderId;
            const bubble = mine
              ? "bg-kplc-navy text-white rounded-br-md"
              : isAdmin
                ? "bg-kplc-yellow text-kplc-navy rounded-bl-md"
                : "bg-white text-slate-800 ring-1 ring-slate-200 rounded-bl-md";
            return (
              <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                {showName && (
                  <div className={`mb-0.5 flex items-center gap-1.5 px-1 text-[11px] ${mine ? "flex-row-reverse" : ""}`}>
                    <span className="font-semibold text-slate-600">{mine ? "You" : m.senderName}</span>
                    <RoleBadge role={m.senderRole} />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${bubble}`}>
                  <p className="whitespace-pre-wrap break-words">{m.message}</p>
                  <p className={`mt-1 text-right text-[10px] ${mine ? "text-white/60" : isAdmin ? "text-kplc-navy/60" : "text-slate-400"}`}>{time(m.createdAt)}</p>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        <form onSubmit={send} className="flex items-center gap-2 border-t border-slate-100 p-3">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message the school…" className="input flex-1" maxLength={2000} />
          <button type="submit" disabled={sending || !text.trim()} className="btn-primary px-5">Send</button>
        </form>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: "teacher" | "admin" }) {
  return role === "admin" ? (
    <span className="rounded-full bg-kplc-yellow px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-kplc-navy">Admin</span>
  ) : (
    <span className="rounded-full bg-slate-200 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-slate-600">Teacher</span>
  );
}
function time(iso: string) { return new Date(iso).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
