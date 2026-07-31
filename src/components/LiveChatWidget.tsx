import { useState, useEffect, useRef } from "react";
import { X, Send, MessageCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

// Immer online — Alex antwortet via ntfy wann immer möglich
function isOnline(): boolean { return true; }

const SESSION_KEY = "aa-chat-session";

interface Msg { id: string; sender: string; message: string; created_at: string }

// WhatsApp-grün für konsistentes Branding
const GREEN = "#25D366";

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.116 1.528 5.845L0 24l6.335-1.502A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.032-1.383l-.361-.214-3.737.885.938-3.637-.235-.374A9.818 9.818 0 1112 21.818z"/>
  </svg>
);

export function LiveChatWidget() {
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(isOnline());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [name, setName] = useState("");
  const [nameSet, setNameSet] = useState(false);
  const [sending, setSending] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Online-Indikator alle 60s prüfen
  useEffect(() => {
    const t = setInterval(() => setOnline(isOnline()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Session aus localStorage wiederherstellen
  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      setSessionId(saved);
      setNameSet(true);
    }
  }, []);

  // Nachrichten laden + Realtime abonnieren wenn Session aktiv
  useEffect(() => {
    if (!sessionId || !supabase) return;

    // Alle bisherigen Nachrichten laden
    supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .then(({ data }) => { if (data) setMsgs(data as Msg[]); });

    // Realtime-Subscription für neue Nachrichten
    const channel = supabase
      .channel(`chat:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const msg = payload.new as Msg;
          setMsgs((prev) => [...prev, msg]);
          if (msg.sender === "agent") setAgentTyping(false);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  // Scroll to bottom wenn neue Nachricht
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  // Session anlegen + erste Nachricht senden
  const startChat = async (firstMsg: string) => {
    if (!supabase) return;
    setSending(true);
    try {
      // Session in Supabase anlegen
      const { data: session } = await supabase
        .from("chat_sessions")
        .insert({ visitor_name: name.trim() || null })
        .select("id")
        .single();
      if (!session) throw new Error("Session konnte nicht erstellt werden");

      const sid = session.id as string;
      setSessionId(sid);
      localStorage.setItem(SESSION_KEY, sid);

      // Erste Nachricht einfügen
      await supabase.from("chat_messages").insert({
        session_id: sid,
        sender: "visitor",
        message: firstMsg,
      });

      // Session last_msg_at aktualisieren
      await supabase.from("chat_sessions").update({ last_msg_at: new Date().toISOString() }).eq("id", sid);

      // Email-Benachrichtigung an Alex
      fetch("/api/chat-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, visitorName: name.trim() || null, firstMessage: firstMsg }),
      }).catch(() => {});
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !supabase || sending) return;
    setInput("");
    setSending(true);
    try {
      if (!sessionId) {
        await startChat(text);
      } else {
        await supabase.from("chat_messages").insert({ session_id: sessionId, sender: "visitor", message: text });
        await supabase.from("chat_sessions").update({ last_msg_at: new Date().toISOString() }).eq("id", sessionId);
      }
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const started = sessionId !== null;

  return (
    <>
      {/* Chat-Panel */}
      {open && (
        <div
          className="fixed bottom-24 left-4 sm:left-6 z-50 w-[min(92vw,360px)] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col animate-fade-up"
          style={{ background: "#111", maxHeight: "75vh" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-white/8" style={{ background: "#0d0d0d" }}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: GREEN }}>
                  <WhatsAppIcon />
                </div>
                <span
                  className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                  style={{ background: online ? "#4ade80" : "#525252", borderColor: "#0d0d0d" }}
                />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Alex Autoshop</p>
                <p className="text-xs" style={{ color: "#4ade80" }}>
                  ● Jetzt online
                </p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nachrichten */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ minHeight: 160 }}>
            {/* Willkommens-Bubble */}
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-white/80" style={{ background: "rgba(255,255,255,0.08)" }}>
                👋 Hallo! Wie kann ich dir helfen?
              </div>
            </div>

            {msgs.map((m) => (
              <div key={m.id} className={`flex ${m.sender === "visitor" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[80%] rounded-2xl px-3 py-2 text-sm break-words"
                  style={
                    m.sender === "visitor"
                      ? { background: GREEN, color: "white", borderBottomRightRadius: 4 }
                      : { background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.85)", borderBottomLeftRadius: 4 }
                  }
                >
                  {m.message}
                </div>
              </div>
            ))}

            {agentTyping && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-2.5 text-xs text-white/50" style={{ background: "rgba(255,255,255,0.06)" }}>
                  Alex tippt …
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Namens-Eingabe (nur beim ersten Mal, optional) */}
          {!nameSet && !started && (
            <div className="px-4 pb-2 pt-1 shrink-0 border-t border-white/8">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dein Name (optional)"
                className="w-full rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                onKeyDown={(e) => { if (e.key === "Enter") { setNameSet(true); inputRef.current?.focus(); } }}
              />
            </div>
          )}

          {/* Eingabe */}
          <div className="px-3 pb-3 pt-2 shrink-0 flex gap-2 border-t border-white/8">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Nachricht schreiben …"
              rows={1}
              className="flex-1 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 resize-none outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", maxHeight: 80 }}
              onFocus={(e) => { setNameSet(true); e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 disabled:opacity-40 active:scale-95 transition-all"
              style={{ background: GREEN, marginTop: "auto" }}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 left-4 sm:left-6 z-50 inline-flex items-center gap-2 h-14 rounded-full text-white shadow-xl active:scale-95 transition-all"
        style={{ paddingLeft: 18, paddingRight: 22, background: GREEN }}
        aria-label="Live Chat öffnen"
      >
        <div className="relative">
          {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
          <span
            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
            style={{
              background: online ? "white" : "rgba(255,255,255,0.35)",
              boxShadow: online ? "0 0 6px rgba(255,255,255,0.8)" : "none",
            }}
          />
        </div>
        <span className="font-semibold text-sm">Live Chat</span>
      </button>
    </>
  );
}
