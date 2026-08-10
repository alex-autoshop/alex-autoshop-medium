/**
 * Inter-Cars-Gateway über /api/intercars (Vercel Serverless).
 *
 * STAND 08/2026: Läuft direkt über Vercel. Die frühere Annahme, IC blocke
 * Vercel-IPs per WAF, war falsch — der 403 kam vom mitgesendeten Origin-Header
 * bzw. von ungültigen Credentials. Mit korrekten PROD-Keys und dem Pflicht-Header
 * `Accept-Language: de` liefert IC von Vercel aus sauber Token, Preise und Bestand.
 * (Die alte Supabase Edge Function `intercars-api` hat noch den kaputten Stand
 *  mit nicht existierenden Endpoints — deshalb hier bewusst nicht mehr genutzt.)
 *
 * Ein Call `searchByIndex` liefert bereits alles: Preis, Bestand, EAN, Lagerorte.
 *
 * Preislogik (unverändert):
 *   priceEK = customerPriceGross (Alex' EK nach Rabattstufe)
 *   price   = EK × PRICE_MARKUP  (Kundenpreis; IC-Listenpreis nur als Fallback)
 */

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
  const t = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(`/api/intercars`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
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
    // searchByIndex liefert Preis + Bestand + EAN bereits fertig normalisiert.
    // Varianten parallel probieren (IC ist format-sensitiv: "VKJP 01001" vs "VKJP01001").
    const results = await Promise.all(
      artVariants(artNo).map((v) => icCall("searchByIndex", { index: v })),
    );
    const p: any = results
      .flatMap((r) => (Array.isArray(r) ? r : []))
      .find((x) => x && x._sku);

    if (p) {
      // p.price = customerPriceGross (EK) · p.priceOriginal = listPriceGross (IC-UVP)
      const ek = Number(p.price) > 0 ? Number(p.price) : undefined;
      const price = ek != null
        ? Math.ceil(ek * PRICE_MARKUP * 100) / 100
        : Number(p.priceOriginal) > 0 ? Number(p.priceOriginal) : undefined;
      const avail = Number(p.stockQuantity) || 0;

      if (price) {
        // IC liefert aus Zweigstelle ODER Zentrallager → immer 1 Werktag.
        // avail=0 heißt nur lokales Lager leer, nicht Out-of-Stock.
        result = {
          price,
          priceEK: ek,
          availability: avail > 0
            ? `1 Werktag · ${avail >= 10 ? ">10" : avail} Stück`
            : "1 Werktag · Zentrallager",
          deliveryDays: 1,
          icSku: String(p._sku),
          imageUrl: extractImage(p),
        };
      }
    }
  } catch { /* best effort */ }

  _cache.set(artNo, { v: result, ts: Date.now() });
  return result;
}
