import { istLieferant, markenSlug, markenSortieren } from "../../shared/kundenmarke.js";

export { markenSlug };

// ── Markenerkennung ───────────────────────────────────────────────────────────
// Shopify `vendor` ist bei uns meist nur der Lieferant ("Alex Autoshop") —
// die echte Marke steht im Titel. Daher Erkennung über Titel + Handle.
//
// Reihenfolge = Reihenfolge der Markensortierung im Shop:
// Mipa → Eigenmarken (FRIZ, Master) → Rest.
// Anker (^) bei mehrdeutigen Marken: "DRYING MASTER" (Mikrofasertuch) darf NICHT
// als Marke Master gelten, "Master Black Carbon Spachtel" schon.
export const BRAND_ORDER: Array<{ brand: string; match: RegExp }> = [
  { brand: "Mipa",          match: /\bmipa\b/i },
  // Eigenmarken direkt danach (beste Marge)
  { brand: "FRIZ",          match: /\bfriz\b|^hochglanz[\s-]antihologramm[\s-]politur|^schleifpaste[\s-]perfect[\s-]heavy[\s-]cut/i },
  { brand: "Master",        match: /^master[\s-]/i },
  // Danach die Hauptmarken
  { brand: "Standox",       match: /\bstandox\b/i },
  { brand: "Glasurit",      match: /\bglasurit\b/i },
  { brand: "Spies Hecker",  match: /\bspies[\s-]?hecker\b/i },
  { brand: "Sikkens",       match: /\bsikkens\b/i },
  { brand: "3M",            match: /\b3m\b/i },
  { brand: "Mirka",         match: /\bmirka\b/i },
  { brand: "Indasa",        match: /\bindasa\b|\brhynogrip\b/i },
  { brand: "Koch-Chemie",   match: /\bkoch[\s-]?chemie\b/i },
  { brand: "SATA",          match: /\bsata\b/i },
  { brand: "DeVilbiss",     match: /\bdevilbiss\b/i },
  { brand: "Rupes",         match: /\brupes\b/i },
  { brand: "Colad",         match: /\bcolad\b/i },
  { brand: "Sonax",         match: /\bsonax\b/i },
  { brand: "Dr. Wack",      match: /^(dr\.?\s?wack|a1)[\s-]/i },
  { brand: "Liqui Moly",    match: /\bliqui[\s-]?moly\b/i },
  { brand: "Castrol",       match: /\bcastrol\b/i },
  { brand: "MANNOL",        match: /\bmannol\b/i },
  { brand: "MANN-FILTER",   match: /\bmann[\s-]?filter\b/i },
  { brand: "Ravenol",       match: /\bravenol\b/i },
  { brand: "NAPA",          match: /\bnapa\b/i },
  { brand: "W5",            match: /^w5[\s-]/i },
  { brand: "TITAN",         match: /^titan[\s-]/i },
  { brand: "FanFaro",       match: /\bfanfaro\b/i },
  { brand: "Novol",         match: /\bnovol\b/i },
  { brand: "Troton",        match: /\btroton\b/i },
  { brand: "U-POL",         match: /\bu-?pol\b/i },
  { brand: "Spray Max",     match: /\bspray[\s-]?max\b/i },
  { brand: "Holts",         match: /\bholts\b/i },
  { brand: "Meyer",         match: /^meyer[\s-]/i },
  { brand: "CRS",           match: /^crs[\s-]/i },
  { brand: "APP",           match: /^app[\s-]/i },
  { brand: "AVO",           match: /^avo[\s-]/i },
  { brand: "Petec",         match: /\bpetec\b/i },
  { brand: "Tesa",          match: /\btesa\b/i },
  { brand: "Kovax",         match: /\bkovax\b/i },
  { brand: "Beaven",        match: /\bbeaven\b/i },
];

/** Lieferanten-Namen im Shopify-Feld `vendor`, die KEINE Marke sind. */
const KEINE_MARKE = new Set(["alex autoshop", "ds color", "ds-color", "inter cars", "intercars", ""]);

type MarkenNode = { node: { title?: string; handle: string; vendor?: string } };

/** Titel und Handle EINZELN prüfen — sonst greifen die ^-Anker nicht
 *  (zusammengeklebt stünde der Handle nie am Stringanfang). */
function matchesBrand(re: RegExp, node: { title?: string; handle: string }): boolean {
  return re.test(node.title || "") || re.test(node.handle.replace(/-/g, " "));
}

function brandIndex(p: MarkenNode): number {
  return BRAND_ORDER.findIndex((b) => matchesBrand(b.match, p.node));
}

/** Klartext-Marke — Titel/Handle, sonst `vendor` (falls echte Marke), sonst "Sonstige". */
export function brandOf(p: MarkenNode): string {
  const i = brandIndex(p);
  if (i !== -1) return BRAND_ORDER[i].brand;
  const v = (p.node.vendor || "").trim();
  if (v && !KEINE_MARKE.has(v.toLowerCase()) && !istLieferant(v)) {
    return BRAND_ORDER.find((b) => b.brand.toLowerCase() === v.toLowerCase())?.brand ?? v;
  }
  return "Sonstige";
}

export function markeAusSlug(slug: string) {
  return BRAND_ORDER.find((b) => markenSlug(b.brand) === slug)?.brand ?? null;
}

/** Gleiche Marke, egal ob Anzeigename oder Slug aus der Adresse. */
export function markeAktiv(liste: string[], name: string) {
  const ziel = markenSlug(name);
  if (!ziel) return false;
  return liste.some((eintrag) => markenSlug(eintrag) === ziel);
}

/** Klick auf eine Marke: an- oder abwählen. Leerer Name leert die Liste. */
export function markeUmschalten(liste: string[], name: string) {
  if (!name) return [];
  const ziel = markenSlug(name);
  if (liste.some((eintrag) => markenSlug(eintrag) === ziel)) {
    return liste.filter((eintrag) => markenSlug(eintrag) !== ziel);
  }
  return [...liste, name];
}

/** Anzeigename zu einem Slug, falls die Marke in der Liste vorkommt. */
export function markenName(token: string, bekannte: string[]) {
  const ziel = markenSlug(token);
  return bekannte.find((name) => markenSlug(name) === ziel) ?? markeAusSlug(ziel) ?? token;
}

/** Marken einer Produktliste, häufigste zuerst. */
export function markenZaehlen(produkte: MarkenNode[]) {
  const zaehler = new Map<string, number>();
  for (const p of produkte) {
    const name = brandOf(p);
    if (!name || name === "Sonstige" || istLieferant(name)) continue;
    zaehler.set(name, (zaehler.get(name) || 0) + 1);
  }
  return markenSortieren([...zaehler.entries()].map(([name, anzahl]) => ({ name, anzahl })));
}

/** Index der Marke in BRAND_ORDER; unbekannte Marken landen hinten. */
export function brandRank(p: MarkenNode): number {
  const b = brandOf(p);
  const i = BRAND_ORDER.findIndex((x) => x.brand === b);
  return i === -1 ? BRAND_ORDER.length : i;
}
