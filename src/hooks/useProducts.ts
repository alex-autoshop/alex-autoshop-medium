import { useCallback, useEffect, useRef, useState } from "react";
import { type ShopifyProduct, storefrontApiRequest, STOREFRONT_PRODUCTS_QUERY } from "@/lib/shopify";
import { kanten, kollektionDirekt, kollektionHolen, leseEinbettung, nimmFrisch, produkteHolen, seitenInfo } from "@/lib/katalog";

interface UseProductsOptions {
  query?: string;
  /** Rohtext der Suche. Wird serverseitig in eine Storefront-Suche übersetzt. */
  suche?: string;
  /** `tag` nimmt Titel und Schlagwort, sonst Titel und Artikelnummer. */
  bereich?: "tag" | "titel";
  /** Kollektions-Handle. Fällt auf `query` zurück, wenn die Collection fehlt. */
  collectionHandle?: string;
  pageSize?: number;
  /** Alle Seiten nachladen, damit Sortierung und Marken über den ganzen Katalog gelten. */
  loadAll?: boolean;
  /** Schlüssel der eingebetteten Daten, z. B. `home` oder `shop:oele:`. */
  einbettung?: string;
}

interface PageInfo {
  hasNextPage?: boolean;
  endCursor?: string | null;
}

/** Einmal pro Sitzung: neue Collections sind (noch) nicht im Headless-Kanal. */
let collectionsOnStorefront: boolean | null = null;

export function useProducts({
  query = "",
  suche = "",
  bereich = "titel",
  collectionHandle,
  pageSize = 24,
  loadAll = false,
  einbettung,
}: UseProductsOptions = {}) {
  const key = einbettung || "";
  const start = key ? leseEinbettung((m) => m.schluessel === key) : null;
  const startKanten = kanten(start) as ShopifyProduct[];
  const [fuer, setFuer] = useState(key);
  const [products, setProducts] = useState<ShopifyProduct[]>(startKanten);
  const [isLoading, setIsLoading] = useState(startKanten.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(Boolean(seitenInfo(start).hasNextPage));
  const cursorRef = useRef<string | null>(seitenInfo(start).endCursor ?? null);
  const requestIdRef = useRef(0);

  if (fuer !== key) {
    const neu = key ? leseEinbettung((m) => m.schluessel === key) : null;
    const edges = kanten(neu) as ShopifyProduct[];
    setFuer(key);
    setProducts(edges);
    setIsLoading(edges.length === 0);
    setError(null);
    setHasNextPage(Boolean(seitenInfo(neu).hasNextPage));
    cursorRef.current = seitenInfo(neu).endCursor ?? null;
  }

  const fetchPage = useCallback(
    async (append: boolean) => {
      const requestId = ++requestIdRef.current;
      if (!append && products.length === 0) setIsLoading(true);
      setError(null);
      try {
        let after = append ? cursorRef.current : null;
        let collected: ShopifyProduct[] = [];
        let more = true;
        let useCollection = Boolean(collectionHandle) && !suche && collectionsOnStorefront !== false;
        let ersteSeite = !append;

        while (more) {
          let edges: ShopifyProduct[] = [];
          let pageInfo: PageInfo | undefined;

          if (useCollection && collectionHandle) {
            const frisch = ersteSeite
              ? await nimmFrisch((m) => Boolean(key) && m?.schluessel === key)
              : null;
            const data = frisch?.data?.collection
              ? frisch
              : await kollektionHolen({ handle: collectionHandle, first: pageSize, after });
            if (requestId !== requestIdRef.current) return;
            const collection = data?.data?.collection;
            if (!collection) {
              const direkt = await kollektionDirekt(collectionHandle, pageSize, after);
              if (requestId !== requestIdRef.current) return;
              if (!direkt?.data?.collection) {
                collectionsOnStorefront = false;
                useCollection = false;
                continue;
              }
              collectionsOnStorefront = true;
              edges = direkt.data.collection.products?.edges ?? [];
              pageInfo = direkt.data.collection.products?.pageInfo;
            } else {
              collectionsOnStorefront = true;
              edges = (collection.products?.edges ?? []) as ShopifyProduct[];
              pageInfo = collection.products?.pageInfo;
            }
          } else {
            const frisch = ersteSeite
              ? await nimmFrisch((m) => Boolean(key) && m?.schluessel === key)
              : null;
            const data = frisch?.data?.products
              ? frisch
              : suche
                ? await produkteHolen({ first: pageSize, after, suche, bereich })
                : query
                  ? await storefrontApiRequest(STOREFRONT_PRODUCTS_QUERY, { first: pageSize, after, query })
                  : await produkteHolen({
                  first: pageSize,
                  after,
                  bereich,
                  einbettung: key === "home" ? "home" : undefined,
                });
            if (requestId !== requestIdRef.current) return;
            edges = (data?.data?.products?.edges ?? []) as ShopifyProduct[];
            pageInfo = data?.data?.products?.pageInfo;
          }

          ersteSeite = false;
          collected = collected.concat(edges);
          after = pageInfo?.endCursor ?? null;
          more = Boolean(pageInfo?.hasNextPage);
          cursorRef.current = after;
          setHasNextPage(more);
          const snapshot = collected;
          setProducts((prev) => (append ? [...prev, ...edges] : snapshot));
          if (!append && snapshot.length) setIsLoading(false);
          if (!loadAll) break;
        }
      } catch (e) {
        if (requestId !== requestIdRef.current) return;
        setError(e instanceof Error ? e.message : "Fehler beim Laden");
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    },
    [query, suche, bereich, collectionHandle, pageSize, loadAll, key, products.length]
  );

  useEffect(() => {
    cursorRef.current = null;
    fetchPage(false);
    // products.length darf den Lauf nicht neu starten, sonst lädt jede Seite doppelt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, suche, bereich, collectionHandle, pageSize, loadAll, key]);

  return { products, isLoading, error, hasNextPage, loadMore: () => fetchPage(true) };
}
