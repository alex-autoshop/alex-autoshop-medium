// ─────────────────────────────────────────────────────────────────────────────
// Mitgliedsbeiträge — EINE Quelle für Website UND Server.
//
// Die Seite (src/data/memberships.ts) zeigt die Preise mit diesen Zahlen an,
// der Server (api/membership-checkout.js, api/membership-email.js) rechnet
// den Beitrag damit selbst nach. Früher kam der Preis aus dem Browser — und
// man konnte sich Level 3 für einen Cent im Monat buchen.
//
// Preise ändern: NUR HIER. Seite und Kasse ziehen automatisch mit.
// Reine Zahlen und eine reine Funktion — kein Zugriff auf irgendetwas sonst,
// damit die Datei im Browser und auf dem Server gleich funktioniert.
// ─────────────────────────────────────────────────────────────────────────────

export const MODULE = ["Autoteile", "Lackfarben", "Lackmaterial"];

export const MITGLIEDSPREISE = {
  1: {
    basePrice: 19,
    // Teilebörse wiegt am schwersten · dann Lackfarben · dann Lackmaterial
    modulePrices: { Autoteile: 12, Lackfarben: 10, Lackmaterial: 8 },
    // Abzug, wenn die Gratis-Farbe abgewählt wird (nur ohne Lack-Modul möglich)
    freePaintValue: 6,
    // Aufbereitung als eigener Posten (Level 1: keins)
    detailingPrice: 0,
  },
  2: {
    basePrice: 39,
    modulePrices: { Autoteile: 59, Lackfarben: 45, Lackmaterial: 37 },
    freePaintValue: 15,
    detailingPrice: 99,
  },
  3: {
    basePrice: 69,
    modulePrices: { Autoteile: 105, Lackfarben: 79, Lackmaterial: 65 },
    freePaintValue: 25,
    detailingPrice: 149,
  },
};

/**
 * Monatsbeitrag — exakt die Rechnung der Mitgliedschafts-Karten.
 *
 *   Grundbeitrag + gewählte Module + Aufbereitung − Gratis-Farbe (abgewählt)
 *
 * @param {{ level: number|string, modules?: string[], freePaint?: boolean, aufbereitung?: boolean }} wahl
 *   freePaint:    false = Gratis-Farbe abgewählt (zählt nur ohne Lack-Modul)
 *   aufbereitung: false = Aufbereitung abgewählt (zählt nur ab Level 2)
 * @returns {{ level: number, module: string[], freePaint: boolean, aufbereitung: boolean, preis: number } | null}
 */
export function mitgliedsbeitrag(wahl) {
  const level = Math.floor(Number(wahl && wahl.level));
  const p = MITGLIEDSPREISE[level];
  if (!p) return null;

  const roh = Array.isArray(wahl.modules) ? wahl.modules : [];
  const module = MODULE.filter((m) => roh.includes(m)); // feste Reihenfolge, nur bekannte

  const moduleSumme = module.reduce((s, m) => s + (p.modulePrices[m] || 0), 0);
  const ohneLack = !module.includes("Lackfarben") && !module.includes("Lackmaterial");
  // Gratis-Farbe gehört fest dazu, sobald ein Lack-Modul gebucht ist.
  const freePaint = ohneLack ? wahl.freePaint !== false : true;
  const farbAbzug = freePaint ? 0 : p.freePaintValue;
  const aufbereitung = p.detailingPrice > 0 && wahl.aufbereitung !== false;
  const aufbereitungKosten = aufbereitung ? p.detailingPrice : 0;

  const preis = Math.max(0, p.basePrice + moduleSumme + aufbereitungKosten - farbAbzug);
  return { level, module, freePaint, aufbereitung, preis };
}
