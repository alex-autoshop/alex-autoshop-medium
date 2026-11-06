import { cn } from "@/lib/utils";
import { markeAktiv } from "@/lib/marken";

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
        if (!wahl || (!mehrfach && aktiv)) onWahl("");
        else onWahl(wahl);
      }}
      className={cn(
        "shrink-0 inline-flex items-center gap-1 rounded-full border px-3 min-h-10 text-xs font-semibold",
        aktiv ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary"
      )}
    >
      {name}
      <span className={cn("tabular-nums font-medium", aktiv ? "text-primary-foreground/80" : "text-muted-foreground")}>{anzahl}</span>
    </button>
  );
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar" role="group" aria-label={label}>
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
