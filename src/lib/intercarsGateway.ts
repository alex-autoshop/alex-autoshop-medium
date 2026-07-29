/**
 * IC-Preis-Lookup direkt über /api/intercars (Vercel Node Serverless).
 * Supabase-Gateway war nötig als noch Edge Functions genutzt wurden (Cloudflare-IPs geblockt).
 * Node Serverless nutzt andere IPs → IC OAuth klappt direkt.
 *
 * Lookups laufen über action "searchByIndex": IC gibt exakten Artikel per Index-Nummer
 * zurück (HU 716/2 x → Mann-Filter Ölfilter mit Preis). Variants probieren wir parallel
 * (mit/ohne Spaces, case-insensitiv).
 */

const PRICE_MARKUP = 1.7; // Fallback wenn nur EK vorhanden
const _cache = new Map<string, { v: unknown; ts: number }>();
const TTL = 5 * 60 * 1000; // 5 Minuten Cache

export interface IcLiveInfo {
  price: number;        // UVP / Einzelhandelspreis
  availability: string; // z.B. "sofort (5 Stück)"
  deliveryDays: number; // 1 = FA1/Zentrallager
  icSku: string;
  imageUrl?: string;
}

/** 4 Varianten parallel — IC ist case-sensitiv und spacing-abhängig */
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

/** Live-Preis + Bestand + Bild zu einer Hersteller-Artikelnummer (best effort). */
export async function icPriceLookup(articleNumber: string): Promise<IcLiveInfo | null> {
  const artNo = (articleNumber || '').trim();
  if (artNo.length < 3) return null;

  // Cache-Hit
  const hit = _cache.get(artNo);
  if (hit && Date.now() - hit.ts < TTL) return hit.v as IcLiveInfo | null;

  let result: IcLiveInfo | null = null;
  try {
    const variants = artVariants(artNo);

    // Varianten nacheinander — beim ersten Treffer mit Preis stoppen
    for (const variant of variants) {
      const products = await searchByIndex(variant);
      if (!products || products.length === 0) continue;

      // Bestes Ergebnis: Artikel mit Preis
      const p = products.find((x: any) => x?.price && x.price > 0) ?? products[0];
      if (!p) continue;

      const price: number | undefined = p.price > 0
        ? p.price
        : p.priceOriginal > 0
          ? p.priceOriginal
          : undefined;

      if (!price) continue;

      result = {
        price,
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
