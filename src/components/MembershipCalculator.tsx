import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import { MEMBERSHIP_LEVELS } from "@/data/memberships";
import { cn } from "@/lib/utils";

const MAX = 500_000;

const CATEGORIES = [
  { id: "teile", label: "Teile-Anschaffung" },
  { id: "fahrzeughandel", label: "Fahrzeughandel-Einkauf" },
  { id: "lackmaterial", label: "Lackmaterial" },
  { id: "lackfarbe", label: "Lackfarbe" },
  { id: "buchhaltung", label: "Buchhaltung" },
  { id: "steuerberatung", label: "Steuerberatung" },
  { id: "sonstiges", label: "Sonstiges" },
] as const;

const eur = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 0 }) + " €";
const onlyDigits = (s: string) => Number(s.replace(/[^\d]/g, "")) || 0;

export function MembershipCalculator() {
  const [mode, setMode] = useState<"simple" | "detailed">("simple");
  const [simpleTotal, setSimpleTotal] = useState(5000);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    teile: true,
    lackmaterial: true,
    lackfarbe: true,
  });

  const detailedTotal = useMemo(
    () => CATEGORIES.reduce((sum, c) => sum + (enabled[c.id] ? amounts[c.id] || 0 : 0), 0),
    [amounts, enabled]
  );

  const total = mode === "simple" ? simpleTotal : detailedTotal;

  return (
    <div className="card-tilt hover:translate-y-0 p-6 sm:p-10 max-w-3xl mx-auto">
      <h2 className="text-2xl mb-2">Lohnt sich das für mich?</h2>
      <p className="text-muted-foreground mb-6">
        Berechne, wie viel deine Werkstatt mit einer Mitgliedschaft pro Monat spart.
      </p>

      {/* Modus-Umschalter */}
      <div className="flex gap-2 mb-6 p-1 bg-secondary rounded-lg max-w-sm">
        {([
          ["simple", "Gesamtausgaben"],
          ["detailed", "Nach Kategorie"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={cn(
              "flex-1 min-h-[44px] rounded-md font-semibold text-sm transition-colors",
              mode === id ? "bg-card shadow-card text-foreground" : "text-muted-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "simple" ? (
        <div className="mb-6">
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            Monatliche Werkstatt-Ausgaben
          </label>
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-1">
              <input
                type="text"
                inputMode="numeric"
                value={simpleTotal.toLocaleString("de-DE")}
                onChange={(e) => setSimpleTotal(Math.min(MAX, onlyDigits(e.target.value)))}
                className="input-base text-2xl font-display font-bold pr-10 text-right"
                aria-label="Monatliche Ausgaben in Euro"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-display font-bold text-muted-foreground">
                €
              </span>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={MAX}
            step={500}
            value={simpleTotal}
            onChange={(e) => setSimpleTotal(Number(e.target.value))}
            className="w-full accent-[#B8860B] h-12"
            aria-label="Ausgaben-Schieberegler"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0 €</span>
            <span>500.000 € / Monat</span>
          </div>
        </div>
      ) : (
        <div className="mb-6 space-y-2">
          {CATEGORIES.map((c) => {
            const on = enabled[c.id] ?? false;
            return (
              <div
                key={c.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-2 pl-3 transition-colors",
                  on ? "border-primary/40 bg-primary/5" : "border-border"
                )}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => setEnabled((p) => ({ ...p, [c.id]: !on }))}
                  className="w-5 h-5 accent-[#B8860B] shrink-0"
                  aria-label={c.label}
                />
                <span className={cn("flex-1 text-sm font-medium", !on && "text-muted-foreground")}>
                  {c.label}
                </span>
                <div className="relative w-36">
                  <input
                    type="text"
                    inputMode="numeric"
                    disabled={!on}
                    value={(amounts[c.id] || 0).toLocaleString("de-DE")}
                    onChange={(e) =>
                      setAmounts((p) => ({ ...p, [c.id]: Math.min(MAX, onlyDigits(e.target.value)) }))
                    }
                    className="input-base text-right pr-7 min-h-[44px] disabled:opacity-40"
                    aria-label={`${c.label} Betrag`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                </div>
              </div>
            );
          })}
          <div className="flex justify-between items-center pt-2 font-semibold">
            <span>Summe / Monat</span>
            <span className="text-xl font-display">{eur(detailedTotal)}</span>
          </div>
        </div>
      )}

      {/* Ergebnis-Karten */}
      <div className="grid sm:grid-cols-3 gap-4">
        {MEMBERSHIP_LEVELS.map((m) => {
          const saved = total * (m.discountPercent / 100);
          const net = saved - m.pricePerMonth;
          const worth = net > 0;
          return (
            <div
              key={m.level}
              className={cn(
                "rounded-xl border p-4",
                worth ? "border-primary bg-primary/5" : "border-border bg-secondary/50"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="font-bold">{m.name}</p>
                <span className="text-xs font-semibold text-primary">{m.discountPercent}%</span>
              </div>
              <p className="text-[11px] text-muted-foreground mb-2">
                {m.pricePerMonth} € Beitrag / Monat
              </p>
              <p className="text-2xl font-display font-bold text-primary leading-none">
                {eur(saved)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Ersparnis / Monat</p>
              <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-1.5 text-sm">
                <TrendingUp className={cn("w-4 h-4", worth ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("font-semibold", worth ? "text-foreground" : "text-muted-foreground")}>
                  {worth ? "+" : ""}
                  {eur(net)} netto
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        Die Ersparnis bezieht sich auf deinen Einkauf über Alex Autoshop. Jahresersparnis bei Level 3:
        bis zu <span className="font-semibold text-foreground">{eur(total * 0.46 * 12)}</span>.
      </p>
    </div>
  );
}
