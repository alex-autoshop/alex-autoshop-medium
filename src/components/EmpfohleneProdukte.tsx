import { useEffect, useMemo, useState } from "react";
import { type ShopifyProduct, storefrontApiRequest, STOREFRONT_PRODUCTS_QUERY } from "@/lib/shopify";
import { brandOf } from "@/lib/marken";
import { ProductCard } from "@/components/ProductCard";
import { useCartStore } from "@/stores/cartStore";
import { ansichtMerken, profilAusVerlauf, profilLeer, verlaufLesen } from "../../shared/gesehen.js";
import {
  empfehle,
  kandidatBauen,
  suchanfragen,
  type EmpfehlungsKandidat,
} from "../../shared/produktempfehlung.js";

type ProduktKnoten = ShopifyProduct["node"];

function ausgeblendet(handle: string) {
  return /friz/i.test(handle)
    || handle.startsWith("hochglanz-antihologramm-politur")
    || handle.startsWith("schleifpaste-perfect-heavy-cut");
}

function zuKandidat(p: ShopifyProduct): EmpfehlungsKandidat {
  const n = p.node;
  const varianten = n.variants?.edges ?? [];
  return kandidatBauen({
    handle: n.handle,
    title: n.title,
    marke: brandOf(p),
    art: n.productType || "",
    tags: n.tags || [],
    verfuegbar: varianten.length === 0 || varianten.some((e) => e.node.availableForSale),
  });
}

function Skelett() {
  return (
    <div className="card-tilt overflow-hidden">
      <div className="aspect-square bg-secondary animate-pulse" />
      <div className="p-4 space-y-2">
        <div className="h-10 bg-secondary rounded animate-pulse" />
        <div className="h-7 bg-secondary rounded w-1/2 animate-pulse" />
        <div className="h-10 bg-secondary rounded animate-pulse" />
      </div>
    </div>
  );
}

/**
 * Empfohlene Produkte unter der Beschreibung.
 * Gleiche Marke und Kategorie, dazu Härter, Verdünnung, Klarlack.
 * Zurückkehrende Besucher: zuletzt angesehene Marken und der Warenkorb
 * verschieben die Reihenfolge, bleiben aber auf diesem Gerät.
 */
export function EmpfohleneProdukte({ produkt }: { produkt: ProduktKnoten }) {
  const [pool, setPool] = useState<ShopifyProduct[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [profil, setProfil] = useState(() => profilAusVerlauf(verlaufLesen()));
  const korb = useCartStore((s) => s.items);

  const aktuell = useMemo(() => zuKandidat({ node: produkt }), [produkt]);

  useEffect(() => {
    // Profil vor dem Merken lesen, sonst zählt der gerade offene Artikel schon als Verlauf.
    setProfil(profilAusVerlauf(verlaufLesen()));
    ansichtMerken({
      h: aktuell.handle,
      m: aktuell.marke,
      k: aktuell.kategorie,
      a: aktuell.art,
      f: aktuell.familien,
    });
  }, [aktuell]);

  useEffect(() => {
    let aktiv = true;
    setLaedt(true);
    setPool([]);
    const anfragen = suchanfragen(aktuell);
    Promise.all(
      anfragen.map((query) =>
        storefrontApiRequest(STOREFRONT_PRODUCTS_QUERY, { first: 24, query }).catch(() => null),
      ),
    )
      .then((seiten) => {
        if (!aktiv) return;
        const nachHandle = new Map<string, ShopifyProduct>();
        for (const seite of seiten) {
          const kanten = seite?.data?.products?.edges ?? [];
          for (const kante of kanten) {
            if (kante?.node?.handle) nachHandle.set(kante.node.handle, kante);
          }
        }
        setPool([...nachHandle.values()]);
      })
      .finally(() => {
        if (aktiv) setLaedt(false);
      });
    return () => {
      aktiv = false;
    };
  }, [aktuell]);

  const warenkorb = useMemo(() => {
    const marken: string[] = [];
    const familien: string[] = [];
    const handles: string[] = [];
    for (const zeile of korb) {
      if (!zeile.product?.node?.handle) continue;
      const k = zuKandidat(zeile.product);
      handles.push(k.handle);
      if (k.marke && !marken.includes(k.marke)) marken.push(k.marke);
      for (const f of k.familien) if (!familien.includes(f)) familien.push(f);
    }
    return { marken, familien, handles };
  }, [korb]);

  const liste = useMemo(() => {
    const karte = new Map(pool.map((p) => [p.node.handle, p]));
    const gewaehlt = empfehle(
      pool.map(zuKandidat),
      { produkt: aktuell, profil, warenkorb, sperre: ausgeblendet },
      12,
    );
    return gewaehlt.map((k) => karte.get(k.handle)).filter((p): p is ShopifyProduct => Boolean(p));
  }, [pool, aktuell, warenkorb, profil]);

  const personalisiert = !profilLeer(profil);

  const hinweis = personalisiert
    ? "Passend zu diesem Artikel und zu dem, was Sie zuletzt angesehen haben."
    : "Gleiche Marke, gleiche Kategorie und Ergänzungen wie Härter, Verdünnung und Klarlack.";

  return (
    <section className="mt-14" aria-labelledby="empfohlene-produkte" aria-busy={laedt}>
      <div className="mb-5">
        <h2 id="empfohlene-produkte" className="text-xl sm:text-2xl">Empfohlene Produkte</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{hinweis}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 items-stretch">
        {laedt && Array.from({ length: 8 }).map((_, i) => <Skelett key={i} />)}
        {!laedt && liste.map((p) => <ProductCard key={p.node.id} product={p} />)}
      </div>
      {!laedt && liste.length === 0 && (
        <p className="text-sm text-muted-foreground">Aktuell keine passenden Empfehlungen.</p>
      )}
    </section>
  );
}
