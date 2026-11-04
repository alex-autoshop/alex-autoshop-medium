import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search, Plus, X, Loader2, CheckCircle, ShoppingBasket, Info, Package,
} from "lucide-react";
import { toast } from "sonner";
import { useProducts } from "@/hooks/useProducts";
import { formatPrice, type ShopifyProduct } from "@/lib/shopify";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { empfehlungLesen } from "@/lib/empfehlung";
import {
  ABO_RABATTE, PRODUKT_ABO_PREISE, MAX_PRODUKTE,
  produktAboErsparnis, mengenPosition, aboGesamt,
} from "../../shared/produktabo.js";
import { WunschfarbenLeiste, type MengenEintrag } from "@/components/WunschfarbenLeiste";
import { cn } from "@/lib/utils";

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
}

/** Eine Zeile der Abo-Liste: entweder ein einzelnes Produkt oder eine
 *  Monatsmenge (Wunschfarbe, Spraydose, Lackstift). */
export type AboZeile = AboProdukt | MengenEintrag;

const istMenge = (z: AboZeile): z is MengenEintrag => (z as MengenEintrag).art === "menge";

const SPEICHER = "alex-produktabo-v1";

const STUFEN_TEXT: Record<number, string> = {
  15: "Einstieg",
  28: "Für laufende Betriebe",
  40: "Höchstrabatt",
};

function liste_laden(): { rabatt: number; produkte: AboZeile[] } {
  try {
    const roh = localStorage.getItem(SPEICHER);
    if (!roh) return { rabatt: 28, produkte: [] };
    const d = JSON.parse(roh);
    return {
      rabatt: ABO_RABATTE.includes(d?.rabatt) ? d.rabatt : 28,
      produkte: Array.isArray(d?.produkte) ? d.produkte.slice(0, MAX_PRODUKTE) : [],
    };
  } catch {
    return { rabatt: 28, produkte: [] };
  }
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
  };
}

const euro = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

