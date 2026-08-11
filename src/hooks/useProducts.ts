import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ShopifyProduct,
  storefrontApiRequest,
  STOREFRONT_PRODUCTS_QUERY,
} from "@/lib/shopify";

interface UseProductsOptions {
  query?: string;
  pageSize?: number;
  /** Alle Seiten am Stück nachladen statt auf "Mehr laden" zu warten.
   *  Nötig für Sortierungen über den GESAMTEN Katalog (z.B. nach Marken):
   *  sonst wird nur die gerade geladene Teilmenge sortiert und das Grid
   *  springt beim Nachladen um. */
  loadAll?: boolean;
}

export function useProducts({ query = "", pageSize = 24, loadAll = false }: UseProductsOptions = {}) {
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

        while (more) {
          const data = await storefrontApiRequest(STOREFRONT_PRODUCTS_QUERY, {
            first: pageSize,
            after,
            query: query || null,
          });
          // Neue Suche/Kategorie gestartet → veraltete Antwort verwerfen
          if (requestId !== requestIdRef.current) return;

          const edges: ShopifyProduct[] = data?.data?.products?.edges ?? [];
          const pageInfo = data?.data?.products?.pageInfo;
          collected = collected.concat(edges);
          after = pageInfo?.endCursor ?? null;
          more = Boolean(pageInfo?.hasNextPage);

          cursorRef.current = after;
          setHasNextPage(more);
          // Zwischenstand sofort rendern — Nutzer wartet nicht auf alle Seiten
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
    [query, pageSize, loadAll]
  );

  useEffect(() => {
    cursorRef.current = null;
    fetchPage(false);
  }, [fetchPage]);

  return { products, isLoading, error, hasNextPage, loadMore: () => fetchPage(true) };
}
