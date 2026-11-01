import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ShopifyProduct,
  storefrontApiRequest,
  STOREFRONT_COLLECTION_SORTED_QUERY,
} from "@/lib/shopify";
import { COLLECTION_SORTS, type CollectionSort } from "@/lib/shopCategories";

/** Laedt ALLE Produkte einer Shopify-Kollektion per collection(handle:) — mit
 *  serverseitiger Sortierung (sortKey/reverse). Alle Seiten werden am Stueck
 *  nachgeladen (Zwischenstand wird sofort gerendert), damit Filter wie die
 *  Marke ueber die ganze Kategorie greifen und nicht nur ueber Seite 1. */
export function useCollectionProducts(handle: string, sort: CollectionSort, pageSize = 100) {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [collectionImage, setCollectionImage] = useState<string | null>(null);
  const cursorRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchPage = useCallback(
    async () => {
      const requestId = ++requestIdRef.current;
      const s = COLLECTION_SORTS.find((x) => x.value === sort) ?? COLLECTION_SORTS[0];
      setIsLoading(true);
      setError(null);
      setProducts([]);
      setNotFound(false);
      try {
        let after: string | null = null;
        let more = true;
        let collected: ShopifyProduct[] = [];
        while (more) {
          const data = await storefrontApiRequest(STOREFRONT_COLLECTION_SORTED_QUERY, {
            handle,
            first: pageSize,
            after,
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
          after = pageInfo?.endCursor ?? null;
          more = Boolean(pageInfo?.hasNextPage) && edges.length > 0;
          cursorRef.current = after;
          collected = collected.concat(edges);
          const snapshot = collected;
          setHasNextPage(more);
          setCollectionImage(collection.image?.url ?? null);
          setProducts(snapshot);
        }
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
    fetchPage();
  }, [fetchPage]);

  return { products, isLoading, error, notFound, hasNextPage, collectionImage };
}
