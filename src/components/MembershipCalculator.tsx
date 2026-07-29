import { useMemo, useState } from "react";
import { TrendingUp, CalendarClock, Check } from "lucide-react";
import { MEMBERSHIP_LEVELS, type MembershipLevel } from "@/data/memberships";
import { cn } from "@/lib/utils";

const MAX = 500_000;

const CATEGORIES = [
  { id: "lackfarbe", label: "Lackfarbe" },
  { id: "lackmaterial", label: "Lackmaterial" },
  { id: "fahrzeughandel", label: "Fahrzeughandel-Einkauf" },
  { id: "teile", label: "Teile Anschaffung" },
  { id: "sonstiges", label: "Sonstiges" },
] as const;

// Welches Modul schaltet den Rabatt für welche Ausgaben-Kategorie frei
// ("any" = zählt sobald mind. ein Modul aktiv ist, z.B. allg. Werkstattbedarf)
const CATEGORY_MODULE: Record<string, "Autoteile" | "Lackfarben" | "Lackmaterial" | "any"> = {
  lackfarbe: "Lackfarben",
  lackmaterial: "Lackmaterial",
  fahrzeughandel: "Autoteile",
  teile: "Autoteile",
  sonstiges: "any",
};

const MODULES: { id: string; label: string }[] = [
  { id: "Autoteile", label: "Autoteile" },
  { id: "Lackfarben", label: "Lackfarben" },
  { id: "Lackmaterial", label: "Lackmaterial" },
];

const MONTH_LABELS = ["Vor 3 Monaten", "Vor 2 Monaten", "Letzter Monat"];

const eur = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 0 }) + " €";
const onlyDigits = (s: string) => Number(s.replace(/[^\d]/g, "")) || 0;

type Mode = "simple" | "detailed" | "months";

