import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ShopifyProduct,
  storefrontApiRequest,
  STOREFRONT_COLLECTION_PRODUCTS_QUERY,
  STOREFRONT_PRODUCTS_QUERY,
} from "@/lib/shopify";

interface UseProductsOptions {
  query?: string;
  /** Kollektions-Handle. Wird zuerst über die Storefront-API geladen;
   *  fällt auf `query` zurück, wenn die Collection nicht veröffentlicht ist. */
  collectionHandle?: string;
  pageSize?: number;
  /** Alle Seiten am Stück nachladen statt auf "Mehr laden" zu warten.
   *  Nötig für Sortierungen über den GESAMTEN Katalog (z.B. nach Marken):
   *  sonst wird nur die gerade geladene Teilmenge sortiert und das Grid
   *  springt beim Nachladen um. */
  loadAll?: boolean;
}

interface PageInfo {
  hasNextPage?: boolean;
  endCursor?: string | null;
}

/** Einmal pro Sitzung: neue Collections sind (noch) nicht im Headless-Kanal. */
let collectionsOnStorefront: boolean | null = null;

export function useProducts({
  query = "",
  collectionHandle,
  pageSize = 24,
  loadAll = false,
}: UseProductsOptions = {}) {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const cursorRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchPage = useCallback(
    async (append: boolean) => {
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      setError(null);
      try {
        let after = append ? cursorRef.current : null;
        let collected: ShopifyProduct[] = [];
        let more = true;
        let useCollection = Boolean(collectionHandle) && collectionsOnStorefront !== false;

        while (more) {
          let edges: ShopifyProduct[] = [];
          let pageInfo: PageInfo | undefined;

          if (useCollection && collectionHandle) {
            const data = await storefrontApiRequest(STOREFRONT_COLLECTION_PRODUCTS_QUERY, {
              handle: collectionHandle,
              first: pageSize,
              after,
            });
            if (requestId !== requestIdRef.current) return;
            const collection = data?.data?.collection;
            if (!collection) {
              // Nicht im Headless-Kanal — für den Rest der Sitzung die Regel-Suche nutzen.
              collectionsOnStorefront = false;
              useCollection = false;
              continue;
            }
            collectionsOnStorefront = true;
            edges = collection.products?.edges ?? [];
            pageInfo = collection.products?.pageInfo;
          } else {
            const data = await storefrontApiRequest(STOREFRONT_PRODUCTS_QUERY, {
              first: pageSize,
              after,
              query: query || null,
            });
            if (requestId !== requestIdRef.current) return;
            edges = data?.data?.products?.edges ?? [];
            pageInfo = data?.data?.products?.pageInfo;
          }

          collected = collected.concat(edges);
          after = pageInfo?.endCursor ?? null;
          more = Boolean(pageInfo?.hasNextPage);

          cursorRef.current = after;
          setHasNextPage(more);
          const snapshot = collected;
          setProducts((prev) => (append ? [...prev, ...edges] : snapshot));

          if (!loadAll) break;
        }
      } catch (e) {
        if (requestId !== requestIdRef.current) return;
        setError(e instanceof Error ? e.message : "Fehler beim Laden");
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    },
    [query, collectionHandle, pageSize, loadAll]
  );

  useEffect(() => {
    cursorRef.current = null;
    fetchPage(false);
  }, [fetchPage]);

  return { products, isLoading, error, hasNextPage, loadMore: () => fetchPage(true) };
}
