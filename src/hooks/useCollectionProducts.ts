import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ShopifyProduct,
  storefrontApiRequest,
  STOREFRONT_COLLECTION_SORTED_QUERY,
} from "@/lib/shopify";
import { COLLECTION_SORTS, type CollectionSort } from "@/lib/shopCategories";

/** Laedt Produkte einer Shopify-Kollektion per collection(handle:) — mit
 *  serverseitiger Sortierung (sortKey/reverse) und "Mehr laden". */
export function useCollectionProducts(handle: string, sort: CollectionSort, pageSize = 24) {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [collectionImage, setCollectionImage] = useState<string | null>(null);
  const cursorRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchPage = useCallback(
    async (append: boolean) => {
      const requestId = ++requestIdRef.current;
      const s = COLLECTION_SORTS.find((x) => x.value === sort) ?? COLLECTION_SORTS[0];
      setIsLoading(true);
      setError(null);
      if (!append) {
        setProducts([]);
        setNotFound(false);
      }
      try {
        const data = await storefrontApiRequest(STOREFRONT_COLLECTION_SORTED_QUERY, {
          handle,
          first: pageSize,
          after: append ? cursorRef.current : null,
          sortKey: s.sortKey,
          reverse: s.reverse,
        });
        if (requestId !== requestIdRef.current) return;
        const collection = data?.data?.collection;
        if (!collection) {
          console.warn(`[shopify] collection(handle: "${handle}") lieferte nichts`);
          setNotFound(true);
          setHasNextPage(false);
          return;
        }
        const edges: ShopifyProduct[] = collection.products?.edges ?? [];
        const pageInfo = collection.products?.pageInfo;
        cursorRef.current = pageInfo?.endCursor ?? null;
        setHasNextPage(Boolean(pageInfo?.hasNextPage));
        setCollectionImage(collection.image?.url ?? null);
        setProducts((prev) => (append ? [...prev, ...edges] : edges));
      } catch (e) {
        if (requestId !== requestIdRef.current) return;
        setError(e instanceof Error ? e.message : "Fehler beim Laden");
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    },
    [handle, sort, pageSize]
  );

  useEffect(() => {
    cursorRef.current = null;
    fetchPage(false);
  }, [fetchPage]);

  return { products, isLoading, error, notFound, hasNextPage, collectionImage, loadMore: () => fetchPage(true) };
}
