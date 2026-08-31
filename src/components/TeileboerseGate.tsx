import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Lock, Phone, LogIn, Zap, CreditCard } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { SHOP_INFO } from "@/data/shopInfo";
import { cn } from "@/lib/utils";

/**
 * Zugang zur Teilebörse für Nicht-Angemeldete.
 *
 *   Gast            10 Minuten frei stöbern und bestellen
 *   danach          Hinweis auf die Gratis-Teststunde (dafür Konto nötig)
 *   Teststunde      60 Minuten mit allen Mitgliederpreisen, Bestellen möglich
 *   danach          Aufforderung, eine Zahlungsart zu hinterlegen
 *
 * Die Uhr läuft in `localStorage`, überlebt also einen Reload — sonst wäre der
 * Zugang mit F5 endlos verlängerbar. Es ist bewusst eine weiche Schranke: sie
 * hält niemanden davon ab, telefonisch zu bestellen, und die Telefonnummer
 * steht deshalb auch im Overlay.
 */

const GUEST_MINUTES = 10;
const KEY = "aa:tb:guestStart";
const WARN_MS = 3 * 60 * 1000; // letzte 3 Minuten deutlich sichtbar

function mmss(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Verbleibende Gastzeit in ms — `null`, solange die Uhr nicht laufen soll. */
function useGuestClock(active: boolean) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!active) {
      setLeft(null);
      return;
    }
    let start = 0;
    try {
      start = Number(localStorage.getItem(KEY)) || 0;
      // Kaputter oder in die Zukunft manipulierter Wert -> neu starten
      if (!start || Number.isNaN(start) || start > Date.now()) {
        start = Date.now();
        localStorage.setItem(KEY, String(start));
      }
    } catch {
      start = Date.now(); // Privater Modus: Uhr läuft nur für diese Sitzung
    }
    const end = start + GUEST_MINUTES * 60_000;
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return left;
}

/** Restzeit der Gratis-Teststunde in ms — `null`, wenn keine läuft. */
function useTrialClock(expiresAt?: string) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!expiresAt) {
      setLeft(null);
      return;
    }
    const end = new Date(expiresAt).getTime();
    if (Number.isNaN(end)) {
      setLeft(null);
      return;
    }
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);
  return left;
}

export function TeileboerseGate() {
  const { user, profile } = useAuth();

  const isGuest = !user;
  const guestLeft = useGuestClock(isGuest);
  const trialLeft = useTrialClock(profile?.trial_expires_at);

  const trialRunning = !isGuest && trialLeft !== null && trialLeft > 0;
  const level = profile?.membership_level ?? 0;
  const trialOver =
    !isGuest && !trialRunning && !!profile?.trial_used && level === 0;

  const guestOver = isGuest && guestLeft !== null && guestLeft <= 0;
  const urgent = guestLeft !== null && guestLeft > 0 && guestLeft <= WARN_MS;

  const bar = useMemo(() => {
    if (isGuest && guestLeft !== null && guestLeft > 0) {
      return {
        tone: urgent ? "urgent" : "calm",
        icon: Clock,
        text: (
          <>
            <strong className="font-semibold">{mmss(guestLeft)}</strong> Gast-Zugang übrig —
            danach eine Stunde alles gratis testen.
          </>
        ),
        cta: { to: "/mitgliedschaft", label: "1 Std. gratis testen" },
      } as const;
    }
    if (trialRunning) {
      return {
        tone: "trial",
        icon: Zap,
        text: (
          <>
            Teststunde läuft — noch <strong className="font-semibold">{mmss(trialLeft!)}</strong> mit
            allen Mitgliederpreisen. Bestellen inklusive.
          </>
        ),
        cta: { to: "/mitgliedschaft", label: "Mitglied werden" },
      } as const;
    }
    if (trialOver) {
      return {
        tone: "urgent",
        icon: CreditCard,
        text: (
          <>
            Deine Gratis-Teststunde ist vorbei. Zahlungsart hinterlegen und zu Mitgliederpreisen
            weiterbestellen.
          </>
        ),
        cta: { to: "/mitgliedschaft", label: "Zahlungsart hinterlegen" },
      } as const;
    }
    return null;
  }, [isGuest, guestLeft, urgent, trialRunning, trialLeft, trialOver]);

  return (
    <>
      {bar && (
        <div
          className={cn(
            "sticky top-0 z-30 border-b px-4 py-2 flex items-center gap-3 flex-wrap text-sm transition-colors",
            bar.tone === "urgent" && "bg-red-50 border-red-200 text-red-900",
            bar.tone === "calm" && "bg-primary/10 border-primary/25 text-foreground",
            bar.tone === "trial" && "bg-night border-black text-white"
          )}
        >
          <bar.icon
            className={cn(
              "w-4 h-4 shrink-0",
              bar.tone === "urgent" && "text-red-600",
              bar.tone === "calm" && "text-primary",
              bar.tone === "trial" && "text-gold-bright"
            )}
          />
          <span className="flex-1 min-w-[12rem] leading-snug">{bar.text}</span>
          <Link
            to={bar.cta.to}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
              bar.tone === "urgent" && "bg-red-600 text-white hover:bg-red-700",
              bar.tone === "calm" && "bg-primary text-primary-foreground hover:bg-gold-deep",
              bar.tone === "trial" && "bg-gold-bright text-night hover:brightness-95"
            )}
          >
            {bar.cta.label}
          </Link>
        </div>
      )}

      {guestOver && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-night/85 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl p-7 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/12 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-2xl mb-2">Deine 10 Minuten sind um</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Weitersuchen kostet dich nichts: leg ein Konto an und teste eine Mitgliedschaft{" "}
              <strong className="text-foreground">eine Stunde lang gratis</strong> — mit allen
              Mitgliederpreisen in der Teilebörse. Bestellen ist in dieser Stunde inklusive.
            </p>
            <div className="flex flex-col gap-2.5">
              <Link to="/mitgliedschaft" className="btn-primary text-base">
                <Clock className="w-5 h-5" /> 1 Stunde gratis testen
              </Link>
              <Link to="/konto" className="btn-outline text-sm">
                <LogIn className="w-4 h-4" /> Ich bin schon Mitglied — anmelden
              </Link>
              <a
                href={`tel:${SHOP_INFO.phoneIntl}`}
                className="text-xs text-muted-foreground hover:text-primary inline-flex items-center justify-center gap-1.5 mt-1 min-h-[44px]"
              >
                <Phone className="w-3.5 h-3.5" /> Lieber direkt bestellen? {SHOP_INFO.phone}
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
