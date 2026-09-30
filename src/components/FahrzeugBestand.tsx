import { useMemo, useState, useCallback } from "react";
import { SlidersHorizontal, X, Heart, LayoutGrid, Car } from "lucide-react";
import { FAHRZEUGE } from "@/data/fahrzeuge";
import {
  LEERER_FILTER, SORTIERUNGEN, filtern, sortieren, filterAktiv,
  type Filter, type Sortierung,
} from "@/lib/fahrzeugFilter";
import { FahrzeugFilter, AktiveFilter } from "@/components/FahrzeugFilter";
import { FahrzeugKarte } from "@/components/FahrzeugKarte";
import { VergleichsLeiste, VergleichsAnsicht, VERGLEICH_MAX } from "@/components/FahrzeugVergleich";
import { useMerkliste } from "@/hooks/useMerkliste";
import { cn } from "@/lib/utils";

export { euro, km, preisText } from "@/lib/fahrzeugFilter";
export { FahrzeugKarte } from "@/components/FahrzeugKarte";

export function FahrzeugBestand({ nurGemerkt = false }: { nurGemerkt?: boolean }) {
  const [filter, setFilter] = useState<Filter>({ ...LEERER_FILTER, nurGemerkt });
  const [sortierung, setSortierung] = useState<Sortierung>("empfohlen");
  const [schubladeOffen, setSchubladeOffen] = useState(false);
  const [vergleich, setVergleich] = useState<string[]>([]);
  const [vergleichOffen, setVergleichOffen] = useState(false);
  const { liste: gemerkt, umschalten: merken } = useMerkliste();

  const liste = useMemo(
    () => sortieren(filtern(FAHRZEUGE, filter, gemerkt), sortierung),
    [filter, gemerkt, sortierung]
  );

  const zuruecksetzen = useCallback(() => setFilter({ ...LEERER_FILTER, nurGemerkt }), [nurGemerkt]);

  const vergleichUmschalten = useCallback((slug: string) => {
    setVergleich((v) =>
      v.includes(slug) ? v.filter((s) => s !== slug) : v.length >= VERGLEICH_MAX ? v : [...v, slug]
    );
  }, []);

  const aktiv = filterAktiv({ ...filter, nurGemerkt: filter.nurGemerkt && !nurGemerkt });

  return (
    <section
      id="bestand"
      className={cn("container py-10 sm:py-16 scroll-mt-24", vergleich.length > 0 && "pb-32 sm:pb-36")}
    >
      {/* Kopf */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-primary font-semibold uppercase tracking-wide text-sm mb-2">
            {nurGemerkt ? "Deine Merkliste" : "Unser Bestand"}
          </p>
          <h2 className="text-2xl sm:text-4xl leading-tight">
            {liste.length} {liste.length === 1 ? "Fahrzeug" : "Fahrzeuge"}{" "}
            <span className="text-primary">{nurGemerkt ? "gemerkt" : "sofort verfügbar"}</span>
          </h2>
          {!nurGemerkt && (
            <p className="text-muted-foreground mt-2">
              Alle Fahrzeuge stehen bei uns in Wuppertal — Probefahrt jederzeit möglich.
            </p>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground whitespace-nowrap">Sortieren</span>
          <select
            value={sortierung}
            onChange={(e) => setSortierung(e.target.value as Sortierung)}
            className="input-base w-auto min-h-[44px] py-0 pr-8"
          >
            {SORTIERUNGEN.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
      </div>

      <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-8 items-start">
        {/* Seitenleiste — am Handy als Schublade */}
        <aside className="hidden lg:block lg:sticky lg:top-40 lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto pr-1">
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <h3 className="font-display font-bold">Filter</h3>
            {aktiv && (
              <button onClick={zuruecksetzen} className="ml-auto text-xs text-primary underline min-h-[32px]">
                zurücksetzen
              </button>
            )}
          </div>
          <FahrzeugFilter alle={FAHRZEUGE} filter={filter} setFilter={setFilter} gemerkt={gemerkt} />
        </aside>

        <div>
          {/* Werkzeugleiste am Handy */}
          <div className="flex items-center gap-2 mb-4 lg:hidden">
            <button
              type="button"
              onClick={() => setSchubladeOffen(true)}
              className="btn-outline flex-1 min-h-[48px]"
            >
              <SlidersHorizontal className="w-5 h-5" /> Filter
              {aktiv && <span className="ml-1 rounded-full bg-primary text-primary-foreground text-xs px-2 py-0.5">an</span>}
            </button>
            {!nurGemerkt && (
              <button
                type="button"
                onClick={() => setFilter({ ...filter, nurGemerkt: !filter.nurGemerkt })}
                aria-pressed={filter.nurGemerkt}
                className={cn("btn-outline min-h-[48px] px-4", filter.nurGemerkt && "border-primary text-primary")}
              >
                <Heart className={cn("w-5 h-5", filter.nurGemerkt && "fill-primary")} />
                {gemerkt.length > 0 && <span className="tabular-nums">{gemerkt.length}</span>}
              </button>
            )}
          </div>

          <AktiveFilter filter={filter} setFilter={setFilter} zuruecksetzen={zuruecksetzen} />

          {liste.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border rounded-2xl">
              {nurGemerkt || filter.nurGemerkt ? (
                <>
                  <Heart className="w-8 h-8 text-muted-foreground/40 mx-auto mb-4" />
                  <p className="text-lg mb-2">Noch nichts gemerkt.</p>
                  <p className="text-muted-foreground mb-6">
                    Tippe bei einem Fahrzeug auf das Herz, dann liegt es hier.
                  </p>
                </>
              ) : (
                <>
                  <Car className="w-8 h-8 text-muted-foreground/40 mx-auto mb-4" />
                  <p className="text-lg mb-2">Kein Fahrzeug passt zu diesen Filtern.</p>
                  <p className="text-muted-foreground mb-6">
                    Nimm einen Filter weg — oder ruf an, wir haben laufend Zulauf.
                  </p>
                </>
              )}
              <button onClick={zuruecksetzen} className="btn-outline">Filter zurücksetzen</button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {liste.map((f) => (
                <FahrzeugKarte
                  key={f.slug}
                  f={f}
                  gemerkt={gemerkt.includes(f.slug)}
                  aufMerken={merken}
                  imVergleich={vergleich.includes(f.slug)}
                  aufVergleich={vergleichUmschalten}
                  vergleichVoll={vergleich.length >= VERGLEICH_MAX}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filter-Schublade am Handy */}
      {schubladeOffen && (
        <div className="fixed inset-0 z-[90] lg:hidden" role="dialog" aria-label="Filter">
          <div className="absolute inset-0 bg-night/60 backdrop-blur-sm" onClick={() => setSchubladeOffen(false)} />
          <div className="absolute inset-y-0 right-0 w-[min(92vw,380px)] bg-background shadow-2xl flex flex-col animate-fade-up">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
              <h3 className="font-display font-bold text-lg flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-primary" /> Filter
              </h3>
              <button
                type="button"
                onClick={() => setSchubladeOffen(false)}
                aria-label="Filter schließen"
                className="w-11 h-11 rounded-lg flex items-center justify-center hover:bg-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <FahrzeugFilter alle={FAHRZEUGE} filter={filter} setFilter={setFilter} gemerkt={gemerkt} />
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-3">
              <button onClick={zuruecksetzen} className="btn-outline flex-1">Zurücksetzen</button>
              <button onClick={() => setSchubladeOffen(false)} className="btn-primary flex-1">
                {liste.length} zeigen
              </button>
            </div>
          </div>
        </div>
      )}

      <VergleichsLeiste
        slugs={vergleich}
        entfernen={vergleichUmschalten}
        leeren={() => setVergleich([])}
        oeffnen={() => setVergleichOffen(true)}
      />
      {vergleichOffen && (
        <VergleichsAnsicht
          slugs={vergleich}
          schliessen={() => setVergleichOffen(false)}
          entfernen={(s) => {
            const rest = vergleich.filter((x) => x !== s);
            setVergleich(rest);
            if (rest.length < 2) setVergleichOffen(false);
          }}
        />
      )}
    </section>
  );
}
