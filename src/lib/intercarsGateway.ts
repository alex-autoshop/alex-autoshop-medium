/**
 * IC-Preis-Lookup direkt über /api/intercars (Vercel Node Serverless).
 * Supabase-Gateway war nötig als noch Edge Functions genutzt wurden (Cloudflare-IPs geblockt).
 * Node Serverless nutzt andere IPs → IC OAuth klappt direkt.
 *
 * Preislogik:
 *   price     = listPriceGross (UVP/Einzelhandel) — was Kunden zahlen, z.B. 13,24€
 *   priceEK   = customerPriceGross (EK) — Alex's Einkaufspreis, z.B. 4,50€
 *   Fallback: EK * 1.7 wenn IC kein UVP liefert
 */

const PRICE_MARKUP = 1.7;
const _cache = new Map<string, { v: unknown; ts: number }>();
const TTL = 5 * 60 * 1000; // 5 Minuten

export interface IcLiveInfo {
  price: number;        // UVP / Einzelhandel (listPriceGross) — für Kunden
  priceEK?: number;     // EK-Preis (customerPriceGross) — nur intern
  availability: string; // z.B. "sofort (10+ Stück)"
  deliveryDays: number;
  icSku: string;
  imageUrl?: string;
}

/** 4 Varianten — IC ist case-sensitiv und spacing-abhängig */
function artVariants(artNo: string): string[] {
  const set = new Set<string>();
  set.add(artNo);
  set.add(artNo.toUpperCase());
  set.add(artNo.replace(/\s+/g, ''));
  set.add(artNo.toUpperCase().replace(/\s+/g, ''));
  return [...set];
}

async function searchByIndex(index: string): Promise<any[] | null> {
  try {
    const res = await fetch('/api/intercars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'searchByIndex', index }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

/** Live UVP + EK + Bestand + Bild zu einer Hersteller-Artikelnummer (best effort). */
export async function icPriceLookup(articleNumber: string): Promise<IcLiveInfo | null> {
  const artNo = (articleNumber || '').trim();
  if (artNo.length < 3) return null;

  const hit = _cache.get(artNo);
  if (hit && Date.now() - hit.ts < TTL) return hit.v as IcLiveInfo | null;

  let result: IcLiveInfo | null = null;
  try {
    for (const variant of artVariants(artNo)) {
      const products = await searchByIndex(variant);
      if (!products || products.length === 0) continue;

      const p = products.find((x: any) => (x?.priceOriginal ?? x?.price) > 0) ?? products[0];
      if (!p) continue;

      // UVP = listPriceGross (priceOriginal) — Einzelhandel-Preis für Kunden
      // EK  = customerPriceGross (price) — Alex's Einkaufspreis
      const ek: number | undefined = p.price > 0 ? Number(p.price) : undefined;
      const uvp: number | undefined = p.priceOriginal != null && p.priceOriginal > 0
        ? Number(p.priceOriginal)
        : ek != null
          ? Math.ceil(ek * PRICE_MARKUP * 100) / 100  // Fallback: EK + Aufschlag
          : undefined;

      if (!uvp) continue;

      result = {
        price: uvp,                          // Einzelhandel — was Kunden sehen
        priceEK: ek,                         // EK-Preis für Alex
        availability: p.availability || '1 Werktag · Zentrallager',
        deliveryDays: typeof p.deliveryDays === 'number' ? p.deliveryDays : 1,
        icSku: p._sku || p._index || String(p.id || variant),
        imageUrl: Array.isArray(p.images) ? p.images[0] : p.imageUrl || undefined,
      };
      break;
    }
  } catch { /* best effort */ }

  _cache.set(artNo, { v: result, ts: Date.now() });
  return result;
}
