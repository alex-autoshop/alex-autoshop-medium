// ─────────────────────────────────────────────────────────────────────────────
// Versand und Pfand — eine Quelle für die Versandseite, den Warenkorb und
// die Kasse. Die Beträge stehen so auch auf /versand.
//
// Paketpreis: Gewichtsstufen (DHL). Solange die echten Stufenpreise nicht
// da sind, kostet jede Stufe den heutigen Satz. Ein Paket höchstens 30 kg
// (begrenzte Menge, LQ). Das erste Paket ist ab VERSAND_FREI_AB frei, jedes
// weitere wird berechnet. Ab dem vierten Paket: Spedition, Preis auf Anfrage.
// ─────────────────────────────────────────────────────────────────────────────

/** Heutiger Satz. Steht in jeder Gewichtsstufe, bis die echten Preise da sind. */
export const DHL_EUR = 7.49;

/**
 * DHL-Gewichtsstufen, Brutto je Paket. Die erste passende Stufe gewinnt.
 * Preise hier ändern — Seite und Kasse ziehen mit. 7,49 ist der Platzhalter.
 */
export const GEWICHT_STUFEN = [
  { bisKg: 2, euro: 7.49 },
  { bisKg: 5, euro: 7.49 },
  { bisKg: 10, euro: 7.49 },
  { bisKg: 20, euro: 7.49 },
  { bisKg: 31.5, euro: 7.49 },
];

/** Höchstgewicht je Paket (begrenzte Menge). DHL-Stufe 31,5 kg bleibt die Preisgrenze. */
export const PAKET_MAX_KG = 30;

/** Ab so vielen Paketen gibt es keinen Online-Preis. */
export const SPEDITION_AB_PAKET = 4;

/**
 * Wenn weder Gewicht noch Gebinde bekannt ist. Klein, damit ein fehlendes
 * Gewicht nicht still eine Spedition auslöst. Gebinde im Namen zählen extra.
 */
export const FALLBACK_KG = 1;

/** Lack inkl. Dose, wenn nur „5 L“ dasteht: 5 L → 5,4 kg. */
const KG_JE_LITER = 1.08;

/** Ab diesem Warenwert (ohne Versand und ohne Pfand) ist das ERSTE Paket inklusive. */
export const VERSAND_FREI_AB = 150;

export const VERSAND_ANFRAGE = "Versand per Spedition – Preis auf Anfrage";
export const VERSAND_MAIL = "info@alex-autoshop.de";

/**
 * Batteriepfand je Starterbatterie. Üblicher Satz nach Batteriegesetz.
 * Kein Altteilpfand — den gibt es hier nicht, und es wird keiner erfunden.
 */
export const BATTERIEPFAND_EUR = 7.5;

export function versandMailto(betreff = "Versand per Spedition") {
  return `mailto:${VERSAND_MAIL}?subject=${encodeURIComponent(String(betreff || "Versand"))}`;
}

/** Shopify-Gewicht (Zahl + Einheit) nach Kilogramm. 0 und Unfug → null. */
export function kgAusShopify(weight, unit) {
  const n = Number(weight);
  if (!Number.isFinite(n) || n <= 0) return null;
  const u = String(unit || "").toUpperCase();
  let kg = n;
  if (u.startsWith("G")) kg = n / 1000;
  else if (u.startsWith("POUND") || u === "LB" || u === "LBS") kg = n * 0.45359237;
  else if (u.startsWith("O")) kg = n * 0.028349523;
  const gerundet = Math.round(kg * 1000) / 1000;
  return gerundet > 0 ? gerundet : null;
}

/** „5 L“, „500 ml“ im Namen → kg. Sonst null. */
export function kgAusText(text) {
  const t = String(text || "").toLowerCase().replace(",", ".");
  const m = t.match(/(\d+(?:\.\d+)?)\s*(ml|l)\b/);
  if (!m) return null;
  const zahl = parseFloat(m[1]);
  if (!Number.isFinite(zahl) || zahl <= 0) return null;
  const liter = m[2] === "ml" ? zahl / 1000 : zahl;
  if (liter > 1000) return null;
  return Math.round(liter * KG_JE_LITER * 1000) / 1000;
}

/**
 * Gewicht eines Stücks.
 * kg + einheit (Shopify) gewinnen, sonst kg schon in Kilogramm, sonst der Name, sonst FALLBACK_KG.
 */
export function stueckKg(angabe) {
  const roh = Number(angabe && angabe.kg);
  const einheit = angabe && angabe.einheit;
  if (Number.isFinite(roh) && roh > 0) {
    const direkt = einheit ? kgAusShopify(roh, einheit) : Math.round(roh * 1000) / 1000;
    if (direkt && direkt > 0) return direkt;
  }
  const ausText = kgAusText(angabe && (angabe.name || angabe.titel || ""));
  if (ausText) return ausText;
  return FALLBACK_KG;
}

export function preisFuerGewicht(kg) {
  const g = Number(kg);
  if (!Number.isFinite(g) || g <= 0) return GEWICHT_STUFEN[0].euro;
  const stufe = GEWICHT_STUFEN.find((s) => g <= s.bisKg + 1e-9);
  return stufe ? stufe.euro : GEWICHT_STUFEN[GEWICHT_STUFEN.length - 1].euro;
}

function gramm(kg) {
  return Math.round(Number(kg) * 1000);
}

