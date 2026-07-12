/**
 * Inter-Cars-Gateway über Supabase Edge Function (Deno-IPs — Cloudflare blockt
 * Vercel-IPs bei der IC-OAuth, Supabase nicht). Actions als Query-Param,
 * Responses kommen in { data: ... } gewrappt.
 */
// WICHTIG: intercars-api läuft auf dem NEUEN Supabase-Projekt (zasbdvtsxgimcezotlsi) —
// Alexs eigenes Projekt, IC-Secrets gesetzt (2026-07-13), Funktion aktiv (v7).
// Supabase Deno-IPs sind nicht von Inter Cars geblockt (anders als Vercel/AWS).
// Der Anon-Key ist per Design öffentlich (nur Function-Aufrufe, RLS geschützt).
const SUPA_URL = "https://zasbdvtsxgimcezotlsi.supabase.co";
const SUPA_KEY = "sb_publishable_hMoY8Rgjjb9cvmeMaTEJoQ_AkBoF3FX";
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

/** Extrahiert Bild-URL aus einem IC-Produkt-Objekt (verschiedene Feldnamen). */
function extractImage(p: any): string | undefined {
  if (!p) return undefined;
  const candidates = [
    p.imageUrl, p.imageURL, p.image, p.thumbnailUrl, p.pictureUrl, p.photo,
    p.images?.[0]?.url, p.images?.[0]?.imageURL, p.images?.[0]?.link,
    p.media?.[0]?.url, p.media?.[0]?.imageURL,
  ];
  return candidates.find((c) => typeof c === "string" && c.startsWith("http"));
}

export interface IcLiveInfo {
  price: number;        // UVP / Einzelhandelspreis von Inter Cars
  availability: string; // z.B. "1 Werktag · 5 Stück"
  deliveryDays: number; // 1 = lokal verfügbar, 2 = Zentrallager
  icSku: string;
  imageUrl?: string;    // Produktbild von IC (falls vorhanden)
}

/**
 * IC sucht case-sensitiv und erwartet Hersteller-Originalformat.
 * TecDoc liefert manchmal lowercase Suffix (z.B. "HU 7020 z") oder Spaces wo IC
 * keinen erwartet (z.B. "OX 787D" → IC braucht "OX787D").
 * Deshalb: 4 Varianten parallel probieren, ersten Treffer nehmen.
 */
function artVariants(artNo: string): string[] {
  const variants = new Set<string>();
  variants.add(artNo);
  variants.add(artNo.toUpperCase());
  variants.add(artNo.replace(/\s+/g, ""));
  variants.add(artNo.toUpperCase().replace(/\s+/g, ""));
  return [...variants];
}

/** Live-Preis + Bestand + Bild zu einer Hersteller-Artikelnummer (best effort). */
export async function icPriceLookup(articleNumber: string): Promise<IcLiveInfo | null> {
  const artNo = (articleNumber || "").trim();
  if (artNo.length < 3) return null;
  const hit = _cache.get(artNo);
  if (hit && Date.now() - hit.ts < TTL) return hit.v as IcLiveInfo | null;

  let result: IcLiveInfo | null = null;
  try {
    // Varianten parallel suchen — IC ist case-sensitiv und formatabhängig
    const variants = artVariants(artNo);
    const searches = await Promise.all(variants.map(v => icCall("search", { index: v, pageSize: 1 })));
    const prods: any[] = searches.flatMap(s => s?.products || []).filter(Boolean);
    const p = prods[0];
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
          imageUrl: extractImage(p) ?? extractImage(d),
        };
      }
    }
  } catch { /* best effort */ }
  _cache.set(artNo, { v: result, ts: Date.now() });
  return result;
}
