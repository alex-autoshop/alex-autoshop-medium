import { cn } from "@/lib/utils";

export function MarkenLeiste({
  marken,
  wert,
  onWahl,
  label,
}: {
  marken: { name: string; anzahl: number }[];
  /** Leer = Alle. */
  wert: string;
  onWahl: (name: string) => void;
  label: string;
}) {
  if (marken.length === 0) return null;
  const gesamt = marken.reduce((s, m) => s + m.anzahl, 0);
  const chip = (name: string, anzahl: number, aktiv: boolean, wahl: string) => (
    <button
      key={name}
      type="button"
      aria-pressed={aktiv}
      onClick={() => onWahl(aktiv && name !== "Alle" ? "" : wahl)}
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
      {chip("Alle", gesamt, !wert, "")}
      {marken.map((m) => chip(m.name, m.anzahl, wert === m.name, m.name))}
    </div>
  );
}
