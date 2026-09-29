import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Gauge, Calendar, Fuel, Cog, Users, ArrowRight, SlidersHorizontal, AlertTriangle, ChevronDown } from "lucide-react";
import { FAHRZEUGE, MARKEN, tuevAbgelaufen, type Fahrzeug } from "@/data/fahrzeuge";
import { cn } from "@/lib/utils";

export const euro = (n: number) => n.toLocaleString("de-DE") + " €";
export const km = (n: number) => n.toLocaleString("de-DE") + " km";

type Sortierung = "neu" | "preis-auf" | "preis-ab" | "km-auf";

const SORTIERUNGEN: { id: Sortierung; label: string }[] = [
  { id: "neu", label: "Empfohlen" },
  { id: "preis-auf", label: "Preis aufsteigend" },
  { id: "preis-ab", label: "Preis absteigend" },
  { id: "km-auf", label: "Kilometer aufsteigend" },
];

const ALLE = "Alle";

function Merkmal({ icon: Icon, children }: { icon: typeof Gauge; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
      <Icon className="w-3.5 h-3.5 text-primary/70 shrink-0" />
      {children}
    </span>
  );
}

export function FahrzeugKarte({ f }: { f: Fahrzeug }) {
  const tuevWeg = tuevAbgelaufen(f.tuev);
  return (
    <Link to={`/fahrzeugboerse/${f.slug}`} className="card-tilt overflow-hidden flex flex-col group">
      <div className="relative bg-night">
        <img
          src={f.bild}
          alt={f.titel}
          loading="lazy"
          width={880}
          height={458}
          className="w-full h-auto block transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {f.ersteHand && (
          <span className="absolute top-3 right-3 rounded-lg bg-gold-bright text-night text-[11px] font-extrabold uppercase tracking-wide px-2 py-1">
            1. Hand
          </span>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-lg leading-tight mb-1">{f.titel}</h3>
        <p className="text-sm text-muted-foreground mb-3">
          {f.bauart}
          {f.ps ? ` · ${f.ps} PS` : ""}
        </p>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4">
          <Merkmal icon={Gauge}>{km(f.km)}</Merkmal>
          <Merkmal icon={Calendar}>EZ {f.erstzulassung}</Merkmal>
          <Merkmal icon={Fuel}>{f.kraftstoff}</Merkmal>
          <Merkmal icon={Cog}>{f.getriebe === "Automatik" ? "Automatik" : "Schaltung"}</Merkmal>
          {f.sitze >= 7 && <Merkmal icon={Users}>{f.sitze} Sitze</Merkmal>}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-3 border-t border-border">
          <div>
            <p className="text-2xl font-display font-bold text-primary leading-none">{euro(f.preis)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {tuevWeg ? (
                <span className="inline-flex items-center gap-1 text-destructive font-semibold">
                  <AlertTriangle className="w-3 h-3" /> TÜV abgelaufen
                </span>
              ) : (
                <>TÜV {f.tuev}{f.garantieMonate ? ` · ${f.garantieMonate} Mon. Garantie` : ""}</>
              )}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary shrink-0">
            Details <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function FahrzeugBestand() {
  const [marke, setMarke] = useState<string>(ALLE);
  const [kraftstoff, setKraftstoff] = useState<string>(ALLE);
  const [getriebe, setGetriebe] = useState<string>(ALLE);
  const [maxPreis, setMaxPreis] = useState<number>(0);
  const [sortierung, setSortierung] = useState<Sortierung>("neu");
  // Am Handy sind die Autos wichtiger als die Filter — die klappen dort erst auf Tippen auf.
  const [filterOffen, setFilterOffen] = useState(false);

  const hoechsterPreis = useMemo(() => Math.max(...FAHRZEUGE.map((f) => f.preis)), []);
  const grenze = maxPreis || hoechsterPreis;

  const liste = useMemo(() => {
    const gefiltert = FAHRZEUGE.filter(
      (f) =>
        (marke === ALLE || f.marke === marke) &&
        (kraftstoff === ALLE || f.kraftstoff === kraftstoff) &&
        (getriebe === ALLE || f.getriebe === getriebe) &&
        f.preis <= grenze
    );
    const sortiert = [...gefiltert];
    if (sortierung === "neu") sortiert.sort((a, b) => b.preis - a.preis);
    if (sortierung === "preis-auf") sortiert.sort((a, b) => a.preis - b.preis);
    if (sortierung === "preis-ab") sortiert.sort((a, b) => b.preis - a.preis);
    if (sortierung === "km-auf") sortiert.sort((a, b) => a.km - b.km);
    return sortiert;
  }, [marke, kraftstoff, getriebe, grenze, sortierung]);

  const zuruecksetzen = () => {
    setMarke(ALLE); setKraftstoff(ALLE); setGetriebe(ALLE); setMaxPreis(0); setSortierung("neu");
  };
  const gefiltertAktiv = marke !== ALLE || kraftstoff !== ALLE || getriebe !== ALLE || maxPreis > 0;

  return (
    <section id="bestand" className="container py-14 sm:py-20 scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-primary font-semibold uppercase tracking-wide text-sm mb-2">Unser Bestand</p>
          <h2 className="text-2xl sm:text-4xl leading-tight">
            {FAHRZEUGE.length} Fahrzeuge <span className="text-primary">sofort verfügbar</span>
          </h2>
          <p className="text-muted-foreground mt-2">
            Alle Fahrzeuge stehen bei uns in Wuppertal — Probefahrt jederzeit möglich.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Sortieren</span>
          <select
            value={sortierung}
            onChange={(e) => setSortierung(e.target.value as Sortierung)}
            className="input-base w-auto min-h-[44px] py-0 pr-8"
          >
            {SORTIERUNGEN.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Filter */}
      <div className="card-tilt hover:translate-y-0 hover:shadow-card p-4 sm:p-5 mb-8">
        <div className="flex items-center gap-2 text-sm font-semibold sm:mb-3">
          <button
            type="button"
            onClick={() => setFilterOffen((v) => !v)}
            aria-expanded={filterOffen}
            className="flex items-center gap-2 min-h-[44px] sm:pointer-events-none"
          >
            <SlidersHorizontal className="w-4 h-4 text-primary" /> Filter
            {gefiltertAktiv && <span className="text-xs font-medium text-primary">· aktiv</span>}
            <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform sm:hidden", filterOffen && "rotate-180")} />
          </button>
          {gefiltertAktiv && (
            <button onClick={zuruecksetzen} className="ml-auto text-xs font-medium text-primary underline min-h-[44px]">
              zurücksetzen
            </button>
          )}
        </div>
        <div className={cn("gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4", filterOffen ? "grid pt-2" : "hidden")}>
          <label className="block">
            <span className="text-xs text-muted-foreground mb-1 block">Marke</span>
            <select value={marke} onChange={(e) => setMarke(e.target.value)} className="input-base">
              <option>{ALLE}</option>
              {MARKEN.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground mb-1 block">Kraftstoff</span>
            <select value={kraftstoff} onChange={(e) => setKraftstoff(e.target.value)} className="input-base">
              <option>{ALLE}</option>
              <option>Benzin</option>
              <option>Diesel</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground mb-1 block">Getriebe</span>
            <select value={getriebe} onChange={(e) => setGetriebe(e.target.value)} className="input-base">
              <option>{ALLE}</option>
              <option>Schaltgetriebe</option>
              <option>Automatik</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground mb-1 block">
              Preis bis <span className="font-semibold text-foreground">{euro(grenze)}</span>
            </span>
            <input
              type="range"
              min={1000}
              max={hoechsterPreis}
              step={500}
              value={grenze}
              onChange={(e) => setMaxPreis(Number(e.target.value))}
              className="w-full min-h-[48px] accent-primary"
              aria-label="Höchstpreis"
            />
          </label>
        </div>
      </div>

      {liste.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-lg mb-2">Kein Fahrzeug passt zu diesen Filtern.</p>
          <button onClick={zuruecksetzen} className="btn-outline mt-2">Filter zurücksetzen</button>
        </div>
      ) : (
        <>
          <p className={cn("text-sm text-muted-foreground mb-4", !gefiltertAktiv && "sr-only")}>
            {liste.length} von {FAHRZEUGE.length} Fahrzeugen
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {liste.map((f) => <FahrzeugKarte key={f.slug} f={f} />)}
          </div>
        </>
      )}
    </section>
  );
}
