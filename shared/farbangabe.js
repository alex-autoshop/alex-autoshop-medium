// Farbangabe auf der Produktseite.
//
// Wunschfarbe (mehrere Varianten) behält Marke, System und den Lackfarben-Rabatt.
// Ein Produkt mit nur einer Variante „Default Title“ — das Smart-Repair-Set —
// übernimmt den Set-Preis und legt die Farbe als Positions-Attribute in den Warenkorb.
// Die Schlüsselnamen sind dieselben wie bei der Wunschfarbe.

export const FARBKONFIGURATOR_HANDLES = [
  "farben-mix",
  "individuelle-spraydose-erstellen",
  "individuellen-lackstift-bestellen-20ml",
  "lackstift-wunschfarbe-20ml-pinsel-nadel",
  "smart-repair-set-fur-lackieranfanger",
];

export const ATTRIBUT_FAHRZEUG = "Fahrzeug";
export const ATTRIBUT_HINWEIS = "Hinweis";
export const FARB_ARTEN = ["Lackcode", "Lackname", "VIN"];

const KASSEN_HOST = "shop.alex-autoshop.de";

function varianten(produkt) {
  const kanten = produkt?.variants?.edges;
  if (!Array.isArray(kanten)) return [];
  return kanten.map((kante) => kante?.node).filter(Boolean);
}

/** Genau eine Variante ohne echte Option (Titel „Default Title“). */
export function istStandardvariante(produkt) {
  const liste = varianten(produkt);
  if (liste.length !== 1 || liste[0].title !== "Default Title") return false;
  const optionen = Array.isArray(produkt?.options) ? produkt.options : [];
  return optionen.every(
    (option) => option?.name === "Title" && (option.values ?? []).every((wert) => wert === "Default Title"),
  );
}

/** Optionsnamen, die der Kunde sieht. Beim Set keine. */
export function sichtbareOptionen(produkt) {
  if (istStandardvariante(produkt)) return [];
  return (produkt?.options ?? []).map((option) => option.name);
}

/**
 * Angezeigter Preis. Beim Set bleibt der Set-Preis, auch wenn ein
 * Lackfarben-Rabatt übergeben wird. Bei der Wunschfarbe gilt der Rabatt.
 */
export function anzeigePreis(betrag, menge, rabattProzent, standardvariante) {
  const rabatt = standardvariante ? 0 : Number(rabattProzent) || 0;
  const basis = Number(betrag) * (Number(menge) > 0 ? Number(menge) : 1);
  return basis * (1 - rabatt / 100);
}

/**
 * Pflicht: Automarke und Lackcode, Lackname oder VIN.
 * Optional: Modell, Baujahr, Hinweis.
 * @returns {{ ok: true, attribute: { key: string, value: string }[] } | { ok: false, fehler: string }}
 */
export function farbAttribute({ automarke, modell, baujahr, art, wert, hinweis }) {
  const marke = String(automarke ?? "").trim();
  const farbe = String(wert ?? "").trim();
  const notiz = String(hinweis ?? "").trim();
  if (!marke) return { ok: false, fehler: "Bitte die Automarke angeben" };
  if (!FARB_ARTEN.includes(art) || !farbe) {
    const name = FARB_ARTEN.includes(art) ? art : "Lackcode";
    return { ok: false, fehler: `Bitte ${name} angeben` };
  }
  const fahrzeug = [marke, String(modell ?? "").trim(), String(baujahr ?? "").trim()].filter(Boolean).join(" ");
  const attribute = [
    { key: ATTRIBUT_FAHRZEUG, value: fahrzeug },
    { key: art, value: farbe },
  ];
  if (notiz) attribute.push({ key: ATTRIBUT_HINWEIS, value: notiz });
  return { ok: true, attribute };
}

/**
 * Der Kurzlink /cart/Variante:Menge legt eine neue Position ohne Attribute an.
 * Liegt eine Farbangabe vor, geht die Kasse über den Warenkorb, der die Attribute schon trägt.
 * Die Adresse bleibt auf der Shop-Domain.
 */
export function kasseAdresse({ attributeVorhanden, checkoutUrl, permalink }) {
  if (!attributeVorhanden || !checkoutUrl) return permalink;
  try {
    const url = new URL(checkoutUrl);
    if (url.hostname.endsWith(".myshopify.com")) url.hostname = KASSEN_HOST;
    return url.toString();
  } catch {
    return permalink;
  }
}
