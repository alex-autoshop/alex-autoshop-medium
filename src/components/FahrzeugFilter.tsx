import { X, RotateCcw } from "lucide-react";
import { KarosserieSymbol } from "@/components/KarosserieSymbol";
import {
  KATEGORIEN, HOECHSTER_PREIS, MERKMAL_LABEL, anzahlJeKategorie, filtern,
  type Filter, type Merkmal, type Fahrzeug,
} from "@/lib/fahrzeugFilter";
import { euro } from "@/lib/fahrzeugFilter";
import { cn } from "@/lib/utils";

const MERKMALE: Merkmal[] = ["automatik", "allrad", "navi", "klimaautomatik", "sitzheizung", "pdc", "ahk", "tuevLang"];
const KM_STUFEN = [100000, 150000, 200000];
const SITZ_STUFEN = [5, 7];

function Block({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border pb-5 mb-5 last:border-0 last:pb-0 last:mb-0">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">{titel}</h3>
      {children}
    </div>
  );
}

function Chip({
  aktiv, aus, anzahl, onClick, children,
}: {
  aktiv: boolean; aus?: boolean; anzahl?: number; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={aus}
      aria-pressed={aktiv}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 min-h-[40px] text-sm font-medium transition-colors",
        aktiv
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:border-primary hover:text-primary",
        aus && !aktiv && "opacity-35 cursor-not-allowed hover:border-border hover:text-foreground"
      )}
    >
      {children}
      {anzahl !== undefined && (
        <span className={cn("text-[11px] tabular-nums", aktiv ? "text-primary-foreground/80" : "text-muted-foreground")}>
          {anzahl}
        </span>
      )}
    </button>
  );
}

