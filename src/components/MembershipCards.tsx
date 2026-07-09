import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Zap, Loader2 } from "lucide-react";
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

  const toggle = (mod: string) =>
    setModules((p) => (p.includes(mod) ? p.filter((x) => x !== mod) : [...p, mod]));

  // Preis und Ersparnis skalieren mit den gewählten Modulen
  const ratio = modules.length / m.modules.length;
  const price = useMemo(
    () => Math.round(m.pricePerMonth * ratio),
    [modules.length, m.pricePerMonth, m.modules.length]
  );
  const savings = useMemo(
    () => Math.round(m.savingsExample * ratio),
    [modules.length, m.savingsExample, m.modules.length]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const mail = user?.email || email;
    if (!mail) return toast.error("Bitte E-Mail angeben");
    if (modules.length === 0) return toast.error("Bitte mindestens ein Modul wählen");
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
        {m.originalPrice && (
          <span className="text-lg text-muted-foreground line-through mr-2">
            {m.originalPrice.toLocaleString("de-DE")} €
          </span>
        )}
        <span className="text-4xl font-display font-bold">
          <AnimatedNumber value={price} format={(n) => Math.round(n).toLocaleString("de-DE")} /> €
        </span>
        <span className="text-muted-foreground"> / Monat</span>
      </p>
      <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary mt-1">
        <Zap className="w-4 h-4" /> Spare im Durchschnitt {savings.toLocaleString("de-DE")} € / Monat
      </p>

      {!compact && (
        <>
          {/* Module wählen */}
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
                  <span className={cn(!on && "line-through")}>{m.discountPercent} % auf {mod}</span>
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

          {/* Features */}
          <ul className="space-y-2 mt-5 mb-5 flex-1">
            {m.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /> {f}
              </li>
            ))}
          </ul>

          {/* E-Mail-Anfrage */}
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
              {loading ? <Loader2 c