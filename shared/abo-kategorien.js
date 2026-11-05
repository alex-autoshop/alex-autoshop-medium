/**
 * Gruppen für die Produktauswahl im Produkt-Abo.
 * Die drei Lack-Konfiguratoren teilen sich denselben Typ, gehören aber
 * in eigene Reihen. Klarlack und Härter stehen zusammen, Politur unter Pflege.
 * Alles andere behält den echten Produkttyp. Ohne Typ: Zubehör.
 */

const KONFIGURATOR = new Set([
  "farben-mix",
  "individuelle-spraydose-erstellen",
  "individuellen-lackstift-bestellen-20ml",
]);

/** Die drei Misch-Produkte gehören in die Lackierer-Karte, nicht in die Produktreihen. */
export function istAboKonfigurator(handle) {
  return KONFIGURATOR.has(String(handle || "").toLowerCase());
}

const FEST = {
  wunschfarben: "Wunschfarben",
  spraydosen: "Spraydosen",
  lackstifte: "Lackstifte",
  klarlack: "Klarlack & Härter",
  pflege: "Pflege/Politur",
  zubehoer: "Zubehör",
};

const REIHENFOLGE = [
  "wunschfarben",
  "spraydosen",
  "lackstifte",
  "klarlack",
  "typ:Grundierung & Füller",
  "typ:Spachtel",
  "typ:Schleifmittel",
  "pflege",
  "typ:Verdünnung & Zusätze",
  "typ:Spezial- & Effektlacke",
  "typ:Steinschlag- & Rostschutz",
  "typ:Dichten & Kleben",
  "typ:Motoröl",
  "typ:Reiniger & Fette",
];

export function aboKategorie(produkt) {
  const handle = String(produkt?.handle || "").toLowerCase();
  const typ = String(produkt?.productType || "").trim();
  if (handle === "farben-mix") return "wunschfarben";
  if (handle === "individuelle-spraydose-erstellen") return "spraydosen";
  if (handle === "individuellen-lackstift-bestellen-20ml") return "lackstifte";
  if (typ === "Klarlack" || typ === "Härter") return "klarlack";
  if (typ === "Politur & Schleifpaste") return "pflege";
  if (!typ) return "zubehoer";
  return `typ:${typ}`;
}

export function aboKategorieLabel(id) {
  if (FEST[id]) return FEST[id];
  if (String(id).startsWith("typ:")) return String(id).slice(4);
  return String(id);
}

/** @param {Array<{ handle?: string, productType?: string }>} liste */
export function aboGruppen(liste) {
  const map = new Map();
  for (const produkt of liste || []) {
    const id = aboKategorie(produkt);
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(produkt);
  }
  const bekannt = REIHENFOLGE.filter((id) => map.has(id));
  const rest = [...map.keys()]
    .filter((id) => !bekannt.includes(id) && id !== "zubehoer")
    .sort((a, b) => aboKategorieLabel(a).localeCompare(aboKategorieLabel(b), "de"));
  const ende = map.has("zubehoer") ? ["zubehoer"] : [];
  return [...bekannt, ...rest, ...ende].map((id) => ({
    id,
    label: aboKategorieLabel(id),
    produkte: map.get(id),
  }));
}
