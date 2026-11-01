import { useEffect, useState } from "react";
import { storefrontApiRequest, collectionPreviewQuery } from "@/lib/shopify";

type Preview = { handle: string; image: { url: string } | null; products: { edges: Array<{ node: { images: { edges: Array<{ node: { url: string } }> } } }> } };

/** Liefert je Kollektion ein Vorschaubild: Kollektionsbild, sonst Bild des ersten Produkts. */
export function useCollectionPreviews(handles: string[]) {
  const [images, setImages] = useState<Record<string, string | null>>({});
  const key = handles.join("|");

  useEffect(() => {
    if (!handles.length) return;
    let aktiv = true;
    storefrontApiRequest(collectionPreviewQuery(handles))
      .then((data) => {
        if (!aktiv || !data?.data) return;
        const out: Record<string, string | null> = {};
        handles.forEach((h, i) => {
          const c: Preview | null = data.data[`c${i}`];
          out[h] = c?.image?.url ?? c?.products?.edges?.[0]?.node?.images?.edges?.[0]?.node?.url ?? null;
        });
        setImages(out);
      })
      .catch((e) => console.warn("[shopify] Kollektionsbilder:", e));
    return () => { aktiv = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return images;
}
