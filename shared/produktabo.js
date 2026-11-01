// ─────────────────────────────────────────────────────────────────────────────
// Produkt-Abo — EINE Quelle für Website UND Server.
//
// Der Kunde wählt eine Rabattstufe und legt Produkte in seine Abo-Liste.
// Bezahlt wird pro Produkt und Monat; der Rabatt gilt nur für genau diese
// Produkte. Dienstleistungen sind nicht enthalten — das ist die andere
// Mitgliedschaft (shared/mitgliedspreise.js).
//
// PREISE ÄNDERN: NUR HIER. Seite und Kasse ziehen automatisch mit.
// Reine Zahlen und reine Funktionen, damit die Datei im Browser und auf dem
// Server gleich funktioniert.
// ─────────────────────────────────────────────────────────────────────────────

/** Monatsbeitrag je Produkt, nach gewählter Rabattstufe. */
export const PRODUKT_ABO_PREISE = {
  15: 0.5,
  28: 1,
  40: 2,
};

/** Mindest- und Höchstzahl an Produkten in einer Abo-Liste. */
export const MIN_PRODUKTE = 1;
export const MAX_PRODUKTE = 100;

export const ABO_RABATTE = [15, 28, 40];

/**
 * Monatsbeitrag für eine Abo-Liste.
 *
 *   Beitrag = Preis je Produkt (abhängig vom Rabatt) × Anzahl Produkte
 *
 * @param {{ rabatt: number|string, anzahl: number|string }} wahl
 * @returns {{ rabatt: number, anzahl: number, proProdukt: number, preis: number } | null}
 *   null, wenn die Stufe unbekannt oder die Anzahl unzulässig ist.
 */
export function produktAboBeitrag(wahl) {
  const rabatt = Math.floor(Number(wahl && wahl.rabatt));
  const proProdukt = PRODUKT_ABO_PREISE[rabatt];
  if (proProdukt === undefined) return null;

  const anzahl = Math.floor(Number(wahl && wahl.anzahl));
  if (!Number.isFinite(anzahl) || anzahl < MIN_PRODUKTE || anzahl > MAX_PRODUKTE) return null;

  // Auf Cent runden, damit Browser und Server exakt dieselbe Zahl sehen.
  const preis = Math.round(proProdukt * anzahl * 100) / 100;
  return { rabatt, anzahl, proProdukt, preis };
}

/** Ersparnis im Monat, wenn der Kunde die Listenprodukte einmal kauft. */
export function produktAboErsparnis(summeNormalpreise, rabatt) {
  const p = Number(summeNormalpreise);
  const r = Number(rabatt);
  if (!Number.isFinite(p) || !PRODUKT_ABO_PREISE[Math.floor(r)]) return 0;
  return Math.round(p * (r / 100) * 100) / 100;
}