export function MembershipCalculator() {
  const [mode, setMode] = useState<Mode>("simple");
  const [simpleTotal, setSimpleTotal] = useState(5000);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    teile: true,
    lackmaterial: true,
    lackfarbe: true,
  });
  const [months, setMonths] = useState<number[]>([0, 0, 0]);

  const detailedTotal = useMemo(
    () => CATEGORIES.reduce((sum, c) => sum + (enabled[c.id] ? amounts[c.id] || 0 : 0), 0),
    [amounts, enabled]
  );

  const monthsTotal = months.reduce((a, b) => a + b, 0);

  // "monatlicher" Bezugswert für simple/detailed; bei "months" der 3-Monats-Schnitt.
  const total = mode === "simple" ? simpleTotal : mode === "detailed" ? detailedTotal : monthsTotal / 3;

  return (
    <div className="card-tilt hover:translate-y-0 p-6 sm:p-10 max-w-3xl mx-auto">
      <h2 className="text-2xl mb-2">Lohnt sich das für mich?</h2>
      <p className="text-muted-foreground mb-6">
        Trag deinen Materialeinkauf ein — und sieh schwarz auf weiß, was eine Mitgliedschaft dir spart.
      </p>

      {/* Modus-Umschalter */}
      <div className="grid grid-cols-3 gap-2 mb-6 p-1 bg-secondary rounded-lg">
        {([
          ["simple", "Gesamtausgaben"],
          ["detailed", "Nach Kategorie"],
          ["months", "Letzte 3 Monate"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={cn(
              "min-h-[44px] rounded-md font-semibold text-xs sm:text-sm transition-colors px-1",
              mode === id ? "bg-card shadow-card text-foreground" : "text-muted-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "simple" && (
        <div className="mb-6">
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            Monatliche Werkstatt-Ausgaben
          </label>
          <div className="relative mb-3">
            <input
              type="text"
              inputMode="numeric"
              value={simpleTotal.toLocaleString("de-DE")}
              onChange={(e) => setSimpleTotal(Math.min(MAX, onlyDigits(e.target.value)))}
              className="input-base text-2xl font-display font-bold pr-10 text-right"
              aria-label="Monatliche Ausgaben in Euro"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-display font-bold text-muted-foreground">€</span>
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
      )}

      {mode === "detailed" && (
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
                <span className={cn("flex-1 text-sm font-medium", !on && "text-muted-foreground")}>{c.label}</span>
                <div className="relative w-36">
                  <input
                    type="text"
                    inputMode="numeric"
                    disabled={!on}
                    value={(amounts[c.id] || 0).toLocaleString("de-DE")}
                    onChange={(e) => setAmounts((p) => ({ ...p, [c.id]: Math.min(MAX, onlyDigits(e.target.value)) }))}
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

      {mode === "months" && (
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-3">
            Trag deine Ausgaben der letzten 3 Monate ein — du siehst, was du mit einer Mitgliedschaft
            gespart hättest.
          </p>
          <div className="space-y-2">
            {MONTH_LABELS.map((label, i) => (
              <div key={label} className="flex items-center gap-3 rounded-lg border border-border p-2 pl-3">
                <CalendarClock className="w-4 h-4 text-primary shrink-0" />
                <span className="flex-1 text-sm font-medium">{label}</span>
                <div className="relative w-40">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={(months[i] || 0).toLocaleString("de-DE")}
                    onChange={(e) =>
                      setMonths((p) => p.map((v, j) => (j === i ? Math.min(MAX, onlyDigits(e.target.value)) : v)))
                    }
                    className="input-base text-right pr-7 min-h-[44px]"
                    aria-label={`${label} Betrag`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-3 font-semibold">
            <span>Summe (3 Monate)</span>
            <span className="text-xl font-display">{eur(monthsTotal)}</span>
          </div>
        </div>
      )}

      {/* Ergebnis-Karten — pro Karte die exakte Mitgliedschaft konfigurieren */}
      <p className="text-xs text-muted-foreground mb-2">
        Module je Level an- oder abwählen — Beitrag, Ersparnis und Netto rechnen sich sofort neu.
      </p>
      <div className="grid sm:grid-cols-3 gap-4">
        {MEMBERSHIP_LEVELS.map((m) => (
          <ResultCard
            key={m.level}
            m={m}
            mode={mode}
            simpleTotal={simpleTotal}
            amounts={amounts}
            enabled={enabled}
            months={months}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        {mode === "months"
          ? "So viel hättest du in den letzten 3 Monaten gespart, wenn du deine Lackfarben, Lackmaterialien, Autoteile, Pflegeprodukte und deinen Werkstattbedarf über Alex Autoshop gekauft hättest."
          : "Die Ersparnis gilt auf deinen Einkauf über Alex Autoshop — Lackfarben, Lackmaterial, Autoteile, Pflegeprodukte und Werkstattbedarf. Der Rabatt greift jeweils in den Bereichen deiner gewählten Module."}
      </p>
    </div>
  );
}

function ResultCard({
  m,
  mode,
  simpleTotal,
  amounts,
  enabled,
  months,
}: {
  m: MembershipLevel;
  mode: Mode;
  simpleTotal: number;
  amounts: Record<string, number>;
  enabled: Record<string, boolean>;
  months: number[];
}) {
  const [modules, setModules] = useState<string[]>(m.modules);
  const [wantFreePaint, setWantFreePaint] = useState(true);
  const toggle = (mod: string) =>
    setModules((p) => (p.includes(mod) ? p.filter((x) => x !== mod) : [...p, mod]));

  const isBase = modules.length === 0;
  const noPaint = !modules.includes("Lackfarben") && !modules.includes("Lackmaterial");
  const freePaintOff = noPaint && !wantFreePaint;
  const rate = isBase ? m.baseDiscountPercent : m.discountPercent;

  // Beitrag (gleiche Logik wie auf den Mitgliedschaftskarten)
  const price = useMemo(() => {
    const base = isBase
      ? m.basePrice
      : m.basePrice + modules.reduce((s, mod) => s + (m.modulePrices[mod] ?? 0), 0);
    return Math.max(0, base - (freePaintOff ? m.freePaintValue : 0));
  }, [isBase, modules, freePaintOff, m]);

  // Rabattfähiger Anteil einer Monatsausgabe – abhängig von den aktiven Modulen
  const eligibleLump = (v: number) => (isBase ? v : v * (modules.length / 3));
  const eligibleDetailed = () =>
    CATEGORIES.reduce((s, c) => {
      if (!enabled[c.id]) return s;
      const amt = amounts[c.id] || 0;
      if (isBase) return s + amt; // Basis: Rabatt auf alles
      const map = CATEGORY_MODULE[c.id];
      const active = map === "any" ? modules.length > 0 : modules.includes(map);
      return s + (active ? amt : 0);
    }, 0);

  // Ergebnis je Modus
  const isMonths = mode === "months";
  const perMonthSaved = months.map((v) => eligibleLump(v) * (rate / 100));
  const monthsSaved = perMonthSaved.reduce((a, b) => a + b, 0);
  const eligibleMonthly =
    mode === "simple" ? eligibleLump(simpleTotal) : mode === "detailed" ? eligibleDetailed() : 0;
  const savedPerMonth = eligibleMonthly * (rate / 100);

  const net = isMonths ? monthsSaved - price * 3 : savedPerMonth - price;
  const worth = net > 0;

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        worth ? "border-primary bg-primary/5" : "border-border bg-secondary/50"
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="font-bold">{m.name}</p>
        <span className="text-xs font-semibold text-primary">{rate}%</span>
      </div>
      <p className="text-[11px] text-muted-foreground mb-2">{price} € Beitrag / Monat</p>

      {/* Module – anklickbar */}
      <div className="space-y-1.5 mb-3">
        {MODULES.map((mod) => {
          const on = modules.includes(mod.id);
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => toggle(mod.id)}
              className={cn(
                "w-full flex items-center justify-between px-2.5 py-2 rounded-md border text-[11px] font-medium transition-colors min-h-[40px]",
                on
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-secondary/40 text-muted-foreground/60"
              )}
            >
              <span className={cn("text-left", !on && "line-through")}>{mod.label}</span>
              <span
                className={cn(
                  "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                  on ? "border-primary bg-primary" : "border-muted-foreground/40"
                )}
              >
                {on && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
              </span>
            </button>
          );
        })}

        {/* Gratis-Farbe abwählbar – nur wenn kein Lack-Modul aktiv */}
        {noPaint && (
          <button
            type="button"
            onClick={() => setWantFreePaint((v) => !v)}
            className={cn(
              "w-full flex items-center justify-between px-2.5 py-2 rounded-md border text-[11px] font-medium transition-colors min-h-[40px]",
              wantFreePaint
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-secondary/40 text-muted-foreground/60"
            )}
          >
            <span className={cn("text-left", !wantFreePaint && "line-through")}>Gratis-Farbe</span>
            {wantFreePaint ? (
              <span className="w-4 h-4 rounded-full border border-primary bg-primary flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 text-primary-foreground" />
              </span>
            ) : (
              <span className="text-[10px] font-bold text-muted-foreground/80 shrink-0">
                −{m.freePaintValue} €
              </span>
            )}
          </button>
        )}
      </div>

      {isMonths ? (
        <>
          <div className="space-y-0.5 text-xs text-muted-foreground mb-2">
            {perMonthSaved.map((s, i) => (
              <div key={i} className="flex justify-between">
                <span>{MONTH_LABELS[i]}</span>
                <span className="text-foreground font-medium">{eur(s)}</span>
              </div>
            ))}
          </div>
          <p className="text-2xl font-display font-bold text-primary leading-none">{eur(monthsSaved)}</p>
          <p className="text-xs text-muted-foreground mt-1">in 3 Monaten gespart</p>
        </>
      ) : (
        <>
          <p className="text-2xl font-display font-bold text-primary leading-none">{eur(savedPerMonth)}</p>
          <p className="text-xs text-muted-foreground mt-1">Ersparnis / Monat</p>
        </>
      )}

      <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-1.5 text-sm">
        <TrendingUp className={cn("w-4 h-4", worth ? "text-primary" : "text-muted-foreground")} />
        <span className={cn("font-semibold", worth ? "text-foreground" : "text-muted-foreground")}>
          {worth ? "+" : ""}
          {eur(net)} netto
        </span>
      </div>
    </div>
  );
}
