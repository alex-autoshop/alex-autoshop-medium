import {
  STOREFRONT_COLLECTION_PRODUCTS_QUERY,
  STOREFRONT_COLLECTION_SORTED_QUERY,
  STOREFRONT_PRODUCT_BY_HANDLE_QUERY,
  STOREFRONT_PRODUCTS_QUERY,
  storefrontApiRequest,
} from "@/lib/shopify";
import { beliebteHolen } from "../../shared/beliebte-produkte.js";
import { katalogJson, katalogVorholen, produktVorholen } from "@/lib/katalogVorholen";

export { katalogVorholen, produktVorholen };

export interface KatalogMeta {
  art?: string;
  handle?: string;
  sort?: string;
  suche?: string;
  category?: string;
  schluessel?: string;
}

export interface KatalogAntwort {
  meta?: KatalogMeta;
  data?: {
    products?: { edges?: unknown[]; pageInfo?: { hasNextPage?: boolean; endCursor?: string | null } };
    collection?: {
      image?: { url?: string | null } | null;
      products?: { edges?: unknown[]; pageInfo?: { hasNextPage?: boolean; endCursor?: string | null } };
    } | null;
    productByHandle?: unknown;
    nodes?: Array<{ id?: string; availableForSale?: boolean; price?: { amount: string; currencyCode: string } } | null>;
  };
}

declare global {
  interface Window {
    __aaFrisch?: Promise<KatalogAntwort | null> | null;
    __aaFrischGelesen?: boolean;
  }
}

export async function katalogLesen(
  such: Record<string, string | number | boolean | null | undefined>,
  opts?: { frisch?: boolean },
): Promise<KatalogAntwort | null> {
  return katalogJson(such, opts) as Promise<KatalogAntwort | null>;
}

export function kanten(payload: KatalogAntwort | null | undefined): Array<{ node: never }> {
  const liste = payload?.data?.products?.edges || payload?.data?.collection?.products?.edges || [];
  return liste as Array<{ node: never }>;
}

export function seitenInfo(payload: KatalogAntwort | null | undefined) {
  return payload?.data?.products?.pageInfo || payload?.data?.collection?.products?.pageInfo || {};
}

/** JSON aus dem HTML, nur wenn es zu dieser Ansicht gehört. */
export function leseEinbettung(passend: (meta: KatalogMeta) => boolean): KatalogAntwort | null {
  if (typeof document === "undefined") return null;
  const el = document.getElementById("aa-daten");
  if (!el?.textContent || el.textContent === "null") return null;
  try {
    const json = JSON.parse(el.textContent) as KatalogAntwort;
    if (!json?.meta || !passend(json.meta)) return null;
    return json;
  } catch {
    return null;
  }
}

/** Die Abfrage, die das HTML schon gestartet hat — einmal, und nur wenn sie passt. */
export async function nimmFrisch(passend: (meta: KatalogMeta | undefined) => boolean): Promise<KatalogAntwort | null> {
  if (typeof window === "undefined" || !window.__aaFrisch || window.__aaFrischGelesen) return null;
  window.__aaFrischGelesen = true;
  try {
    const json = await window.__aaFrisch;
    if (json && passend(json.meta)) return json;
  } catch {
    /* die Seite holt selbst */
  }
  return null;
}

export async function produkteHolen(vars: { first: number; after?: string | null; suche?: string; bereich?: string; einbettung?: string; filter?: string }) {
  const api = await katalogLesen({
    was: "produkte",
    first: vars.first,
    after: vars.after || undefined,
    suche: vars.suche || undefined,
    bereich: vars.bereich || undefined,
    einbettung: vars.einbettung === "home" ? "home" : undefined,
    filter: vars.filter || undefined,
  });
  if (api?.data?.products) return api;
  if (vars.einbettung === "home") {
    const products = await beliebteHolen((query) => storefrontApiRequest(query));
    return { meta: { art: "home", schluessel: "home" }, data: { products } };
  }
  const text = (vars.suche || "").trim().replace(/["\\*]/g, "").slice(0, 80);
  const filter = vars.filter && vars.filter.length <= 180 && !/[{}]/.test(vars.filter) ? vars.filter : "";
  const query = filter
    ? filter
    : text
    ? vars.bereich === "tag"
      ? `title:*${text}* OR tag:*${text}*`
      : `title:*${text}* OR sku:"${text}"`
    : null;
  return storefrontApiRequest(STOREFRONT_PRODUCTS_QUERY, {
    first: vars.first,
    after: vars.after || null,
    query,
  }) as Promise<KatalogAntwort | undefined>;
}

export async function kollektionHolen(vars: {
  handle: string;
  first: number;
  after?: string | null;
  sort?: string;
  sortKey?: string;
  reverse?: boolean;
}) {
  const api = await katalogLesen({
    was: "kollektion",
    handle: vars.handle,
    first: vars.first,
    after: vars.after || undefined,
    sort: vars.sort || undefined,
  });
  if (api?.data && "collection" in api.data) return api;
  return storefrontApiRequest(STOREFRONT_COLLECTION_SORTED_QUERY, {
    handle: vars.handle,
    first: vars.first,
    after: vars.after || null,
    sortKey: vars.sortKey || "COLLECTION_DEFAULT",
    reverse: Boolean(vars.reverse),
  }) as Promise<KatalogAntwort | undefined>;
}

const BESCHREIBUNG_QUERY = `
  query Beschreibung($handle: String!) {
    productByHandle(handle: $handle) { descriptionHtml }
  }
`;

/** Der gecachte Katalog kann das Feld noch nicht kennen. Dann nur den HTML-Text nachziehen. */
export async function beschreibungNachziehen<T extends KatalogAntwort | null | undefined>(handle: string, daten: T): Promise<T> {
  const data = daten?.data;
  const produkt = data?.productByHandle as { descriptionHtml?: string | null } | null | undefined;
  if (!handle || !data || !produkt || produkt.descriptionHtml != null) return daten;
  try {
    const direkt = await storefrontApiRequest(BESCHREIBUNG_QUERY, { handle }) as KatalogAntwort | undefined;
    const html = (direkt?.data?.productByHandle as { descriptionHtml?: string | null } | null)?.descriptionHtml;
    if (!html) return daten;
    return {
      ...daten,
      data: { ...data, productByHandle: { ...produkt, descriptionHtml: html } },
    } as T;
  } catch {
    return daten;
  }
}

export async function produktHolen(handle: string, frisch = false) {
  const api = await katalogLesen({ was: "produkt", handle }, { frisch });
  if (api?.data && "productByHandle" in api.data) return beschreibungNachziehen(handle, api);
  if (frisch) return null;
  return storefrontApiRequest(STOREFRONT_PRODUCT_BY_HANDLE_QUERY, { handle }) as Promise<KatalogAntwort | undefined>;
}

export async function variantenPreise(ids: string[]) {
  const api = await katalogLesen({ was: "varianten", ids: ids.join(",") }, { frisch: true });
  return api?.data?.nodes ?? null;
}

/** Direkte Kollektion ohne Sortierung — Fallback, wenn der Cache nichts weiß. */
export async function kollektionDirekt(handle: string, first: number, after?: string | null) {
  return storefrontApiRequest(STOREFRONT_COLLECTION_PRODUCTS_QUERY, {
    handle,
    first,
    after: after || null,
  });
}
