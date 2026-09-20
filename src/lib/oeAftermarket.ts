/**
 * Von der Originalnummer in der Explosionszeichnung zum kaufbaren Teil.
 *
 * Der Hersteller-Katalog sagt, WELCHES Teil verbaut ist. Verkauft wird aber
 * das baugleiche Zubehörteil (MANN, BOSCH, VAICO …) zu Inter-Cars-Preisen.
 * Diese Datei baut die Brücke — und zwar so, dass kein falsches Teil
 * durchrutscht:
 *
 * 1. ALLE Nummern des Originalteils nehmen, nicht nur die Katalognummer.
 *    Opel führt je Teil zwei: die Katalognummer (650209) und die GM-Nummer
 *    (Attribut gm_part_number, 55578235). Im Namen stehen oft weitere:
 *    "PRODUKTIONS NR. 13262798", "VERWENDEN 13351796".
 *
 * 2. Nur Treffer vom richtigen Autohersteller behalten. Gemessen am
 *    20.09.2026: die Opel-Nummer 650209 (Ölfiltergehäuse) lieferte ohne
 *    Filter einen "Federbalg, Luftfederung" — die Ziffernfolge gehört dort
 *    zu DENNIS. Mit Filter: kein falsches Teil mehr.
 */

import type { YqPart } from "@/lib/yqcat";
import { apOeTreffer, type ApOeTreffer } from "@/lib/autoparts";

export interface OeArtikel {
  id: string;
  name: string;
  brand: string;
  articleNumber: string;
  imageUrl?: string;
  /** Die Originalnummer, über die dieses Teil gefunden wurde. */
  ueberOe: string;
}

const kompakt = (s: string) => (s || "").replace(/[\s.\-/]/g, "").toUpperCase();

/** Alle Nummern, unter denen dieses Originalteil im Zubehör geführt sein kann. */
export function oeNummernAusTeil(p: YqPart): string[] {
  const out: string[] = [];
  const dazu = (x?: string) => {
    const v = (x || "").trim();
    if (v.length >= 5 && !out.some((o) => kompakt(o) === kompakt(v))) out.push(v);
  };

  // Herstellereigene Zusatznummern (Opel: gm_part_number) zuerst — die sind
  // im Zubehör-Katalog oft besser verknüpft als die Katalognummer.
  for (const a of p.attributes ?? []) {
    const code = String(a.code || a.key || a.name || "").toLowerCase();
    if (/part_?number|oem|original|teilenummer/.test(code)) {
      for (const v of a.values ?? (a.value ? [a.value] : [])) dazu(String(v));
    }
  }

  dazu(p.partNumber);
  dazu(p.partNumberFormatted);

  // Ersatz- und Produktionsnummern aus dem Namen:
  // "DECKEL (NML.- VERWENDEN 13351796 18 12 023)",
  // "GEHAEUSE, LUFTDUESE (PRODUKTIONS NR. 13262798)".
  const name = [p.partName, p.displayName].filter(Boolean).join(" ");
  for (const m of name.matchAll(/(?:PRODUKTIONS\s*NR\.?|VERWENDEN|ERSETZT\s+DURCH|ERSATZ)\s*:?\s*(\d{7,10})/gi)) {
    dazu(m[1]);
  }

  return out.slice(0, 5);
}

/* ── Hersteller-Familien ──────────────────────────────────────────────
   TecDoc hängt eine OE-Nummer manchmal an die Schwestermarke (Opel-Teil
   unter VAUXHALL oder GENERAL MOTORS). Deshalb Familien, nicht Einzelmarken.
   Bewusst eng gehalten: lieber einmal "nicht gefunden" als ein Teil vom
   falschen Auto. */
