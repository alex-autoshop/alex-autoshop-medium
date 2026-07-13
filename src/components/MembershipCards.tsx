import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Zap, Loader2, Info } from "lucide-react";
import type { Feature } from "@/data/memberships";
import { toast } from "sonner";
import { MEMBERSHIP_LEVELS, type MembershipLevel } from "@/data/memberships";
import { useAuth } from "@/context/AuthContext";
import { requestMembership } from "@/lib/inbox";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { cn } from "@/lib/utils";

export function MembershipCards({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      <p className="text-center text-sm font-semibold mb-5 text-muted-foreground">
        🇩🇪 <span className="text-foreground">Deutschlandweit</span> — jeder kann Mitglied werden,
        Werkstatt wie privat. Wir liefern direkt zu dir.
      </p>
      <div className="grid lg:grid-cols-3 gap-5 items-start">
        {MEMBERSHIP_LEVELS.map((m) => (
          <Card key={m.level} m={m} compact={compact} />
        ))}
      </div>
    </div>
  );
}

function Card({ m, compact }: { m: MembershipLevel; compact: boolean }) {
  const { user } = useAuth();
  const [modules, setModules] = useState<string[]>(m.defaultModules ?? m.modules);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [openInfo, setOpenInfo] = useState<string | null>(null);

  const toggle = (mod: string) =>
    setModules((p) => (p.includes(mod) ? p.filter((x) => x !== mod) : [...p, mod]));

  const isBase = modules.length === 0;
  const ratio = modules.length / m.modules.length;
  const activeDiscount = isBase ? m.baseDiscountPercent : m.discountPercent;

  // Per-Modul-Preis: Autoteile günstigst, Lackmaterial mittig, Lackfarben teuerst
  const moduleSum = useMemo(() => {
    if (isBase) return 0;
    return modules.reduce((sum, mod) => sum + (m.modulePrices[mod] ?? 0), 0);
  }, [isBase, modules, m.modulePrices]);

  const totalModuleCost = Object.values(m.modulePrices).reduce((s, v) => s + v, 0);
  const moduleRatio = totalModuleCost > 0 ? moduleSum / totalModuleCost : ratio;

  const price = useMemo(() => {
    if (isBase) return m.basePrice;
    return m.basePrice + moduleSum;
  }, [isBase, moduleSum, m.basePrice]);

  const originalPrice = useMemo(() => {
    if (isBase || !m.originalPrice) return undefined;
    // originalPrice muss immer > actual price — proportional zum vollen Preisverhältnis
    const fullRatio = m.originalPrice / m.pricePerMonth;
    return Math.round((m.basePrice + moduleSum) * fullRatio);
  }, [isBase, moduleSum, m.originalPrice, m.pricePerMonth, m.basePrice]);

  const savings = useMemo(() => {
    if (isBase) return null;
    return Math.round(m.savingsExample * moduleRatio);
  }, [isBase, moduleRatio, m.savingsExample]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const mail = user?.email || email;
    if (!mail) return toast.error("Bitte E-Mail angeben");
    setLoading(true);
    const { error } = await requestMembership({
      level: m.level,
      modules,
      email: mail,
      userId: user?.id,
    });
    setLoading(false);
    if (error) return toast.error("Anfrage fehlgeschlagen", { description: error });
    toast.success("Anfrage gesendet!", {
      description: user ? "Du findest die Bestätigung in deiner Inbox." : "Wir melden uns per E-Mail.",
    });
    setEmail("");
  };

  return (
    <div
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
        <span className="text-4xl font-display font-bold">
          <AnimatedNumber value={price} format={(n) => Math.round(n).toLocaleString("de-DE")} /> €
        </span>
        <span className="text-muted-foreground"> / Monat</span>
      </p>

      {isBase ? (
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary mt-1">
          <Zap className="w-4 h-4" /> {activeDiscount}% auf das gesamte Sortiment und Teileportal
        </p>
      ) : (
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary mt-1">
          <Zap className="w-4 h-4" /> Spare im Durchschnitt {savings!.toLocaleString("de-DE")} € / Monat
        </p>
      )}

      {!compact && (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mt-5 mb-2">
            Module wählen
          </p>
          <div className="space-y-2">
            {m.modules.map((mod) => {
              const on = modules.includes(mod);
              return (
                <button
                  key={mod}
                  type="button"
                  onClick={() => toggle(mod)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-medium transition-colors min-h-[48px]",
                    on
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-secondary/40 text-muted-foreground/60"
                  )}
                >
                  <span className={cn(!on && "line-through")}>
                    {m.discountPercent}% auf {mod === "Autoteile" ? "Autoteile (im Teileportal)" : mod}
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
          </div>

          {/* Basis-Hinweis wenn alle Module abgewählt */}
          {isBase && (
            <div className="mt-3 rounded-lg bg-secondary/60 border border-border px-4 py-3 text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">{activeDiscount}% auf das gesamte Sortiment und Teileportal</span> — inkl. Gratis-Farbe und alle Mitgliedsvorteile. Module einzeln zubuchbar.
            </div>
          )}

          <ul className="space-y-2 mt-5 mb-5 flex-1">
            {m.features.map((f: Feature) => {
              const isCashback = f.label.includes("Cashback");
              const autoteileAktiv = modules.includes("Autoteile");
              const inactive = isCashback && !autoteileAktiv;
              const isOpen = openInfo === f.label;
              return (
                <li key={f.label} className={cn("flex flex-col gap-0.5 text-sm", inactive && "opacity-40")}>
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
            <button type="submit" disabled={loading} className={m.highlight ? "btn-primary w-full" : "btn-dark w-full"}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {isBase ? `Basis freischalten (${activeDiscount}%) →` : "Jetzt freischalten →"}
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
