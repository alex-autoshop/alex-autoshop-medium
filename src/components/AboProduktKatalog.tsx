import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { aboGruppen } from "../../shared/abo-kategorien.js";
import { brandOf, markenZaehlen } from "@/lib/marken";
import { MarkenLeiste } from "@/components/MarkenLeiste";
import { cn } from "@/lib/utils";

export interface AboKatalogProdukt {
  id?: string;
  handle?: string;
  title?: string;
  titel?: string;
  vendor?: string;
  productType?: string;
}

/** Sichtbare Karten pro Schritt. Klein genug, dass ein Schritt den Faden nicht blockiert. */
const SCHRITT = 6;
const ERSTE_REIHEN = 2;

function markeVon(p: AboKatalogProdukt) {
  return brandOf({ node: { title: p.title || p.titel, handle: p.handle || "", vendor: p.vendor } });
}

function schieben(el: HTMLDivElement | null, richtung: number) {
  if (!el) return;
  const ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollBy({
    left: richtung * Math.max(220, el.clientWidth * 0.8),
    behavior: ruhig ? "auto" : "smooth",
  });
}

function passt(p: AboKatalogProdukt, globaleMarke: string, reihenMarke: string) {
  const m = markeVon(p);
  if (globaleMarke && m !== globaleMarke) return false;
  if (reihenMarke && m !== reihenMarke) return false;
  return true;
}

function Reihe({
  titel,
  produkte,
  onAlle,
  marken,
  marke,
  onMarke,
  anfangsZahl,
  startBis = 0,
  startX = 0,
  onStand,
  karte,
}: {
  titel: string;
  produkte: AboKatalogProdukt[];
  onAlle?: () => void;
  marken: { name: string; anzahl: number }[];
  marke: string;
  onMarke: (name: string) => void;
  anfangsZahl: number;
  startBis?: number;
  startX?: number;
  onStand?: (stand: { bis: number; x: number }) => void;
  karte: (produkt: AboKatalogProdukt) => ReactNode;
}) {
  const anfang = Math.max(anfangsZahl, startBis);
  const scroller = useRef<HTMLDivElement>(null);
  const abschnitt = useRef<HTMLElement>(null);
  const mehr = useRef<HTMLDivElement>(null);
  const stand = useRef(onStand);
  stand.current = onStand;
  const [nah, setNah] = useState(anfang > 0);
  const [bis, setBis] = useState(anfang);

  useEffect(() => {
    if (nah) return;
    const el = abschnitt.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNah(true);
      return;
    }
    const beobachter = new IntersectionObserver(([eintrag]) => {
      if (eintrag?.isIntersecting) setNah(true);
    }, { rootMargin: "500px 0px" });
    beobachter.observe(el);
    return () => beobachter.disconnect();
  }, [nah]);

  useEffect(() => {
    if (!nah || bis > 0 || produkte.length === 0) return;
    setBis(Math.min(SCHRITT, produkte.length));
  }, [nah, bis, produkte.length]);

  useEffect(() => {
    stand.current?.({ bis, x: scroller.current?.scrollLeft || startX || 0 });
  }, [bis, startX]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && startX) el.scrollLeft = startX;
  }, [startX]);

  useEffect(() => {
    const el = mehr.current;
    if (!el || bis >= produkte.length || typeof IntersectionObserver === "undefined") return;
    const beobachter = new IntersectionObserver(([eintrag]) => {
      if (!eintrag?.isIntersecting) return;
      setBis((n) => Math.min(produkte.length, n + SCHRITT));
    }, { rootMargin: "240px 280px" });
    beobachter.observe(el);
    return () => beobachter.disconnect();
  }, [bis, produkte.length]);

  const gezeigt = nah ? produkte.slice(0, bis) : [];

  return (
    <section ref={abschnitt} aria-label={titel} className="relative">
      <div className="flex items-end justify-between gap-2 mb-1.5">
        <h4 className="text-lg lg:text-base font-bold leading-tight min-w-0">
          {titel}
          <span className="ml-1.5 text-sm font-semibold text-muted-foreground tabular-nums"> {produkte.length}</span>
        </h4>
        {onAlle && (
          <button
            type="button"
            onClick={onAlle}
            className="shrink-0 text-sm font-semibold text-primary min-h-10 px-1"
          >
            Alle ansehen
          </button>
        )}
        <div className="hidden md:flex lg:hidden gap-1 shrink-0">
          <button
            type="button"
            className="w-11 h-11 rounded-full border border-border bg-card inline-flex items-center justify-center hover:border-primary"
            aria-label={`${titel} zurück`}
            onClick={() => schieben(scroller.current, -1)}
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="w-11 h-11 rounded-full border border-border bg-card inline-flex items-center justify-center hover:border-primary"
            aria-label={`${titel} weiter`}
            onClick={() => schieben(scroller.current, 1)}
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="mb-1.5">
        <MarkenLeiste marken={marken} wert={marke} onWahl={onMarke} label={`Marken in ${titel}`} />
      </div>
      <div
        ref={scroller}
        onScroll={() => stand.current?.({ bis, x: scroller.current?.scrollLeft || 0 })}
        className="flex gap-2 overflow-x-auto snap-x snap-mandatory scroll-pl-1 pb-0.5 items-stretch no-scrollbar lg:grid lg:grid-cols-3 lg:overflow-visible lg:snap-none lg:pb-0 lg:gap-2.5 xl:grid-cols-5"
      >
        {gezeigt.map((produkt) => (
          <div
            key={produkt.id || produkt.handle || titel}
            className="snap-start shrink-0 w-[40%] self-stretch flex lg:w-auto lg:shrink"
          >
            {karte(produkt)}
          </div>
        ))}
        {nah && bis < produkte.length && (
          <div ref={mehr} className="w-px shrink-0 self-stretch lg:col-span-full lg:h-px lg:w-full" aria-hidden />
        )}
      </div>
    </section>
  );
}

