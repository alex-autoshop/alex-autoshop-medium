import { useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { aboGruppen } from "../../shared/abo-kategorien.js";
import { cn } from "@/lib/utils";

export interface AboKatalogProdukt {
  id?: string;
  handle?: string;
  productType?: string;
}

function schieben(el: HTMLDivElement | null, richtung: number) {
  if (!el) return;
  const ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollBy({
    left: richtung * Math.max(220, el.clientWidth * 0.8),
    behavior: ruhig ? "auto" : "smooth",
  });
}

function Reihe({ titel, kinder }: { titel: string; kinder: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <section aria-label={titel} className="relative">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h4 className="text-sm font-semibold">{titel}</h4>
        <div className="hidden md:flex lg:hidden gap-1">
          <button
            type="button"
            className="w-11 h-11 rounded-full border border-border bg-card inline-flex items-center justify-center hover:border-primary"
            aria-label={`${titel} zurück`}
            onClick={() => schieben(ref.current, -1)}
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="w-11 h-11 rounded-full border border-border bg-card inline-flex items-center justify-center hover:border-primary"
            aria-label={`${titel} weiter`}
            onClick={() => schieben(ref.current, 1)}
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div
        ref={ref}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-pl-1 pb-1 no-scrollbar lg:grid lg:grid-cols-3 lg:overflow-visible lg:snap-none lg:pb-0 xl:grid-cols-4"
      >
        {kinder}
      </div>
    </section>
  );
}

export function AboProduktKatalog<T extends AboKatalogProdukt>({
  produkte,
  kategorie,
  onKategorie,
  karte,
}: {
  produkte: T[];
  kategorie: string;
  onKategorie: (id: string) => void;
  karte: (produkt: T) => ReactNode;
}) {
  const gruppen = aboGruppen(produkte);
  const sichtbar = kategorie === "alle" ? gruppen : gruppen.filter((g) => g.id === kategorie);
  const chips = [{ id: "alle", label: "Alle" }, ...gruppen.map((g) => ({ id: g.id, label: g.label }))];

  return (
    <div>
      <div className="sticky top-20 sm:top-24 z-20 -mx-5 sm:-mx-6 px-5 sm:px-6 py-2 bg-card/95 backdrop-blur-sm border-b border-border/60">
        <div role="tablist" aria-label="Produktkategorien" className="flex gap-2 overflow-x-auto no-scrollbar">
          {chips.map((chip) => {
            const aktiv = kategorie === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                role="tab"
                aria-selected={aktiv}
                onClick={() => onKategorie(chip.id)}
                className={cn(
                  "shrink-0 rounded-full border px-3 min-h-11 text-sm font-semibold",
                  aktiv ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary"
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {sichtbar.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6">In dieser Kategorie ist nichts dabei.</p>
      ) : (
        <div className="space-y-5 pt-4">
          {sichtbar.map((gruppe) => (
            <Reihe key={gruppe.id} titel={gruppe.label} kinder={
              gruppe.produkte.map((produkt) => (
                <div
                  key={produkt.id || produkt.handle || gruppe.id}
                  className="snap-start shrink-0 w-[78%] max-w-[17rem] lg:w-auto lg:max-w-none lg:shrink"
                >
                  {karte(produkt)}
                </div>
              ))
            } />
          ))}
        </div>
      )}
    </div>
  );
}
