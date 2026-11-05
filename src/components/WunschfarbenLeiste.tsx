import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Minus, Palette, SprayCan, Pencil, Info, Lightbulb, ChevronDown } from "lucide-react";
import {
  storefrontApiRequest, STOREFRONT_PRODUCT_BY_HANDLE_QUERY, type ShopifyProduct,
} from "@/lib/shopify";
import { literAus, mischBedarf, guenstigsteKombi, mengenPosition, ABO_RABATTE } from "../../shared/produktabo.js";
import { cn } from "@/lib/utils";

/** Die drei Misch-Produkte. Preise und Gebinde kommen aus Shopify — hier steht
 *  nur, welches Produkt gemeint ist, damit nichts doppelt gepflegt wird. */
export const MISCH_PRODUKTE = [
  { id: "farbe", handle: "farben-mix",                             label: "Wunschfarbe", knopf: "Wunschfarben", icon: Palette,  einheit: "Liter" },
  { id: "spray", handle: "individuelle-spraydose-erstellen",       label: "Spraydose",   knopf: "Spraydosen",   icon: SprayCan, einheit: "Dosen" },
  { id: "stift", handle: "individuellen-lackstift-bestellen-20ml", label: "Lackstift",   knopf: "Lackstifte",   icon: Pencil,   einheit: "Stifte" },
] as const;

export interface MengenEintrag {
  art: "menge";
  id: string;
  handle: string;
  titel: string;
  variantId: string;
  variante: string;
  /** 1K, 2K oder egal — steht so auch in der Abo-Liste. */
  lacksystem: "1K" | "2K" | "egal";
  /** Eigene Rabattstufe dieser Lack-Position, unabhängig von den anderen Produkten. */
  rabatt: number;
  einzelpreis: number;
  menge: number;
  bild?: string;
}

type Produkt = ShopifyProduct["node"];
type Variante = Produkt["variants"]["edges"][number]["node"];
const euro = (n: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
const zahl = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 2 });

const wertVon = (v: Variante, name: string) =>
  v.selectedOptions.find((o) => o.name === name)?.value ?? "";

/** Nur der Markenname, ohne den Klammertext aus Shopify. */
function markenName(name: string) {
  return String(name || "").replace(/\s*\([^)]*\)/g, "").trim();
}

type Lacksystem = "1k" | "2k" | "egal";

const LACKSYSTEME: { id: Lacksystem; titel: string; hinweis: string; kuerzel: "1K" | "2K" | "egal" }[] = [
  { id: "1k", titel: "1K-Lack", hinweis: "Basislack, Klarlack kommt separat drüber", kuerzel: "1K" },
  { id: "2k", titel: "2K-Lack immer bevorzugt", hinweis: "Lack mit Härter, ohne extra Klarlack", kuerzel: "2K" },
  { id: "egal", titel: "Egal – 1K oder 2K", hinweis: "Wir nehmen, was für deinen Farbton verfügbar und am günstigsten ist", kuerzel: "egal" },
];

function systemKlasse(wert: string): "1k" | "2k" | "" {
  const t = wert.toLowerCase();
  if (t.startsWith("1k")) return "1k";
  if (t.startsWith("2k")) return "2k";
  return "";
}

