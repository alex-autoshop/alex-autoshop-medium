import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import { WunschfarbenLeiste, type MengenEintrag } from "@/components/WunschfarbenLeiste";
import { istAboKonfigurator } from "../../shared/abo-kategorien.js";
import { cn } from "@/lib/utils";
import { ABO_EREIGNIS, ABO_SPEICHER, aboListeLesen } from "@/lib/aboListe";
import { AboAnmeldung } from "@/components/AboAnmeldung";
import { AboProduktKatalog } from "@/components/AboProduktKatalog";
import { AboVorschau } from "@/components/AboVorschau";
import { aboBildStil } from "../../shared/abo-bildrahmen.js";
import { gefahrstoffVonKnoten, kaufGesperrt } from "../../shared/gefahrstoff.js";
import { BaldVerfuegbar, GefahrstoffKompakt } from "@/components/GefahrstoffHinweis";
import { AboLeisteMobil } from "@/components/AboLeisteMobil";

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
  /** true, wenn die Varianten verschiedene Preise haben — dann „ab …“. */
  ab?: boolean;
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

function StufenWahl({ wert, onChange, label, knapp = false }: {
  wert: number; onChange: (n: number) => void; label: string; knapp?: boolean;
}) {
  return (
    <div role="group" aria-label={label} className="flex w-full rounded-lg border border-border overflow-hidden">
      {ABO_RABATTE.map((r) => (
        <button
          key={r}
          type="button"
          aria-pressed={wert === r}
          onClick={() => onChange(r)}
          className={cn(
            "flex-1 basis-0 min-w-0 cursor-pointer px-1 text-[11px] font-semibold text-center",
            knapp ? "min-h-10 py-1" : "min-h-[32px] py-1",
            wert === r ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-primary/10"
          )}
        >
          {r}%
        </button>
      ))}
    </div>
  );
}

/** Kleinster Variantenpreis über 0, wie auf der Produktkarte. „ab“, wenn sie auseinanderliegen. */
function preisLage(p: ShopifyProduct): { preis: number; ab: boolean } {
  const betraege = (p.node.variants?.edges ?? [])
    .map((e) => parseFloat(e.node.price?.amount ?? ""))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (betraege.length) {
    const min = Math.min(...betraege);
    const max = Math.max(...betraege);
    return { preis: min, ab: max - min > 0.009 };
  }
  const min = parseFloat(p.node.priceRange?.minVariantPrice?.amount ?? "");
  return { preis: Number.isFinite(min) && min > 0 ? min : 0, ab: false };
}

function alsAboProdukt(p: ShopifyProduct): AboProdukt {
  const n = p.node;
  const lage = preisLage(p);
  return {
    id: n.id,
    handle: n.handle,
    titel: n.title,
    preis: lage.preis,
    ab: lage.ab,
    waehrung: n.priceRange?.minVariantPrice?.currencyCode ?? "EUR",
    bild: n.images?.edges?.[0]?.node?.url,
    rabatt: 15,
  };
}

