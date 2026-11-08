/**
 * Nur-Lesen: Lücken in den Katalogdaten.
 * Schreibt eine CSV. Ändert nichts im Shop.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { storefront } from "../api/_storefront.js";
import { istLieferant } from "../shared/kundenmarke.js";
import { hatWerbeaussage, gtinAus, klartext } from "../shared/seo-katalog.js";

const QUERY = `query Audit($first: Int!, $after: String) {
  products(first: $first, after: $after) {
    pageInfo { hasNextPage endCursor }
    edges { node {
      handle title vendor productType tags
      description
      seo { title description }
      images(first: 6) { edges { node { altText } } }
      variants(first: 20) { edges { node { sku barcode } } }
      ratingCount: metafield(namespace: "reviews", key: "rating_count") { value }
      rating: metafield(namespace: "reviews", key: "rating") { value }
      judgeme: metafield(namespace: "judgeme", key: "badge") { value }
      spr: metafield(namespace: "spr", key: "reviews") { value }
    } }
  }
}`;

function zelle(wert) {
  const s = String(wert ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

function zahlAus(wert) {
  if (wert == null || wert === "") return 0;
  const roh = String(wert);
  const direkt = Number(roh);
  if (Number.isFinite(direkt)) return direkt;
  try {
    const obj = JSON.parse(roh);
    const n = Number(obj?.value ?? obj?.ratingCount ?? obj);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

const zeilen = [];
let after = null;
for (let seite = 0; seite < 40; seite += 1) {
  const data = await storefront(QUERY, { first: 50, after });
  const kante = data?.data?.products;
  for (const eintrag of kante?.edges || []) zeilen.push(eintrag.node);
  after = kante?.pageInfo?.endCursor || null;
  if (!kante?.pageInfo?.hasNextPage) break;
}

const kopf = [
  "handle",
  "titel",
  "vendor",
  "produkttyp",
  "anzahl_tags",
  "seo_titel_gesetzt",
  "seo_beschreibung_gesetzt",
  "seo_beschreibung_werbeaussage",
  "beschreibung_zeichen",
  "beschreibung_kurz",
  "bilder",
  "bilder_ohne_alt",
  "gtin_vorhanden",
  "sku_vorhanden",
  "marke_fehlt",
  "ohne_tags",
  "ohne_produkttyp",
  "bewertungen",
];

const summe = {
  produkte: zeilen.length,
  ohneSeoTitel: 0,
  ohneSeoBeschreibung: 0,
  seoWerbeaussage: 0,
  beschreibungKurz: 0,
  ohneBildAlt: 0,
  ohneGtin: 0,
  ohneSku: 0,
  ohneMarke: 0,
  ohneTags: 0,
  ohneProdukttyp: 0,
  mitBewertung: 0,
  bewertungen: 0,
};

const csv = [kopf.join(",")];
for (const p of zeilen) {
  const beschreibung = klartext(p.description);
  const seoTitel = String(p.seo?.title || "").trim();
  const seoText = String(p.seo?.description || "").trim();
  const bilder = p.images?.edges || [];
  const ohneAlt = bilder.filter((e) => !String(e?.node?.altText || "").trim()).length;
  const varianten = (p.variants?.edges || []).map((e) => e.node);
  const gtin = varianten.some((v) => gtinAus(v?.barcode));
  const sku = varianten.some((v) => String(v?.sku || "").trim());
  const markeFehlt = !String(p.vendor || "").trim() || istLieferant(p.vendor);
  const tags = Array.isArray(p.tags) ? p.tags : [];
  const werbung = seoText ? hatWerbeaussage(seoText) : false;
  const kurz = beschreibung.length < 80;
  const bewertungen = Math.max(zahlAus(p.ratingCount?.value), zahlAus(p.judgeme?.value), zahlAus(p.spr?.value), p.rating?.value ? 1 : 0);
  if (!seoTitel) summe.ohneSeoTitel += 1;
  if (!seoText) summe.ohneSeoBeschreibung += 1;
  if (werbung) summe.seoWerbeaussage += 1;
  if (kurz) summe.beschreibungKurz += 1;
  if (ohneAlt > 0 || bilder.length === 0) summe.ohneBildAlt += 1;
  if (!gtin) summe.ohneGtin += 1;
  if (!sku) summe.ohneSku += 1;
  if (markeFehlt) summe.ohneMarke += 1;
  if (!tags.length) summe.ohneTags += 1;
  if (!String(p.productType || "").trim()) summe.ohneProdukttyp += 1;
  if (bewertungen > 0) {
    summe.mitBewertung += 1;
    summe.bewertungen += bewertungen;
  }
  csv.push([
    p.handle,
    p.title,
    p.vendor || "",
    p.productType || "",
    tags.length,
    seoTitel ? 1 : 0,
    seoText ? 1 : 0,
    werbung ? 1 : 0,
    beschreibung.length,
    kurz ? 1 : 0,
    bilder.length,
    ohneAlt,
    gtin ? 1 : 0,
    sku ? 1 : 0,
    markeFehlt ? 1 : 0,
    tags.length ? 0 : 1,
    String(p.productType || "").trim() ? 0 : 1,
    bewertungen,
  ].map(zelle).join(","));
}

mkdirSync("audit", { recursive: true });
writeFileSync("audit/seo-produkte.csv", `${csv.join("\n")}\n`);
writeFileSync("/opt/cursor/artifacts/seo-audit.csv", `${csv.join("\n")}\n`);
writeFileSync("/opt/cursor/artifacts/seo-audit-summary.json", JSON.stringify(summe, null, 2));
console.log(JSON.stringify(summe, null, 2));
