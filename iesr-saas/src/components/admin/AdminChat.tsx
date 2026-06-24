"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Conversation { teacherId: string; teacherName: string; active: boolean; lastBody: string | null; lastAt: string | null; unread: number; total: number }
interface Msg { id: string; sender: "teacher" | "admin"; body: string; createdAt: string }

export function AdminChat({ initial }: { initial: Conversation[] }) {
  const [conversations, setConversations] = useState<Conversation[]>(initial);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    const r = await fetch("/api/admin/chat", { cache: "no-store" });
    const j = await r.json();
    if (j.ok) setConversations(j.data.conversations as Conversation[]);
  }, []);

  const loadThread = useCallback(async (teacherId: string) => {
    const r = await fetch(`/api/admin/chat?teacherId=${teacherId}`, { cache: "no-store" });
    const j = await r.json();
    if (j.ok) {
      setMessages(j.data.messages as Msg[]);
      setConversations((prev) => prev.map((c) => (c.teacherId === teacherId ? { ...c, unread: 0 } : c)));
    }
  }, []);

  useEffect(() => { const t = setInterval(loadConversations, 8000); return () => clearInterval(t); }, [loadConversations]);
  useEffect(() => {
    if (!selected) return;
    loadThread(selected);
    const t = setInterval(() => loadThread(selected), 5000);
    return () => clearInterval(t);
  }, [selected, loadThread]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !selected) return;
    setSending(true); setText("");
    try {
      await fetch("/api/admin/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teacherId: selected, body }) });
      await loadThread(selected); await loadConversations();
    } finally { setSending(false); }
  }

  const current = conversations.find((c) => c.teacherId === selected) ?? null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Messages</h1>
        <p className="mt-1 text-slate-600">Direct chat with teachers. New messages arrive live.</p>
      </div>

      <div className="grid h-[calc(100vh-14rem)] gap-4 lg:grid-cols-[320px_1fr]">
        {/* conversation list */}
        <div className="card flex min-h-0 flex-col overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Teachers</div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {conversations.map((c) => (
              <button key={c.teacherId} onClick={() => setSelected(c.teacherId)}
                className={`flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3 text-left transition ${selected === c.teacherId ? "bg-kplc-navy/5" : "hover:bg-slate-50"}`}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-kplc-navy/10 text-xs font-bold text-kplc-navy">{initials(c.teacherName)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-slate-800">{c.teacherName}</p>
                    {c.lastAt && <span className="shrink-0 text-[10px] text-slate-400">{shortTime(c.lastAt)}</span>}
                  </div>
                  <p className="truncate text-xs text-slate-400">{c.lastBody ?? "No messages yet"}</p>
                </div>
                {c.unread > 0 && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-rose-600 px-1.5 text-[10px] font-bold text-white">{c.unread}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* thread */}
        <div className="card flex min-h-0 flex-col overflow-hidden">
          {!current ? (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-400">Select a teacher to view the conversation.</div>
          ) : (
            <>
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="font-semibold text-slate-800">{current.teacherName}</p>
                <p className="text-xs text-slate-400">{current.active ? "Active teacher" : "Inactive"}</p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-400">No messages yet — start the conversation.</p>
                ) : messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${m.sender === "admin" ? "bg-kplc-navy text-white" : "bg-slate-100 text-slate-800"}`}>
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p className={`mt-1 text-right text-[10px] ${m.sender === "admin" ? "text-white/60" : "text-slate-400"}`}>{shortTime(m.createdAt)}</p>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <form onSubmit={send} className="flex items-center gap-2 border-t border-slate-100 p-3">
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Reply to ${current.teacherName}…`} className="input flex-1" maxLength={2000} />
                <button type="submit" disabled={sending || !text.trim()} className="btn-primary px-5">Send</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?"; }
function shortTime(iso: string) { return new Date(iso).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
