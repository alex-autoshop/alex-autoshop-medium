import { useEffect, useRef, useState } from "react";
import { type ShopifyProduct } from "@/lib/shopify";
import { produkteHolen } from "@/lib/katalog";

function wartenBisRuhe() {
  return new Promise<void>((resolve) => {
    const fenster = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    if (fenster.requestIdleCallback) {
      fenster.requestIdleCallback(() => resolve(), { timeout: 500 });
      return;
    }
    window.setTimeout(resolve, 80);
  });
}

/**
 * Der ganze veröffentlichte Katalog, Seite für Seite, über den Cache.
 * Die erste Seite erscheint sofort, der Rest läuft in Pausen, damit die
 * Seite tippbar bleibt. `bereit` hält den Abruf zurück, bis der Bereich
 * in der Nähe des Fensters ist.
 */
export function useVollerKatalog(suchbegriff: string, bereit = true) {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const lauf = useRef(0);

  useEffect(() => {
    if (!bereit) return;
    const id = ++lauf.current;
    let aktiv = true;
    setProducts([]);
    setIsLoading(true);
    setFehler(null);
    setHasMore(false);

    (async () => {
      let after: string | null = null;
      let alle: ShopifyProduct[] = [];
      let seiten = 0;
      try {
        while (aktiv && id === lauf.current && seiten < 30) {
          const data = await produkteHolen({
            first: 100,
            after,
            suche: suchbegriff,
            bereich: "tag",
          });
          if (!aktiv || id !== lauf.current) return;
          const kante = data?.data?.products;
          const edges = (kante?.edges ?? []) as ShopifyProduct[];
          const info = kante?.pageInfo;
          alle = alle.concat(edges);
          setProducts(alle);
          if (alle.length) setIsLoading(false);
          after = info?.endCursor ?? null;
          const weiter = Boolean(info?.hasNextPage) && edges.length > 0;
          setHasMore(weiter);
          seiten += 1;
          if (!weiter) break;
          await wartenBisRuhe();
          if (!aktiv || id !== lauf.current) return;
        }
      } catch (e) {
        if (id === lauf.current) setFehler(e instanceof Error ? e.message : "Fehler beim Laden");
      } finally {
        if (id === lauf.current) setIsLoading(false);
      }
    })();

    return () => { aktiv = false; };
  }, [suchbegriff, bereit]);

  return { products, isLoading, hasMore, fehler };
}