const FAMILIEN: string[][] = [
  ["OPEL", "VAUXHALL", "GENERAL MOTORS", "GM", "CHEVROLET", "SAAB", "HOLDEN", "BUICK", "CADILLAC", "DAEWOO"],
  ["VW", "VOLKSWAGEN", "AUDI", "SKODA", "SEAT", "CUPRA", "PORSCHE"],
  ["BMW", "MINI", "ROLLS-ROYCE"],
  ["MERCEDES-BENZ", "MERCEDES", "SMART", "MAYBACH", "DAIMLER"],
  ["PEUGEOT", "CITROEN", "DS"],
  ["RENAULT", "DACIA", "RENAULT SAMSUNG"],
  ["NISSAN", "INFINITI", "DATSUN"],
  ["FORD", "FORD USA", "FORD AUSTRALIA", "FORD OTOSAN"],
  ["FIAT", "ALFA ROMEO", "LANCIA", "ABARTH", "JEEP", "CHRYSLER", "DODGE"],
  ["TOYOTA", "LEXUS", "DAIHATSU"],
  ["HYUNDAI", "KIA"],
  ["HONDA", "ACURA"],
  ["JAGUAR", "LAND ROVER", "ROVER"],
];

const markeNorm = (m: string) =>
  (m || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ").trim();

export function herstellerFamilie(marke: string): Set<string> {
  const m = markeNorm(marke);
  if (!m) return new Set();
  const fam = FAMILIEN.find((f) => f.some((x) => x === m || m.startsWith(x + " ") || x.startsWith(m + " ")));
  return new Set(fam ?? [m]);
}

/* ── Markenreihenfolge ────────────────────────────────────────────────
   Nur für die Reihenfolge, in der Preise geholt werden — angezeigt wird am
   Ende nach Lieferzeit und Preis. Erstausrüster-Marken zuerst, weil die
   Werkstatt sie am häufigsten will. */
const ERSTAUSRUESTER = [
  "BOSCH", "MANN-FILTER", "MAHLE", "HENGST FILTER", "KNECHT", "UFI", "FEBI BILSTEIN", "MEYLE",
  "SWAG", "VAICO", "LEMFÖRDER", "TRW", "ATE", "BREMBO", "TEXTAR", "ZIMMERMANN", "SACHS", "LUK",
  "INA", "FAG", "SKF", "GATES", "CONTINENTAL CTAM", "CONTITECH", "DAYCO", "VALEO", "DELPHI",
  "DENSO", "NGK", "BERU", "NRF", "HELLA", "TOPRAN", "BILSTEIN", "KYB", "MONROE", "CORTECO",
  "ELRING", "VICTOR REINZ", "PIERBURG", "BLUE PRINT", "MAPCO", "METZGER", "NK", "SPIDAN",
];
const rang = (brand: string) => {
  const b = markeNorm(brand);
  const i = ERSTAUSRUESTER.findIndex((x) => markeNorm(x) === b);
  return i === -1 ? 999 : i;
};

export interface OeSuche {
  artikel: OeArtikel[];
  /** Treffer, die wegen falschem Autohersteller verworfen wurden. */
  verworfen: number;
}

/**
 * Zubehörteile zu den Nummern eines Originalteils — gefiltert auf den
 * Autohersteller des Fahrzeugs, ohne Doppelte, Erstausrüster zuerst.
 */
export async function aftermarketZuOe(nummern: string[], fahrzeugMarke: string): Promise<OeSuche> {
  const familie = herstellerFamilie(fahrzeugMarke);
  const listen = await Promise.all(nummern.slice(0, 5).map((n) => apOeTreffer(n).then((l) => ({ n, l }))));

  let verworfen = 0;
  const gesehen = new Set<string>();
  const artikel: OeArtikel[] = [];

  for (const { n, l } of listen) {
    for (const t of l as ApOeTreffer[]) {
      // Ohne bekannte Marke lieber gar nichts filtern als alles verwerfen —
      // kommt praktisch nicht vor, weil der Katalog die Marke mitliefert.
      if (familie.size > 0 && !familie.has(markeNorm(t.oeHersteller))) {
        verworfen++;
        continue;
      }
      const key = `${markeNorm(t.supplierName)}|${kompakt(t.articleNo)}`;
      if (gesehen.has(key)) continue;
      gesehen.add(key);
      artikel.push({
        // Die echte TecDoc-Artikel-ID — daran hängt die Bildsuche, falls das
        // Bild nicht schon mitkommt.
        id: t.articleId ? String(t.articleId) : key,
        name: t.productName || "Teil",
        brand: t.supplierName,
        articleNumber: t.articleNo,
        imageUrl: t.image,
        ueberOe: n,
      });
    }
  }

  artikel.sort((a, b) => rang(a.brand) - rang(b.brand) || a.brand.localeCompare(b.brand, "de"));
  return { artikel, verworfen };
}
