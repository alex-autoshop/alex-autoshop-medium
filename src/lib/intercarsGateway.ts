/**
 * Inter-Cars-Gateway über Supabase Edge Function (Deno-IPs — Cloudflare blockt
 * Vercel-IPs bei der IC-OAuth, Supabase nicht). Actions als Query-Param,
 * Responses kommen in { data: ... } gewrappt.
 */
// WICHTIG: Die intercars-api-Funktion läuft auf dem ALTEN Supabase-Projekt
// (hfkjgxmmcqtgzapubxvu) — dort liegen die IC-Secrets und die ic_tokens-Tabelle.
// Verifiziert 2026-07-12: liefert echte Preise (UVP/EK) + Lagerbestand in <2s.
// Der Anon-Key ist per Design öffentlich (nur Function-Aufrufe, RLS geschützt).
const SUPA_URL = "https://hfkjgxmmcqtgzapubxvu.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhma2pneG1tY3F0Z3phcHVieHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MzIzMjcsImV4cCI6MjA4OTAwODMyN30.T7GO851P2K96s6erlfCf0iiE-JV2Wuj2uFEgsayUHDw";
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
  price: number;        // UVP / Einzelhandelspreis von Inter Cars
  availability: string; // z.B. "1 Werktag · 5 Stück"
  deliveryDays: number; // 1 = lokal verfügbar, 2 = Zentrallager
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
      // UVP ("Einzelhandel") anzeigen — NICHT den EK. Fallback: EK x Markup.
      const uvp = digNumber(d?.pricing, "listPriceGross");
      const ek = digNumber(d?.pricing, "customerPriceGross");
      const price = uvp && uvp > 0 ? uvp : ek && ek > 0 ? Math.ceil(ek * PRICE_MARKUP * 100) / 100 : undefined;
      const avail = digNumber(d?.stock, "availability") ?? 0;
      if (price) {
        result = {
          price,
          availability: avail > 0
            ? `1 Werktag · ${avail >= 10 ? ">10" : avail} Stück`
            : "2 Werktage · Zentrallager",
          deliveryDays: avail > 0 ? 1 : 2,
          icSku: String(p.sku),
        };
      }
    }
  } catch { /* best effort */ }
  _cache.set(artNo, { v: result, ts: Date.now() });
  return result;
}
