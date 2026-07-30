import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, Loader2, MessageCircle, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Seo } from "@/components/Seo";

interface Session { id: string; visitor_name: string | null; last_msg_at: string; status: string }
interface Msg { id: string; session_id: string; sender: string; message: string; created_at: string }

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "gerade eben";
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std`;
  return new Date(iso).toLocaleDateString("de-DE");
}

export default function AdminChat() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(params.get("session"));
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Zugriffschutz — nur Alex
  const ALEX_EMAIL = "alexanderharitopoulos@gmail.com";
  if (!user || user.email !== ALEX_EMAIL) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
        Kein Zugriff.
      </div>
    );
  }

  // Sessions laden + Realtime
  useEffect(() => {
    if (!supabase) return;
    const load = async () => {
      const { data } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("status", "open")
        .order("last_msg_at", { ascending: false });
      if (data) setSessions(data as Session[]);
    };
    load();

    const ch = supabase
      .channel("admin-sessions")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_sessions" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Nachrichten für aktive Session
  useEffect(() => {
    if (!activeId || !supabase) return;
    setMsgs([]);

    supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", activeId)
      .order("created_at", { ascending: true })
      .then(({ data }) => { if (data) setMsgs(data as Msg[]); });

    const ch = supabase
      .channel(`admin-msgs:${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `session_id=eq.${activeId}` },
        (p) => setMsgs((prev) => [...prev, p.new as Msg])
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    const text = input.trim();
    if (!text || !activeId || !supabase || sending) return;
    setInput("");
    setSending(true);
    try {
      await supabase.from("chat_messages").insert({ session_id: activeId, sender: "agent", message: text });
      await supabase.from("chat_sessions").update({ last_msg_at: new Date().toISOString() }).eq("id", activeId);
    } finally {
      setSending(false);
    }
  };

  const closeSession = async (id: string) => {
    if (!supabase) return;
    await supabase.from("chat_sessions").update({ status: "closed" }).eq("id", id);
    setSessions((p) => p.filter((s) => s.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const activeSession = sessions.find((s) => s.id === activeId);

  return (
    <div className="min-h-screen bg-background">
      <Seo title="Live Chat Admin — Alex Autoshop" />
      <div className="flex h-[calc(100vh-96px)]">

        {/* Session-Liste */}
        <aside className="w-64 shrink-0 border-r border-border flex flex-col bg-card">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-bold flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              Live Chats
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{sessions.length} offen</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Keine offenen Chats
              </div>
            )}
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={`w-full text-left px-4 py-3 border-b border-border transition-colors ${activeId === s.id ? "bg-primary/10" : "hover:bg-secondary/50"}`}
              >
                <p className="font-semibold text-sm truncate">{s.visitor_name || "Besucher"}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" /> {timeAgo(s.last_msg_at)}
                </p>
              </button>
            ))}
          </div>
        </aside>

        {/* Chat-Fenster */}
        <div className="flex-1 flex flex-col">
          {!activeId ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Wähle einen Chat aus
            </div>
          ) : (
            <>
              {/* Chat-Header */}
              <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-card shrink-0">
                <div>
                  <p className="font-bold">{activeSession?.visitor_name || "Besucher"}</p>
                  <p className="text-xs text-muted-foreground">Session {activeId?.slice(0, 8)}…</p>
                </div>
                <button
                  onClick={() => closeSession(activeId)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Chat schließen
                </button>
              </div>

              {/* Nachrichten */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {msgs.map((m) => (
                  <div key={m.id} className={`flex ${m.sender === "agent" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm break-words ${
                        m.sender === "agent"
                          ? "bg-primary text-night rounded-br-sm"
                          : "bg-secondary text-foreground rounded-bl-sm"
                      }`}
                    >
                      {m.message}
                      <p className="text-[10px] opacity-60 mt-1">{new Date(m.created_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Eingabe */}
              <div className="px-4 py-3 border-t border-border flex gap-3 bg-card shrink-0">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Antwort schreiben … (Enter = senden)"
                  rows={2}
                  className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm resize-none outline-none focus:border-primary transition-colors"
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || sending}
                  className="btn-primary px-4 self-end disabled:opacity-40"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