/** Dieselbe Rechnung wie „als Mitglied“ auf der Karte: Normalpreis × (1 − Stufe). */
function AboPreis({ normal, mitglied, ab, rabatt, beitrag }: {
  normal: number; mitglied: number; ab?: boolean; rabatt: number; beitrag: number;
}) {
  const vor = ab ? "ab " : "";
  return (
    <div className="mt-0.5">
      <p className="text-xs leading-snug">
        <span className="text-muted-foreground line-through">{vor}{euro(normal)}</span>
        {" "}
        <span className="font-semibold text-primary">Dein Preis {vor}{euro(mitglied)} ({rabatt} %)</span>
      </p>
      <p className="text-[11px] text-muted-foreground">Abo: {euro(beitrag)} / Monat</p>
    </div>
  );
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
  const [blatt, setBlatt] = useState(false);
  const listeRef = useRef<HTMLDivElement>(null);
  const [listeSichtbar, setListeSichtbar] = useState(false);

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

  useEffect(() => {
    const el = listeRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([eintrag]) => setListeSichtbar(eintrag.isIntersecting),
      { threshold: 0, rootMargin: "0px 0px -72px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (produkte.length === 0) setBlatt(false);
  }, [produkte.length]);

  useEffect(() => {
    if (!blatt) return;
    const zu = (e: KeyboardEvent) => { if (e.key === "Escape") setBlatt(false); };
    document.addEventListener("keydown", zu);
    const vorher = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", zu);
      document.body.style.overflow = vorher;
    };
  }, [blatt]);

  const { products: rohProdukte, isLoading, hasMore, fehler } = useVollerKatalog(suchbegriff);
  const products = useMemo(
    () => rohProdukte.filter((p) => !istAboKonfigurator(p.node.handle)),
    [rohProdukte],
  );

  const gesamt = aboListeGesamt(produkte.map((p) => istMenge(p)
    ? { art: "menge", rabatt: p.rabatt, einzelpreis: p.einzelpreis, menge: p.menge }
    : { art: "einzel", rabatt: p.rabatt, preis: p.preis }));

  const drin = (id: string) => produkte.some((p) => p.id === id);

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
    <div className={produkte.length > 0 ? "abo-unten" : undefined}>
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
          Die drei Stufen
        </p>
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {ABO_RABATTE.map((r: number) => (
            <div
              key={r}
              className="rounded-2xl border-2 border-border bg-card px-2 py-4 sm:px-4 sm:py-5 text-center min-h-[100px]"
            >
              <span className="block font-display font-bold leading-none text-2xl sm:text-3xl text-foreground">
                {r}%
              </span>
              <span className="block text-[11px] sm:text-xs text-muted-foreground mt-1.5 leading-snug">
                {STUFEN_TEXT[r]}
              </span>
              <span className="block text-[11px] sm:text-xs font-semibold mt-1.5">
                {euro(PRODUKT_ABO_PREISE[r])} / Produkt
              </span>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-3">
          Die Stufe wählst du direkt bei jedem Produkt.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start [&>*]:min-w-0">
        <div className="space-y-6 min-w-0">
        {/* ── Produkte suchen und hinzufügen ──────────────────────────── */}
        <div className="card-tilt hover:translate-y-0 p-3 sm:p-4 lg:p-5">
          <h3 className="text-lg mb-1">Produkte auswählen</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Such dir die Artikel heraus, die du regelmäßig brauchst.
            {products.length > 0 && (
              <span className="block mt-1">{katalogHinweis(products.length, !!suchbegriff, hasMore || isLoading)}</span>
            )}
          </p>

          <label className="relative block mb-5">
            <span className="sr-only">Produkte suchen</span>
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              className="input-base pl-10"
              placeholder="Klarlack, Härter, Mikrofasertuch …"
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
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
                const stufe = stufeVon(a.id);
                const gefahr = gefahrstoffVonKnoten(p.node);
                const gesperrt = kaufGesperrt(gefahr);
                return (
                  <div className="h-full w-full flex flex-col rounded-lg border border-border p-1.5 lg:p-2 bg-card">
                    <button
                      type="button"
                      className="aspect-[4/3] rounded-md bg-white overflow-hidden mb-1.5 cursor-pointer active:scale-[0.98] transition-transform"
                      onClick={() => setVorschau(p)}
                      aria-haspopup="dialog"
                      aria-label={`Vorschau: ${a.titel}`}
                    >
                      {a.bild && (
                        <img
                          src={a.bild}
                          alt=""
                          className="w-full h-full object-contain object-center"
                          style={aboBildStil(a.handle)}
                          loading="lazy"
                        />
                      )}
                    </button>
                    <button
                      type="button"
                      lang="de"
                      className="produkt-titel text-left cursor-pointer hover:text-primary"
                      onClick={() => setVorschau(p)}
                    >
                      {a.titel}
                    </button>
                    {gefahr.ist && !gesperrt && <div className="mt-1"><GefahrstoffKompakt g={gefahr} /></div>}
                    <div className="mt-auto pt-1.5 flex flex-col gap-1.5">
                      {a.preis > 0 && (
                        <div>
                          <p className="text-[11px] text-muted-foreground line-through leading-tight">
                            {formatPrice(String(a.preis), a.waehrung)}
                          </p>
                          <p className="text-[11px] lg:text-xs text-primary font-semibold leading-tight">
                            als Mitglied {euro(a.preis * (1 - stufe / 100))}
                          </p>
                        </div>
                      )}
                      <StufenWahl
                        knapp
                        wert={stufe}
                        label={`Rabatt für ${a.titel}`}
                        onChange={(r) => setWahl((alt) => ({ ...alt, [a.id]: r }))}
                      />
                      {gesperrt ? <BaldVerfuegbar /> : <button
                        type="button"
                        onClick={() => { if (!schon) hinzufuegen(p, stufe); }}
                        disabled={schon}
                        aria-label={schon ? `${a.titel} ist schon in der Liste` : `${a.titel} hinzufügen`}
                        className={cn(
                          "inline-flex items-center justify-center gap-1 rounded-lg px-2 text-[11px] lg:text-xs font-semibold transition-colors min-h-10 whitespace-nowrap",
                          schon
                            ? "bg-secondary text-muted-foreground cursor-default"
                            : "bg-primary text-primary-foreground hover:brightness-95 cursor-pointer"
                        )}
                      >
                        {schon ? <><CheckCircle className="w-3.5 h-3.5" /> drin</> : <><Plus className="w-3.5 h-3.5" /> Hinzufügen</>}
                      </button>}
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
        <div id="abo-liste" ref={listeRef} className="lg:sticky lg:top-28 space-y-4 scroll-mt-28">
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
                      <p lang="de" className="produkt-titel">{p.titel}</p>
                      {istMenge(p) && (
                        <p className="text-[11px] text-muted-foreground leading-tight">
                          {p.variante} · {p.menge}× / Monat
                        </p>
                      )}
                      <AboPreis
                        normal={m ? m.normal : (p as AboProdukt).preis}
                        mitglied={mitglied}
                        ab={!m && (p as AboProdukt).ab}
                        rabatt={p.rabatt}
                        beitrag={beitrag}
                      />
                      <div className="mt-1.5">
                        <StufenWahl
                          wert={p.rabatt}
                          label={`Rabatt für ${p.titel}`}
                          onChange={(r) => setProdukte((alt) => alt.map((x) => (x.id === p.id ? { ...x, rabatt: r } : x)))}
                        />
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
            <p className="text-sm text-muted-foreground">Monatlich gesamt</p>
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
      <AboLeisteMobil
        produkte={produkte.map((p) => ({ id: p.id, titel: p.titel, bild: p.bild }))}
        beitrag={gesamt?.beitrag ?? 0}
        mitglied={gesamt ? Math.round(gesamt.zeilen.reduce((s, z) => s + z.mitglied, 0) * 100) / 100 : 0}
        verdeckt={listeSichtbar || blatt}
        onAnsehen={() => setBlatt(true)}
      />
      {blatt && createPortal(
        <div className="lg:hidden fixed inset-0 z-[45] flex items-end">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Schließen" onClick={() => setBlatt(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="abo-blatt-titel"
            className="relative flex max-h-[88vh] w-full flex-col rounded-t-3xl bg-background shadow-2xl"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + var(--abo-cookie, 0px))" }}
          >
            <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
              <h3 id="abo-blatt-titel" className="text-lg inline-flex items-center gap-2">
                <ShoppingBasket className="w-5 h-5 text-primary" /> Deine Abo-Liste
              </h3>
              <button
                type="button"
                onClick={() => setBlatt(false)}
                aria-label="Abo-Liste schließen"
                className="w-11 h-11 rounded-full border border-border inline-flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-4 pb-4 space-y-3">
              {produkte.map((p) => {
                const m = istMenge(p)
                  ? mengenPosition({ einzelpreis: p.einzelpreis, menge: p.menge, rabatt: p.rabatt })
                  : null;
                const beitrag = m ? m.beitrag : PRODUKT_ABO_PREISE[p.rabatt];
                return (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl bg-secondary/50 p-2.5">
                    <div className="w-12 h-12 rounded-lg bg-background shrink-0 overflow-hidden">
                      {p.bild && <img src={p.bild} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p lang="de" className="produkt-titel">{p.titel}</p>
                      {istMenge(p) && (
                        <p className="text-[11px] text-muted-foreground leading-tight">{p.variante}</p>
                      )}
                      <AboPreis
                        normal={m ? m.normal : (p as AboProdukt).preis}
                        mitglied={m ? m.mitglied : (p as AboProdukt).preis * (1 - p.rabatt / 100)}
                        ab={!m && (p as AboProdukt).ab}
                        rabatt={p.rabatt}
                        beitrag={beitrag}
                      />
                      <div className="mt-1.5">
                        <StufenWahl
                          wert={p.rabatt}
                          label={`Rabatt für ${p.titel}`}
                          onChange={(r) => setProdukte((alt) => alt.map((x) => (x.id === p.id ? { ...x, rabatt: r } : x)))}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProdukte((alt) => alt.filter((x) => x.id !== p.id))}
                      aria-label={`${p.titel} entfernen`}
                      className="shrink-0 w-11 h-11 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
              <form onSubmit={abschliessen} className="rounded-2xl border-2 border-primary/50 bg-primary/5 p-4 space-y-3">
                <p className="text-sm text-muted-foreground">Monatlich gesamt</p>
                <p className="font-display font-bold text-2xl tabular-nums leading-none">
                  {euro(gesamt?.beitrag ?? 0)} <span className="text-base font-normal text-muted-foreground">/ Monat</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(["gocardless", "stripe"] as const).map((z) => (
                    <button
                      key={z} type="button" onClick={() => setZahlweg(z)} aria-pressed={zahlweg === z}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-xs font-semibold min-h-11",
                        zahlweg === z ? "border-primary bg-primary/10 text-primary" : "border-border"
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
            </div>
          </div>
        </div>,
        document.body,
      )}
      <AboAnmeldung offen={anmeldung} onZu={() => setAnmeldung(false)} />
      {vorschau && (
        <AboVorschau
          produkt={vorschau}
          stufe={stufeVon(vorschau.node.id)}
          schon={drin(vorschau.node.id)}
          misch={false}
          onStufe={(r) => setWahl((alt) => ({ ...alt, [vorschau.node.id]: r }))}
          onHinzu={() => {
            if (!drin(vorschau.node.id)) hinzufuegen(vorschau, stufeVon(vorschau.node.id));
          }}
          onZu={() => setVorschau(null)}
        />
      )}
    </div>
  );
}
