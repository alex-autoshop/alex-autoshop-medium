import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Zap, Loader2, Info, Clock, MousePointer2, RotateCcw } from "lucide-react";
import type { Feature } from "@/data/memberships";
import { toast } from "sonner";
import { MEMBERSHIP_LEVELS, type MembershipLevel } from "@/data/memberships";
import { useAuth } from "@/context/AuthContext";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { cn } from "@/lib/utils";

export function MembershipCards({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      <p className="text-center text-sm font-semibold mb-10 sm:mb-12 text-muted-foreground">
        🇩🇪 <span className="text-foreground">Deutschlandweit</span> — jeder kann Mitglied werden,
        Werkstatt wie privat. Wir liefern direkt zu dir.
      </p>
      <div className="grid lg:grid-cols-3 gap-8 lg:gap-7 items-start">
        {MEMBERSHIP_LEVELS.map((m) => (
          <Card key={m.level} m={m} compact={compact} />
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Demo-Animation: zeigt Erstbesuchern EINMAL pro Sitzung, dass jedes Modul
 * einzeln abwählbar ist — auch alle drei (= Basis-Mitgliedschaft).
 * Ein Geister-Cursor tippt die Module von unten nach oben ab, der Preis fällt
 * live mit, danach wird die ursprüngliche Auswahl wiederhergestellt.
 * -------------------------------------------------------------------------*/
const DEMO_FIRST_SLOT = 650;   // ms bis zum ersten Modul
const DEMO_SLOT = 900;         // ms pro Modul
const DEMO_TAP = 420;          // Tipp-Zeitpunkt innerhalb eines Slots
const DEMO_HOLD_BASE = 1250;   // Basis-Zustand kurz stehen lassen
const DEMO_RESTORE_STEP = 170; // Stagger beim Wiederherstellen

type Cursor = { top: number; left: number; visible: boolean; tap: boolean };

function Card({ m, compact }: { m: MembershipLevel; compact: boolean }) {
  const { user, profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [modules, setModules] = useState<string[]>(m.defaultModules ?? m.modules);
  const [wantFreePaint, setWantFreePaint] = useState(true);
  const [email, setEmail] = useState("");
  const [payMethod, setPayMethod] = useState<"gocardless" | "stripe">("gocardless");
  const [loading, setLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [openInfo, setOpenInfo] = useState<string | null>(null);

  /* --- Demo-State ------------------------------------------------------- */
  const [demoModules, setDemoModules] = useState<string[] | null>(null);
  const [cursor, setCursor] = useState<Cursor | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const timers = useRef<number[]>([]);
  const demoRef = useRef(false);
  const touchedRef = useRef(false);
  const modulesRef = useRef(modules);
  modulesRef.current = modules;

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };
  const at = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const cancelDemo = useCallback(() => {
    if (!demoRef.current) return;
    demoRef.current = false;
    clearTimers();
    setDemoModules(null);
    setCursor(null);
    setFlash(null);
  }, []);

  const posOf = (mod: string) => {
    const el = btnRefs.current[mod];
    if (!el) return null;
    // offsetTop/-Left beziehen sich auf den (position:relative) Modul-Container,
    // sind also unabhängig von Layout-Verschiebungen ausserhalb der Liste.
    return { top: el.offsetTop + el.offsetHeight / 2 - 5, left: el.offsetLeft + el.offsetWidth - 32 };
  };

  const runDemo = useCallback(() => {
    if (compact) return;
    clearTimers();
    const start = modulesRef.current;
    const order = [...m.modules].reverse(); // von unten nach oben abtippen
    const firstPos = posOf(order[0]);
    if (!firstPos) return;

    demoRef.current = true;
    setDemoModules(start);
    setCursor({ ...firstPos, visible: false, tap: false });
    at(60, () => setCursor((c) => (c ? { ...c, visible: true } : c)));

    order.forEach((mod, i) => {
      const slot = DEMO_FIRST_SLOT + i * DEMO_SLOT;
      at(slot, () => {
        const p = posOf(mod);
        if (p) setCursor((c) => (c ? { ...c, ...p } : c));
      });
      // Nur "tippen", wenn das Modul überhaupt aktiv ist — sonst nur hinbewegen
      if (!start.includes(mod)) return;
      at(slot + DEMO_TAP, () => {
        setCursor((c) => (c ? { ...c, tap: true } : c));
        setFlash(mod);
        setDemoModules((prev) => (prev ?? start).filter((x) => x !== mod));
      });
      at(slot + DEMO_TAP + 220, () => {
        setCursor((c) => (c ? { ...c, tap: false } : c));
        setFlash(null);
      });
    });

    const restoreAt = DEMO_FIRST_SLOT + order.length * DEMO_SLOT + DEMO_HOLD_BASE;
    at(restoreAt, () => setCursor((c) => (c ? { ...c, visible: false } : c)));
    start.forEach((mod, i) => {
      at(restoreAt + i * DEMO_RESTORE_STEP, () => {
        setFlash(mod);
        setDemoModules((prev) => (prev && prev.includes(mod) ? prev : [...(prev ?? []), mod]));
      });
      at(restoreAt + i * DEMO_RESTORE_STEP + 280, () => setFlash(null));
    });
    at(restoreAt + start.length * DEMO_RESTORE_STEP + 650, () => {
      demoRef.current = false;
      setDemoModules(null);
      setCursor(null);
      setFlash(null);
    });
  }, [compact, m.modules]);

  // Auto-Start: einmal pro Sitzung, sobald die Modul-Liste im Blick ist
  useEffect(() => {
    if (compact) return;
    const el = listRef.current;
    if (!el || typeof window === "undefined" || !("IntersectionObserver" in window)) return;
    // Pro Seite einmal pro Sitzung (Startseite + /mitgliedschaft je einmal)
    const key = `aa:modDemo:${m.level}:${window.location.pathname}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      /* Private-Mode: dann eben ohne Merker */
    }
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting || e.intersectionRatio < 0.85) continue;
          io.disconnect();
          try {
            sessionStorage.setItem(key, "1");
          } catch {
            /* ignore */
          }
          at(450, () => {
            if (!touchedRef.current && !document.hidden) runDemo();
          });
        }
      },
      { threshold: [0.85] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [compact, m.level, runDemo]);

  useEffect(() => clearTimers, []);

  const demoActive = demoModules !== null;
  const view = demoModules ?? modules;

  // Trial-Status für dieses Level
  const now = new Date();
  const trialRunning =
    profile.trial_level === m.level &&
    !!profile.trial_expires_at &&
    new Date(profile.trial_expires_at) > now;

  const activateTrial = async () => {
    if (!user) {
      toast.info("Bitte zuerst anmelden", {
        description: `Melde dich an — dann kannst du Level ${m.level} 1 Stunde gratis testen.`,
      });
      navigate("/konto");
      return;
    }
    if (trialRunning) {
      navigate("/dashboard?tab=shop");
      return;
    }
    if (profile.trial_used) {
      toast.error("Trial bereits genutzt", {
        description: "Du hast deine kostenlose Teststunde bereits genutzt. Jetzt Mitglied werden und dauerhaft sparen!",
      });
      return;
    }
    setTrialLoading(true);
    try {
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const { error } = await updateProfile({
        trial_level:      m.level,
        trial_expires_at: expiresAt,
        trial_used:       true,
      });
      if (error) throw new Error(error);
      toast.success(`Level ${m.level} Trial gestartet — 1 Stunde! 🎉`, {
        description: "Du siehst jetzt alle Mitglieder-Preise. Viel Spaß beim Testen!",
      });
      navigate("/dashboard?tab=shop");
    } catch (err: unknown) {
      toast.error("Fehler beim Aktivieren", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setTrialLoading(false);
    }
  };

  const toggle = (mod: string) => {
    touchedRef.current = true;
    cancelDemo();
    setModules((p) => (p.includes(mod) ? p.filter((x) => x !== mod) : [...p, mod]));
  };

  const isBase = view.length === 0;
  const ratio = view.length / m.modules.length;
  const activeDiscount = isBase ? m.baseDiscountPercent : m.discountPercent;

  // Gratis-Farbe ist nur abwählbar wenn KEIN Lack-Modul aktiv ist (nur Teilebörse oder Basis).
  // Sobald Lackfarben/Lackmaterial gebucht sind, gehört die Gratis-Farbe fest dazu.
  const noPaint = !view.includes("Lackfarben") && !view.includes("Lackmaterial");
  const freePaintFeature = m.features.find((f) => f.label.startsWith("Gratis Farbe"));
  const freePaintOff = noPaint && !wantFreePaint;
  const freePaintDeduction = freePaintOff ? m.freePaintValue : 0;

  // Per-Modul-Preis: Autoteile günstigst, Lackmaterial mittig, Lackfarben teuerst
  const moduleSum = useMemo(() => {
    if (isBase) return 0;
    return view.reduce((sum, mod) => sum + (m.modulePrices[mod] ?? 0), 0);
  }, [isBase, view, m.modulePrices]);

  const totalModuleCost = Object.values(m.modulePrices).reduce((s, v) => s + v, 0);
  const moduleRatio = totalModuleCost > 0 ? moduleSum / totalModuleCost : ratio;

  const price = useMemo(() => {
    const base = isBase ? m.basePrice : m.basePrice + moduleSum;
    return Math.max(0, base - freePaintDeduction);
  }, [isBase, moduleSum, m.basePrice, freePaintDeduction]);

  const originalPrice = useMemo(() => {
    if (isBase || !m.originalPrice) return undefined;
    // originalPrice muss immer > actual price — proportional zum vollen Preisverhältnis
    const fullRatio = m.originalPrice / m.pricePerMonth;
    return Math.round((m.basePrice + moduleSum) * fullRatio) - freePaintDeduction;
  }, [isBase, moduleSum, m.originalPrice, m.pricePerMonth, m.basePrice, freePaintDeduction]);

  const savings = useMemo(() => {
    if (isBase) return null;
    return Math.round(m.savingsExample * moduleRatio);
  }, [isBase, moduleRatio, m.savingsExample]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const mail = user?.email || email;
    if (!mail) return toast.error("Bitte E-Mail angeben");
    setLoading(true);
    try {
      // 1) Echte Zahlung versuchen (Stripe-Abo bzw. GoCardless-SEPA)
      const co = await fetch("/api/membership-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mail, level: m.level, modules, price, method: payMethod, freePaint: noPaint ? wantFreePaint : true }),
      });
      const coData = await co.json().catch(() => ({}));
      if (co.ok && coData.url) {
        // Weiterleitung zur sicheren Bezahlseite
        window.location.href = coData.url;
        return;
      }
      // 2) Fallback: Anbieter noch nicht konfiguriert → bisheriger E-Mail-Anfrage-Flow
      const res = await fetch("/api/membership-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: mail,
          level: m.level,
          modules,
          price,
          freePaint: noPaint ? wantFreePaint : true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unbekannter Fehler");
      toast.success("Anfrage gesendet! 📬", {
        description: "Wir melden uns zur Zahlung. Klick auf 'Zum Dashboard' in der Mail — du wirst automatisch eingeloggt.",
      });
      setEmail("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Anfrage fehlgeschlagen", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onPointerDownCapture={cancelDemo}
      className={cn(
        "card-tilt hover:translate-y-0 p-6 flex flex-col relative",
        m.highlight && "border-primary ring-2 ring-primary/40 lg:scale-[1.03]"
      )}
    >
      {m.badge && (
        <span
          className={cn(
            "absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full",
            m.highlight ? "bg-primary text-primary-foreground" : "bg-night text-gold-bright"
          )}
        >
          {m.badge}
        </span>
      )}

      <h3 className="text-xl">{m.name}</h3>
      <p className="text-sm text-muted-foreground mt-1 min-h-[2.5rem]">{m.tagline}</p>

      <p className="mt-4">
        {originalPrice && (
          <span className="text-lg text-muted-foreground line-through mr-2">
            {originalPrice.toLocaleString("de-DE")} €
          </span>
        )}
        <span
          className={cn(
            "text-4xl font-display font-bold transition-colors duration-300",
            demoActive && "text-primary"
          )}
        >
          <AnimatedNumber value={price} format={(n) => Math.round(n).toLocaleString("de-DE")} /> €
        </span>
        <span className="text-muted-foreground"> / Monat</span>
      </p>

      {isBase ? (
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary mt-1">
          <Zap className="w-4 h-4" /> {activeDiscount}% auf das gesamte Sortiment und Teilebörse
        </p>
      ) : (
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary mt-1">
          <Zap className="w-4 h-4" /> Spare im Durchschnitt {savings!.toLocaleString("de-DE")} € / Monat
        </p>
      )}

      {!compact && (
        <>
          <div className="flex items-center justify-between gap-2 mt-5 mb-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Module wählen
            </p>
            <button
              type="button"
              onClick={() => {
                cancelDemo();
                runDemo();
              }}
              className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70 hover:text-primary transition-colors"
              aria-label="Zeigen, wie die Module funktionieren"
            >
              <RotateCcw className="w-3 h-3" /> Zeig mir
            </button>
          </div>
          <p
            className={cn(
              "text-[11px] leading-snug mb-2 transition-colors duration-300",
              demoActive ? "text-primary font-semibold" : "text-muted-foreground"
            )}
          >
            {demoActive
              ? "Antippen zum Ab- oder Zuwählen — du zahlst nur, was du brauchst."
              : "Frei kombinierbar: jedes Modul einzeln abwählbar — auch alle drei."}
          </p>

          <div ref={listRef} className="space-y-2 relative">
            {m.modules.map((mod) => {
              const on = view.includes(mod);
              return (
                <button
                  key={mod}
                  ref={(el) => {
                    btnRefs.current[mod] = el;
                  }}
                  type="button"
                  onClick={() => toggle(mod)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-medium transition-all duration-300 min-h-[48px]",
                    on
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-secondary/40 text-muted-foreground/60",
                    flash === mod && "ring-2 ring-primary/70 scale-[1.02]"
                  )}
                >
                  <span className={cn("text-left transition-all", !on && "line-through")}>
                    {m.discountPercent}% auf {mod === "Autoteile" ? "Autoteile (in der Teilebörse)" : mod}
                  </span>
                  {on ? (
                    <span className="w-5 h-5 rounded-full border-2 border-primary bg-primary flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70 shrink-0">
                      Nicht aktiv
                    </span>
                  )}
                </button>
              );
            })}

            {/* Geister-Cursor der Demo */}
            {cursor && (
              <span
                className="pointer-events-none absolute z-20 block"
                style={{
                  top: cursor.top,
                  left: cursor.left,
                  opacity: cursor.visible ? 1 : 0,
                  transform: `scale(${cursor.tap ? 0.8 : 1})`,
                  transformOrigin: "top left",
                  transition:
                    "top .55s cubic-bezier(.4,0,.2,1), left .55s cubic-bezier(.4,0,.2,1), transform .18s ease-out, opacity .35s ease-out",
                }}
              >
                {cursor.tap && (
                  <span className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-primary/35 animate-ping" />
                )}
                <MousePointer2 className="relative w-7 h-7 text-foreground fill-primary drop-shadow-[0_3px_7px_rgba(0,0,0,0.4)]" />
              </span>
            )}
          </div>

          {/* Gratis-Farbe abwählbar — nur wenn kein Lack-Modul aktiv (Teilebörse-only oder Basis) */}
          {!demoActive && noPaint && freePaintFeature && (
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Gratis-Farbe (optional)
              </p>
              <button
                type="button"
                onClick={() => setWantFreePaint((v) => !v)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-medium transition-colors min-h-[48px] text-left",
                  wantFreePaint
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-secondary/40 text-muted-foreground/60"
                )}
              >
                <span className={cn(!wantFreePaint && "line-through")}>{freePaintFeature.label}</span>
                {wantFreePaint ? (
                  <span className="w-5 h-5 rounded-full border-2 border-primary bg-primary flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </span>
                ) : (
                  <span className="text-[11px] font-bold tracking-wide text-muted-foreground/80 shrink-0">
                    −{m.freePaintValue} €
                  </span>
                )}
              </button>
              <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                {wantFreePaint
                  ? `Keine Lackfarbe nötig? Farbe abwählen und ${m.freePaintValue} € / Monat sparen.`
                  : `Gratis-Farbe abgewählt — du sparst ${m.freePaintValue} € / Monat.`}
              </p>
            </div>
          )}

          {/* Basis-Hinweis wenn alle Module abgewählt */}
          {isBase && (
            <div
              className={cn(
                "mt-3 rounded-lg bg-secondary/60 border px-4 py-3 text-xs text-muted-foreground leading-relaxed transition-colors duration-300",
                demoActive ? "border-primary/60 bg-primary/5" : "border-border"
              )}
            >
              <span className="font-semibold text-foreground">
                Alle Module abgewählt = Basis für {m.basePrice} € — {activeDiscount}% auf das gesamte
                Sortiment und Teilebörse
              </span>{" "}
              — {wantFreePaint ? "inkl. Gratis-Farbe und alle" : "alle weiteren"} Mitgliedsvorteile.
              Module jederzeit einzeln zubuchbar.
            </div>
          )}

          <ul className="space-y-2 mt-5 mb-5 flex-1">
            {m.features.map((f: Feature) => {
              const isCashback = f.label.includes("Cashback");
              const autoteileAktiv = view.includes("Autoteile");
              const isFreePaint = f.label.startsWith("Gratis Farbe");
              const inactive = (isCashback && !autoteileAktiv) || (isFreePaint && freePaintOff);
              const isOpen = openInfo === f.label;
              return (
                <li
                  key={f.label}
                  className={cn(
                    "flex flex-col gap-0.5 text-sm transition-opacity duration-300",
                    inactive && "opacity-40"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span className={cn("flex-1", inactive && "line-through")}>{f.label}</span>
                    {f.info && (
                      <button
                        type="button"
                        onClick={() => setOpenInfo(isOpen ? null : f.label)}
                        className="shrink-0 w-4 h-4 rounded-full border border-muted-foreground/40 flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                        aria-label="Mehr Info"
                      >
                        <Info className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                  {isOpen && f.info && (
                    <p className="ml-6 text-xs text-muted-foreground bg-secondary/60 rounded-md px-3 py-2 leading-relaxed">
                      {f.info}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>

          <form onSubmit={submit} className="mt-auto space-y-2">
            {!user && (
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="deine@email.de"
                className="input-base"
              />
            )}
            {/* Zahlungsart */}
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: "gocardless", label: "SEPA-Lastschrift" },
                { id: "stripe", label: "Karte" },
              ] as const).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPayMethod(opt.id)}
                  className={cn(
                    "px-3 py-2 rounded-xl border text-xs font-semibold transition-colors min-h-[44px]",
                    payMethod === opt.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button type="submit" disabled={loading} className={m.highlight ? "btn-primary w-full" : "btn-dark w-full"}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {isBase ? `Basis freischalten (${activeDiscount}%) →` : "Jetzt kostenpflichtig buchen →"}
            </button>

            {/* Trial-Button — 1 Stunde gratis testen */}
            <button
              type="button"
              onClick={activateTrial}
              disabled={trialLoading || (profile.trial_used && !trialRunning)}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors min-h-[48px]",
                trialRunning
                  ? "border-primary bg-primary/10 text-primary"
                  : profile.trial_used
                  ? "border-border bg-secondary/20 text-muted-foreground/40 cursor-not-allowed"
                  : "border-border bg-secondary/40 hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-foreground"
              )}
            >
              {trialLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Clock className={cn("w-4 h-4", trialRunning ? "text-primary" : "")} />
              )}
              {trialRunning
                ? "Trial aktiv — Zum Shop →"
                : profile.trial_used
                ? "Trial bereits genutzt"
                : "1 Std. gratis testen →"}
            </button>
          </form>
        </>
      )}

      {compact && (
        <Link to="/mitgliedschaft" className={cn("mt-5", m.highlight ? "btn-primary" : "btn-outline")}>
          Mehr erfahren
        </Link>
      )}
    </div>
  );
}
