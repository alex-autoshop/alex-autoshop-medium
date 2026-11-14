/**
 * WhatsApp-Link für Autoteile-Anfragen.
 * Die Angaben stehen nur in der Nachricht, nichts wird gespeichert.
 */

export const WHATSAPP_NUMMER = "4920282690";
export const WHATSAPP_ANZEIGE = "+49 202 82690";
export const WHATSAPP_TEL = "+4920282690";

export const FELD_MAX = {
  marke: 80,
  modell: 80,
  baujahr: 4,
  hsn: 8,
  tsn: 6,
  fin: 17,
  teil: 120,
  anmerkung: 400,
  plz: 10,
};

const FELDER = [
  ["marke", "Marke", FELD_MAX.marke],
  ["modell", "Modell", FELD_MAX.modell],
  ["baujahr", "Baujahr", FELD_MAX.baujahr],
  ["hsn", "HSN", FELD_MAX.hsn],
  ["tsn", "TSN", FELD_MAX.tsn],
  ["fin", "FIN", FELD_MAX.fin],
  ["teil", "Teil", FELD_MAX.teil],
  ["anmerkung", "Anmerkung", FELD_MAX.anmerkung],
  ["plz", "PLZ", FELD_MAX.plz],
];

const GRUSS = "Hallo, ich suche ein Autoteil bei Alex Autoshop.";
const URL_MAX = 1800;

export function feldText(wert, max = 120) {
  const grenze = Number.isFinite(max) && max > 0 ? Math.floor(max) : 120;
  return String(wert ?? "")
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, grenze);
}

function finText(wert) {
  return feldText(wert, 40)
    .replace(/\s/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, FELD_MAX.fin);
}

export function anfrageText(angaben = {}) {
  const zeilen = [GRUSS];
  for (const [key, label, max] of FELDER) {
    const text = key === "fin" ? finText(angaben?.[key]) : feldText(angaben?.[key], max);
    if (text) zeilen.push(`${label}: ${text}`);
  }
  let text = zeilen.join("\n");
  const basis = whatsappChatUrl() + "?text=";
  while (basis.length + encodeURIComponent(text).length > URL_MAX && text.length > 0) {
    text = text.slice(0, -1);
  }
  return text.trim();
}

export function anfrageBereit(angaben) {
  return feldText(angaben?.teil, FELD_MAX.teil).length > 0;
}

export function whatsappChatUrl() {
  return `https://wa.me/${WHATSAPP_NUMMER}`;
}

export function whatsappAnfrageUrl(angaben) {
  return `${whatsappChatUrl()}?text=${encodeURIComponent(anfrageText(angaben))}`;
}
