import { useState, useEffect } from "react";
import { X, Send } from "lucide-react";

// WhatsApp-Nummer im internationalen Format (kein + oder Leerzeichen)
// 0202 82690 → +49 202 82690 → 4920282690
const WHATSAPP = "4920282690";

// Öffnungszeiten in Berliner Zeit
// Mo–Fr 09:00–17:30 · Sa 09:00–14:00
function checkBusinessHours(): boolean {
  const now = new Date();
  const berlin = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  const day = berlin.getDay(); // 0 = So, 1 = Mo, …, 6 = Sa
  const minutes = berlin.getHours() * 60 + berlin.getMinutes();

  if (day >= 1 && day <= 5) return minutes >= 9 * 60 && minutes < 17 * 60 + 30;
  if (day === 6) return minutes >= 9 * 60 && minutes < 14 * 60;
  return false;
}

// WhatsApp SVG-Icon
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.116 1.528 5.845L0 24l6.335-1.502A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.032-1.383l-.361-.214-3.737.885.938-3.637-.235-.374A9.818 9.818 0 1112 21.818z"/>
  </svg>
);

export function LiveChatWidget() {
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(false);
  const [message, setMessage] = useState("");

  // Jede Minute Öffnungszeiten prüfen
  useEffect(() => {
    const check = () => setOnline(checkBusinessHours());
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, []);

  const send = () => {
    const text = message.trim() || "Hallo, ich habe eine Frage!";
    window.open(
      `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
    setMessage("");
    setOpen(false);
  };

  return (
    <>
      {/* Chat-Panel */}
      {open && (
        <div className="fixed bottom-24 left-4 sm:left-6 z-50 w-[min(92vw,340px)] rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-fade-up"
          style={{ background: "#111" }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/8"
            style={{ background: "#0d0d0d" }}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: "#25D366" }}>
                  <WhatsAppIcon />
                </div>
                <span
                  className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                  style={{
                    background: online ? "#4ade80" : "#525252",
                    borderColor: "#0d0d0d",
                  }}
                />
              </div>
              <div>
                <p className="font-bold text-white text-sm leading-tight">Alex Autoshop</p>
                <p className="text-xs leading-tight" style={{ color: online ? "#4ade80" : "rgba(255,255,255,0.35)" }}>
                  {online ? "● Jetzt online" : "● Außerhalb der Zeiten"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4">
            {/* Chat-Bubble vom Shop */}
            <div className="rounded-xl p-3 mb-3 text-sm leading-relaxed"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.75)" }}>
              👋 Hi! Schreib uns direkt — wir antworten auf WhatsApp.
            </div>

            {!online && (
              <p className="text-center text-xs mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>
                Mo–Fr 9–17:30 · Sa 9–14
              </p>
            )}

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Deine Frage oder Bestellung…"
              rows={3}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 resize-none focus:outline-none transition-colors"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />

            <button
              onClick={send}
              className="mt-2.5 w-full flex items-center justify-center gap-2 font-bold py-3 rounded-xl text-white text-sm active:scale-[0.98] transition-all"
              style={{ background: "#25D366" }}
            >
              <Send className="w-4 h-4" />
              {online ? "Auf WhatsApp senden" : "Nachricht hinterlassen"}
            </button>
          </div>
        </div>
      )}

      {/* Floating-Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 left-4 sm:left-6 z-50 inline-flex items-center gap-2 h-14 rounded-full text-white shadow-xl active:scale-95 transition-all"
        style={{
          paddingLeft: 18,
          paddingRight: 22,
          background: "#25D366",
        }}
        aria-label="Live Chat öffnen"
      >
        <div className="relative">
          <WhatsAppIcon />
          {/* Online-Indikator */}
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