export function FahrzeugFilter({
  alle, filter, setFilter, gemerkt,
}: {
  alle: Fahrzeug[];
  filter: Filter;
  setFilter: (f: Filter) => void;
  gemerkt: string[];
}) {
  // Zahlen an den Kacheln: wie viele Treffer bleiben, wenn nur diese Kategorie gewählt ist
  const ohneKategorie = filtern(alle, { ...filter, kategorien: [] }, gemerkt);
  const proKategorie = anzahlJeKategorie(ohneKategorie);
  const marken = [...new Set(alle.map((f) => f.marke))].sort((a, b) => a.localeCompare(b, "de"));
  const ohneMarke = filtern(alle, { ...filter, marken: [] }, gemerkt);

  const umschalten = <K extends keyof Filter>(schluessel: K, wert: string) => {
    const bisher = filter[schluessel] as unknown as string[];
    const neu = bisher.includes(wert) ? bisher.filter((x) => x !== wert) : [...bisher, wert];
    setFilter({ ...filter, [schluessel]: neu });
  };

  return (
    <div className="space-y-0">
      <Block titel="Karosserie">
        <div className="grid grid-cols-2 gap-2">
          {KATEGORIEN.map((k) => {
            const n = proKategorie[k] ?? 0;
            const aktiv = filter.kategorien.includes(k);
            return (
              <button
                key={k}
                type="button"
                onClick={() => umschalten("kategorien", k)}
                disabled={n === 0 && !aktiv}
                aria-pressed={aktiv}
                className={cn(
                  "group/kachel overflow-hidden rounded-xl border transition-colors text-center",
                  aktiv ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/60",
                  n === 0 && !aktiv && "opacity-35 cursor-not-allowed hover:border-border"
                )}
              >
                <span className={cn("flex flex-col items-center gap-1 px-2 pt-3 pb-2", aktiv ? "bg-primary/10 text-primary" : "bg-card")}>
                  <KarosserieSymbol
                    art={k}
                    className={cn("w-11 h-[22px] transition-transform duration-300 group-hover/kachel:scale-110",
                      aktiv ? "text-primary" : "text-muted-foreground")}
                  />
                  <span className="text-[11px] font-semibold leading-tight text-center">{k}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{n}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Block>

      <Block titel="Preis">
        <label className="block">
          <span className="text-sm text-muted-foreground">
            bis <span className="font-semibold text-foreground">{euro(filter.maxPreis || HOECHSTER_PREIS)}</span>
          </span>
          <input
            type="range"
            min={1000}
            max={HOECHSTER_PREIS}
            step={500}
            value={filter.maxPreis || HOECHSTER_PREIS}
            onChange={(e) => {
              const w = Number(e.target.value);
              setFilter({ ...filter, maxPreis: w >= HOECHSTER_PREIS ? 0 : w });
            }}
            className="w-full min-h-[44px] accent-primary"
            aria-label="Höchstpreis"
          />
        </label>
        <div className="flex flex-wrap gap-2 mt-1">
          {[3000, 5000, 10000].map((p) => (
            <Chip key={p} aktiv={filter.maxPreis === p} onClick={() => setFilter({ ...filter, maxPreis: filter.maxPreis === p ? 0 : p })}>
              bis {euro(p)}
            </Chip>
          ))}
        </div>
      </Block>

      <Block titel="Marke">
        <div className="flex flex-wrap gap-2">
          {marken.map((m) => (
            <Chip
              key={m}
              aktiv={filter.marken.includes(m)}
              aus={!ohneMarke.some((f) => f.marke === m)}
              onClick={() => umschalten("marken", m)}
            >
              {m}
            </Chip>
          ))}
        </div>
      </Block>

      <Block titel="Kraftstoff">
        <div className="flex flex-wrap gap-2">
          {["Benzin", "Diesel"].map((k) => (
            <Chip key={k} aktiv={filter.kraftstoffe.includes(k)} onClick={() => umschalten("kraftstoffe", k)}>
              {k}
            </Chip>
          ))}
        </div>
      </Block>

      <Block titel="Getriebe">
        <div className="flex flex-wrap gap-2">
          {["Schaltgetriebe", "Automatik"].map((g) => (
            <Chip key={g} aktiv={filter.getriebe.includes(g)} onClick={() => umschalten("getriebe", g)}>
              {g === "Schaltgetriebe" ? "Schaltung" : g}
            </Chip>
          ))}
        </div>
      </Block>

      <Block titel="Kilometer & Sitze">
        <div className="flex flex-wrap gap-2 mb-3">
          {KM_STUFEN.map((k) => (
            <Chip key={k} aktiv={filter.maxKm === k} onClick={() => setFilter({ ...filter, maxKm: filter.maxKm === k ? 0 : k })}>
              bis {(k / 1000).toLocaleString("de-DE")} tkm
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {SITZ_STUFEN.map((s) => (
            <Chip key={s} aktiv={filter.minSitze === s} onClick={() => setFilter({ ...filter, minSitze: filter.minSitze === s ? 0 : s })}>
              ab {s} Sitze
            </Chip>
          ))}
        </div>
      </Block>

      <Block titel="Ausstattung">
        <div className="flex flex-wrap gap-2">
          {MERKMALE.map((m) => (
            <Chip key={m} aktiv={filter.merkmale.includes(m)} onClick={() => umschalten("merkmale", m)}>
              {MERKMAL_LABEL[m]}
            </Chip>
          ))}
        </div>
      </Block>
    </div>
  );
}

/** Die gesetzten Filter als wegklickbare Chips über den Ergebnissen. */
export function AktiveFilter({
  filter, setFilter, zuruecksetzen,
}: {
  filter: Filter; setFilter: (f: Filter) => void; zuruecksetzen: () => void;
}) {
  const eintraege: { text: string; weg: () => void }[] = [];
  const entferne = <K extends keyof Filter>(k: K, w: string) => () =>
    setFilter({ ...filter, [k]: (filter[k] as unknown as string[]).filter((x) => x !== w) });

  filter.kategorien.forEach((k) => eintraege.push({ text: k, weg: entferne("kategorien", k) }));
  filter.marken.forEach((m) => eintraege.push({ text: m, weg: entferne("marken", m) }));
  filter.kraftstoffe.forEach((k) => eintraege.push({ text: k, weg: entferne("kraftstoffe", k) }));
  filter.getriebe.forEach((g) => eintraege.push({ text: g === "Schaltgetriebe" ? "Schaltung" : g, weg: entferne("getriebe", g) }));
  filter.merkmale.forEach((m) => eintraege.push({ text: MERKMAL_LABEL[m], weg: entferne("merkmale", m) }));
  if (filter.maxPreis) eintraege.push({ text: `bis ${euro(filter.maxPreis)}`, weg: () => setFilter({ ...filter, maxPreis: 0 }) });
  if (filter.maxKm) eintraege.push({ text: `bis ${(filter.maxKm / 1000).toLocaleString("de-DE")} tkm`, weg: () => setFilter({ ...filter, maxKm: 0 }) });
  if (filter.minSitze) eintraege.push({ text: `ab ${filter.minSitze} Sitze`, weg: () => setFilter({ ...filter, minSitze: 0 }) });
  if (filter.nurGemerkt) eintraege.push({ text: "nur Gemerkte", weg: () => setFilter({ ...filter, nurGemerkt: false }) });

  if (eintraege.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-5">
      {eintraege.map((e) => (
        <button
          key={e.text}
          type="button"
          onClick={e.weg}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary px-3 min-h-[36px] text-sm font-medium hover:bg-primary/20 transition-colors"
        >
          {e.text} <X className="w-3.5 h-3.5" />
        </button>
      ))}
      <button
        type="button"
        onClick={zuruecksetzen}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary min-h-[36px] px-2"
      >
        <RotateCcw className="w-3.5 h-3.5" /> alle zurücksetzen
      </button>
    </div>
  );
}
