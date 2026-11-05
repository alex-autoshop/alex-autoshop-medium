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
export function rabattGueltig(wert) {
  return PRODUKT_ABO_PREISE[Math.floor(Number(wert))] !== undefined;
}

/**
 * Alte Listen hatten EINE Stufe für alles (`rabatt`). Die wandert auf jedes
 * Produkt. Neue Listen speichern `standard` nur als Voreinstellung für das
 * nächste Produkt. Ohne gespeicherte Stufe gilt 15 %.
 */
export function listeNormalisieren(roh) {
  const vorlage = Math.floor(Number(roh && (roh.standard != null ? roh.standard : roh.rabatt)));
  const standard = rabattGueltig(vorlage) ? vorlage : 15;
  const produkte = (Array.isArray(roh && roh.produkte) ? roh.produkte : [])
    .slice(0, MAX_PRODUKTE)
    .map((p) => {
      const eigene = Math.floor(Number(p && p.rabatt));
      return { ...p, rabatt: rabattGueltig(eigene) ? eigene : standard };
    });
  return { standard, produkte };
}

/**
 * Monatsbeitrag einer Position mit IHRER Stufe.
 * Einzelprodukt: fester Beitrag der Stufe. Mengen-Position (Lack): Anteil an der Ersparnis.
 */
export function beitragPosition(pos) {
  const rabatt = Math.floor(Number(pos && pos.rabatt));
  if (!rabattGueltig(rabatt)) return null;
  const menge = pos && (pos.art === "menge" || pos.einzelpreis != null);
  if (menge && pos.art !== "einzel") {
    return mengenPosition({ einzelpreis: pos.einzelpreis, menge: pos.menge, rabatt });
  }
  const normal = Number(pos && pos.preis);
  if (!Number.isFinite(normal) || normal < 0) return null;
  const cent = (n) => Math.round(n * 100) / 100;
  const mitglied = cent(normal * (1 - rabatt / 100));
  return {
    normal: cent(normal),
    mitglied,
    ersparnis: cent(normal - mitglied),
    beitrag: PRODUKT_ABO_PREISE[rabatt],
  };
}

/** Summe über eine Liste, in der jedes Produkt seine eigene Stufe hat. */
export function aboListeGesamt(positionen) {
  const liste = Array.isArray(positionen) ? positionen : [];
  if (!liste.length || liste.length > MAX_PRODUKTE) return null;
  const cent = (n) => Math.round(n * 100) / 100;
  const zeilen = [];
  let beitrag = 0;
  let ersparnis = 0;
  for (const p of liste) {
    const z = beitragPosition(p);
    if (!z) return null;
    zeilen.push(z);
    beitrag = cent(beitrag + z.beitrag);
    ersparnis = cent(ersparnis + z.ersparnis);
  }
  return { beitrag, ersparnis, zeilen };
}

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


// ─────────────────────────────────────────────────────────────────────────────
// Gebinde-Rechner
//
// Ein Lackierer denkt nicht in Gebinden, sondern in Litern pro Monat. Er sagt
// "ich brauche 7 Liter" — welche Dosen das sind, ist unser Problem, nicht
// seines. Diese Funktionen rechnen den Bedarf in die GÜNSTIGSTE Kombination
// der real verfügbaren Gebinde um.
// ─────────────────────────────────────────────────────────────────────────────

/** "50ml" · "500 ml" · "1 Liter" · "1.5 Liter" · "2,5 L" → Liter, sonst null. */
export function literAus(bezeichnung) {
  const t = String(bezeichnung || "").toLowerCase().replace(",", ".");
  const m = t.match(/([\d.]+)\s*(ml|l\b|liter)/);
  if (!m) return null;
  const zahl = parseFloat(m[1]);
  if (!Number.isFinite(zahl) || zahl <= 0) return null;
  return m[2] === "ml" ? zahl / 1000 : zahl;
}

/**
 * Günstigste Kombination von Gebinden, die den Monatsbedarf deckt.
 *
 * @param {Array<{label:string, liter:number, preis:number}>} gebinde
 * @param {number} bedarfLiter
 * @returns {{ teile: Array<{label:string, liter:number, preis:number, anzahl:number}>,
 *             liter:number, preis:number } | null}
 */
