import { motion } from "framer-motion";
import { Truck, Store } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Leiste mit unseren Bezugsquellen und Verkaufskanälen.
 *
 * WICHTIG: Die NAMEN unserer Teile-Lieferanten werden bewusst NICHT genannt
 * (Alex, 17.08.2026) — sie sind unser Wettbewerbsvorteil, sobald die Teilebörse
 * live Preise aus mehreren Quellen vergleicht. Stattdessen steht dort die
 * Leistung: wie viele Quellen wir vergleichen und was der Kunde davon hat.
 * Auf `SHOW_SOURCE_NAMES = true` stellen, falls die Namen doch erscheinen sollen.
 *
 * Fremde LOGOS bleiben tabu — die brauchen immer die Freigabe des Marken-
 * inhabers (ausdrückliche Ansage von DS Color). Namen in Schriftform wären ok.
 */

/** Namen der Teile-Lieferanten anzeigen? Bewusst aus. */
const SHOW_SOURCE_NAMES = false;

/** Anzahl der Quellen, die wir bei jeder Anfrage vergleichen. */
export const SOURCE_COUNT = 7;

export interface PartnerEntry {
  name: string;
  note: string;
}

/** Woher wir Teile beziehen. */
export const SOURCING: PartnerEntry[] = [
  { name: "Inter Cars", note: "Teile-Großhandel" },
  { name: "PV Automotive", note: "Großhandel" },
  { name: "WM SE", note: "Großhandel" },
  { name: "Tyre24 · Azura", note: "Teile & Reifen" },
  { name: "Motorintegrator", note: "Teile-Plattform" },
  { name: "kfzteile24", note: "Teile-Portal" },
  { name: "autoteile-markt.de", note: "Teile-Portal" },
];

/** Was der Kunde davon hat — ohne unsere Quellen zu verraten. */
export const ANONYM: PartnerEntry[] = [
  { name: `${SOURCE_COUNT} Quellen`, note: "gleichzeitig abgefragt" },
  { name: "Live-Preise", note: "kein veralteter Katalog" },
  { name: "Echtzeit-Bestand", note: "nur was wirklich da ist" },
  { name: "Bester Preis", note: "automatisch gewählt" },
  { name: "Original & Ersatz", note: "beide Qualitäten" },
];

/** Wo man uns ausserdem findet. */
export const CHANNELS: PartnerEntry[] = [
  { name: "eBay", note: "Verkaufskanal" },
  { name: "Kleinanzeigen", note: "Verkaufskanal" },
];

function Chip({ p, i, tone }: { p: PartnerEntry; i: number; tone: "gold" | "neutral" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.4) }}
      className={cn(
        "group flex flex-col items-center justify-center px-3 py-2 rounded-xl border bg-card transition-colors",
        tone === "gold"
          ? "border-border hover:border-primary/50"
          : "border-border/70 hover:border-foreground/25"
      )}
    >
      <span className="text-[13px] font-bold tracking-tight whitespace-nowrap">{p.name}</span>
      <span className="text-[9.5px] uppercase tracking-wider text-muted-foreground/70 whitespace-nowrap">
        {p.note}
      </span>
    </motion.div>
  );
}

export function PartnerStrip({ className }: { className?: string }) {
  return (
    <section className={cn("max-w-6xl mx-auto", className)}>
      <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm px-5 py-5">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Truck className="w-4 h-4 text-primary" />
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {SHOW_SOURCE_NAMES ? "Beschaffung über unsere Partner" : `Preisvergleich über ${SOURCE_COUNT} Quellen`}
          </p>
        </div>
        <p className="text-center text-xs text-muted-foreground mb-4">
          {SHOW_SOURCE_NAMES
            ? "Wir kaufen bei mehreren Großhändlern und Plattformen gleichzeitig ein — deshalb finden wir fast jedes Teil, oft am selben Tag."
            : `Für jedes Teil fragen wir ${SOURCE_COUNT} Großhändler und Plattformen gleichzeitig ab und zeigen dir den besten Preis — du musst nirgendwo sonst vergleichen.`}
        </p>

        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
          {SHOW_SOURCE_NAMES
            ? SOURCING.map((p, i) => <Chip key={p.name} p={p} i={i} tone="gold" />)
            : ANONYM.map((p, i) => <Chip key={p.name} p={p} i={i} tone="gold" />)}
        </div>

        <div className="flex items-center gap-3 my-4">
          <span className="h-px flex-1 bg-border" />
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            <Store className="w-3.5 h-3.5" /> Auch zu finden auf
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {CHANNELS.map((p, i) => (
            <Chip key={p.name} p={p} i={i} tone="neutral" />
          ))}
        </div>
      </div>
    </section>
  );
}
