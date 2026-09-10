import { useState } from "react";
import { Layers, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Brücke von der Teilesuche in den Original-Katalog.
 *
 * Vorher lag der Einstieg zu den Explosionszeichnungen als Kachel auf der
 * Startseite der Teilebörse — also genau dort, wo man sie noch nicht braucht,
 * und unsichtbar, sobald ein Fahrzeug gewählt ist. Diese Leiste sitzt beim
 * angeklickten Teil.
 *
 * Ohne FIN wird der Weg nicht versteckt, sondern es wird nach ihr gefragt:
 * an der Stelle, an der klar ist, wofür sie gut ist.
 */
export function OemDrawingBar({
  vin,
  onOpen,
  onVin,
}: {
  /** Fahrgestellnummer, falls bekannt. */
  vin?: string;
  /** Katalog öffnen (FIN liegt vor). */
  onOpen: () => void;
  /** FIN nachgereicht — Seite übernimmt sie und öffnet den Katalog. */
  onVin: (vin: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");
  // Im Fahrzeugschein steht die FIN oft gruppiert. Leerzeichen und Bindestriche
  // fliegen deshalb schon beim Tippen raus — sonst erreicht niemand die 17.
  const ok = val.length === 17;

  if (vin) {
    return (
      <button
        onClick={onOpen}
        className="w-full flex items-center gap-2 px-4 py-2.5 border-b border-border bg-primary/8 hover:bg-primary/14 transition-colors text-left"
      >
        <Layers className="w-4 h-4 text-primary shrink-0" />
        <span className="flex-1 text-[13px] font-semibold">Explosionszeichnung ansehen</span>
        <ChevronRight className="w-4 h-4 text-primary shrink-0" />
      </button>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-4 py-2.5 border-b border-border bg-secondary/50 hover:bg-secondary transition-colors text-left"
      >
        <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="flex-1 text-[12px] text-muted-foreground leading-snug">
          <span className="font-semibold text-foreground">Explosionszeichnung</span> — mit der
          Fahrgestellnummer zeigen wir dir die Original-Zeichnung zu diesem Teil.
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>
    );
  }

  return (
    <div className="px-4 py-3 border-b border-border bg-secondary/50">
      <div className="flex items-center gap-2 mb-2">
        <Layers className="w-4 h-4 text-primary shrink-0" />
        <p className="text-[12px] font-semibold flex-1">Fahrgestellnummer eingeben</p>
        <button
          onClick={() => setOpen(false)}
          className="w-6 h-6 rounded-md hover:bg-background flex items-center justify-center text-muted-foreground"
          aria-label="Schließen"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (ok) onVin(val);
        }}
        className="flex gap-2"
      >
        <input
          value={val}
          onChange={(e) => setVal(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17))}
          placeholder="17 Zeichen, z.B. W0LSE9E…"
          inputMode="text"
          autoCapitalize="characters"
          spellCheck={false}
          autoFocus
          className="flex-1 min-w-0 h-10 px-3 rounded-lg border border-border bg-card text-[13px] font-mono uppercase focus:outline-none focus:border-primary/60"
        />
        <span className="self-center text-[11px] tabular-nums text-muted-foreground shrink-0 w-10 text-right">
          {val.length}/17
        </span>
        <button
          type="submit"
          disabled={!ok}
          className={cn(
            "px-3 h-10 rounded-lg text-[12px] font-bold shrink-0 transition-colors",
            ok
              ? "bg-primary text-primary-foreground hover:bg-gold-deep"
              : "bg-secondary text-muted-foreground/60 cursor-not-allowed"
          )}
        >
          Zeigen
        </button>
      </form>
      <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
        Steht im Fahrzeugschein unter <strong className="text-foreground">E</strong>. Nur damit kennt
        der Hersteller-Katalog die genaue Ausstattung deines Fahrzeugs.
      </p>
    </div>
  );
}
