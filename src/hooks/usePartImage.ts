import { useEffect, useState } from "react";
import { istBildAdresse, partImage } from "@/lib/partImages";

/**
 * Liefert das Produktbild eines Artikels — das mitgelieferte, sonst das
 * nachgeschlagene. Gibt zusätzlich zurück, ob noch gesucht wird, damit die
 * Zeile einen Platzhalter statt eines Sprungs zeigen kann.
 */
export function usePartImage(
  imageUrl: string | undefined,
  articleNumber: string,
  brand?: string,
  articleId?: string | number
) {
  // Ein Datenblatt-PDF im Bildfeld zählt nicht als Bild.
  const mitgeliefert = istBildAdresse(imageUrl) ? imageUrl : undefined;
  const [nachgeladen, setNachgeladen] = useState<string | undefined>(undefined);
  const [sucht, setSucht] = useState(false);
  // Ein kaputter Link ist so gut wie keiner — dann wird trotzdem gesucht.
  const [kaputt, setKaputt] = useState(false);

  useEffect(() => { setNachgeladen(undefined); setKaputt(false); }, [articleNumber, brand, articleId, imageUrl]);

  useEffect(() => {
    if (mitgeliefert && !kaputt) return;
    if (!articleNumber && articleId == null) return;
    let aktiv = true;
    setSucht(true);
    partImage(articleNumber, brand, articleId).then((u) => {
      if (!aktiv) return;
      setNachgeladen(u);
      setSucht(false);
    });
    return () => { aktiv = false; };
  }, [mitgeliefert, kaputt, articleNumber, brand, articleId]);

  return {
    src: (kaputt ? undefined : mitgeliefert) ?? nachgeladen,
    sucht,
    /** Vom <img> aufrufen, wenn der Link nicht lädt. */
    meldeFehler: () => setKaputt(true),
  };
}
