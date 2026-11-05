import { useEffect, useRef, useState } from "react";
import {
  type ShopifyProduct,
  storefrontApiRequest,
  STOREFRONT_PRODUCTS_QUERY,
} from "@/lib/shopify";

/**
 * Der ganze veröffentlichte Katalog, Seite für Seite.
 * Vorher lieferte die Auswahl nur die erste Storefront-Seite (etwa ein Dutzend Artikel) und hörte auf.
 */
export function useVollerKatalog(suchbegriff: string) {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const lauf = useRef(0);

  useEffect(() => {
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
          const data = await storefrontApiRequest(STOREFRONT_PRODUCTS_QUERY, {
            first: 50,
            after,
            query: suchbegriff ? `title:*${suchbegriff}* OR tag:*${suchbegriff}*` : null,
          });
          if (!aktiv || id !== lauf.current) return;
          const kante = data?.data?.products;
          const edges: ShopifyProduct[] = kante?.edges ?? [];
          const info = kante?.pageInfo;
          alle = alle.concat(edges);
          setProducts(alle);
          after = info?.endCursor ?? null;
          const weiter = Boolean(info?.hasNextPage) && edges.length > 0;
          setHasMore(weiter);
          seiten += 1;
          if (!weiter) break;
        }
      } catch (e) {
        if (id === lauf.current) setFehler(e instanceof Error ? e.message : "Fehler beim Laden");
      } finally {
        if (id === lauf.current) setIsLoading(false);
      }
    })();

    return () => { aktiv = false; };
  }, [suchbegriff]);

  return { products, isLoading, hasMore, fehler };
}
