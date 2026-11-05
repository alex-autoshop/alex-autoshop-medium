import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search, Plus, X, Loader2, CheckCircle, ShoppingBasket, Package,
} from "lucide-react";
import { toast } from "sonner";
import { useVollerKatalog } from "@/hooks/useVollerKatalog";
import { formatPrice, type ShopifyProduct } from "@/lib/shopify";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { empfehlungLesen } from "@/lib/empfehlung";
import { empfehlungOffen } from "../../shared/empfehlung.js";
import {
  ABO_RABATTE, PRODUKT_ABO_PREISE, MAX_PRODUKTE,
  mengenPosition, aboListeGesamt, rabattGueltig,
} from "../../shared/produktabo.js";
import { WunschfarbenLeiste, MISCH_PRODUKTE, type MengenEintrag } from "@/components/WunschfarbenLeiste";
import { cn } from "@/lib/utils";
import { ABO_EREIGNIS, ABO_SPEICHER, aboListeLesen } from "@/lib/aboListe";
import { AboAnmeldung } from "@/components/AboAnmeldung";
import { AboProduktKatalog } from "@/components/AboProduktKatalog";
import { AboVorschau } from "@/components/AboVorschau";

/** Ein Produkt in der Abo-Liste — nur das Nötigste, damit es in den
 *  localStorage passt und auch ohne erneute Shop-Abfrage anzeigbar bleibt. */
export interface AboProdukt {
  art?: "einzel";
  id: string;
  handle: string;
  titel: string;
  preis: number;
  waehrung: string;
  bild?: string;
  rabatt: number;
}

/** Eine Zeile der Abo-Liste: entweder ein einzelnes Produkt oder eine
 *  Monatsmenge (Wunschfarbe, Spraydose, Lackstift). */
export type AboZeile = AboProdukt | MengenEintrag;

const istMenge = (z: AboZeile): z is MengenEintrag => (z as MengenEintrag).art === "menge";

const STUFEN_TEXT: Record<number, string> = {
  15: "Einstieg",
  28: "Für laufende Betriebe",
  40: "Höchstrabatt",
};

function liste_laden(): { standard: number; produkte: AboZeile[] } {
  const n = aboListeLesen();
  return { standard: n.standard, produkte: n.produkte as unknown as AboZeile[] };
}

function StufenWahl({ wert, onChange, label }: { wert: number; onChange: (n: number) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-lg border border-border overflow-hidden">
      {ABO_RABATTE.map((r) => (
        <button
          key={r}
          type="button"
          aria-pressed={wert === r}
          onClick={() => onChange(r)}
          className={cn(
            "cursor-pointer px-2 py-1 text-[11px] font-semibold min-h-[32px]",
            wert === r ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-primary/10"
          )}
        >
          {r}%
        </button>
      ))}
    </div>
  );
}

function alsAboProdukt(p: ShopifyProduct): AboProdukt {
  const n = p.node;
  return {
    id: n.id,
    handle: n.handle,
    titel: n.title,
    preis: parseFloat(n.priceRange?.minVariantPrice?.amount ?? "0"),
    waehrung: n.priceRange?.minVariantPrice?.currencyCode ?? "EUR",
    bild: n.images?.edges?.[0]?.node?.url,
    rabatt: 15,
  };
}

function katalogHinweis(anzahl: number, suche: boolean, laedt: boolean) {
  const kern = suche
    ? (anzahl === 1 ? "1 Treffer" : `${anzahl} Treffer`)
    : (anzahl === 1 ? "1 Produkt im Shop" : `${anzahl} Produkte im Shop`);
  return laedt ? `${kern}, weitere werden geladen` : `${kern}.`;
}

const euro = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

