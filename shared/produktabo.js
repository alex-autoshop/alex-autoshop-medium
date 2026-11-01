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

/**
 * Mengen-Positionen (Wunschfarbe, Spraydose, Lackstift).
 *
 * Für Lackierer taugt ein fester Betrag je Produkt nicht: wer 20 Liter im
 * Monat mischen lässt, spart dreistellig — da wäre 1 € Beitrag geschenkt.
 * Deshalb kostet eine Mengen-Position einen ANTEIL AN DER ERSPARNIS.
 * Der Kunde behält den Rest, und der Beitrag wächst automatisch mit der Menge.
 *
 * ANTEIL ÄNDERN: hier. 0.2 = der Kunde behält 80 % seiner Ersparnis.
 */
export const ANTEIL_AN_ERSPARNIS = 0.2;

/** Kleinster Monatsbeitrag für eine Mengen-Position. */
export const MENGE_MINDESTBEITRAG = 1;

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

/**
 * Beitrag einer einzelnen Mengen-Position.
 *
 * @param {{ einzelpreis: number, menge: number, rabatt: number }} pos
 *   einzelpreis = Normalpreis einer Einheit (z. B. 1 L Mipa 2K)
 *   menge       = Einheiten pro Monat
 * @returns {{ normal: number, mitglied: number, ersparnis: number, beitrag: number } | null}
 */
export function mengenPosition(pos) {
  const einzel = Number(pos && pos.einzelpreis);
  const menge = Math.floor(Number(pos && pos.menge));
  const rabatt = Math.floor(Number(pos && pos.rabatt));
  if (!Number.isFinite(einzel) || einzel <= 0) return null;
  if (!Number.isFinite(menge) || menge < 1) return null;
  if (PRODUKT_ABO_PREISE[rabatt] === undefined) return null;

  const cent = (n) => Math.round(n * 100) / 100;
  const normal = cent(einzel * menge);
  const mitglied = cent(normal * (1 - rabatt / 100));
  const ersparnis = cent(normal - mitglied);
  const beitrag = cent(Math.max(MENGE_MINDESTBEITRAG, ersparnis * ANTEIL_AN_ERSPARNIS));
  return { normal, mitglied, ersparnis, beitrag };
}

/**
 * Monatsbeitrag für eine komplette Abo-Liste aus Einzel- und Mengen-Positionen.
 *
 * @param {{ rabatt: number, einzelAnzahl: number, mengen: Array<{einzelpreis:number,menge:number}> }} liste
 */
export function aboGesamt(liste) {
  const rabatt = Math.floor(Number(liste && liste.rabatt));
  const proProdukt = PRODUKT_ABO_PREISE[rabatt];
  if (proProdukt === undefined) return null;

  const einzelAnzahl = Math.max(0, Math.floor(Number(liste.einzelAnzahl) || 0));
  const mengen = Array.isArray(liste.mengen) ? liste.mengen : [];
  if (einzelAnzahl === 0 && mengen.length === 0) return null;
  if (einzelAnzahl + mengen.length > MAX_PRODUKTE) return null;

  const cent = (n) => Math.round(n * 100) / 100;
  let beitrag = cent(proProdukt * einzelAnzahl);
  let ersparnis = 0;

  for (const m of mengen) {
    const p = mengenPosition({ ...m, rabatt });
    if (!p) return null;
    beitrag = cent(beitrag + p.beitrag);
    ersparnis = cent(ersparnis + p.ersparnis);
  }
  return { rabatt, einzelAnzahl, mengenAnzahl: mengen.length, beitrag, ersparnisMengen: ersparnis };
}
