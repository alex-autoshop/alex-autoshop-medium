/** Adresse eines Teils: /teile/mann-filter--HU+719~6x (Leerzeichen +, Schrägstrich ~). */

export function markeSlug(marke) {
  const s = String(marke || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return s || "teil";
}

export function nummerKodieren(nummer) {
  return String(nummer || "").trim().replace(/\//g, "~").replace(/\s+/g, "+");
}

export function nummerDekodieren(kodiert) {
  return String(kodiert || "").replace(/\+/g, " ").replace(/~/g, "/").trim();
}

export function teileSlug(marke, nummer) {
  return `${markeSlug(marke)}--${nummerKodieren(nummer)}`;
}

export function teilePfad(marke, nummer) {
  return `/teile/${teileSlug(marke, nummer)}`;
}

export function ausTeileSlug(slug) {
  const roh = decodeURIComponent(String(slug || ""));
  const i = roh.indexOf("--");
  if (i < 0) return { marke: "", nummer: nummerDekodieren(roh) };
  return { marke: roh.slice(0, i), nummer: nummerDekodieren(roh.slice(i + 2)) };
}

/** Bekannte Nummern für die Produkt-Sitemap. Nur Einträge mit Preis kommen hinein. */
export const TEILE_BELIEBT = Object.freeze([
  { marke: "MANN-FILTER", nummer: "HU 719/6x" },
  { marke: "MANN-FILTER", nummer: "W 712/75" },
  { marke: "BOSCH", nummer: "0 092 S40 050" },
  { marke: "BOSCH", nummer: "0 986 494 104" },
]);
