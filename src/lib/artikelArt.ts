/**
 * Grobe Warenart aus dem Namen. Damit ein Klick auf „Ölfilter“ keinen
 * Luftfilter, Kraftstofffilter oder Partikelfilter stehen lässt, auch wenn
 * der Katalog die Obergruppe mitgeliefert hat.
 * Unbekannte Namen bleiben drin — die Kategorie-ID hat sie ja geliefert.
 */

export type ArtikelArt = "oil" | "air" | "fuel" | "cabin" | "dpf";

function norm(text: string): string {
  return String(text || "")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

export function artikelArt(text: string): ArtikelArt | null {
  const n = norm(text);
  if (/partikelfilter|russfilter|dieselpartikelfilter|\bdpf\b/.test(n)) return "dpf";
  if (/innenraum|pollenfilter|kabinenfilter/.test(n)) return "cabin";
  if (/kraftstofffilter|benzinfilter|dieselfilter/.test(n)) return "fuel";
  if (/luftfilter/.test(n)) return "air";
  if (/oelfilter|oilfilter/.test(n)) return "oil";
  return null;
}

export function passtZurKategorie(name: string, category: string | undefined, catName: string): boolean {
  const want = artikelArt(catName);
  if (!want) return true;
  const got = artikelArt(`${name} ${category || ""}`);
  if (!got) return true;
  return got === want;
}
