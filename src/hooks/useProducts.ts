import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ShopifyProduct,
  storefrontApiRequest,
  STOREFRONT_PRODUCTS_QUERY,
} from "@/lib/shopify";

interface UseProductsOptions {
  query?: string;
  pageSize?: number;
}

export function useProducts({ query = "", pageSize = 24 }: UseProductsOptions = {}) {
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
        const data = await storefrontApiRequest(STOREFRONT_PRODUCTS_QUERY, {
          first: pageSize,
          after: append ? cursorRef.current : null,
          query: query || null,
        });
        if (requestId !== requestIdRef.current) return;
        const edges: ShopifyProduct[] = data?.data?.products?.edges ?? [];
        const pageInfo = data?.data?.products?.pageInfo;
        cursorRef.current = pageInfo?.endCursor ?? null;
        setHasNextPage(Boolean(pageInfo?.hasNextPage));
        setProducts((prev) => (append ? [...prev, ...edges] : edges));
      } catch (e) {
        if (requestId !== requestIdRef.current) return;
        setError(e instanceof Error ? e.message : "Fehler beim Laden");
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    },
    [query, pageSize]
  );

  useEffect(() => {
    cursorRef.current = null;
    fetchPage(false);
  }, [fetchPage]);

  return { products, isLoading, error, hasNextPage, loadMore: () => fetchPage(true) };
}
