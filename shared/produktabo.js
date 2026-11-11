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

import { istAboKonfigurator } from "./abo-kategorien.js";

/** Monatsbeitrag je Produkt, nach gewählter Rabattstufe. */
export const PRODUKT_ABO_PREISE = {
  15: 1,
  28: 2,
  40: 3,
};

/**
 * Jede Position, Einzelprodukt wie Menge.
 *
 * Der Monatsbeitrag ist ein Anteil an der Ersparnis dieser Zeile, mindestens
 * der Stufenbeitrag (1 € / 2 € / 3 €). Die Ersparnis selbst hat keine Obergrenze:
 * wer viel kauft, spart den vollen Rabatt und zahlt davon den Anteil.
 *
 *   Ersparnis = (Normalpreis − Abo-Preis) × Menge
 *   Beitrag   = max(Stufenminimum, Ersparnis × ANTEIL_AN_ERSPARNIS)
 *
 * ANTEIL ÄNDERN: hier. 0.2 = der Kunde behält 80 % seiner Ersparnis.
 */
export const ANTEIL_AN_ERSPARNIS = 0.2;

/**
 * Früher der feste Boden nur für Mengen-Positionen (1 €, unabhängig von der Stufe).
 * Der Boden ist jetzt das Stufenminimum. Die Konstante bleibt, damit alte Importe
 * nicht brechen; die Rechnung nutzt sie nicht mehr.
 */
export const MENGE_MINDESTBEITRAG = 1;

/** Mindest- und Höchstzahl an Produkten in einer Abo-Liste. */
export const MIN_PRODUKTE = 1;
export const MAX_PRODUKTE = 100;

export const ABO_RABATTE = [15, 28, 40];

/**
 * Aufschlag auf den 2K-Normalpreis im Produkt-Abo.
 * Viele Farbtöne gibt es nicht als 2K — dann wird 1K geliefert. Der Zuschlag
 * liegt auf dem Normalpreis, bevor Rabatt und Beitrag gerechnet werden.
 * ÄNDERN: nur diese Zahl. 0.25 = plus 25 %.
 */
export const ABO_2K_AUFSCHLAG = 0.25;

export const LACKSYSTEM_1K = "1K bevorzugt";
export const LACKSYSTEM_2K = "2K bevorzugt";

/** Deutsche Menge: 4 → „4“, 1.5 → „1,5“, 1000 → „1.000“. */
export function mengeZahl(wert) {
  const n = Number(wert);
  if (!Number.isFinite(n)) return "";
  const gerundet = Math.round(n * 100) / 100;
  const negativ = gerundet < 0;
  const [ganz, bruch] = Math.abs(gerundet).toFixed(2).split(".");
  const gruppen = ganz.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const rest = bruch.replace(/0+$/, "");
  const text = rest ? `${gruppen},${rest}` : gruppen;
  return negativ ? `-${text}` : text;
}

/** Wunschfarbe in der Abo-Liste, z. B. „40 % auf 4 L Wunschfarbe im Monat“. */
export function wunschfarbeAboTitel(rabatt, liter) {
  const r = Math.floor(Number(rabatt));
  const l = Number(liter);
  if (!Number.isFinite(r) || !Number.isFinite(l) || l <= 0) return null;
  return `${r} % auf ${mengeZahl(l)} L Wunschfarbe im Monat`;
}

/** Mengen-Zeile der Wunschfarbe (nicht Spraydose oder Lackstift). */
export function istWunschfarbeMenge(p) {
  if (!p) return false;
  const handle = String(p.handle || "");
  const id = String(p.id || "");
  if (handle !== "farben-mix" && !id.startsWith("farben-mix::")) return false;
  return p.art === "menge" || p.einzelpreis != null;
}

/**
 * Detailzeile ohne eingefrorene Liter. Markenmix und Lacksystem bleiben,
 * die Liter folgen der aktuellen Menge.
 */
export function wunschfarbeDetail(variante, liter) {
  const kern = String(variante || "")
    .replace(/\s*·\s*[\d.,]+\s*L\s*\/\s*Monat\s*$/i, "")
    .trim();
  const literText = `${mengeZahl(liter)} L / Monat`;
  return kern ? `${kern} · ${literText}` : literText;
}