export function ProduktAbo() {
  const { user } = useAuth();
  const start = useMemo(liste_laden, []);
  const [rabatt, setRabatt] = useState<number>(start.rabatt);
  const [produkte, setProdukte] = useState<AboZeile[]>(start.produkte);
  const [suche, setSuche] = useState("");
  const [suchbegriff, setSuchbegriff] = useState("");
  const [email, setEmail] = useState("");
  const [zahlweg, setZahlweg] = useState<"gocardless" | "stripe">("gocardless");
  const [laeuft, setLaeuft] = useState(false);

  // Auswahl überlebt einen Seitenwechsel — sonst ist die Arbeit weg
  useEffect(() => {
    try {
      localStorage.setItem(SPEICHER, JSON.stringify({ rabatt, produkte }));
    } catch { /* privater Modus: dann eben nicht */ }
  }, [rabatt, produkte]);

  // Suche erst abschicken, wenn der Kunde kurz aufhört zu tippen
  useEffect(() => {
    const t = setTimeout(() => setSuchbegriff(suche.trim()), 350);
    return () => clearTimeout(t);
  }, [suche]);

  const { products, isLoading } = useProducts({
    query: suchbegriff ? `title:*${suchbegriff}* OR tag:*${suchbegriff}*` : "",
    pageSize: 12,
  });

  const einzelne = produkte.filter((p) => !istMenge(p)) as AboProdukt[];
  const mengen = produkte.filter(istMenge);
  const gesamt = aboGesamt({
    rabatt,
    einzelAnzahl: einzelne.length,
    mengen: mengen.map((m) => ({ einzelpreis: m.einzelpreis, menge: m.menge })),
  });
  const summeNormal = einzelne.reduce((s, p) => s + p.preis, 0);
  const ersparnis = produktAboErsparnis(summeNormal, rabatt) + (gesamt?.ersparnisMengen ?? 0);
  const proProdukt = PRODUKT_ABO_PREISE[rabatt];

  const drin = (id: string) => produkte.some((p) => p.id === id);

  function hinzufuegen(p: ShopifyProduct) {
    const neu = alsAboProdukt(p);
    if (drin(neu.id)) return;
    if (produkte.length >= MAX_PRODUKTE) {
      toast.error(`Mehr als ${MAX_PRODUKTE} Produkte gehen nicht — ruf uns an, dann machen wir es größer.`);
      return;
    }
    setProdukte((alt) => [...alt, neu]);
  }

  async function abschliessen(e: React.FormEvent) {
    e.preventDefault();
    const mail = (user?.email || email).trim().toLowerCase();
    if (!mail) { toast.error("Bitte E-Mail-Adresse angeben."); return; }
    if (!gesamt) { toast.error("Leg zuerst mindestens ein Produkt in die Liste."); return; }

    setLaeuft(true);
    try {
      const auswahl = {
        aboTyp: "produkt" as const,
        email: mail,
        rabatt,
        produkte: produkte.map((p) => istMenge(p)
          ? { id: p.id, handle: p.handle, titel: p.titel, variante: p.variante, menge: p.menge, einzelpreis: p.einzelpreis }
          : { id: p.id, handle: p.handle, titel: p.titel }),
        price: gesamt.beitrag,
        ref: empfehlungLesen() || undefined,
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
      if (!user) setEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div>
      {/* ── Rabattstufe ───────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto mb-8">
        <p className="text-center text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Wie viel Rabatt willst du?
        </p>
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3" role="group" aria-label="Rabatt wählen">
          {ABO_RABATTE.map((r: number) => {
            const aktiv = r === rabatt;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRabatt(r)}
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
          Du zahlst pro Produkt in deiner Liste, nicht für den ganzen Shop. Monatlich kündbar,
          Produkte jederzeit austauschbar.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start [&>*]:min-w-0">
        <div className="space-y-6 min-w-0">
        <WunschfarbenLeiste
          rabatt={rabatt}
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

        {/* ── Produkte suchen und hinzufügen ──────────────────────────── */}
        <div className="card-tilt hover:translate-y-0 p-5 sm:p-6">
          <h3 className="text-lg mb-1">Produkte auswählen</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Such dir die Artikel heraus, die du regelmäßig brauchst.
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

          {isLoading && suchbegriff && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Suche läuft …
            </p>
          )}

          {!suchbegriff && (
            <p className="flex items-start gap-2 text-sm text-muted-foreground py-6">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              Tipp dein Produkt ein — zum Beispiel „Klarlack" oder den Markennamen.
            </p>
          )}

          {suchbegriff && !isLoading && products.length === 0 && (
            <p className="text-sm text-muted-foreground py-6">
              Nichts gefunden zu „{suchbegriff}". Anderer Begriff oder ruf uns an, dann legen wir es für dich an.
            </p>
          )}

          <div className="space-y-2.5">
            {products.map((p) => {
              const a = alsAboProdukt(p);
              const schon = drin(a.id);
              return (
                <div key={a.id} className="flex items-center gap-3 rounded-xl border border-border p-2.5">
                  <div className="w-14 h-14 rounded-lg bg-secondary shrink-0 overflow-hidden">
                    {a.bild && <img src={a.bild} alt="" className="w-full h-full object-cover" loading="lazy" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-snug line-clamp-2">{a.titel}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-through">
                      {formatPrice(String(a.preis), a.waehrung)}
                    </p>
                    <p className="text-xs text-primary font-semibold leading-tight">
                      als Mitglied {euro(a.preis * (1 - rabatt / 100))}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => hinzufuegen(p)}
                    disabled={schon}
                    aria-label={schon ? `${a.titel} ist schon in der Liste` : `${a.titel} hinzufügen`}
                    className={cn(
                      "shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors min-h-[40px]",
                      schon ? "bg-secondary text-muted-foreground cursor-default"
                            : "bg-primary text-primary-foreground hover:brightness-95"
                    )}
                  >
                    {schon ? <><CheckCircle className="w-4 h-4" /> drin</> : <><Plus className="w-4 h-4" /> Hinzufügen</>}
                  </button>
                </div>
              );
            })}
          </div>
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
                  const m = istMenge(p) ? mengenPosition({ einzelpreis: p.einzelpreis, menge: p.menge, rabatt }) : null;
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
                            <span className="text-primary font-bold">{euro(m.mitglied)}</span>
                          </p>
                        </>
                      ) : (
                        <p className="text-xs mt-0.5">
                          <span className="text-muted-foreground line-through mr-1.5">
                            {formatPrice(String((p as AboProdukt).preis), (p as AboProdukt).waehrung)}
                          </span>
                          <span className="text-primary font-bold">
                            {euro((p as AboProdukt).preis * (1 - rabatt / 100))}
                          </span>
                        </p>
                      )}
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
              {einzelne.length > 0 && <>{einzelne.length} × {euro(proProdukt)}</>}
              {einzelne.length > 0 && mengen.length > 0 && " · "}
              {mengen.length > 0 && <>{mengen.length} Mengen-Position{mengen.length === 1 ? "" : "en"}</>}
            </p>
            {ersparnis > 0 && (
              <p className="text-sm font-semibold text-red-600 mt-3">
                Du sparst ca. {euro(ersparnis)} im Monat
              </p>
            )}

            <form onSubmit={abschliessen} className="mt-5 space-y-3">
              {!user && (
                <input
                  type="email" required className="input-base" value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="deine@email.de"
                  aria-label="E-Mail-Adresse"
                />
              )}
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
                {laeuft ? <><Loader2 className="w-5 h-5 animate-spin" /> Moment …</> : "Produkt-Abo abschließen"}
              </button>
            </form>

            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              Der Rabatt gilt nur für die Produkte in dieser Liste. Monatlich kündbar, Produkte
              kannst du im Kundenkonto jederzeit tauschen.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
