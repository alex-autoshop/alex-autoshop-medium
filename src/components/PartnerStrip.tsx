import { motion } from "framer-motion";
import { Truck, Store } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Leiste unter der Teilebörse.
 *
 * TecDoc-Katalog, Live-Preise und Bestand, Abholung in Wuppertal.
 * Der Name der Bezugsquelle bleibt unsichtbar. Fremde Logos bleiben tabu.
 */

export interface PartnerEntry {
  name: string;
  note: string;
}

const FAKTEN: PartnerEntry[] = [
  { name: "TecDoc-Katalog", note: "Fahrzeug und Teilenummer" },
  { name: "Live-Bestand", note: "sofort abgefragt" },
  { name: "Live-Preise", note: "ein Preis für alle" },
  { name: "Abholung", note: "Wuppertal, Handelstraße" },
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
            Preise und Bestand live
          </p>
        </div>
        <p className="text-center text-xs text-muted-foreground mb-4">
          Der Teilekatalog kommt von TecDoc. Preis und Lagerbestand sind live — eine Quelle, kein Vergleich mit anderen Händlern.
        </p>

        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
          {FAKTEN.map((p, i) => <Chip key={p.name} p={p} i={i} tone="gold" />)}
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
