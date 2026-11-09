import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { markeAktiv, markenSlug } from "@/lib/marken";

export function MarkenLeiste({
  marken,
  wert = "",
  werte,
  onWahl,
  label,
  mitAlle = true,
}: {
  marken: { name: string; anzahl: number }[];
  /** Einzelauswahl. Leer = Alle. */
  wert?: string;
  /** Mehrfachauswahl. Hat Vorrang vor `wert`. */
  werte?: string[];
  onWahl: (name: string) => void;
  label: string;
  mitAlle?: boolean;
}) {
  const leiste = useRef<HTMLDivElement>(null);
  const zuletzt = useRef("");
  const auswahl = Array.isArray(werte) ? werte.join("|") : wert;
  const ersteWahl = Array.isArray(werte) ? (werte[0] || "") : wert;
  useEffect(() => {
    const root = leiste.current;
    const name = zuletzt.current || ersteWahl;
    if (!root || !name) return;
    const ziel = markenSlug(name);
    const knopf = [...root.querySelectorAll("button")].find((b) => {
      const roh = (b.textContent || "").replace(/\s+\d+\s*$/, "").trim();
      return roh === name || markenSlug(roh) === ziel;
    });
    if (!knopf) return;
    const links = knopf.getBoundingClientRect().left - root.getBoundingClientRect().left + root.scrollLeft;
    const rechts = links + knopf.offsetWidth;
    if (links < root.scrollLeft - 1) root.scrollLeft = links;
    else if (rechts > root.scrollLeft + root.clientWidth + 1) root.scrollLeft = rechts - root.clientWidth;
  }, [auswahl, ersteWahl]);

  if (marken.length === 0) return null;
  const mehrfach = Array.isArray(werte);
  const gesamt = marken.reduce((s, m) => s + m.anzahl, 0);
  const alleAktiv = mehrfach ? werte.length === 0 : !wert;
  const chip = (name: string, anzahl: number, aktiv: boolean, wahl: string) => (
    <button
      key={name}
      type="button"
      aria-pressed={aktiv}
      onClick={() => {
        zuletzt.current = wahl || "Alle";
        if (!wahl || (!mehrfach && aktiv)) onWahl("");
        else onWahl(wahl);
      }}
      className={cn(
        "shrink-0 snap-start inline-flex items-center gap-1 rounded-full border px-3 min-h-10 text-xs font-semibold",
        aktiv ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary"
      )}
    >
      {name}
      <span className={cn("tabular-nums font-medium", aktiv ? "text-primary-foreground/80" : "text-muted-foreground")}>{anzahl}</span>
    </button>
  );
  return (
    <div ref={leiste} className="flex w-full min-w-0 gap-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain snap-x snap-mandatory no-scrollbar" role="group" aria-label={label}>
      {mitAlle && chip("Alle", gesamt, alleAktiv, "")}
      {marken.map((m) => chip(
        m.name,
        m.anzahl,
        mehrfach ? markeAktiv(werte, m.name) : Boolean(wert) && markeAktiv([wert], m.name),
        m.name,
      ))}
    </div>
  );
}