/** Alte Werte („1K“, „2K“, „egal“, „Egal – 1K oder 2K“) auf die zwei Knöpfe. */
export function lacksystemKanonisch(wert) {
  const t = String(wert ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (t.startsWith("2k")) return LACKSYSTEM_2K;
  if (t.startsWith("1k")) return LACKSYSTEM_1K;
  return LACKSYSTEM_1K;
}

/** Kurzer Alt-Code „2K“, dessen Einzelpreis den Aufschlag noch nicht enthält. */
export function istAlter2kOhneAufschlag(wert) {
  const t = String(wert ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!t.startsWith("2k")) return false;
  return !t.startsWith("2k bevorzugt");
}

/** Normalpreis mal (1 + Aufschlag), auf Cent. Ohne Aufschlag bleibt der Preis. */
export function preisMitAufschlag(betrag, aufschlag) {
  const n = Number(betrag);
  if (!Number.isFinite(n)) return null;
  const a = Number(aufschlag);
  const faktor = Number.isFinite(a) && a > 0 ? 1 + a : 1;
  return Math.round(n * faktor * 100) / 100;
}

function varianteKanonisch(text) {
  return String(text || "").split(" · ").map((teil) => {
    const t = teil.trim().toLowerCase().replace(/\s+/g, " ");
    if (t.startsWith("2k")) return LACKSYSTEM_2K;
    if (t.startsWith("1k")) return LACKSYSTEM_1K;
    if (t === "egal" || t.startsWith("egal")) return LACKSYSTEM_1K;
    return teil;
  }).join(" · ");
}

/**
 * Gespeicherte Mengen-Zeile: „egal“ wird „1K bevorzugt“.
 * Ein alter „2K“-Einzelpreis bekommt den Aufschlag genau einmal.
 */
export function mengenAngabeNormalisieren(p) {
  if (!p) return p;
  const hatLack = p.lacksystem != null && String(p.lacksystem).trim() !== "";
  const hatVariante = p.variante != null && String(p.variante).length > 0;
  const id = p.id != null ? String(p.id) : "";
  const hatEgalId = /::egal::/i.test(id);
  if (!hatLack && !hatVariante && !hatEgalId) return p;

  const auf = hatLack && istAlter2kOhneAufschlag(p.lacksystem);
  const einzel = Number(p.einzelpreis);
  const naechster = { ...p };
  if (hatLack) naechster.lacksystem = lacksystemKanonisch(p.lacksystem);
  if (hatVariante) naechster.variante = varianteKanonisch(p.variante);
  if (hatEgalId) naechster.id = id.replace(/::egal::/gi, "::1k::");
  if (auf && Number.isFinite(einzel)) {
    naechster.einzelpreis = preisMitAufschlag(einzel, ABO_2K_AUFSCHLAG);
  }
  return naechster;
}

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

const cent = (n) => Math.round(n * 100) / 100;

/** max(Stufenminimum, Anteil an der Ersparnis), auf Cent. */
export function zeilenBeitrag(ersparnis, mindest) {
  const anteil = cent(Math.max(0, Number(ersparnis) || 0) * ANTEIL_AN_ERSPARNIS);
  const boden = cent(Math.max(0, Number(mindest) || 0));
  return cent(Math.max(boden, anteil));
}

/**
 * Beitrag einer einzelnen Mengen-Position.
 *
 * @param {{ einzelpreis: number, menge: number, rabatt: number }} pos
 *   einzelpreis = Normalpreis einer Einheit (z. B. 1 L Lack)
 *   menge       = Einheiten pro Monat
 * @returns {{ normal: number, mitglied: number, ersparnis: number, anteil: number, mindest: number, beitrag: number } | null}
 */
export function mengenPosition(pos) {
  const einzel = Number(pos && pos.einzelpreis);
  const menge = Math.floor(Number(pos && pos.menge));
  const rabatt = Math.floor(Number(pos && pos.rabatt));
  if (!Number.isFinite(einzel) || einzel <= 0) return null;
  if (!Number.isFinite(menge) || menge < 1 || menge > 9999) return null;
  if (PRODUKT_ABO_PREISE[rabatt] === undefined) return null;

  const normal = cent(einzel * menge);
  const mitglied = cent(normal * (1 - rabatt / 100));
  const ersparnis = cent(normal - mitglied);
  const mindest = PRODUKT_ABO_PREISE[rabatt];
  const anteil = cent(ersparnis * ANTEIL_AN_ERSPARNIS);
  return { normal, mitglied, ersparnis, anteil, mindest, beitrag: cent(Math.max(mindest, anteil)) };
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
    .filter((p) => p && (p.art === "menge" || !istAboKonfigurator(p.handle)))
    .map((p) => {
      const eigene = Math.floor(Number(p && p.rabatt));
      const basis = { ...p, rabatt: rabattGueltig(eigene) ? eigene : standard };
      return mengenAngabeNormalisieren(basis);
    });
  return { standard, produkte };
}

/**
 * Ein Einzelprodukt in die Abo-Liste. Die Stufe ist die gespeicherte
 * Voreinstellung (sonst 15 %). Doppelte und volle Listen bleiben unverändert.
 */
export function aboListeErgaenzen(roh, produkt) {
  const liste = listeNormalisieren(roh);
  const id = String(produkt && produkt.id || "").trim();
  const titel = String(produkt && produkt.titel || "").trim();
  if (!id || !titel) return { ...liste, ergebnis: "leer" };
  if (produkt.art !== "menge" && istAboKonfigurator(produkt.handle)) return { ...liste, ergebnis: "konfigurator" };
  if (liste.produkte.some((p) => p && p.id === id)) return { ...liste, ergebnis: "schon" };
  if (liste.produkte.length >= MAX_PRODUKTE) return { ...liste, ergebnis: "voll" };
  const eigene = Math.floor(Number(produkt && produkt.rabatt));
  const neu = {
    id,
    handle: String(produkt.handle || ""),
    titel,
    preis: Number(produkt.preis) > 0 ? Number(produkt.preis) : 0,
    waehrung: String(produkt.waehrung || "EUR"),
    bild: produkt.bild ? String(produkt.bild) : "",
    ab: !!produkt.ab,
    rabatt: rabattGueltig(eigene) ? eigene : liste.standard,
  };
  return { standard: liste.standard, produkte: [...liste.produkte, neu], ergebnis: "neu" };
}

/**
 * Rabattstufe einer vorhandenen Zeile ändern, Einzelprodukt oder Menge.
 * Die Voreinstellung für das nächste Produkt bleibt. Unbekannte Stufen
 * und fehlende Zeilen bleiben unverändert.
 */
export function aboStufeSetzen(roh, id, rabatt) {
  const liste = listeNormalisieren(roh);
  const ziel = String(id || "").trim();
  const stufe = Math.floor(Number(rabatt));
  if (!ziel || !rabattGueltig(stufe)) return { ...liste, ergebnis: "leer" };
  const idx = liste.produkte.findIndex((p) => p && p.id === ziel);
  if (idx < 0) return { ...liste, ergebnis: "leer" };
  if (liste.produkte[idx].rabatt === stufe) return { ...liste, ergebnis: "schon" };
  const produkte = liste.produkte.slice();
  produkte[idx] = { ...produkte[idx], rabatt: stufe };
  return { standard: liste.standard, produkte, ergebnis: "neu" };
}

/** Stufe (und optional den Einzelpreis) einer vorhandenen Einzelposition ändern. */
export function aboEinzelAktualisieren(roh, produkt) {
  const liste = listeNormalisieren(roh);
  const id = String(produkt && produkt.id || "").trim();
  const rabatt = Math.floor(Number(produkt && produkt.rabatt));
  if (!id || !rabattGueltig(rabatt)) return { ...liste, ergebnis: "leer" };
  const idx = liste.produkte.findIndex((p) => p && p.id === id);
  if (idx < 0) return { ...liste, ergebnis: "leer" };
  if (liste.produkte[idx].art === "menge") return { ...liste, ergebnis: "schon" };
  const produkte = liste.produkte.slice();
  const preis = Number(produkt.preis);
  produkte[idx] = {
    ...produkte[idx],
    rabatt,
    ...(Number.isFinite(preis) && preis >= 0 ? { preis } : {}),
  };
  return { standard: liste.standard, produkte, ergebnis: "neu" };
}

/**
 * Eine Zeile aus der Übersicht nehmen, Einzelprodukt oder Mengen-Position.
 * Dieselbe Geste wie auf der Abo-Seite (Zeile filtern). Der Warenkorb nutzt
 * weiter aboEinzelEntfernen, das Mengen-Positionen stehen lässt.
 */
export function aboPositionEntfernen(roh, id) {
  const liste = listeNormalisieren(roh);
  const ziel = String(id || "").trim();
  if (!ziel || !liste.produkte.some((p) => p && p.id === ziel)) {
    return { ...liste, ergebnis: "leer" };
  }
  return {
    standard: liste.standard,
    produkte: liste.produkte.filter((p) => p && p.id !== ziel),
    ergebnis: "weg",
  };
}

/** Einzelposition aus der Liste nehmen. Eine Mengen-Position bleibt. */
export function aboEinzelEntfernen(roh, id) {
  const liste = listeNormalisieren(roh);
  const ziel = liste.produkte.find((p) => p && p.id === id);
  if (!ziel) return { ...liste, ergebnis: "leer" };
  if (ziel.art === "menge") return { ...liste, ergebnis: "schon" };
  return {
    standard: liste.standard,
    produkte: liste.produkte.filter((p) => p.id !== id),
    ergebnis: "weg",
  };
}

/**
 * Mitgliedspreis einer Warenkorbzeile.
 * einzel = Normalpreis einer Einheit, menge = Stückzahl, rabatt = 15, 28 oder 40.
 */
export function mitgliedZeile(einzel, menge, rabatt) {
  const r = Math.floor(Number(rabatt));
  if (!rabattGueltig(r)) return null;
  const e = Number(einzel);
  const m = Math.floor(Number(menge));
  if (!Number.isFinite(e) || e < 0 || !Number.isFinite(m) || m < 1) return null;
  const cent = (n) => Math.round(n * 100) / 100;
  const normal = cent(e * m);
  const mitglied = cent(normal * (1 - r / 100));
  return { normal, mitglied, ersparnis: cent(normal - mitglied), rabatt: r };
}

/**
 * Warenwert einer Kasse. Zeilen mit gültiger Stufe werden zum Abo-Preis
 * gerechnet, die anderen zum Ladenpreis. Der Browser-Preis zählt nicht.
 */
export function warenMitRabatt(zeilen) {
  const cent = (n) => Math.round(Number(n) * 100) / 100;
  let summe = 0;
  const positionen = [];
  for (const z of zeilen || []) {
    const einzel = Number(z && z.einzel);
    const menge = Math.floor(Number(z && z.menge));
    const rabatt = Math.floor(Number(z && z.rabatt));
    const titel = String((z && z.titel) || "Ware").slice(0, 80);
    if (!Number.isFinite(einzel) || einzel < 0 || menge < 1 || menge > 999) return null;
    if (rabattGueltig(rabatt)) {
      const rech = mitgliedZeile(einzel, menge, rabatt);
      if (!rech) return null;
      positionen.push({ titel, menge, betrag: rech.mitglied });
      summe = cent(summe + rech.mitglied);
    } else {
      const betrag = cent(einzel * menge);
      positionen.push({ titel, menge, betrag });
      summe = cent(summe + betrag);
    }
  }
  if (!positionen.length) return null;
  return { summe, positionen };
}

function istMengenPosition(pos) {
  return !!(pos && (pos.art === "menge" || (pos.einzelpreis != null && pos.art !== "einzel")));
}

/**
 * Monatsbeitrag einer Position mit IHRER Stufe.
 * Jede Zeile: max(Stufenminimum, 20 % der Ersparnis). Menge 1, wenn keine dasteht.
 */
export function beitragPosition(pos) {
  const rabatt = Math.floor(Number(pos && pos.rabatt));
  if (!rabattGueltig(rabatt)) return null;
  if (istMengenPosition(pos)) {
    return mengenPosition({ einzelpreis: pos.einzelpreis, menge: pos.menge, rabatt });
  }
  const einzel = Number(pos && pos.preis);
  const menge = Math.max(1, Math.floor(Number(pos && pos.menge) || 1));
  if (!Number.isFinite(einzel) || einzel < 0) return null;
  if (menge > 9999) return null;
  const normal = cent(einzel * menge);
  const mitglied = cent(normal * (1 - rabatt / 100));
  const ersparnis = cent(normal - mitglied);
  const mindest = PRODUKT_ABO_PREISE[rabatt];
  const anteil = cent(ersparnis * ANTEIL_AN_ERSPARNIS);
  return { normal, mitglied, ersparnis, anteil, mindest, beitrag: cent(Math.max(mindest, anteil)) };
}

/**
 * Warenkorb-Menge auf Einzelprodukte legen. Mengen-Positionen behalten ihre eigene Menge.
 * @param {Array<Record<string, unknown>>} produkte
 * @param {Array<{ id?: string, menge?: number }>} zeilen
 */
export function produkteMitKorbmenge(produkte, zeilen) {
  const summe = new Map();
  for (const z of zeilen || []) {
    const id = String(z && z.id || "");
    const menge = Math.floor(Number(z && z.menge) || 0);
    if (!id || menge < 1) continue;
    summe.set(id, (summe.get(id) || 0) + menge);
  }
  return (Array.isArray(produkte) ? produkte : []).map((p) => {
    if (istMengenPosition(p)) return p;
    const ausKorb = summe.get(String(p && p.id || ""));
    const menge = ausKorb || Math.max(1, Math.floor(Number(p && p.menge) || 1));
    return { ...p, menge };
  });
}

/**
 * Beitrag der Kasse. Die Menge einer Einzelposition ist mindestens die Menge
 * der rabattierten Warenzeile — ein mitgeschickter Beitrag von 1 Stück bei
 * 20 Stück Ware zählt nicht.
 */
export function aboBeitragFuerKasse(produkte, waren) {
  const rabattWaren = (Array.isArray(waren) ? waren : []).filter((w) => rabattGueltig(w && w.rabatt));
  const basis = (Array.isArray(produkte) ? produkte : []).map((p) => {
    if (istMengenPosition(p)) return p;
    const treffer = rabattWaren.filter((w) => (
      (w.id && p && p.id && String(w.id) === String(p.id))
      || (!w.id && w.titel && p && w.titel === p.titel)
    ));
    const menge = treffer.reduce((s, w) => s + Math.max(0, Math.floor(Number(w.menge) || 0)), 0);
    const preis = treffer.length && Number(treffer[0].einzel) > 0 ? Number(treffer[0].einzel) : p.preis;
    return { ...p, preis, menge: Math.max(1, menge || Math.floor(Number(p && p.menge) || 1)) };
  });
  const ids = new Set(basis.map((p) => String(p && p.id || "")));
  const titel = new Set(basis.filter((p) => !istMengenPosition(p)).map((p) => p && p.titel));
  const extra = [];
  for (const w of rabattWaren) {
    if (w.id && ids.has(String(w.id))) continue;
    if (!w.id && titel.has(w.titel)) continue;
    extra.push({
      art: "einzel",
      id: w.id,
      titel: w.titel,
      preis: w.einzel,
      menge: w.menge,
      rabatt: w.rabatt,
    });
  }
  return aboListeGesamt([...basis, ...extra]);
}

/** Ein Satz für die Leiste: Ersparnis, Anteil, Minimum, Beitrag. */
export function beitragSatz(z) {
  if (!z || !Number.isFinite(Number(z.beitrag))) return "";
  const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
  const prozent = Math.round(ANTEIL_AN_ERSPARNIS * 100);
  const anteil = Number.isFinite(Number(z.anteil))
    ? Number(z.anteil)
    : cent(Number(z.ersparnis) * ANTEIL_AN_ERSPARNIS);
  const mindest = Number.isFinite(Number(z.mindest)) ? ` · mindestens ${euro.format(z.mindest)}` : "";
  return `Ersparnis ${euro.format(z.ersparnis)} · ${prozent} % davon ${euro.format(anteil)}${mindest} → ${euro.format(z.beitrag)}`;
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
 *           gebindeA:Array, gebindeB:Array, rabatt:number, aufschlag?:number }} wahl
 *   anteilB = Anteil der zweiten Marke in Prozent (0 = nur A, 100 = nur B)
 *   aufschlag = Zuschlag auf den Normalpreis vor Rabatt (2K: ABO_2K_AUFSCHLAG)
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
  const basis = cent(teilA.preis + teilB.preis);
  if (basis <= 0) return null;
  const normal = preisMitAufschlag(basis, wahl && wahl.aufschlag);
  if (!(normal > 0)) return null;
  const mitglied = cent(normal * (1 - rabatt / 100));
  const ersparnis = cent(normal - mitglied);
  const mindest = PRODUKT_ABO_PREISE[rabatt];
  const anteil = cent(ersparnis * ANTEIL_AN_ERSPARNIS);
  const beitrag = cent(Math.max(mindest, anteil));
  return {
    literA, literB, teilA, teilB,
    literGesamt: cent(teilA.liter + teilB.liter),
    normal, mitglied, ersparnis, anteil, mindest, beitrag,
  };
}
