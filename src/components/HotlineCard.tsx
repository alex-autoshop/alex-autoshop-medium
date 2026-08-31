import { useEffect, useState } from "react";
import { PhoneCall, MessageCircle, Loader2, Lock, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Hotline = { phone: string; whatsapp: string; hinweis?: string };

/**
 * Die persönliche Notfallnummer von Alex — sichtbar ausschließlich für
 * bezahlte Level-3-Mitglieder.
 *
 * Die Nummer steht bewusst NICHT im Frontend-Code (öffentliches Repo,
 * lesbares Bundle), sondern wird von /api/hotline erst nach serverseitiger
 * Prüfung der Mitgliedschaftsstufe ausgeliefert.
 */
export function HotlineCard() {
  const [data, setData] = useState<Hotline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token = (await supabase?.auth.getSession())?.data.session?.access_token;
        if (!token) throw new Error("Nicht angemeldet.");
        const r = await fetch("/api/hotline", { headers: { Authorization: `Bearer ${token}` } });
        const j = await r.json().catch(() => null);
        if (!alive) return;
        if (!r.ok) throw new Error(j?.error || `Fehler ${r.status}`);
        setData(j);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Unbekannter Fehler");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const pretty = data?.phone.replace(/^(\+49)(\d{3,4})(\d+)$/, "$1 $2 $3");

  return (
    <div className="rounded-2xl bg-night text-white p-6 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.09] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle at 85% 15%, #f1eb5b 0%, transparent 55%)" }}
      />
      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <PhoneCall className="w-5 h-5 text-gold-bright" />
          <h2 className="text-lg text-white">Alex-Notfallnummer</h2>
          <span className="ml-auto rounded-full bg-gold-bright text-night text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
            Level 3
          </span>
        </div>
        <p className="text-sm text-white/60 mb-4">
          Direkt zu Alex — 24 Stunden, 7 Tage die Woche, auch sonntags. Kein Ticket, keine
          Warteschleife.
        </p>

        {loading && (
          <p className="flex items-center gap-2 text-sm text-white/60">
            <Loader2 className="w-4 h-4 animate-spin" /> Nummer wird geladen …
          </p>
        )}

        {!loading && error && (
          <p className="flex items-start gap-2 text-sm text-white/70 bg-white/5 rounded-lg px-3 py-2">
            <Lock className="w-4 h-4 shrink-0 mt-0.5 text-gold-bright" />
            {error}
          </p>
        )}

        {!loading && data && (
          <>
            <p className="font-display text-3xl font-bold text-gold-bright tracking-tight mb-4 select-all">
              {pretty || data.phone}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href={`tel:${data.phone}`} className="btn-gold-bright flex-1">
                <PhoneCall className="w-5 h-5" /> Anrufen
              </a>
              <a
                href={data.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="btn bg-white/10 text-white hover:bg-white/20 flex-1"
              >
                <MessageCircle className="w-5 h-5" /> WhatsApp
              </a>
            </div>
            <p className="flex items-start gap-2 text-xs text-white/45 mt-4 leading-relaxed">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Persönliche Nummer — bitte nur im Notfall und nicht weitergeben. Für normale
              Bestellungen erreichst du uns unter 0202 82690.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