export function guenstigsteKombi(gebinde, bedarfLiter) {
  const brauchbar = (gebinde || []).filter(
    (g) => Number.isFinite(g.liter) && g.liter > 0 && Number.isFinite(g.preis) && g.preis > 0
  );
  if (!brauchbar.length) return null;

  // In 50-ml-Schritten rechnen — feiner braucht es niemand, und es hält die
  // Tabelle klein genug, um sie bei jedem Tastendruck neu zu füllen.
  const SCHRITT = 0.05;
  const ziel = Math.ceil(Number(bedarfLiter) / SCHRITT);
  if (!Number.isFinite(ziel) || ziel <= 0) return null;
  if (ziel > 20000) return null;                 // > 1000 Liter: bitte anrufen

  const kosten = new Array(ziel + 1).fill(Infinity);
  const woher = new Array(ziel + 1).fill(-1);
  kosten[0] = 0;

  for (let i = 1; i <= ziel; i++) {
    for (let g = 0; g < brauchbar.length; g++) {
      const schritte = Math.round(brauchbar[g].liter / SCHRITT);
      if (schritte <= 0) continue;
      // Ein größeres Gebinde darf über das Ziel hinausschießen — es zählt,
      // was am Ende am wenigsten kostet.
      const vorher = Math.max(0, i - schritte);
      const neu = kosten[vorher] + brauchbar[g].preis;
      if (neu < kosten[i]) { kosten[i] = neu; woher[i] = g; }
    }
  }
  if (!Number.isFinite(kosten[ziel])) return null;

  const zaehler = new Map();
  let i = ziel;
  while (i > 0 && woher[i] >= 0) {
    const g = brauchbar[woher[i]];
    zaehler.set(g.label, (zaehler.get(g.label) || 0) + 1);
    i = Math.max(0, i - Math.round(g.liter / SCHRITT));
  }

  const teile = [...zaehler.entries()].map(([label, anzahl]) => {
    const g = brauchbar.find((x) => x.label === label);
    return { label, liter: g.liter, preis: g.preis, anzahl };
  }).sort((a, b) => b.liter - a.liter);

  const liter = Math.round(teile.reduce((s, t) => s + t.liter * t.anzahl, 0) * 1000) / 1000;
  const preis = Math.round(teile.reduce((s, t) => s + t.preis * t.anzahl, 0) * 100) / 100;
  return { teile, liter, preis };
}

/**
 * Monatsbedarf auf zwei Marken aufteilen und beide Hälften günstigst einkaufen.
 *
 * @param {{ bedarfLiter:number, anteilB:number,
 *           gebindeA:Array, gebindeB:Array, rabatt:number }} wahl
 *   anteilB = Anteil der zweiten Marke in Prozent (0 = nur A, 100 = nur B)
 */
export function mischBedarf(wahl) {
  const bedarf = Number(wahl && wahl.bedarfLiter);
  const anteilB = Math.min(100, Math.max(0, Number(wahl && wahl.anteilB) || 0));
  const rabatt = Math.floor(Number(wahl && wahl.rabatt));
  if (!Number.isFinite(bedarf) || bedarf <= 0) return null;
  if (PRODUKT_ABO_PREISE[rabatt] === undefined) return null;

  const literB = Math.round(bedarf * (anteilB / 100) * 1000) / 1000;
  const literA = Math.round((bedarf - literB) * 1000) / 1000;

  const teilA = literA > 0 ? guenstigsteKombi(wahl.gebindeA, literA) : { teile: [], liter: 0, preis: 0 };
  const teilB = literB > 0 ? guenstigsteKombi(wahl.gebindeB, literB) : { teile: [], liter: 0, preis: 0 };
  if (!teilA || !teilB) return null;

  const cent = (n) => Math.round(n * 100) / 100;
  const normal = cent(teilA.preis + teilB.preis);
  if (normal <= 0) return null;
  const mitglied = cent(normal * (1 - rabatt / 100));
  const ersparnis = cent(normal - mitglied);
  const beitrag = cent(Math.max(MENGE_MINDESTBEITRAG, ersparnis * ANTEIL_AN_ERSPARNIS));
  return {
    literA, literB, teilA, teilB,
    literGesamt: cent(teilA.liter + teilB.liter),
    normal, mitglied, ersparnis, beitrag,
  };
}