export function AboProduktKatalog<T extends AboKatalogProdukt>({
  produkte,
  kategorie,
  onKategorie,
  karte,
  marke: markeProp,
  onMarke,
  geladen,
  onGeladen,
  startReihenMarke,
  onReihenMarke,
}: {
  produkte: T[];
  kategorie: string;
  onKategorie: (id: string) => void;
  karte: (produkt: T) => ReactNode;
  marke?: string;
  onMarke?: (name: string) => void;
  geladen?: Record<string, { bis?: number; x?: number }>;
  onGeladen?: (id: string, stand: { bis: number; x: number }) => void;
  startReihenMarke?: Record<string, string>;
  onReihenMarke?: (marken: Record<string, string>) => void;
}) {
  const [eigeneMarke, setEigeneMarke] = useState("");
  const globaleMarke = onMarke ? (markeProp || "") : eigeneMarke;
  const setGlobaleMarke = (name: string) => {
    if (onMarke) onMarke(name);
    else setEigeneMarke(name);
  };
  const [reihenMarke, setReihenMarke] = useState<Record<string, string>>(startReihenMarke || {});
  const reihenMarkeMelden = useRef(onReihenMarke);
  reihenMarkeMelden.current = onReihenMarke;
  useEffect(() => { reihenMarkeMelden.current?.(reihenMarke); }, [reihenMarke]);
  const gruppen = useMemo(() => aboGruppen(produkte), [produkte]);
  const sichtbar = kategorie === "alle" ? gruppen : gruppen.filter((g) => g.id === kategorie);
  const alleMarken = useMemo(
    () => markenZaehlen(produkte.map((p) => ({ node: { title: p.title || p.titel, handle: p.handle || "", vendor: p.vendor } }))),
    [produkte],
  );
  const chips = useMemo(
    () => [{ id: "alle", label: "Alle" }, ...gruppen.map((g) => ({ id: g.id, label: g.label }))],
    [gruppen],
  );
  const reihen = useMemo(() => sichtbar.map((gruppe) => {
    const wahl = reihenMarke[gruppe.id] || "";
    const liste = (gruppe.produkte as T[]).filter((p) => passt(p, globaleMarke, wahl));
    const marken = markenZaehlen(gruppe.produkte.map((p) => ({
      node: { title: p.title || p.titel, handle: p.handle || "", vendor: p.vendor },
    })));
    return { gruppe, liste, marken, wahl };
  }), [sichtbar, reihenMarke, globaleMarke]);

  return (
    <div>
      <div className="sticky top-20 sm:top-24 z-20 -mx-3 sm:-mx-4 lg:-mx-5 px-3 sm:px-4 lg:px-5 py-2 bg-card/95 backdrop-blur-sm border-b border-border/60">
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
        <div className="mt-2 flex items-center gap-2">
          <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-muted-foreground">Marke</span>
          <div className="min-w-0 flex-1">
          <MarkenLeiste
            marken={alleMarken}
            wert={globaleMarke}
            onWahl={setGlobaleMarke}
            label="Marke für alle Reihen"
          />
          </div>
        </div>
      </div>

      {reihen.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6">In dieser Kategorie ist nichts dabei.</p>
      ) : (
        <div className="space-y-3 pt-2">
          {reihen.map(({ gruppe, liste, marken, wahl }, index) => (
            <Reihe
              key={gruppe.id}
              titel={gruppe.label}
              produkte={liste}
              anfangsZahl={index < ERSTE_REIHEN ? SCHRITT : 0}
              startBis={geladen?.[gruppe.id]?.bis || 0}
              startX={geladen?.[gruppe.id]?.x || 0}
              onStand={onGeladen ? (stand) => onGeladen(gruppe.id, stand) : undefined}
              onAlle={kategorie === "alle" ? () => onKategorie(gruppe.id) : undefined}
              marken={marken}
              marke={wahl}
              onMarke={(name) => setReihenMarke((alt) => ({ ...alt, [gruppe.id]: name }))}
              karte={karte as (produkt: AboKatalogProdukt) => ReactNode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
