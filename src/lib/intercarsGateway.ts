/**
 * Inter-Cars-Gateway über Supabase Edge Function (Deno-IPs — Cloudflare blockt
 * Vercel-IPs bei der IC-OAuth, Supabase nicht). Actions als Query-Param,
 * Responses kommen in { data: ... } gewrappt.
 */
const SUPA_URL = (import.meta.env.VITE_SUPABASE_URL as string) || "https://zasbdvtsxgimcezotlsi.supabase.co";
const SUPA_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || "sb_publishable_hMoY8Rgjjb9cvmeMaTEJoQ_AkBoF3FX";
const PRICE_MARKUP = 1.7;

const _cache = new Map<string, { v: unknown; ts: number }>();
const TTL = 5 * 60 * 1000;

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

function digNumber(obj: any, key: string): number | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  if (typeof obj[key] === "number") return obj[key];
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") { const r = digNumber(v, key); if (r !== undefined) return r; }
  }
  return undefined;
}

export interface IcLiveInfo {
  price: number;        // Verkaufspreis (EK × Markup)
  availability: string; // z.B. "sofort (10+ Stück)"
  icSku: string;
}

/** Live-Preis + Bestand zu einer Hersteller-Artikelnummer (best effort). */
export async function icPriceLookup(articleNumber: string): Promise<IcLiveInfo | null> {
  const artNo = (articleNumber || "").trim();
  if (artNo.length < 3) return null;
  const hit = _cache.get(artNo);
  if (hit && Date.now() - hit.ts < TTL) return hit.v as IcLiveInfo | null;

  let result: IcLiveInfo | null = null;
  try {
    const s = await icCall("search", { index: artNo, pageSize: 3 });
    const prods: any[] = s?.products || [];
    const p = prods[0] || (await icCall("search", { sku: artNo, pageSize: 3 }))?.products?.[0];
    if (p?.sku) {
      const d = await icCall("product-detail", { sku: p.sku });
      const ek = digNumber(d?.pricing, "customerPriceGross") ?? digNumber(d?.pricing, "listPriceGross");
      const avail = digNumber(d?.stock, "availability") ?? 0;
      if (ek && ek > 0) {
        result = {
          price: Math.ceil(ek * PRICE_MARKUP * 100) / 100,
          availability: avail > 0 ? (avail >= 10 ? "sofort (10+ Stück)" : `sofort (${avail} Stück)`) : "1–3 Werktage",
          icSku: String(p.sku),
        };
      }
    }
  } catch { /* best effort */ }
  _cache.set(artNo, { v: result, ts: Date.now() });
  return result;
}
