import { useEffect, useRef, useState } from "react";
import { type ShopifyProduct } from "@/lib/shopify";
import { kanten, kollektionHolen, leseEinbettung, nimmFrisch, seitenInfo } from "@/lib/katalog";
import { COLLECTION_SORTS, type CollectionSort } from "@/lib/shopCategories";

/** Alle Produkte einer Kollektion. Die erste Seite kommt aus dem HTML,
 *  der Rest und frische Preise danach — die Markenleiste bleibt vollständig. */
export function useCollectionProducts(handle: string, sort: CollectionSort, pageSize = 100) {
  const key = `kollektion:${handle}:${sort}`;
  const start = leseEinbettung((m) => m.schluessel === key);
  const startKanten = kanten(start) as ShopifyProduct[];
  const [fuer, setFuer] = useState(key);
  const [products, setProducts] = useState<ShopifyProduct[]>(startKanten);
  const [isLoading, setIsLoading] = useState(startKanten.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(Boolean(seitenInfo(start).hasNextPage));
  const [collectionImage, setCollectionImage] = useState<string | null>(start?.data?.collection?.image?.url ?? null);
  const requestIdRef = useRef(0);

  if (fuer !== key) {
    const neu = leseEinbettung((m) => m.schluessel === key);
    const edges = kanten(neu) as ShopifyProduct[];
    setFuer(key);
    setProducts(edges);
    setIsLoading(edges.length === 0);
    setError(null);
    setNotFound(false);
    setHasNextPage(Boolean(seitenInfo(neu).hasNextPage));
    setCollectionImage(neu?.data?.collection?.image?.url ?? null);
  }

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    let aktiv = true;
    const s = COLLECTION_SORTS.find((x) => x.value === sort) ?? COLLECTION_SORTS[0];

    (async () => {
      try {
        const erste = await nimmFrisch((m) => m?.schluessel === key)
          ?? await kollektionHolen({
            handle,
            first: pageSize,
            sort,
            sortKey: s.sortKey,
            reverse: s.reverse,
          });
        if (!aktiv || requestId !== requestIdRef.current) return;
        const collection = erste?.data?.collection;
        if (!collection) {
          setNotFound(true);
          setHasNextPage(false);
          setProducts([]);
          return;
        }
        let edges = (collection.products?.edges ?? []) as ShopifyProduct[];
        let info = collection.products?.pageInfo;
        let after = info?.endCursor ?? null;
        let more = Boolean(info?.hasNextPage) && edges.length > 0;
        setProducts(edges);
        setHasNextPage(more);
        setCollectionImage(collection.image?.url ?? null);
        setIsLoading(false);
        while (more) {
          const next = await kollektionHolen({
            handle,
            first: pageSize,
            after,
            sort,
            sortKey: s.sortKey,
            reverse: s.reverse,
          });
          if (!aktiv || requestId !== requestIdRef.current) return;
          const col = next?.data?.collection;
          const dazu = (col?.products?.edges ?? []) as ShopifyProduct[];
          info = col?.products?.pageInfo;
          after = info?.endCursor ?? null;
          more = Boolean(info?.hasNextPage) && dazu.length > 0;
          edges = edges.concat(dazu);
          setProducts(edges);
          setHasNextPage(more);
        }
      } catch (e) {
        if (!aktiv || requestId !== requestIdRef.current) return;
        setError(e instanceof Error ? e.message : "Fehler beim Laden");
      } finally {
        if (aktiv && requestId === requestIdRef.current) setIsLoading(false);
      }
    })();

    return () => { aktiv = false; };
  }, [handle, sort, pageSize, key]);

  return { products, isLoading, error, notFound, hasNextPage, collectionImage };
}
