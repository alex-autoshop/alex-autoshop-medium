/**
 * Regeln für den gecachten Katalog.
 * Listen ohne Beschreibung: die ist der schwere Teil und wird nur auf der
 * Produktseite gebraucht. Preise für die Kasse laufen getrennt und ungecacht.
 */

export const KARTEN_FELDER = `
  id
  title
  handle
  vendor
  tags
  productType
  priceRange { minVariantPrice { amount currencyCode } }
  images(first: 5) { edges { node { url altText width height } } }
  variants(first: 10) {
    edges { node {
      id title sku barcode
      price { amount currencyCode }
      availableForSale
      selectedOptions { name value }
      unitPrice { amount currencyCode }
      unitPriceMeasurement { referenceValue referenceUnit }
      lieferzeit: metafields(identifiers: [
        {namespace: "custom", key: "lieferzeit_min"},
        {namespace: "custom", key: "lieferzeit_max"}
      ]) { key value }
    } }
  }
  options { name values }
  gefahrstoffMetafelder: metafields(identifiers: [
    {namespace: "gefahrstoff", key: "ist_gefahrstoff"},
    {namespace: "gefahrstoff", key: "h_saetze"},
    {namespace: "gefahrstoff", key: "p_saetze"},
    {namespace: "gefahrstoff", key: "piktogramme"},
    {namespace: "gefahrstoff", key: "signalwort"},
    {namespace: "gefahrstoff", key: "sdb_url"},
    {namespace: "gefahrstoff", key: "tds_url"},
    {namespace: "gefahrstoff", key: "sdb_stand"},
    {namespace: "gefahrstoff", key: "gefahrgut_un_nr"},
    {namespace: "gefahrstoff", key: "mindestalter"},
    {namespace: "gefahrstoff", key: "versand_hinweis"}
  ]) { key value }
  lieferzeit: metafields(identifiers: [
    {namespace: "custom", key: "lieferzeit_min"},
    {namespace: "custom", key: "lieferzeit_max"}
  ]) { key value }
`;

export const PRODUKT_FELDER = `
  id
  title
  description
  handle
  vendor
  tags
  productType
  priceRange { minVariantPrice { amount currencyCode } }
  images(first: 8) { edges { node { url altText width height } } }
  seo { title description }
  collections(first: 20) { edges { node { handle title } } }
  variants(first: 100) {
    edges { node {
      id title sku barcode
      price { amount currencyCode }
      availableForSale
      selectedOptions { name value }
      unitPrice { amount currencyCode }
      unitPriceMeasurement { referenceValue referenceUnit }
      lieferzeit: metafields(identifiers: [
        {namespace: "custom", key: "lieferzeit_min"},
        {namespace: "custom", key: "lieferzeit_max"}
      ]) { key value }
    } }
  }
  options { name values }
  lieferzeit: metafields(identifiers: [
    {namespace: "custom", key: "lieferzeit_min"},
    {namespace: "custom", key: "lieferzeit_max"}
  ]) { key value }
  gefahrstoffMetafelder: metafields(identifiers: [
    {namespace: "gefahrstoff", key: "ist_gefahrstoff"},
    {namespace: "gefahrstoff", key: "h_saetze"},
    {namespace: "gefahrstoff", key: "p_saetze"},
    {namespace: "gefahrstoff", key: "piktogramme"},
    {namespace: "gefahrstoff", key: "signalwort"},
    {namespace: "gefahrstoff", key: "sdb_url"},
    {namespace: "gefahrstoff", key: "tds_url"},
    {namespace: "gefahrstoff", key: "sdb_stand"},
    {namespace: "gefahrstoff", key: "gefahrgut_un_nr"},
    {namespace: "gefahrstoff", key: "mindestalter"},
    {namespace: "gefahrstoff", key: "versand_hinweis"}
  ]) { key value }
  gpsr: metafields(identifiers: [
    {namespace: "custom", key: "gpsr_hersteller_name"},
    {namespace: "custom", key: "gpsr_hersteller_adresse"},
    {namespace: "custom", key: "gpsr_hersteller_kontakt"},
    {namespace: "custom", key: "gpsr_eu_verantwortlicher"},
    {namespace: "custom", key: "gpsr_sicherheitshinweise"}
  ]) { key value }
  prozessSchritte: metafield(namespace: "custom", key: "prozess_schritte") { value }
`;

export const QUERY_PRODUKTE = `query Produkte($first: Int!, $after: String, $query: String) {
  products(first: $first, after: $after, query: $query) {
    edges { node { ${KARTEN_FELDER} } }
    pageInfo { hasNextPage endCursor }
  }
}`;

export const QUERY_KOLLEKTION = `query Kollektion($handle: String!, $first: Int!, $after: String, $sortKey: ProductCollectionSortKeys, $reverse: Boolean) {
  collection(handle: $handle) {
    handle
    title
    image { url altText }
    products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse) {
      edges { node { ${KARTEN_FELDER} } }
      pageInfo { hasNextPage endCursor }
    }
  }
}`;

export const QUERY_PRODUKT = `query Produkt($handle: String!) {
  productByHandle(handle: $handle) { ${PRODUKT_FELDER} }
}`;

export const QUERY_VARIANTEN = `query Varianten($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on ProductVariant {
      id
      availableForSale
      price { amount currencyCode }
    }
  }
}`;

