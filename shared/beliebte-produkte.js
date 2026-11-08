/**
 * Startseite „Beliebte Produkte“.
 *
 * Der Inhaber ändert nur die Handles in BELIEBTE_HANDLES.
 * Reihenfolge = Anzeige von links nach rechts, oben nach unten.
 * Höchstens 10: auf großen Bildschirmen stehen 5 Kacheln in einer Reihe,
 * 10 füllen zwei Reihen. Die Auslieferung lässt Artikel weg, die nicht
 * im Shop veröffentlicht sind, kein echtes Bild haben, keinen gültigen
 * Preis haben oder deren Varianten nicht lieferbar sind.
 */
import { KARTEN_FELDER, sichererHandle } from "./katalog-regeln.js";

export const BELIEBTE_MAX = 10;

/** Passt zu `first=10` in index.html. Die Zahl nicht allein ändern. */
export const BELIEBTE_ANFRAGE = 10;

export const BELIEBTE_HANDLES = [
  "farben-mix",
  "troton-remover-spray-effektiver-entferner-fur-lacke-kleberuckstande",
  "castrol-edge-5w-30-ll-motoroel-acea-c3-vw-504-00-507-00",
  "liqui-moly-leichtlauf-10w-40-motoroel",
  "sonax-profiline-os-02-06-all-in-one-politur-lackpflege",
  "wd-40-specialist-kontaktspray-49368-25-400-ml",
  "smart-repair-set-fur-lackieranfanger",
  "individuelle-spraydose-erstellen",
  "mipa-cc9-2k-hs-klarlack-5l",
  "napa-premium-kuhlerschutz-np48",
];

const PLATZHALTER = /placeholder|no-image|noimage|default-product|bild-folgt|kein-bild/i;

export function beliebteHandles(liste = BELIEBTE_HANDLES) {
  const aus = [];
  const roh = Array.isArray(liste) ? liste : [];
  for (const teil of roh) {
    const h = sichererHandle(teil);
    if (!h || aus.includes(h)) continue;
    aus.push(h);
    if (aus.length >= BELIEBTE_MAX) break;
  }
  return aus;
}

/** Echte Produktkarte: Bild, Preis und mindestens eine lieferbare Variante. */
export function beliebteKarte(node) {
  if (!node || typeof node !== "object") return false;
  const bild = node.images?.edges?.[0]?.node?.url;
  if (typeof bild !== "string" || !bild.startsWith("https://") || PLATZHALTER.test(bild)) return false;
  const preis = Number(node.priceRange?.minVariantPrice?.amount);
  if (!Number.isFinite(preis) || preis <= 0) return false;
  const varianten = node.variants?.edges;
  if (!Array.isArray(varianten) || varianten.length === 0) return false;
  return varianten.some((e) => e?.node?.availableForSale === true);
}

export function beliebteKanten(knoten) {
  const liste = Array.isArray(knoten) ? knoten : [];
  return liste.filter(beliebteKarte).map((node) => ({ node }));
}

/**
 * Eine Storefront-Abfrage, Reihenfolge wie in der Liste.
 * `liste` ist nur für Tests; die Seite nimmt BELIEBTE_HANDLES.
 */
export async function beliebteHolen(storefront, liste) {
  const handles = beliebteHandles(liste);
  const leer = { edges: [], pageInfo: { hasNextPage: false, endCursor: null } };
  if (!handles.length) return leer;
  const felder = handles
    .map((h, i) => `p${i}: productByHandle(handle: ${JSON.stringify(h)}) { ${KARTEN_FELDER} }`)
    .join("\n");
  const data = await storefront(`query Beliebte { ${felder} }`);
  const knoten = handles.map((_, i) => data?.data?.[`p${i}`] ?? null);
  return {
    edges: beliebteKanten(knoten),
    pageInfo: { hasNextPage: false, endCursor: null },
  };
}
