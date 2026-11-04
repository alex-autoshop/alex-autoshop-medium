import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LogIn, Zap, CreditCard } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

/**
 * Stöbern ist frei, und der Teilepreis ist für alle gleich. Die Mitgliedschaft
 * gilt im Shopify-Shop. Die Seite wird nicht nach ein paar Minuten zugesperrt.
 */

function mmss(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
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
  const trialLeft = useTrialClock(profile?.trial_expires_at);

  const trialRunning = !isGuest && trialLeft !== null && trialLeft > 0;
  const level = profile?.membership_level ?? 0;
  const trialOver =
    !isGuest && !trialRunning && !!profile?.trial_used && level === 0;

  const bar = useMemo(() => {
    if (isGuest) {
      return {
        tone: "calm" as const,
        icon: LogIn,
        text: <>Stöbern ist frei. In der Teilebörse gilt ein Preis für alle — die Mitgliedschaft gilt im Shop.</>,
        cta: { to: "/konto", label: "Anmelden" },
      };
    }
    if (trialRunning) {
      return {
        tone: "trial",
        icon: Zap,
        text: (
          <>
            Teststunde läuft — noch <strong className="font-semibold">{mmss(trialLeft!)}</strong>.
            Der Teilepreis ist derselbe wie ohne Anmeldung. Die Mitgliedschaft gilt im Shop.
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
            Deine Gratis-Teststunde ist vorbei. Teile bestellst du weiter zum gleichen Preis.
            Die Mitgliedschaft gilt im Shop, nicht in der Teilebörse.
          </>
        ),
        cta: { to: "/mitgliedschaft", label: "Zahlungsart hinterlegen" },
      } as const;
    }
    return null;
  }, [isGuest, trialRunning, trialLeft, trialOver]);

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

    </>
  );
}
