/**
 * Gecachter Katalog für Listen, Suche und Produktseiten.
 * Warenkorb und Kasse gehen hier nicht durch.
 * `frisch=1` ist ungecacht — nur für den Preis direkt vor dem Bezahlen.
 */
import { storefront } from "./_storefront.js";
import {
  QUERY_KOLLEKTION,
  QUERY_PRODUKT,
  QUERY_PRODUKTE,
  QUERY_VARIANTEN,
  KARTEN_FELDER,
  cacheNie,
  cacheOeffentlich,
  cursor,
  erste,
  handleListe,
  sichererHandle,
  sortAus,
  suchFilter,
  suchFilterRoh,
  suchText,
  variantenIds,
} from "../shared/katalog-regeln.js";

function antwort(res, status, obj, cache) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", cache);
  res.status(status).end(JSON.stringify(obj));
}

function parameter(req) {
  const q = req.query || {};
  const aus = {};
  for (const [k, v] of Object.entries(q)) aus[k] = Array.isArray(v) ? v.join(",") : v;
  return aus;
}

export async function katalogDaten(q) {
  const was = String(q.was || "produkte");
  const anfang = Date.now();

  if (was === "varianten") {
    const ids = variantenIds(q.ids);
    if (!ids.length) return { meta: { art: "varianten" }, data: { nodes: [] }, ms: 0 };
    const data = await storefront(QUERY_VARIANTEN, { ids });
    return { meta: { art: "varianten", frisch: true }, data: data.data, ms: Date.now() - anfang };
  }

  if (was === "produkt") {
    const handle = sichererHandle(q.handle);
    if (!handle) return { meta: { art: "produkt", schluessel: "produkt:" }, data: { productByHandle: null }, ms: 0 };
    const data = await storefront(QUERY_PRODUKT, { handle });
    return {
      meta: { art: "produkt", handle, schluessel: `produkt:${handle}` },
      data: data.data,
      ms: Date.now() - anfang,
    };
  }

  if (was === "handles") {
    const handles = handleListe(q.handles);
    if (!handles.length) return { meta: { art: "handles" }, data: { products: { edges: [] } }, ms: 0 };
    const felder = handles.map((h, i) => `p${i}: productByHandle(handle: ${JSON.stringify(h)}) { ${KARTEN_FELDER} }`).join("\n");
    const data = await storefront(`query Handles { ${felder} }`);
    const edges = handles
      .map((_, i) => data.data?.[`p${i}`])
      .filter(Boolean)
      .map((node) => ({ node }));
    return { meta: { art: "handles" }, data: { products: { edges } }, ms: Date.now() - anfang };
  }

  if (was === "kollektion") {
    const handle = sichererHandle(q.handle);
    const sort = sortAus(q.sort);
    const first = erste(q.first, 24, 100);
    const after = cursor(q.after);
    if (!handle) {
      return { meta: { art: "kollektion", schluessel: "kollektion::empfohlen" }, data: { collection: null }, ms: 0 };
    }
    const data = await storefront(QUERY_KOLLEKTION, {
      handle,
      first,
      after,
      sortKey: sort.sortKey,
      reverse: sort.reverse,
    });
    const sortName = SORT_NAME[`${sort.sortKey}:${sort.reverse}`] || "empfohlen";
    return {
      meta: {
        art: "kollektion",
        handle,
        sort: sortName,
        schluessel: `kollektion:${handle}:${sortName}`,
      },
      data: data.data,
      ms: Date.now() - anfang,
    };
  }

  const first = erste(q.first, 24, 100);
  const after = cursor(q.after);
  const text = suchText(q.suche);
  const filter = suchFilterRoh(q.filter) || suchFilter(text, q.bereich === "tag" ? "tag" : "titel");
  const data = await storefront(QUERY_PRODUKTE, { first, after, query: filter });
  const category = sichererHandle(q.category);
  const schluessel = q.einbettung === "home"
    ? "home"
    : `shop:${category}:${text}`;
  return {
    meta: {
      art: q.einbettung === "home" ? "home" : "shop",
      category,
      suche: text,
      schluessel,
    },
    data: data.data,
    ms: Date.now() - anfang,
  };
}

const SORT_NAME = {
  "COLLECTION_DEFAULT:false": "empfohlen",
  "PRICE:false": "preis-auf",
  "PRICE:true": "preis-ab",
  "TITLE:false": "name",
  "CREATED:true": "neu",
};

export function istKatalog(req) {
  const q = req.query || {};
  const url = String(req.url || "");
  return q.aa === "katalog" || url.includes("aa=katalog") || url.includes("/api/katalog");
}

export async function katalogHandler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return antwort(res, 405, { error: "Nur Abruf." }, cacheNie());
  }
  const q = parameter(req);
  const frisch = q.frisch === "1" || q.was === "varianten";
  try {
    const erg = await katalogDaten(q);
    if (erg.ms != null) res.setHeader("Server-Timing", `katalog;dur=${erg.ms}`);
    return antwort(res, 200, { meta: erg.meta, data: erg.data }, frisch ? cacheNie() : cacheOeffentlich());
  } catch {
    return antwort(res, 502, { error: "Katalog gerade nicht erreichbar." }, cacheNie());
  }
}
