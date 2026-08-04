/**
 * Inter-Cars-Gateway über Supabase Edge Function (Deno-IPs).
 *
 * WICHTIG: NICHT direkt über /api/intercars (Vercel) aufrufen — Inter Cars blockt
 * Vercel/AWS-IPs per WAF ("Połączenie zablokowane", 403 auf OAuth). Die Supabase
 * Edge Function `intercars-api` (Projekt zasbdvtsxgimcezotlsi) läuft auf Deno-IPs,
 * die IC nicht blockt, und hat gültige IC-Secrets hinterlegt → OAuth klappt dort.
 *
 * Preislogik:
 *   price     = listPriceGross (UVP / Einzelhandel) — was Kunden sehen, z.B. 13,24€
 *   priceEK   = customerPriceGross (EK) — Alex' Einkaufspreis, nur intern, z.B. 4,50€
 *   Fallback: EK * Markup, falls IC kein UVP liefert.
 */

const SUPA_URL = "https://zasbdvtsxgimcezotlsi.supabase.co";
// Anon/Publishable-Key ist per Design öffentlich (Function-Aufruf, RLS-geschützt).
const SUPA_KEY = "sb_publishable_hMoY8Rgjjb9cvmeMaTEJoQ_AkBoF3FX";
// VK = EK × 2.0 — konsistent mit parseIntercarsArticles in Teileportal.tsx
const PRICE_MARKUP = 2.0;

const _cache = new Map<string, { v: unknown; ts: number }>();
const TTL = 5 * 60 * 1000; // 5 Minuten

export interface IcLiveInfo {
  price: number;        // UVP / Einzelhandel (listPriceGross) — für Kunden
  priceEK?: number;     // EK-Preis (customerPriceGross) — nur intern
  availability: string; // z.B. "1 Werktag · 5 Stück"
  deliveryDays: number;
  icSku: string;
  imageUrl?: string;
}

async function icCall(action: string, body: Record<string, unknown>): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(`${SUPA_URL}/functions/v1/intercars-api?action=${action}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const j = await res.json().catch(() => null);
    return j?.data ?? j;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Rekursiv nach einem numerischen Feld suchen (IC verschachtelt price/stock). */
function digNumber(obj: any, key: string): number | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  if (typeof obj[key] === "number") return obj[key];
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") { const r = digNumber(v, key); if (r !== undefined) return r; }
  }
  return undefined;
}

/** Bild-URL aus einem IC-Produkt-Objekt extrahieren (verschiedene Feldnamen). */
function extractImage(p: any): string | undefined {
  if (!p) return undefined;
  const candidates = [
    p.imageUrl, p.imageURL, p.image, p.thumbnailUrl, p.pictureUrl, p.photo,
    p.images?.[0]?.url, p.images?.[0]?.imageURL, p.images?.[0]?.link,
    p.media?.[0]?.url, p.media?.[0]?.imageURL,
  ];
  return candidates.find((c) => typeof c === "string" && c.startsWith("http"));
}

/** IC ist case-sensitiv und formatabhängig → 4 Varianten parallel probieren. */
function artVariants(artNo: string): string[] {
  const set = new Set<string>();
  set.add(artNo);
  set.add(artNo.toUpperCase());
  set.add(artNo.replace(/\s+/g, ""));
  set.add(artNo.toUpperCase().replace(/\s+/g, ""));
  return [...set];
}

/** Live UVP + EK + Bestand + Bild zu einer Hersteller-Artikelnummer (best effort). */
export async function icPriceLookup(articleNumber: string): Promise<IcLiveInfo | null> {
  const artNo = (articleNumber || "").trim();
  if (artNo.length < 3) return null;

  const hit = _cache.get(artNo);
  if (hit && Date.now() - hit.ts < TTL) return hit.v as IcLiveInfo | null;

  let result: IcLiveInfo | null = null;
  try {
    // Varianten parallel suchen — ersten Treffer nehmen
    const searches = await Promise.all(
      artVariants(artNo).map((v) => icCall("search", { index: v, pageSize: 1 })),
    );
    const prods: any[] = searches.flatMap((s) => s?.products || []).filter(Boolean);
    const p = prods[0];

    if (p?.sku) {
      const d = await icCall("product-detail", { sku: p.sku });
      // VK = EK × 2.0 (Alex's Preis, immer unter IC-Listenpreis). listPriceGross wird NICHT verwendet.
      const ek  = digNumber(d?.pricing, "customerPriceGross");
      const price = ek && ek > 0
        ? Math.ceil(ek * PRICE_MARKUP * 100) / 100
        : undefined;
      const avail = digNumber(d?.stock, "availability") ?? 0;

      if (price) {
        // IC liefert aus Zweigstelle ODER Zentrallager → immer 1 Werktag.
        // avail=0 heißt nur lokales Lager leer, nicht Out-of-Stock.
        result = {
          price,
          priceEK: ek && ek > 0 ? ek : undefined,
          availability: avail > 0
            ? `1 Werktag · ${avail >= 10 ? ">10" : avail} Stück`
            : "1 Werktag · Zentrallager",
          deliveryDays: 1,
          icSku: String(p.sku),
          imageUrl: extractImage(p) ?? extractImage(d),
        };
      }
    }
  } catch { /* best effort */ }

  _cache.set(artNo, { v: result, ts: Date.now() });
  return result;
}