export function ProduktAbo() {
  const { user } = useAuth();
  const start = useMemo(liste_laden, []);
  const [standard, setStandard] = useState<number>(start.standard);
  const [wahl, setWahl] = useState<Record<string, number>>({});
  const [produkte, setProdukte] = useState<AboZeile[]>(start.produkte);
  const [suche, setSuche] = useState("");
  const [suchbegriff, setSuchbegriff] = useState("");
  const [zahlweg, setZahlweg] = useState<"gocardless" | "stripe">("gocardless");
  const [laeuft, setLaeuft] = useState(false);
  const [farbeAuf, setFarbeAuf] = useState(0);
  const [farbeStart, setFarbeStart] = useState("");
  const [anmeldung, setAnmeldung] = useState(false);
  const [kategorie, setKategorie] = useState("alle");
  const [vorschau, setVorschau] = useState<ShopifyProduct | null>(null);

  // Auswahl überlebt einen Seitenwechsel — sonst ist die Arbeit weg
  useEffect(() => {
    try {
      localStorage.setItem(ABO_SPEICHER, JSON.stringify({ standard, produkte }));
    } catch { /* privater Modus: dann eben nicht */ }
  }, [standard, produkte]);

  useEffect(() => {
    const neu = () => {
      const geladen = liste_laden();
      setStandard(geladen.standard);
      setProdukte(geladen.produkte);
    };
    window.addEventListener(ABO_EREIGNIS, neu);
    return () => window.removeEventListener(ABO_EREIGNIS, neu);
  }, []);

  // Suche erst abschicken, wenn der Kunde kurz aufhört zu tippen
  useEffect(() => {
    const t = setTimeout(() => setSuchbegriff(suche.trim()), 350);
    return () => clearTimeout(t);
  }, [suche]);

  useEffect(() => { setKategorie("alle"); }, [suchbegriff]);

  const { products, isLoading, hasMore, fehler } = useVollerKatalog(suchbegriff);

  const gesamt = aboListeGesamt(produkte.map((p) => istMenge(p)
    ? { art: "menge", rabatt: p.rabatt, einzelpreis: p.einzelpreis, menge: p.menge }
    : { art: "einzel", rabatt: p.rabatt, preis: p.preis }));

  const drin = (id: string) => produkte.some((p) => p.id === id);

  function wunschOeffnen(handle: string) {
    const m = MISCH_PRODUKTE.find((x) => x.handle === handle);
    if (!m) return false;
    setFarbeStart(m.id);
    setFarbeAuf((n) => n + 1);
    return true;
  }

  function stufeVon(id: string) {
    const gewaehlt = wahl[id];
    return rabattGueltig(gewaehlt) ? gewaehlt : standard;
  }

  function hinzufuegen(p: ShopifyProduct, stufe = standard) {
    const neu = { ...alsAboProdukt(p), rabatt: stufe };
    if (drin(neu.id)) return;
    if (produkte.length >= MAX_PRODUKTE) {
      toast.error(`Mehr als ${MAX_PRODUKTE} Produkte gehen nicht — ruf uns an, dann machen wir es größer.`);
      return;
    }
    setProdukte((alt) => [...alt, neu]);
  }

  async function abschliessen(e: React.FormEvent) {
    e.preventDefault();
    if (!gesamt) { toast.error("Leg zuerst mindestens ein Produkt in die Liste."); return; }
    if (!user) { setAnmeldung(true); return; }
    const mail = user.email?.trim().toLowerCase() || "";
    if (!mail) { toast.error("Bitte E-Mail-Adresse angeben."); return; }

    setLaeuft(true);
    try {
      const auswahl = {
        aboTyp: "produkt" as const,
        email: mail,
        produkte: produkte.map((p) => istMenge(p)
          ? { art: "menge" as const, id: p.id, handle: p.handle, titel: p.titel, variante: p.variante, lacksystem: p.lacksystem, menge: p.menge, einzelpreis: p.einzelpreis, rabatt: p.rabatt }
          : { art: "einzel" as const, id: p.id, handle: p.handle, titel: p.titel, preis: p.preis, rabatt: p.rabatt }),
        price: gesamt.beitrag,
        ref: empfehlungOffen() ? empfehlungLesen() || undefined : undefined,
      };

      // 1) Echte Zahlung versuchen — gleicher Weg wie bei der Dienstleistungs-Mitgliedschaft
      const co = await fetch("/api/membership-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...auswahl, method: zahlweg }),
      });
      const coData = await co.json().catch(() => ({}));
      if (co.ok && coData.url) { window.location.href = coData.url; return; }
      if (co.status === 409 || co.status === 400) {
        throw new Error(coData.error || "Buchung nicht möglich — bitte Seite neu laden.");
      }

      // 2) Anbieter noch nicht eingerichtet → Anfrage per E-Mail, wie gehabt
      const token = (await supabase?.auth.getSession())?.data.session?.access_token;
      const res = await fetch("/api/membership-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(auswahl),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Unbekannter Fehler");
      toast.success("Anfrage gesendet! 📬", {
        description: "Wir melden uns zur Zahlung. Deine Produktliste liegt bei uns.",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div>
      {/* Eingeklappt ganz oben, damit die Karte nicht unter der Produktliste verschwindet. */}
      <div className="max-w-3xl mx-auto mb-8">
        <WunschfarbenLeiste
          rabatt={15}
          oeffnen={farbeAuf}
          start={farbeStart}
          onHinzufuegen={(e) => {
            if (produkte.some((p) => p.id === e.id)) {
              setProdukte((alt) => alt.map((p) => (p.id === e.id && istMenge(p) ? { ...p, menge: p.menge + e.menge } : p)));
              toast.success("Menge erhöht");
              return;
            }
            if (produkte.length >= MAX_PRODUKTE) { toast.error("Liste ist voll — ruf uns an."); return; }
            setProdukte((alt) => [...alt, e]);
          }}
        />
      </div>

      {/* ── Rabattstufe ───────────────────────────────────────────────── */}
      <div id="abo-stufen" className="max-w-3xl mx-auto mb-8 scroll-mt-24">
        <p className="text-center text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Standard für neue Produkte
        </p>
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3" role="group" aria-label="Rabatt wählen">
          {ABO_RABATTE.map((r: number) => {
            const aktiv = r === standard;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setStandard(r)}
                aria-pressed={aktiv}
                className={cn(
                  "rounded-2xl border-2 px-2 py-4 sm:px-4 sm:py-5 text-center transition-all duration-200 min-h-[100px]",
                  aktiv ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
                )}
              >
                <span className={cn("block font-display font-bold leading-none text-2xl sm:text-3xl",
                  aktiv ? "text-primary" : "text-foreground")}>
                  {r}%
                </span>
                <span className="block text-[11px] sm:text-xs text-muted-foreground mt-1.5 leading-snug">
                  {STUFEN_TEXT[r]}
                </span>
                <span className="block text-[11px] sm:text-xs font-semibold mt-1.5">
                  {euro(PRODUKT_ABO_PREISE[r])} / Produkt
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-3">
          Gilt nur für das nächste Produkt, das du hinzufügst. Jede Zeile in der Liste behält ihre eigene Stufe.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start [&>*]:min-w-0">
        <div className="space-y-6 min-w-0">
        {/* ── Produkte suchen und hinzufügen ──────────────────────────── */}
        <div className="card-tilt hover:translate-y-0 p-5 sm:p-6">
          <h3 className="text-lg mb-1">Produkte auswählen</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Such dir die Artikel heraus, die du regelmäßig brauchst.
            {products.length > 0 && (
              <span className="block mt-1">{katalogHinweis(products.length, !!suchbegriff, hasMore || isLoading)}</span>
            )}
          </p>

          <label className="relative block mb-5">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className="input-base pl-10"
              placeholder="Klarlack, Härter, Mikrofasertuch …"
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              aria-label="Produkte suchen"
            />
          </label>

          {isLoading && products.length === 0 && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Produkte werden geladen …
            </p>
          )}

          {suchbegriff && !isLoading && products.length === 0 && (
            <p className="text-sm text-muted-foreground py-6">
              Nichts gefunden zu „{suchbegriff}". Anderer Begriff oder ruf uns an, dann legen wir es für dich an.
            </p>
          )}

          {products.length > 0 && (
            <AboProduktKatalog
              produkte={products.map((p) => ({ ...p.node, quelle: p }))}
              kategorie={kategorie}
              onKategorie={setKategorie}
              karte={(eintrag) => {
                const p = eintrag.quelle;
                const a = alsAboProdukt(p);
                const schon = drin(a.id);
                const misch = MISCH_PRODUKTE.find((m) => m.handle === a.handle);
                const stufe = stufeVon(a.id);
                return (
                  <div className="h-full w-full flex flex-col rounded-xl border border-border p-2.5 bg-card">
                    <button
                      type="button"
                      className="aspect-square rounded-lg bg-white overflow-hidden mb-3 cursor-pointer active:scale-[0.98] transition-transform"
                      onClick={() => setVorschau(p)}
                      aria-haspopup="dialog"
                      aria-label={`Vorschau: ${a.titel}`}
                    >
                      {a.bild && <img src={a.bild} alt="" className="w-full h-full object-contain" loading="lazy" />}
                    </button>
                    <button
                      type="button"
                      className="text-sm font-semibold leading-5 line-clamp-2 h-10 overflow-hidden text-left cursor-pointer hover:text-primary"
                      onClick={() => setVorschau(p)}
                    >
                      {a.titel}
                    </button>
                    <div className="mt-auto pt-3 flex flex-col gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground line-through">
                          {formatPrice(String(a.preis), a.waehrung)}
                        </p>
                        <p className="text-xs text-primary font-semibold leading-tight">
                          als Mitglied {euro(a.preis * (1 - stufe / 100))}
                        </p>
                      </div>
                      {misch ? (
                        <div className="h-8" aria-hidden="true" />
                      ) : (
                        <StufenWahl
                          wert={stufe}
                          label={`Rabatt für ${a.titel}`}
                          onChange={(r) => setWahl((alt) => ({ ...alt, [a.id]: r }))}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (misch) wunschOeffnen(a.handle);
                          if (!schon) hinzufuegen(p, stufe);
                        }}
                        disabled={schon && !misch}
                        aria-label={
                          misch ? `${a.titel} konfigurieren` :
                          schon ? `${a.titel} ist schon in der Liste` : `${a.titel} hinzufügen`
                        }
                        className={cn(
                          "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors min-h-11",
                          schon && !misch
                            ? "bg-secondary text-muted-foreground cursor-default"
                            : "bg-primary text-primary-foreground hover:brightness-95 cursor-pointer"
                        )}
                      >
                        {schon && misch ? "Öffnen" : schon ? <><CheckCircle className="w-4 h-4" /> drin</> : <><Plus className="w-4 h-4" /> Hinzufügen</>}
                      </button>
                    </div>
                  </div>
                );
              }}
            />
          )}
          {(isLoading || hasMore) && products.length > 0 && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground pt-3">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Weitere Produkte …
            </p>
          )}
          {fehler && (
            <p className="text-sm text-destructive pt-3">{fehler}</p>
          )}
        </div>
        </div>

        {/* ── Abo-Liste und Rechner ───────────────────────────────────── */}
        <div className="lg:sticky lg:top-28 space-y-4">
          <div className="card-tilt hover:translate-y-0 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-lg inline-flex items-center gap-2">
                <ShoppingBasket className="w-5 h-5 text-primary" /> Deine Abo-Liste
              </h3>
              <span className="text-sm font-semibold tabular-nums">{produkte.length}</span>
            </div>

            {produkte.length === 0 ? (
              <p className="flex items-start gap-2 text-sm text-muted-foreground py-4">
                <Package className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                Noch nichts drin. Such links ein Produkt und klick auf „Hinzufügen".
              </p>
            ) : (
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {produkte.map((p) => {
                  const m = istMenge(p)
                    ? mengenPosition({ einzelpreis: p.einzelpreis, menge: p.menge, rabatt: p.rabatt })
                    : null;
                  const mitglied = m ? m.mitglied : (p as AboProdukt).preis * (1 - p.rabatt / 100);
                  const beitrag = m ? m.beitrag : PRODUKT_ABO_PREISE[p.rabatt];
                  return (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl bg-secondary/50 p-2.5">
                    <div className="w-12 h-12 rounded-lg bg-background shrink-0 overflow-hidden">
                      {p.bild && <img src={p.bild} alt="" className="w-full h-full object-cover" loading="lazy" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold leading-snug line-clamp-2">{p.titel}</p>
                      {istMenge(p) && m ? (
                        <>
                          <p className="text-[11px] text-muted-foreground leading-tight">
                            {p.variante} · {p.menge}× / Monat
                          </p>
                          <p className="text-xs mt-0.5">
                            <span className="text-muted-foreground line-through mr-1.5">{euro(m.normal)}</span>
                            <span className="text-primary font-bold">{euro(mitglied)}</span>
                          </p>
                        </>
                      ) : (
                        <p className="text-xs mt-0.5">
                          <span className="text-muted-foreground line-through mr-1.5">
                            {formatPrice(String((p as AboProdukt).preis), (p as AboProdukt).waehrung)}
                          </span>
                          <span className="text-primary font-bold">{euro(mitglied)}</span>
                        </p>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <StufenWahl
                          wert={p.rabatt}
                          label={`Rabatt für ${p.titel}`}
                          onChange={(r) => setProdukte((alt) => alt.map((x) => (x.id === p.id ? { ...x, rabatt: r } : x)))}
                        />
                        <span className="text-[11px] text-muted-foreground">{euro(beitrag)} / Monat</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProdukte((alt) => alt.filter((x) => x.id !== p.id))}
                      aria-label={`${p.titel} entfernen`}
                      className="shrink-0 w-8 h-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Live-Rechner */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border-2 border-primary/50 bg-primary/5 p-5 sm:p-6"
          >
            <p className="text-sm text-muted-foreground">Du zahlst</p>
            <p className="font-display font-bold text-3xl tabular-nums leading-none mt-1">
              {euro(gesamt?.beitrag ?? 0)} <span className="text-base font-normal text-muted-foreground">/ Monat</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1.5">
              Summe der Stufen in der Liste. Jedes Produkt zählt einzeln.
            </p>
            {(gesamt?.ersparnis ?? 0) > 0 && (
              <p className="text-sm font-semibold text-red-600 mt-3">
                Du sparst ca. {euro(gesamt?.ersparnis ?? 0)} beim nächsten Einkauf dieser Liste
              </p>
            )}

            <form onSubmit={abschliessen} className="mt-5 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {(["gocardless", "stripe"] as const).map((z) => (
                  <button
                    key={z} type="button" onClick={() => setZahlweg(z)} aria-pressed={zahlweg === z}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs font-semibold transition-colors min-h-[40px]",
                      zahlweg === z ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"
                    )}
                  >
                    {z === "gocardless" ? "SEPA-Lastschrift" : "Karte"}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                disabled={laeuft || produkte.length === 0}
                className={cn("btn-primary w-full", (laeuft || produkte.length === 0) && "opacity-50 cursor-not-allowed")}
              >
                {laeuft ? <><Loader2 className="w-5 h-5 animate-spin" /> Moment …</> : "Zahlungspflichtig bestellen"}
              </button>
            </form>

            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              Der Rabatt gilt nur für die Produkte in dieser Liste. Monatlich kündbar, Produkte
              kannst du im Kundenkonto jederzeit tauschen.
            </p>
          </motion.div>
        </div>
      </div>
      <AboAnmeldung offen={anmeldung} onZu={() => setAnmeldung(false)} />
      {vorschau && (
        <AboVorschau
          produkt={vorschau}
          stufe={stufeVon(vorschau.node.id)}
          schon={drin(vorschau.node.id)}
          misch={!!MISCH_PRODUKTE.find((m) => m.handle === vorschau.node.handle)}
          onStufe={(r) => setWahl((alt) => ({ ...alt, [vorschau.node.id]: r }))}
          onHinzu={() => {
            const misch = MISCH_PRODUKTE.find((m) => m.handle === vorschau.node.handle);
            if (misch) wunschOeffnen(vorschau.node.handle);
            if (!drin(vorschau.node.id)) hinzufuegen(vorschau, stufeVon(vorschau.node.id));
          }}
          onZu={() => setVorschau(null)}
        />
      )}
    </div>
  );
}
