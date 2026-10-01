import { useState } from "react";
import { motion } from "framer-motion";
import { BadgeEuro, CalendarCheck, Zap, SlidersHorizontal, ArrowRight, Info } from "lucide-react";

/* ------------------------------------------------------------------ *
 *  Rechenregeln
 *
 *  Abgeleitet aus den oeffentlichen Angaben des Finanzierungspartners:
 *  bis zum Zweifachen des Monatsumsatzes, abhaengig davon, wie lange es
 *  den Betrieb gibt. Zwei belegte Stuetzpunkte:
 *    12 Monate Laufzeit, 12.500 Umsatz  ->  16.250  (Faktor 1,30)
 *    "bis zum Zweifachen des Monatsumsatzes" als Obergrenze
 *  Dazwischen linear, oberhalb gedeckelt.
 *
 *  ACHTUNG: Sobald der Finanzierungspartner die echte Angebotsmatrix
 *  liefert, werden GENAU diese Konstanten ersetzt — sonst nichts.
 * ------------------------------------------------------------------ */
const MIN_MONATE = 3;          // darunter gibt es kein Angebot
const MIN_UMSATZ = 1500;       // monatlich, darunter ebenfalls nicht
const FAKTOR_START = 0.9;      // bei 3 Monaten
const FAKTOR_MITTE = 1.3;      // bei 12 Monaten
const FAKTOR_MAX = 2.0;        // ab 36 Monaten, zugleich Obergrenze

export function faktor(monate: number): number {
  if (monate < MIN_MONATE) return 0;
  if (monate <= 12) return FAKTOR_START + ((FAKTOR_MITTE - FAKTOR_START) * (monate - MIN_MONATE)) / (12 - MIN_MONATE);
  if (monate >= 36) return FAKTOR_MAX;
  return FAKTOR_MITTE + ((FAKTOR_MAX - FAKTOR_MITTE) * (monate - 12)) / 24;
}

/** Auf 50er runden, damit keine krummen Zahlen wie 16.237 € entstehen. */
export function summe(umsatz: number, monate: number): number {
  const roh = umsatz * faktor(monate);
  return Math.round(roh / 50) * 50;
}

const euro = (n: number) => n.toLocaleString("de-DE") + " €";

const VORTEILE = [
  { icon: BadgeEuro, titel: "Klarer Preis", text: "Keine Zinsen, sondern eine feste Gebühr, die vor der Unterschrift feststeht." },
  { icon: CalendarCheck, titel: "Keine dicke Monatsrate", text: "Die Rückzahlung läuft anteilig mit dem Umsatz mit, nicht gegen ihn." },
  { icon: Zap, titel: "Schneller als die Bank", text: "Entscheidung meist innerhalb eines Werktages, Auszahlung in wenigen Tagen." },
  { icon: SlidersHorizontal, titel: "Passend zum Betrieb", text: "Bis zum Zweifachen eines Monatsumsatzes — je länger es den Betrieb gibt, desto mehr." },
];

function dauerText(m: number): string {
  if (m < 24) return `${m} Monate`;
  const j = Math.floor(m / 12);
  const r = m % 12;
  if (m >= 60) return "5 Jahre oder länger";
  return r === 0 ? `${j} Jahre` : `${j} Jahre, ${r} Mon.`;
}