export function WunschfarbenLeiste({
  rabatt, onHinzufuegen, oeffnen = 0, start = "",
}: {
  rabatt: number;
  onHinzufuegen: (e: MengenEintrag) => void;
  /** Steigt, wenn die Leiste von außen aufgeklappt werden soll (z. B. Klick auf Wunschfarbe in der Produktliste). */
  oeffnen?: number;
  /** Produktart, die dabei aktiv sein soll: farbe, spray oder stift. */
  start?: string;
}) {
  const [offen, setOffen] = useState(false);
  const [aktiv, setAktiv] = useState<string>(MISCH_PRODUKTE[0].id);
  const [produkte, setProdukte] = useState<Record<string, Produkt | null>>({});
  const [laedt, setLaedt] = useState(true);
  const [anteilB, setAnteilB] = useState(0);      // Anteil der zweiten Marke in %
  const [system, setSystem] = useState<Lacksystem>("egal");
  const [lackRabatt, setLackRabatt] = useState(15);
  const [bedarf, setBedarf] = useState(4);

  const eintrag = MISCH_PRODUKTE.find((m) => m.id === aktiv)!;
  const produkt = produkte[eintrag.handle];

  useEffect(() => {
    if (!oeffnen) return;
    if (start && MISCH_PRODUKTE.some((m) => m.id === start)) setAktiv(start);
    setOffen(true);
    document.getElementById("farbe-nach-monatsbedarf-kopf")?.scrollIntoView({ block: "start" });
  }, [oeffnen, start]);

  useEffect(() => {
    let weg = false;
    (async () => {
      setLaedt(true);
      const erg: Record<string, Produkt | null> = {};
      await Promise.all(MISCH_PRODUKTE.map(async (m) => {
        try {
          const d = await storefrontApiRequest(STOREFRONT_PRODUCT_BY_HANDLE_QUERY, { handle: m.handle });
          erg[m.handle] = d?.data?.productByHandle ?? null;
        } catch { erg[m.handle] = null; }
      }));
      if (!weg) { setProdukte(erg); setLaedt(false); }
    })();
    return () => { weg = true; };
  }, []);

  const varianten = useMemo<Variante[]>(
    () => (produkt?.variants?.edges ?? []).map((e) => e.node),
    [produkt]
  );

  // Welche Optionsnamen gibt es? (Hersteller / Komponenten / Menge)
  const marken = useMemo(
    () => [...new Set(varianten.map((v) => wertVon(v, "Hersteller")).filter(Boolean))],
    [varianten]
  );
  const aufbauten = useMemo(
    () => [...new Set(varianten.map((v) => wertVon(v, "Komponenten")).filter(Boolean))],
    [varianten]
  );
  // Liefert das Produkt Gebinde in Litern — oder zählt man Stück?
  const inLitern = useMemo(
    () => varianten.some((v) => literAus(wertVon(v, "Menge")) !== null),
    [varianten]
  );

  useEffect(() => {
    setSystem("egal");
    setAnteilB(0);
    setBedarf(inLitern ? 4 : 10);
  }, [aktiv, inLitern]);

  /** Gebinde einer Marke für 1K oder 2K. Fehlt die Sorte, gilt dieselbe Preisbasis. */
  const gebindeVon = (marke: string, sys: "1k" | "2k") => {
    const einerMarke = varianten.filter((v) => !marke || wertVon(v, "Hersteller") === marke);
    const passend = einerMarke.filter((v) => systemKlasse(wertVon(v, "Komponenten")) === sys);
    const basis = passend.length ? passend : einerMarke;
    return basis
      .map((v) => ({
        label: wertVon(v, "Menge") || v.title,
        liter: literAus(wertVon(v, "Menge")) ?? 0,
        preis: parseFloat(v.price.amount),
        variantId: v.id,
      }))
      .filter((g) => g.preis > 0);
  };

  const systemText = LACKSYSTEME.find((s) => s.id === system)!.kuerzel;

  const markeA = marken[0] ?? "";
  const markeB = marken[1] ?? "";

  const literFuer = (sys: "1k" | "2k") => mischBedarf({
    bedarfLiter: bedarf,
    anteilB: markeB ? anteilB : 0,
    gebindeA: gebindeVon(markeA, sys),
    gebindeB: markeB ? gebindeVon(markeB, sys) : [],
    rabatt: lackRabatt,
  });
  const liter1 = inLitern ? literFuer("1k") : null;
  const liter2 = inLitern ? literFuer("2k") : null;
  const guenstiger = (a: typeof liter1, b: typeof liter1) => {
    if (!a) return b;
    if (!b) return a;
    return a.normal <= b.normal ? a : b;
  };

  // ── Rechnung ──────────────────────────────────────────────────────────────
  // 1K nur die 1K-Gebinde, 2K die 2K-Gebinde (sonst dieselbe Basis),
  // Egal = der günstigere der beiden.
  const literRechnung = !inLitern ? null
    : system === "1k" ? liter1
    : system === "2k" ? liter2
    : guenstiger(liter1, liter2);

  const stueckVon = (sys: "1k" | "2k") => {
    const liste = [
      ...gebindeVon(markeA, sys),
      ...(anteilB === 100 && markeB ? gebindeVon(markeB, sys) : []),
    ];
    const preise = liste.map((g) => g.preis).filter(Number.isFinite);
    return preise.length ? Math.min(...preise) : Number.NaN;
  };
  // Stückware (Dose, Stift): nur die billigste passende Variante × Anzahl
  const stueckPreis = !inLitern
    ? Math.min(...(system === "egal" ? [stueckVon("1k"), stueckVon("2k")] : [stueckVon(system)]).filter(Number.isFinite))
    : 0;
  const stueckRechnung = !inLitern && Number.isFinite(stueckPreis) && stueckPreis > 0
    ? mengenPosition({ einzelpreis: stueckPreis, menge: bedarf, rabatt: lackRabatt })
    : null;

  const rechnung = literRechnung ?? stueckRechnung;
  const ueberschuss = literRechnung ? literRechnung.literGesamt - bedarf : 0;

  function insAbo() {
    if (!produkt || !rechnung) return;
    const beschreibung = inLitern
      ? [
          markeB && anteilB > 0 && anteilB < 100
            ? `${100 - anteilB} % ${markenName(markeA)} · ${anteilB} % ${markenName(markeB)}`
            : anteilB === 100 ? markenName(markeB) : markenName(markeA),
          systemText,
          `${zahl(bedarf)} L / Monat`,
        ].filter(Boolean).join(" · ")
      : [anteilB === 100 && markeB ? markenName(markeB) : markenName(markeA), systemText, `${bedarf} ${eintrag.einheit} / Monat`]
          .filter(Boolean).join(" · ");

    const gebindeGewaehlt = gebindeVon(markeA, system === "2k" ? "2k" : "1k");
    onHinzufuegen({
      art: "menge",
      id: `${produkt.handle}::${anteilB}::${system}::${inLitern ? "L" : "S"}`,
      handle: produkt.handle,
      titel: produkt.title,
      variantId: gebindeGewaehlt[0]?.variantId ?? "",
      variante: beschreibung,
      lacksystem: systemText,
      rabatt: lackRabatt,
      // Einzelpreis so wählen, dass Menge × Einzelpreis den Monatspreis ergibt
      einzelpreis: Math.round((rechnung.normal / Math.max(1, bedarf)) * 100) / 100,
      menge: bedarf,
      bild: produkt.images?.edges?.[0]?.node?.url,
    });
  }

  return (
    <div className="lack-rahmen rounded-2xl shadow-card overflow-hidden">
      <button
        id="farbe-nach-monatsbedarf-kopf"
        type="button"
        className="w-full flex items-center gap-3 p-4 text-left cursor-pointer"
        aria-expanded={offen}
        aria-controls="farbe-nach-monatsbedarf"
        onClick={() => setOffen((v) => !v)}
      >
        <span className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Palette className="w-5 h-5 text-primary" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display font-bold text-base leading-snug">Für Lackierer: Farbe nach Monatsbedarf</span>
          <span className="block text-sm text-muted-foreground mt-0.5 truncate">
            Sag, wie viel du im Monat brauchst — wir rechnen die günstigsten Gebinde.
          </span>
        </span>
        <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-primary">
          {offen ? "Zuklappen" : "Aufklappen"}
          <ChevronDown className={cn("w-4 h-4 transition-transform", offen && "rotate-180")} aria-hidden="true" />
        </span>
      </button>

      <div id="farbe-nach-monatsbedarf" hidden={!offen} className="px-4 pb-5">
      <div className="grid grid-cols-3 gap-2 mb-5" role="group" aria-label="Produktart wählen">
        {MISCH_PRODUKTE.map((m) => {
          const an = m.id === aktiv;
          return (
            <button key={m.id} type="button" onClick={() => setAktiv(m.id)} aria-pressed={an}
              className={cn("cursor-pointer rounded-xl border-2 px-2 py-3 text-center transition-all min-h-[68px]",
                an ? "border-primary bg-primary/15" : "border-border bg-card hover:border-primary/50")}>
              <m.icon className={cn("w-5 h-5 mx-auto mb-1", an ? "text-primary" : "text-muted-foreground")} />
              <span className="block text-[11px] sm:text-xs font-semibold leading-tight">{m.knopf}</span>
            </button>
          );
        })}
      </div>

      {laedt && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Gebinde und Preise werden geladen …
        </p>
      )}

      {!laedt && !produkt && (
        <p className="flex items-start gap-2 text-sm text-muted-foreground py-4">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          {eintrag.label} ist gerade nicht abrufbar. Ruf uns an, dann nehmen wir den Bedarf telefonisch auf.
        </p>
      )}

      {!laedt && produkt && (
        <>
          {/* ── Anteil je Marke, nicht eine vermischte Farbe ───────────── */}
          {markeB && (
            <div className="mb-5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Markenaufteilung</p>
                <p className="text-sm font-semibold tabular-nums">
                  {100 - anteilB} % {markenName(markeA)} · {anteilB} % {markenName(markeB)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                So viel deines Lacks kommt von Standox, so viel von Mipa.
              </p>
              <input
                type="range" min={0} max={100} step={5} value={anteilB}
                onChange={(e) => setAnteilB(Number(e.target.value))}
                aria-label={`Anteil ${markenName(markeB)} in Prozent`}
                className="w-full h-2 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary
                  [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background
                  [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background"
                style={{ background: `linear-gradient(to right, hsl(var(--primary)) ${anteilB}%, hsl(var(--border)) ${anteilB}%)` }}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                <span>{markenName(markeA)}</span><span>{markenName(markeB)}</span>
              </div>
              <div className="flex gap-2 mt-2.5">
                {[[0, markenName(markeA)], [50, "halbe/halbe"], [100, markenName(markeB)]].map(([w, t]) => (
                  <button key={String(w)} type="button" onClick={() => setAnteilB(Number(w))}
                    className={cn("cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors",
                      anteilB === w ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50")}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Lacksystem: 1K, 2K oder das Günstigste ─────────────── */}
          {(inLitern || aufbauten.length > 0) && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Lacksystem</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="group" aria-label="Lacksystem wählen">
                {LACKSYSTEME.map((s) => {
                  const an = system === s.id;
                  return (
                    <button key={s.id} type="button" onClick={() => setSystem(s.id)} aria-pressed={an}
                      className={cn("cursor-pointer rounded-xl border-2 px-3 py-2.5 text-left transition-all",
                        an ? "border-primary bg-primary/15" : "border-border bg-card hover:border-primary/50")}>
                      <span className="block text-sm font-semibold">{s.titel}</span>
                      <span className="block text-[11px] text-muted-foreground mt-0.5">{s.hinweis}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Dein Rabatt auf diesen Lack</p>
            <div className="flex w-full rounded-lg border border-border overflow-hidden" role="group" aria-label="Rabattstufe für den Lack">
              {ABO_RABATTE.map((r) => (
                <button key={r} type="button" aria-pressed={lackRabatt === r} onClick={() => setLackRabatt(r)}
                  className={cn("flex-1 basis-0 min-w-0 cursor-pointer min-h-11 px-1 py-2 text-center text-sm font-bold",
                    lackRabatt === r ? "bg-primary text-primary-foreground" : "bg-card hover:bg-primary/10")}>
                  {r} %
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">Nur dieser Lack. Jedes andere Produkt in der Liste hat seine eigene Stufe. Der Beitrag unten hängt an der Ersparnis dieser Menge.</p>
          </div>

          {/* ── Monatsbedarf ─────────────────────────────────────────── */}
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Wie viel brauchst du im Monat?
            </p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setBedarf((m) => Math.max(inLitern ? 0.5 : 1, +(m - (inLitern ? 0.5 : 1)).toFixed(2)))}
                aria-label="Weniger" className="cursor-pointer w-11 h-11 rounded-lg border border-border inline-flex items-center justify-center hover:border-primary">
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number" min={inLitern ? 0.5 : 1} step={inLitern ? 0.5 : 1} max={999} value={bedarf}
                onChange={(e) => setBedarf(Math.min(999, Math.max(inLitern ? 0.5 : 1, Number(e.target.value) || 1)))}
                aria-label={`${eintrag.einheit} pro Monat`}
                className="input-base w-24 text-center tabular-nums"
              />
              <button type="button" onClick={() => setBedarf((m) => Math.min(999, +(m + (inLitern ? 0.5 : 1)).toFixed(2)))}
                aria-label="Mehr" className="cursor-pointer w-11 h-11 rounded-lg border border-border inline-flex items-center justify-center hover:border-primary">
                <Plus className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold">{eintrag.einheit} im Monat</span>
            </div>
          </div>

          {/* ── Ergebnis ─────────────────────────────────────────────── */}
          {rechnung ? (
            <div className="rounded-xl bg-card border border-border p-4 space-y-3">
              {literRechnung && (
                <div className="text-sm space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                    Das bekommst du dafür
                  </p>
                  {literRechnung.literA > 0 && (
                    <p className="flex justify-between gap-3">
                      <span>{markenName(markeA)} {zahl(literRechnung.literA)} L</span>
                      <span className="text-muted-foreground text-right">
                        {literRechnung.teilA.teile.map((t) => `${t.anzahl}× ${t.label}`).join(" + ") || "—"}
                      </span>
                    </p>
                  )}
                  {literRechnung.literB > 0 && (
                    <p className="flex justify-between gap-3">
                      <span>{markenName(markeB)} {zahl(literRechnung.literB)} L</span>
                      <span className="text-muted-foreground text-right">
                        {literRechnung.teilB.teile.map((t) => `${t.anzahl}× ${t.label}`).join(" + ") || "—"}
                      </span>
                    </p>
                  )}
                  {ueberschuss > 0.01 && (
                    <p className="flex items-start gap-2 text-xs text-primary pt-1">
                      <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      Du bekommst {zahl(literRechnung.literGesamt)} L statt {zahl(bedarf)} L — das größere
                      Gebinde ist günstiger als mehrere kleine.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-1.5 text-sm border-t border-border pt-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Normal im Monat</span>
                  <span className="line-through text-muted-foreground tabular-nums">{euro(rechnung.normal)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Als Mitglied</span>
                  <span className="text-primary tabular-nums">{euro(rechnung.mitglied)}</span>
                </div>
                <div className="flex justify-between text-red-600 font-semibold">
                  <span>Du sparst</span>
                  <span className="tabular-nums">{euro(rechnung.ersparnis)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1.5 mt-1.5">
                  <span className="text-muted-foreground">Dein Beitrag dafür</span>
                  <span className="font-bold tabular-nums">{euro(rechnung.beitrag)} / Monat</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              Für diese Auswahl liegen gerade keine Preise vor — ruf uns kurz an.
            </p>
          )}

          <button type="button" onClick={insAbo} disabled={!rechnung}
            className={cn("btn-primary cursor-pointer w-full mt-4", !rechnung && "opacity-50 cursor-not-allowed")}>
            <Plus className="w-5 h-5" /> In mein Abo
          </button>

          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            Den Farbcode gibst du bei der Bestellung an. Der Bedarf hier legt fest, wie viel du im
            Monat zu Mitgliedspreisen beziehen kannst — nicht abgerufene Mengen verfallen nicht.
          </p>
        </>
      )}
      </div>
    </div>
  );
}
