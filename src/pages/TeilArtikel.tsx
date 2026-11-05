import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ausTeileSlug, teilePfad } from "../../shared/teile-pfad.js";
import { Loader2, Package } from "lucide-react";
import { Seo } from "@/components/Seo";
import { apArticlesByNumber, type ApArticle } from "@/lib/autoparts";
import { icPriceLookup } from "@/lib/livePreis";

/**
 * Eine Adresse pro Teilenummer, damit die Nummer geteilt und von Google
 * gelesen werden kann. Der Preis kommt live, sobald er da ist —
 * ohne Preis steht kein erfundener Offer-Preis im Schema.
 */
export default function TeilArtikel() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const ausSlug = slug ? ausTeileSlug(slug).nummer : "";
  const nr = (ausSlug || params.get("nr") || "").trim();
  const [artikel, setArtikel] = useState<ApArticle | null>(null);
  const [preis, setPreis] = useState<number | null>(null);
  const [bestand, setBestand] = useState<string>("");
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState("");

  useEffect(() => {
    if (!nr) return;
    let lebt = true;
    setLaedt(true);
    setFehler("");
    setArtikel(null);
    setPreis(null);
    (async () => {
      try {
        const liste = await apArticlesByNumber(nr);
        const erster = liste[0] || null;
        if (!lebt) return;
        setArtikel(erster);
        if (!erster) setFehler("Diese Nummer steht so nicht im Katalog.");
        const live = await icPriceLookup(erster?.articleNumber || nr, erster?.name).catch(() => null);
        if (!lebt || !live) return;
        setPreis(live.price);
        setBestand(live.availability || "");
      } catch {
        if (lebt) setFehler("Der Katalog ist gerade nicht erreichbar.");
      } finally {
        if (lebt) setLaedt(false);
      }
    })();
    return () => { lebt = false; };
  }, [nr]);

  const name = artikel ? `${artikel.brand} ${artikel.name}`.trim() : (nr ? `Autoteil ${nr}` : "Autoteil");
  const jsonLd = nr
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name,
        sku: artikel?.articleNumber || nr,
        brand: artikel?.brand ? { "@type": "Brand", name: artikel.brand } : undefined,
        image: artikel?.imageUrl,
        url: `https://www.alex-autoshop.de${teilePfad(artikel?.brand || "teil", artikel?.articleNumber || nr)}`,
        ...(preis != null
          ? {
              offers: {
                "@type": "Offer",
                priceCurrency: "EUR",
                price: preis.toFixed(2),
                availability: bestand && !/anfrage/i.test(bestand) ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
                url: `https://www.alex-autoshop.de${teilePfad(artikel?.brand || "teil", artikel?.articleNumber || nr)}`,
              },
            }
          : {}),
      }
    : undefined;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Seo
        title={name}
        description={nr
          ? `Teilenummer ${nr} im TecDoc-Katalog. Preis und Bestand live, Abholung in Wuppertal.`
          : "Teil aus dem TecDoc-Katalog."}
        jsonLd={jsonLd}
      />
      <Link to="/teileboerse" className="text-sm text-muted-foreground hover:text-primary">← Teilebörse</Link>
      <h1 className="text-2xl font-bold mt-3">{name}</h1>
      {!nr && <p className="text-muted-foreground mt-2">Keine Teilenummer in der Adresse.</p>}
      {laedt && <p className="mt-6 flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Katalog wird abgefragt …</p>}
      {fehler && <p className="mt-6 text-sm">{fehler}</p>}
      {artikel && (
        <div className="mt-6 flex gap-4">
          <div className="w-28 h-28 rounded-xl border border-border bg-white flex items-center justify-center p-2">
            {artikel.imageUrl ? <img src={artikel.imageUrl} alt="" className="max-w-full max-h-full object-contain" /> : <Package className="w-8 h-8 text-muted-foreground/40" />}
          </div>
          <div className="text-sm space-y-1">
            <p className="font-mono">{artikel.articleNumber}</p>
            <p>{artikel.brand}</p>
            {preis != null
              ? <p className="text-lg font-bold">{preis.toFixed(2).replace(".", ",")} € <span className="text-xs font-normal text-muted-foreground">inkl. MwSt</span></p>
              : <p className="text-muted-foreground">Preis auf Anfrage</p>}
            {bestand && <p className="text-muted-foreground">{bestand}</p>}
            <p className="text-xs text-muted-foreground">Passung nicht geprüft — dafür das Fahrzeug in der Teilebörse wählen.</p>
            <Link to={`/teileboerse`} className="inline-block mt-2 text-primary font-semibold">In der Teilebörse suchen</Link>
          </div>
        </div>
      )}
    </div>
  );
}