function Regler({
  label, wert, anzeige, min, max, schritt, onChange,
}: {
  label: string; wert: number; anzeige: string;
  min: number; max: number; schritt: number; onChange: (n: number) => void;
}) {
  const anteil = ((wert - min) / (max - min)) * 100;
  return (
    <div className="py-4">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="font-display font-bold tabular-nums">{anzeige}</span>
      </div>
      <input
        type="range" min={min} max={max} step={schritt} value={wert}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-border
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary
          [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background
          [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab
          [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background
          [&::-moz-range-thumb]:cursor-grab"
        style={{ background: `linear-gradient(to right, hsl(var(--primary)) ${anteil}%, hsl(var(--border)) ${anteil}%)` }}
      />
    </div>
  );
}

export function UmsatzRechner({ zielId = "schnellfinanzierung-formular" }: { zielId?: string }) {
  const [umsatz, setUmsatz] = useState(12500);
  const [monate, setMonate] = useState(12);

  const reicht = monate >= MIN_MONATE && umsatz >= MIN_UMSATZ;
  const betrag = reicht ? summe(umsatz, monate) : 0;

  return (
    <div className="grid lg:grid-cols-[1fr_minmax(0,460px)_1fr] gap-6 lg:gap-8 items-center">
      {/* linke Vorteile — auf dem Handy wandern alle vier unter die Karte */}
      <div className="hidden lg:flex flex-col gap-10">
        {VORTEILE.slice(0, 2).map((v) => <Vorteil key={v.titel} {...v} />)}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }}
        className="rounded-3xl border border-border bg-card shadow-lg overflow-hidden order-first lg:order-none"
      >
        <div className="p-6 sm:p-7 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <span className="text-sm text-muted-foreground leading-snug max-w-[9rem]">
              Du könntest finanziert werden bis zu
            </span>
            <span className="font-display font-bold text-3xl sm:text-[2.6rem] leading-none tabular-nums text-right">
              {reicht ? <>{euro(betrag)}<span className="text-primary align-super text-base">*</span></> : "—"}
            </span>
          </div>
        </div>

        <div className="px-6 sm:px-7 py-4 border-b border-border flex items-baseline justify-between gap-3">
          <span className="text-sm text-primary font-semibold">Du zahlst zurück</span>
          <span className="text-sm text-right">
            {reicht ? <>{euro(betrag)}<span className="text-primary align-super">*</span> + feste Gebühr</> : "—"}
          </span>
        </div>

        <div className="px-6 sm:px-7 pt-2 pb-6 sm:pb-7">
          <Regler
            label="Monatsumsatz deines Betriebs" wert={umsatz} anzeige={euro(umsatz)}
            min={1000} max={150000} schritt={500} onChange={setUmsatz}
          />
          <Regler
            label="So lange gibt es den Betrieb" wert={monate} anzeige={dauerText(monate)}
            min={0} max={60} schritt={1} onChange={setMonate}
          />

          {!reicht && (
            <p className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed mt-2 mb-4">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              {monate < MIN_MONATE
                ? "Für diese Finanzierung muss der Betrieb mindestens drei Monate laufen. Ruf trotzdem an — für Gründungen gibt es eigene Programme."
                : "Unter 1.500 € Monatsumsatz greift dieses Produkt nicht. Ein Förderprogramm kann trotzdem passen."}
            </p>
          )}

          <a href={`#${zielId}`} className="btn-primary w-full mt-4">
            Unverbindlich anfragen <ArrowRight className="w-5 h-5" />
          </a>
          <p className="text-xs text-muted-foreground text-center mt-4 leading-relaxed">
            * Nur eine Orientierung, kein Angebot. Was wirklich geht, sagt dir die Prüfung —
            dafür brauchen wir deine Zahlen.
          </p>
        </div>
      </motion.div>

      <div className="hidden lg:flex flex-col gap-10">
        {VORTEILE.slice(2).map((v) => <Vorteil key={v.titel} {...v} />)}
      </div>

      {/* Handy und Tablet: alle vier Vorteile unter der Karte */}
      <div className="grid sm:grid-cols-2 gap-6 lg:hidden">
        {VORTEILE.map((v) => <Vorteil key={v.titel} {...v} />)}
      </div>
    </div>
  );
}

function Vorteil({ icon: Icon, titel, text }: { icon: typeof BadgeEuro; titel: string; text: string }) {
  return (
    <div className="text-center lg:px-2">
      <div className="w-12 h-12 rounded-full border border-primary/30 bg-primary/5 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h3 className="text-base mb-1.5">{titel}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}