const SORT = {
  empfohlen: { sortKey: "COLLECTION_DEFAULT", reverse: false },
  "preis-auf": { sortKey: "PRICE", reverse: false },
  "preis-ab": { sortKey: "PRICE", reverse: true },
  name: { sortKey: "TITLE", reverse: false },
  neu: { sortKey: "CREATED", reverse: true },
};

export function sortAus(wert) {
  return SORT[wert] || SORT.empfohlen;
}

export function erste(wert, standard, max) {
  const n = Number(wert);
  if (!Number.isFinite(n)) return standard;
  return Math.max(1, Math.min(max, Math.floor(n)));
}

export function sichererHandle(wert) {
  const h = String(wert || "");
  return /^[a-z0-9-]{1,160}$/.test(h) ? h : "";
}

export function handleListe(wert) {
  const roh = Array.isArray(wert) ? wert.join(",") : String(wert || "");
  const aus = [];
  for (const teil of roh.split(",")) {
    const h = sichererHandle(teil.trim());
    if (h && !aus.includes(h)) aus.push(h);
    if (aus.length >= 8) break;
  }
  return aus;
}

export function suchText(wert) {
  return String(wert || "").trim().replace(/["\\*]/g, "").slice(0, 80);
}

/** Storefront-Suche. `tag` zusätzlich für die Markenseite. */
export function suchFilter(text, bereich) {
  if (!text) return null;
  if (bereich === "tag") return `title:*${text}* OR tag:*${text}*`;
  return `title:*${text}* OR sku:"${text}"`;
}

/** Fertige Katalog-Suche aus dem Programm, kein freier GraphQL-Text. */
export function suchFilterRoh(wert) {
  const s = String(wert || "").trim().slice(0, 180);
  if (!s || !/^[\p{L}\p{N} *:"'_.&/+()-]+$/u.test(s)) return null;
  return s;
}

export function cursor(wert) {
  const s = String(wert || "");
  if (!s) return null;
  if (s.length > 600 || !/^[A-Za-z0-9+/=_-]+$/.test(s)) return null;
  return s;
}

export function variantenIds(wert) {
  const roh = Array.isArray(wert) ? wert.join(",") : String(wert || "");
  const aus = [];
  for (const teil of roh.split(",")) {
    const id = teil.trim();
    if (/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(id)) aus.push(id);
    if (aus.length >= 50) break;
  }
  return aus;
}

export const KARTEN_GROESSEN = "(min-width: 1280px) 18vw, (min-width: 640px) 30vw, 46vw";
const BILD_BREITEN = [240, 480, 720, 960];

export function cacheOeffentlich() {
  return "public, max-age=60, s-maxage=300, stale-while-revalidate=86400";
}

export function cacheNie() {
  return "private, no-store";
}

export function bildSrcset(url, format = "webp") {
  return BILD_BREITEN.map((w) => `${bildAdresse(url, w, format)} ${w}w`).join(", ");
}

export function bildAdresse(url, breite, format) {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("shopify.com")) return url;
    u.searchParams.set("width", String(breite));
    if (format) u.searchParams.set("format", format);
    return u.toString();
  } catch {
    return url;
  }
}

export function htmlText(wert) {
  return String(wert ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

export function jsonFuerScript(wert) {
  return JSON.stringify(wert).replace(/</g, "\\u003c");
}

export function euro(betrag, waehrung) {
  const n = Number(betrag);
  if (!Number.isFinite(n)) return "";
  try {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: waehrung || "EUR" }).format(n);
  } catch {
    return `${n.toFixed(2)} €`;
  }
}

export function kantenVon(payload) {
  return payload?.data?.products?.edges
    || payload?.data?.collection?.products?.edges
    || [];
}

/** Sichtbare Karten, bevor das Programm da ist. Höchstens eine Bildschirmseite. */
export function kartenHtml(edges) {
  const liste = Array.isArray(edges) ? edges.slice(0, 24) : [];
  if (!liste.length) return "";
  return liste.map((p, i) => {
    const node = p.node || p;
    const bildNode = node.images?.edges?.[0]?.node;
    const bild = bildNode?.url;
    const preis = node.priceRange?.minVariantPrice;
    const src = bild ? bildAdresse(bild, 480, "webp") : "";
    const set = bild ? bildSrcset(bild, "webp") : "";
    const mehrere = (node.variants?.edges?.length || 0) > 1;
    const prio = i < 2 ? ' fetchpriority="high"' : ' loading="lazy"';
    const breite = Number(bildNode?.width) > 0 ? Math.round(bildNode.width) : 480;
    const hoehe = Number(bildNode?.height) > 0 ? Math.round(bildNode.height) : 480;
    return `<a href="/produkt/${htmlText(node.handle)}"><span class="aa-bild">${
      src ? `<img src="${htmlText(src)}" srcset="${htmlText(set)}" sizes="${KARTEN_GROESSEN}" alt="${htmlText(node.title)}" width="${breite}" height="${hoehe}"${prio} decoding="async">` : ""
    }</span><span class="aa-name">${htmlText(node.title)}</span><strong>${mehrere ? "Ab " : ""}${htmlText(euro(preis?.amount, preis?.currencyCode))}</strong></a>`;
  }).join("");
}
