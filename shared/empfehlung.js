// ─────────────────────────────────────────────────────────────────────────────
// Empfehlungsprogramm — EIN Wert für Kundenkonto, Willkommens-Mail und die
// automatische Gutschrift (Zahlungs-Webhooks).
//
// Satz ändern: NUR HIER. Texte und Buchung ziehen automatisch mit.
// (Bis 22.09.2026 standen überall 20 % — bei Level 3 mehr als die Marge.)
//
// EMPFEHLUNG_OEFFENTLICH = false: Kunden sehen den Bereich nicht, neue
// Zuordnungen und neue Provisionen bleiben aus. Der Code und die gespeicherten
// Guthaben bleiben. Wieder öffnen: Konstante auf true, oder
// EMPFEHLUNG_OEFFENTLICH=true (auch VITE_EMPFEHLUNG_OEFFENTLICH).
// Das Konto info@alex-autoshop.de sieht die Fläche auch solange sie zu ist.
// ─────────────────────────────────────────────────────────────────────────────

import { istTeileboerseAdminMail } from "./teileboerse-schalter.js";

export const EMPFEHLUNG_OEFFENTLICH = false;

function envWert(name) {
  try {
    const env = typeof process !== "undefined" && process.env ? process.env : {};
    const wert = env[name];
    return typeof wert === "string" ? wert : "";
  } catch {
    return "";
  }
}

function viteWert() {
  try {
    const env = import.meta && import.meta.env;
    const wert = env && env.VITE_EMPFEHLUNG_OEFFENTLICH;
    return typeof wert === "string" ? wert : "";
  } catch {
    return "";
  }
}

export function empfehlungOffen() {
  if (EMPFEHLUNG_OEFFENTLICH === true) return true;
  const wert = envWert("EMPFEHLUNG_OEFFENTLICH") || viteWert();
  return wert === "true" || wert === "1";
}

/** Kunden sehen nichts. Nur das Admin-Konto, oder wenn der Schalter auf ist. */
export function empfehlungSichtbar(email) {
  return empfehlungOffen() || istTeileboerseAdminMail(email);
}

export const EMPFEHLUNGS_PROZENT = 5;

/** Guthaben für einen Einkauf, auf den Cent gerundet. */
export const provisionFuer = (betrag) => Math.round(Number(betrag || 0) * EMPFEHLUNGS_PROZENT) / 100;