/**
 * Stücke in Pakete, schwerste zuerst, höchstens 30 kg. Ein Stück darüber
 * passt in kein Paket (zuSchwer).
 * @param {number[]} stueckeKg
 */
export function paketePacken(stueckeKg) {
  const max = gramm(PAKET_MAX_KG);
  const stueck = [];
  for (const roh of stueckeKg || []) {
    const g = gramm(roh);
    if (!Number.isFinite(g) || g <= 0) continue;
    stueck.push(g);
  }
  if (stueck.some((g) => g > max)) return { zuSchwer: true, pakete: [] };
  stueck.sort((a, b) => b - a);
  /** @type {number[]} */
  const pakete = [];
  for (const g of stueck) {
    let ziel = pakete.findIndex((rest) => rest + g <= max);
    if (ziel < 0) {
      pakete.push(0);
      ziel = pakete.length - 1;
    }
    pakete[ziel] += g;
  }
  return {
    zuSchwer: false,
    pakete: pakete.map((g) => ({ kg: Math.round(g) / 1000, gramm: g })),
  };
}

function stueckeAusPositionen(positionen) {
  const liste = [];
  for (const p of positionen || []) {
    const menge = Math.max(0, Math.floor(Number(p && p.menge) || 0));
    const kg = stueckKg(p);
    for (let i = 0; i < menge; i++) liste.push(kg);
  }
  return liste;
}

/**
 * @param {{ summe?: number, abholung?: boolean, positionen?: Array<{ menge?: number, kg?: number, einheit?: string, name?: string, titel?: string }> }} wahl
 * Ohne positionen: ein Paket zum heutigen Satz (alte Aufrufe).
 * @returns {{ art: "abholung"|"frei"|"paket"|"spedition", betrag: number|null, pakete: number, zeilen: Array<{kg:number, preis:number}>, text: string }}
 */
export function versandPlan(wahl) {
  if (wahl && wahl.abholung) {
    return { art: "abholung", betrag: 0, pakete: 0, zeilen: [], text: "Abholung kostenlos" };
  }
  const hatPositionen = Array.isArray(wahl && wahl.positionen);
  let gepackt;
  if (!hatPositionen) {
    gepackt = { zuSchwer: false, pakete: [{ kg: 0, gramm: 0, pauschale: true }] };
  } else if (wahl.positionen.length === 0) {
    gepackt = { zuSchwer: false, pakete: [] };
  } else {
    gepackt = paketePacken(stueckeAusPositionen(wahl.positionen));
  }
  if (gepackt.zuSchwer || gepackt.pakete.length >= SPEDITION_AB_PAKET) {
    return {
      art: "spedition",
      betrag: null,
      pakete: gepackt.zuSchwer ? SPEDITION_AB_PAKET : gepackt.pakete.length,
      zeilen: [],
      text: VERSAND_ANFRAGE,
    };
  }
  const summe = Number(wahl && wahl.summe) || 0;
  const erstesFrei = summe >= VERSAND_FREI_AB;
  let betrag = 0;
  const zeilen = gepackt.pakete.map((p, i) => {
    const liste = p.pauschale ? preisFuerGewicht(PAKET_MAX_KG) : preisFuerGewicht(p.kg);
    const preis = i === 0 && erstesFrei ? 0 : liste;
    betrag = Math.round((betrag + preis) * 100) / 100;
    return { kg: p.kg || 0, preis };
  });
  const art = betrag === 0 ? "frei" : "paket";
  return { art, betrag, pakete: zeilen.length, zeilen, text: versandText({ art, betrag, pakete: zeilen.length, zeilen, text: "" }) };
}

export function versandText(plan) {
  if (!plan || plan.art === "abholung") return "Abholung kostenlos";
  if (plan.art === "spedition") return VERSAND_ANFRAGE;
  const n = Math.max(0, Math.floor(Number(plan.pakete) || 0));
  const geld = Number(plan.betrag || 0).toFixed(2).replace(".", ",");
  if (!(plan.betrag > 0)) return n > 1 ? `Versand kostenlos · ${n} Pakete` : "Versand kostenlos";
  return n > 1 ? `Versand ${geld} € · ${n} Pakete` : `Versand ${geld} €`;
}

/**
 * Betrag in Euro, oder null wenn der Preis auf Anfrage ist.
 * Ohne Positionen bleibt es beim heutigen einen Paket.
 */
export function versandkosten(wahl) {
  const plan = versandPlan(wahl);
  if (plan.art === "spedition") return null;
  return plan.betrag;
}

/** Starterbatterie, nicht Polfett, Klemme oder Ladekabel. */
export function istStarterbatterie(name) {
  const n = String(name || "").toLowerCase();
  if (/polfett|polklemme|batterieklemme|batteriehalter|batteriepol|ladekabel|erhaltungslad|batteriesäure|batteriesaeure/.test(n)) {
    return false;
  }
  if (/starterbatterie/.test(n)) return true;
  return /\bbatterie\b/.test(n) && /(\d+\s?ah|\b12\s?v\b)/.test(n);
}

export function pfandBetrag(namenMitMenge) {
  const liste = Array.isArray(namenMitMenge) ? namenMitMenge : [];
  const stueck = liste.reduce((n, p) => {
    if (!istStarterbatterie(p && p.name)) return n;
    const m = Math.max(0, Math.floor(Number(p.menge) || 0));
    return n + m;
  }, 0);
  return { stueck, betrag: Math.round(stueck * BATTERIEPFAND_EUR * 100) / 100 };
}
