import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, Loader2, CheckCircle, ChevronLeft, Lock, MessageCircle } from "lucide-react";

interface Session { id: string; visitor_name: string | null; last_msg_at: string; status: string }
interface Msg { id: string; session_id: string; sender: string; message: string; created_at: string }

const PIN_KEY = "aa-admin-auth";

/**
 * Die PIN steht NICHT mehr im Code.
 *
 * Vorher stand die PIN als Zeichenkette direkt hier — im oeffentlichen Repo und
 * im ausgelieferten JS-Bundle. Sie hat ohnehin nichts geschuetzt: die
 * Chat-Tabellen waren fuer jeden lesbar, der den oeffentlichen Key nimmt.
 *
 * Jetzt liegt die PIN nur in Vercel (ADMIN_PIN), geprueft wird sie auf dem
 * Server, und die Chatdaten kommen ausschliesslich von dort.
 */
async function adminRuf(pin: string, was: string, params?: Record<string, string>, body?: unknown) {
  const qs = new URLSearchParams({ was, ...(params || {}) });
  const r = await fetch(`/api/admin-chat?${qs}`, {
    method: body ? "POST" : "GET",
    headers: { "x-admin-pin": pin, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(j?.hinweis ? `${j.error} — ${j.hinweis}` : j?.error || `Fehler ${r.status}`);
  return j;
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "gerade eben";
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std`;
  return new Date(iso).toLocaleDateString("de-DE");
}

function PinScreen({ onAuth }: { onAuth: (pin: string) => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [pruefe, setPruefe] = useState(false);

  const submit = async () => {
    if (!pin.trim() || pruefe) return;
    setPruefe(true);
    setMeldung(null);
    try {
      // Der Server entscheidet, nicht der Browser.
      await adminRuf(pin, "sitzungen");
      localStorage.setItem(PIN_KEY, pin);
      onAuth(pin);
    } catch (e) {
      setError(true);
      setPin("");
      setMeldung(e instanceof Error ? e.message : "Anmeldung fehlgeschlagen");
      setTimeout(() => setError(false), 1500);
    } finally {
      setPruefe(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center px-6">
      <div className="w-full max-w-xs flex flex-col items-center gap-6">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Lock className="w-7 h-7 text-primary" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold text-white">Alex Autoshop</h1>
          <p className="text-sm text-white/40 mt-1">Admin Chat</p>
        </div>
        <input
          type="password"
          value={pin}
          onChange={e => setPin(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="PIN"
          autoFocus
          className={`w-full rounded-2xl border px-5 py-4 text-center text-xl text-white bg-white/5 outline-none transition-all ${
            error ? "border-red-500 bg-red-500/10" : "border-white/10 focus:border-primary"
          }`}
        />
        <button onClick={submit} disabled={pruefe}
          className="w-full py-4 rounded-2xl bg-primary text-night font-bold text-base active:scale-95 transition-all disabled:opacity-60">
          {pruefe ? "Prüfe …" : "Einloggen"}
        </button>
        {meldung && <p className="text-xs text-red-400 text-center leading-relaxed">{meldung}</p>}
      </div>
    </div>
  );
}

export default function AdminChat() {
  const [params] = useSearchParams();
  const [pin, setPin] = useState<string | null>(() => localStorage.getItem(PIN_KEY));
  const [fehler, setFehler] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(params.get("session"));
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sitzungen vom Server holen. Realtime faellt weg: die Tabellen sind jetzt
  // zu, und der Browser hat keinen Schluessel mehr dafuer. Alle 5 Sekunden
  // nachfragen reicht fuer einen Posteingang vollkommen.
  useEffect(() => {
    if (!pin) return;
    let aktiv = true;
    const laden = async () => {
      try {
        const j = await adminRuf(pin, "sitzungen");
        if (!aktiv) return;
        setSessions((j?.sitzungen ?? []).filter((x: Session) => x.status === "open"));
        setFehler(null);
      } catch (e) {
        if (!aktiv) return;
        const m = e instanceof Error ? e.message : String(e);
        setFehler(m);
        if (/PIN/i.test(m)) { localStorage.removeItem(PIN_KEY); setPin(null); }
      }
    };
    laden();
    const t = setInterval(laden, 5000);
    return () => { aktiv = false; clearInterval(t); };
  }, [pin]);

  // Nachrichten der offenen Unterhaltung
  useEffect(() => {
    if (!activeId || !pin) return;
    let aktiv = true;
    setMsgs([]);
    const laden = async () => {
      try {
        const j = await adminRuf(pin, "nachrichten", { session: activeId });
        if (aktiv) setMsgs(j?.nachrichten ?? []);
      } catch { /* der Sitzungs-Abruf meldet den Fehler bereits */ }
    };
    laden();
    const t = setInterval(laden, 4000);
    return () => { aktiv = false; clearInterval(t); };
  }, [activeId, pin]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    const text = input.trim();
    if (!text || !activeId || !pin || sending) return;
    setInput("");
    setSending(true);
    try {
      const j = await adminRuf(pin, "antworten", undefined, { session: activeId, text });
      if (j?.gespeichert) setMsgs((prev) => [...prev, j.gespeichert as Msg]);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
      setInput(text);
    } finally { setSending(false); }
  };

  const closeSession = async (id: string) => {
    if (!pin) return;
    try { await adminRuf(pin, "schliessen", undefined, { session: id }); } catch { /* egal */ }
    setSessions(p => p.filter(s => s.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const activeSession = sessions.find(s => s.id === activeId);

  if (!pin) return <PinScreen onAuth={(p) => setPin(p)} />;

  // Mobile: zeige Chat wenn aktiv, sonst Liste
  const showChat = !!activeId;

  return (
    <div className="fixed inset-0 bg-background flex flex-col" style={{ fontFamily: "inherit" }}>

      {/* SESSION-LISTE (mobile: versteckt wenn Chat offen) */}
      <div className={`flex flex-col h-full ${showChat ? "hidden md:flex md:w-72 md:shrink-0 md:border-r md:border-border" : "flex"}`}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border bg-card shrink-0">
          <MessageCircle className="w-5 h-5 text-primary" />
          <div>
            <p className="font-bold text-sm">Live Chats</p>
            <p className="text-xs text-muted-foreground">{sessions.length} offen</p>
            {fehler && (
              <p className="mt-1 text-[11px] text-red-500 leading-snug">{fehler}</p>
            )}
          </div>
        </div>
        {/* Liste */}
        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Keine offenen Chats</div>
          ) : sessions.map(s => (
            <button key={s.id} onClick={() => setActiveId(s.id)}
              className={`w-full text-left px-4 py-4 border-b border-border transition-colors ${activeId === s.id ? "bg-primary/10" : "hover:bg-secondary/40 active:bg-secondary/60"}`}>
              <p className="font-semibold text-sm">{s.visitor_name || "Besucher"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(s.last_msg_at)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* CHAT-PANEL (mobile: Vollbild, desktop: rechts) */}
      {showChat && (
        <div className="flex-1 flex flex-col h-full md:flex">
          {/* Chat-Header */}
          <div className="flex items-center gap-3 px-3 py-3 border-b border-border bg-card shrink-0">
            <button onClick={() => setActiveId(null)}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/50 active:bg-secondary transition-colors md:hidden">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{activeSession?.visitor_name || "Besucher"}</p>
              <p className="text-xs text-muted-foreground truncate">Session {activeId?.slice(0, 8)}…</p>
            </div>
            <button onClick={() => closeSession(activeId!)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-xl px-3 py-2 transition-colors shrink-0 active:bg-secondary">
              <CheckCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Schließen</span>
            </button>
          </div>

          {/* Nachrichten */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
            {msgs.map(m => (
              <div key={m.id} className={`flex ${m.sender === "agent" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm break-words ${
                  m.sender === "agent"
                    ? "bg-primary text-night rounded-br-sm"
                    : "bg-secondary text-foreground rounded-bl-sm"
                }`}>
                  {m.message}
                  <p className="text-[10px] opacity-50 mt-1 text-right">
                    {new Date(m.created_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Eingabe */}
          <div className="px-3 pb-4 pt-2 border-t border-border flex gap-2 bg-card shrink-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Antwort … (Enter senden)"
              rows={1}
              className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm resize-none outline-none focus:border-primary transition-colors"
              style={{ maxHeight: 100 }}
            />
            <button onClick={send} disabled={!input.trim() || sending}
              className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center text-night shrink-0 self-end disabled:opacity-40 active:scale-95 transition-all">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Desktop: leere Mitte wenn keine Session */}
      {!showChat && (
        <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground text-sm">
          Chat auswählen
        </div>
      )}
    </div>
  );
}
