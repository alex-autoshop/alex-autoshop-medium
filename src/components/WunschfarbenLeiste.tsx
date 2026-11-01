import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Minus, Palette, SprayCan, Pencil, Info } from "lucide-react";
import {
  storefrontApiRequest, STOREFRONT_PRODUCT_BY_HANDLE_QUERY, type ShopifyProduct,
} from "@/lib/shopify";
import { mengenPosition } from "../../shared/produktabo.js";
import { cn } from "@/lib/utils";

/** Die drei Misch-Produkte. Preise und Gebinde kommen aus Shopify — hier steht
 *  nur, welches Produkt gemeint ist, damit nichts doppelt gepflegt wird. */
export const MISCH_PRODUKTE = [
  { id: "farbe",   handle: "farben-mix",                            label: "Wunschfarbe", icon: Palette,   einheit: "Gebinde" },
  { id: "spray",   handle: "individuelle-spraydose-erstellen",      label: "Spraydose",   icon: SprayCan,  einheit: "Dose" },
  { id: "stift",   handle: "individuellen-lackstift-bestellen-20ml", label: "Lackstift",  icon: Pencil,    einheit: "Stift" },
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
const euro = (n: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

export function WunschfarbenLeiste({
  rabatt, onHinzufuegen,
}: { rabatt: number; onHinzufuegen: (e: MengenEintrag) => void }) {
  const [aktiv, setAktiv] = useState<string>(MISCH_PRODUKTE[0].id);
  const [produkte, setProdukte] = useState<Record<string, Produkt | null>>({});
  const [laedt, setLaedt] = useState(true);
  const [wahl, setWahl] = useState<Record<string, string>>({});
  const [menge, setMenge] = useState(1);

  const eintrag = MISCH_PRODUKTE.find((m) => m.id === aktiv)!;
  const produkt = produkte[eintrag.handle];

  useEffect(() => {
    let abgebrochen = false;
    (async () => {
      setLaedt(true);
      const ergebnis: Record<string, Produkt | null> = {};
      await Promise.all(MISCH_PRODUKTE.map(async (m) => {
        try {
          const d = await storefrontApiRequest(STOREFRONT_PRODUCT_BY_HANDLE_QUERY, { handle: m.handle });
          ergebnis[m.handle] = d?.data?.productByHandle ?? null;
        } catch { ergebnis[m.handle] = null; }
      }));
      if (!abgebrochen) { setProdukte(ergebnis); setLaedt(false); }
    })();
    return () => { abgebrochen = true; };
  }, []);

  // Auswahl zurücksetzen, wenn das Produkt wechselt
  useEffect(() => { setWahl({}); setMenge(1); }, [aktiv]);

  const optionen = produkt?.options ?? [];
  const varianten = useMemo(
    () => (produkt?.variants?.edges ?? []).map((e) => e.node),
    [produkt]
  );

  const moeglich = (name: string, wert: string) =>
    varianten.some((v) =>
      v.selectedOptions.some((o) => o.name === name && o.value === wert) &&
      optionen.every((opt) => {
        if (opt.name === name) return true;
        const g = wahl[opt.name];
        return !g || v.selectedOptions.some((o) => o.name === opt.name && o.value === g);
      })
    );

  const komplett = optionen.length > 0 && optionen.every((o) => wahl[o.name]);
  const variante = komplett
    ? varianten.find((v) => optionen.every((o) => v.selectedOptions.some((so) => so.name === o.name && so.value === wahl[o.name])))
    : undefined;

  const einzelpreis = variante ? parseFloat(variante.price.amount) : 0;
  const rechnung = einzelpreis > 0 ? mengenPosition({ einzelpreis, menge, rabatt }) : null;

  function insAbo() {
    if (!variante || !produkt || !rechnung) return;
    onHinzufuegen({
      art: "menge",
      id: `${produkt.handle}::${variante.id}`,
      handle: produkt.handle,
      titel: produkt.title,
      variantId: variante.id,
      variante: variante.selectedOptions.map((o) => o.value).join(" · "),
      einzelpreis,
      menge,
      bild: produkt.images?.edges?.[0]?.node?.url,
    });
    setMenge(1);
  }

  return (
    <div className="card-tilt hover:translate-y-0 p-5 sm:p-6 border-primary/40 bg-primary/5">
      <div className="flex items-start gap-3 mb-1">
        <Palette className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <h3 className="text-lg leading-snug">Für Lackierer: Farbe nach Monatsbedarf</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Sag, wie viel du im Monat brauchst — der Beitrag richtet sich nach deiner Ersparnis,
            nicht nach der Stückzahl.
          </p>
        </div>
      </div>

      {/* Welches Misch-Produkt */}
      <div className="grid grid-cols-3 gap-2 mt-5 mb-5" role="group" aria-label="Produktart wählen">
        {MISCH_PRODUKTE.map((m) => {
          const an = m.id === aktiv;
          return (
            <button
              key={m.id} type="button" onClick={() => setAktiv(m.id)} aria-pressed={an}
              className={cn(
                "rounded-xl border-2 px-2 py-3 text-center transition-all min-h-[68px]",
                an ? "border-primary bg-primary/15" : "border-border bg-card hover:border-primary/50"
              )}
            >
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
          {eintrag.label} ist gerade nicht abrufbar. Ruf uns an, dann nehmen wir die Menge telefonisch auf.
        </p>
      )}

      {!laedt && produkt && (
        <>
          {optionen.map((opt) => (
            <div key={opt.name} className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {opt.name === "Hersteller" ? "Marke" : opt.name === "Komponenten" ? "System" : opt.name}
              </p>
              <div className="flex flex-wrap gap-2">
                {opt.values.map((wert) => {
                  const geht = moeglich(opt.name, wert);
                  const an = wahl[opt.name] === wert;
                  return (
                    <button
                      key={wert} type="button" disabled={!geht}
                      onClick={() => setWahl((p) => ({ ...p, [opt.name]: wert }))}
                      aria-pressed={an}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm font-medium transition-colors min-h-[40px]",
                        an ? "border-primary bg-primary text-primary-foreground"
                           : geht ? "border-border bg-card hover:border-primary/60"
                                  : "border-border/50 text-muted-foreground/40 line-through cursor-not-allowed"
                      )}
                    >
                      {wert}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Monatsbedarf */}
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Bedarf pro Monat
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button" onClick={() => setMenge((m) => Math.max(1, m - 1))}
                aria-label="Menge verringern"
                className="w-11 h-11 rounded-lg border border-border inline-flex items-center justify-center hover:border-primary"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number" min={1} max={999} value={menge}
                onChange={(e) => setMenge(Math.min(999, Math.max(1, Number(e.target.value) || 1)))}
                aria-label={`${eintrag.einheit} pro Monat`}
                className="input-base w-20 text-center tabular-nums"
              />
              <button
                type="button" onClick={() => setMenge((m) => Math.min(999, m + 1))}
                aria-label="Menge erhöhen"
                className="w-11 h-11 rounded-lg border border-border inline-flex items-center justify-center hover:border-primary"
              >
                <Plus className="w-4 h-4" />
              </button>
              <span className="text-sm text-muted-foreground">
                {eintrag.einheit}{menge === 1 ? "" : eintrag.einheit.endsWith("e") ? "n" : "n"} / Monat
              </span>
            </div>
          </div>

          {/* Rechnung */}
          {rechnung ? (
            <div className="rounded-xl bg-card border border-border p-4 space-y-1.5 text-sm">
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
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              Wähl {optionen.map((o) => (o.name === "Hersteller" ? "Marke" : o.name === "Komponenten" ? "System" : o.name)).join(", ")} — dann rechne ich dir das aus.
            </p>
          )}

          <button
            type="button" onClick={insAbo} disabled={!rechnung}
            className={cn("btn-primary w-full mt-4", !rechnung && "opacity-50 cursor-not-allowed")}
          >
            <Plus className="w-5 h-5" /> In mein Abo
          </button>

          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            Den Farbcode gibst du bei der Bestellung an — die Menge hier legt nur fest,
            wie viel du im Monat zu Mitgliedspreisen beziehen kannst.
          </p>
        </>
      )}
    </div>
  );
}
