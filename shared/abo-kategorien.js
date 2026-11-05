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

function titelVon(produkt) {
  return String(produkt?.title || produkt?.titel || "");
}

/** Erste Mengenangabe in g oder ml. Liter wird nach ml umgerechnet. */
function groesseVon(titel) {
  const m = titel.replace(/\u00a0/g, " ").match(/(\d+(?:[.,]\d+)?)\s*(ml|l|g)\b/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return m[2].toLowerCase() === "l" ? n * 1000 : n;
}

/** Produktlinie ohne Marke, Gebinde und Füllwörter, damit 250 g und 750 g zusammenfinden. */
function linieVon(titel) {
  return titel
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/(\d+(?:[.,]\d+)?)\s*(ml|l|g)\b/gi, " ")
    .replace(/\b(friz|silikonfrei)\b/g, " ")
    .replace(/[^a-zäöüß]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Innerhalb einer Reihe: kleine Gebinde vor großen, gleiche Linie beieinander.
 * Produkte ohne Mengenangabe behalten ihre Reihenfolge und stehen dahinter.
 */
export function aboReiheOrdnen(produkte) {
  return (produkte || [])
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      const ga = groesseVon(titelVon(a.p));
      const gb = groesseVon(titelVon(b.p));
      if ((ga == null) !== (gb == null)) return ga == null ? 1 : -1;
      if (ga != null && gb != null && ga !== gb) return ga - gb;
      const la = linieVon(titelVon(a.p));
      const lb = linieVon(titelVon(b.p));
      if (la !== lb) return la.localeCompare(lb, "de");
      return a.i - b.i;
    })
    .map((x) => x.p);
}

/** @param {Array<{ handle?: string, productType?: string, title?: string, titel?: string }>} liste */
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
    // Nur Pflege: dort liegen die Politur-Paare 250 g / 750 g. Andere Reihen
    // behalten die Shop-Reihenfolge, damit z. B. Schwarz vor Grau stehen bleibt.
    produkte: id === "pflege" ? aboReiheOrdnen(map.get(id)) : map.get(id),
  }));
}
