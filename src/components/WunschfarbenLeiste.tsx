import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Minus, Palette, SprayCan, Pencil, Info, Lightbulb } from "lucide-react";
import {
  storefrontApiRequest, STOREFRONT_PRODUCT_BY_HANDLE_QUERY, type ShopifyProduct,
} from "@/lib/shopify";
import { literAus, mischBedarf, guenstigsteKombi, mengenPosition } from "../../shared/produktabo.js";
import { cn } from "@/lib/utils";

/** Die drei Misch-Produkte. Preise und Gebinde kommen aus Shopify — hier steht
 *  nur, welches Produkt gemeint ist, damit nichts doppelt gepflegt wird. */
export const MISCH_PRODUKTE = [
  { id: "farbe", handle: "farben-mix",                             label: "Wunschfarbe", icon: Palette,  einheit: "Liter" },
  { id: "spray", handle: "individuelle-spraydose-erstellen",       label: "Spraydose",   icon: SprayCan, einheit: "Dosen" },
  { id: "stift", handle: "individuellen-lackstift-bestellen-20ml", label: "Lackstift",   icon: Pencil,   einheit: "Stifte" },
] as const;

export interface MengenEintrag {
  art: "menge";
  id: string;
  handle: string;
  titel: string;
  variantId: string;
  variante: string;
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

/** Aufbau-Bezeichnungen in die Sprache des Lackierers übersetzen. */
function aufbauLabel(wert: string) {
  const t = wert.toLowerCase();
  if (t.startsWith("1k")) return { titel: "Nur Basislack", hinweis: "Klarlack kommt separat drüber" };
  if (t.startsWith("2k")) return { titel: "Mit Klarlack", hinweis: "Basislack und Klarlack zusammen" };
  return { titel: wert, hinweis: "" };
}

export function WunschfarbenLeiste({
  rabatt, onHinzufuegen,
}: { rabatt: number; onHinzufuegen: (e: MengenEintrag) => void }) {
  const [aktiv, setAktiv] = useState<string>(MISCH_PRODUKTE[0].id);
  const [produkte, setProdukte] = useState<Record<string, Produkt | null>>({});
  const [laedt, setLaedt] = useState(true);
  const [anteilB, setAnteilB] = useState(0);      // Anteil der zweiten Marke in %
  const [aufbau, setAufbau] = useState<string>("");
  const [bedarf, setBedarf] = useState(4);

  const eintrag = MISCH_PRODUKTE.find((m) => m.id === aktiv)!;
  const produkt = produkte[eintrag.handle];

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
    setAufbau(aufbauten[0] ?? "");
    setAnteilB(0);
    setBedarf(inLitern ? 4 : 10);
  }, [aktiv, aufbauten.length, inLitern]);

  /** Gebinde einer Marke beim gewählten Aufbau. */
  const gebindeVon = (marke: string) =>
    varianten
      .filter((v) => (!marke || wertVon(v, "Hersteller") === marke) && (!aufbau || wertVon(v, "Komponenten") === aufbau))
      .map((v) => ({
        label: wertVon(v, "Menge") || v.title,
        liter: literAus(wertVon(v, "Menge")) ?? 0,
        preis: parseFloat(v.price.amount),
        variantId: v.id,
      }))
      .filter((g) => g.preis > 0);

  const markeA = marken[0] ?? "";
  const markeB = marken[1] ?? "";
  const gebindeA = gebindeVon(markeA);
  const gebindeB = markeB ? gebindeVon(markeB) : [];

  // ── Rechnung ──────────────────────────────────────────────────────────────
  const literRechnung = inLitern
    ? mischBedarf({ bedarfLiter: bedarf, anteilB: markeB ? anteilB : 0, gebindeA, gebindeB, rabatt })
    : null;

  // Stückware (Dose, Stift): nur die billigste passende Variante × Anzahl
  const stueckPreis = !inLitern
    ? Math.min(...[...gebindeA, ...(anteilB === 100 ? gebindeB : [])].map((g) => g.preis).filter(Number.isFinite))
    : 0;
  const stueckRechnung = !inLitern && Number.isFinite(stueckPreis) && stueckPreis > 0
    ? mengenPosition({ einzelpreis: stueckPreis, menge: bedarf, rabatt })
    : null;

  const rechnung = literRechnung ?? stueckRechnung;
  const ueberschuss = literRechnung ? literRechnung.literGesamt - bedarf : 0;

  function insAbo() {
    if (!produkt || !rechnung) return;
    const beschreibung = inLitern
      ? [
          markeB && anteilB > 0 && anteilB < 100
            ? `${100 - anteilB} % ${markeA} / ${anteilB} % ${markeB}`
            : anteilB === 100 ? markeB : markeA,
          aufbau ? aufbauLabel(aufbau).titel : "",
          `${zahl(bedarf)} L / Monat`,
        ].filter(Boolean).join(" · ")
      : [anteilB === 100 && markeB ? markeB : markeA, aufbau ? aufbauLabel(aufbau).titel : "", `${bedarf} ${eintrag.einheit} / Monat`]
          .filter(Boolean).join(" · ");

    onHinzufuegen({
      art: "menge",
      id: `${produkt.handle}::${anteilB}::${aufbau}::${inLitern ? "L" : "S"}`,
      handle: produkt.handle,
      titel: produkt.title,
      variantId: gebindeA[0]?.variantId ?? "",
      variante: beschreibung,
      // Einzelpreis so wählen, dass Menge × Einzelpreis den Monatspreis ergibt
      einzelpreis: Math.round((rechnung.normal / Math.max(1, bedarf)) * 100) / 100,
      menge: bedarf,
      bild: produkt.images?.edges?.[0]?.node?.url,
    });
  }

  return (
    <div className="card-tilt hover:translate-y-0 p-5 sm:p-6 border-primary/40 bg-primary/5">
      <div className="flex items-start gap-3 mb-1">
        <Palette className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <h3 className="text-lg leading-snug">Für Lackierer: Farbe nach Monatsbedarf</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Sag, wie viel du im Monat brauchst — welche Gebinde das günstigsten sind, rechnen wir aus.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-5 mb-5" role="group" aria-label="Produktart wählen">
        {MISCH_PRODUKTE.map((m) => {
          const an = m.id === aktiv;
          return (
            <button key={m.id} type="button" onClick={() => setAktiv(m.id)} aria-pressed={an}
              className={cn("rounded-xl border-2 px-2 py-3 text-center transition-all min-h-[68px]",
                an ? "border-primary bg-primary/15" : "border-border bg-card hover:border-primary/50")}>
              <m.icon className={cn("w-5 h-5 mx-auto mb-1", an ? "text-primary" : "text-muted-foreground")} />
              <span className="block text-xs font-semibold leading-tight">{m.label}</span>
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
          {/* ── Mischung zweier Marken ──────────────────────────────── */}
          {markeB && (
            <div className="mb-5">
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mischung</p>
                <p className="text-sm font-semibold tabular-nums">
                  {100 - anteilB} % {markeA} · {anteilB} % {markeB}
                </p>
              </div>
              <input
                type="range" min={0} max={100} step={5} value={anteilB}
                onChange={(e) => setAnteilB(Number(e.target.value))}
                aria-label={`Anteil ${markeB} in Prozent`}
                className="w-full h-2 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary
                  [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background
                  [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background"
                style={{ background: `linear-gradient(to right, hsl(var(--primary)) ${anteilB}%, hsl(var(--border)) ${anteilB}%)` }}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                <span>nur {markeA}</span><span>nur {markeB}</span>
              </div>
              <div className="flex gap-2 mt-2.5">
                {[[0, `nur ${markeA}`], [50, "halbe/halbe"], [100, `nur ${markeB}`]].map(([w, t]) => (
                  <button key={String(w)} type="button" onClick={() => setAnteilB(Number(w))}
                    className={cn("rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors",
                      anteilB === w ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50")}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Lackaufbau statt 1K/2K ──────────────────────────────── */}
          {aufbauten.length > 1 && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Lackaufbau</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {aufbauten.map((w) => {
                  const l = aufbauLabel(w);
                  const an = aufbau === w;
                  return (
                    <button key={w} type="button" onClick={() => setAufbau(w)} aria-pressed={an}
                      className={cn("rounded-xl border-2 px-3 py-2.5 text-left transition-all",
                        an ? "border-primary bg-primary/15" : "border-border bg-card hover:border-primary/50")}>
                      <span className="block text-sm font-semibold">{l.titel}</span>
                      {l.hinweis && <span className="block text-[11px] text-muted-foreground mt-0.5">{l.hinweis}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Monatsbedarf ─────────────────────────────────────────── */}
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Wie viel brauchst du im Monat?
            </p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setBedarf((m) => Math.max(inLitern ? 0.5 : 1, +(m - (inLitern ? 0.5 : 1)).toFixed(2)))}
                aria-label="Weniger" className="w-11 h-11 rounded-lg border border-border inline-flex items-center justify-center hover:border-primary">
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number" min={inLitern ? 0.5 : 1} step={inLitern ? 0.5 : 1} max={999} value={bedarf}
                onChange={(e) => setBedarf(Math.min(999, Math.max(inLitern ? 0.5 : 1, Number(e.target.value) || 1)))}
                aria-label={`${eintrag.einheit} pro Monat`}
                className="input-base w-24 text-center tabular-nums"
              />
              <button type="button" onClick={() => setBedarf((m) => Math.min(999, +(m + (inLitern ? 0.5 : 1)).toFixed(2)))}
                aria-label="Mehr" className="w-11 h-11 rounded-lg border border-border inline-flex items-center justify-center hover:border-primary">
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
                      <span>{markeA} {zahl(literRechnung.literA)} L</span>
                      <span className="text-muted-foreground text-right">
                        {literRechnung.teilA.teile.map((t) => `${t.anzahl}× ${t.label}`).join(" + ") || "—"}
                      </span>
                    </p>
                  )}
                  {literRechnung.literB > 0 && (
                    <p className="flex justify-between gap-3">
                      <span>{markeB} {zahl(literRechnung.literB)} L</span>
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
            className={cn("btn-primary w-full mt-4", !rechnung && "opacity-50 cursor-not-allowed")}>
            <Plus className="w-5 h-5" /> In mein Abo
          </button>

          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            Den Farbcode gibst du bei der Bestellung an. Der Bedarf hier legt fest, wie viel du im
            Monat zu Mitgliedspreisen beziehen kannst — nicht abgerufene Mengen verfallen nicht.
          </p>
        </>
      )}
    </div>
  );
}
