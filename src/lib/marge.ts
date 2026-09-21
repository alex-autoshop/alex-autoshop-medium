/**
 * Margen-Mathematik für den Ladenverkauf — nur Rechnen, keine Daten.
 *
 * Alle Preise in der Teilebörse sind BRUTTO (inkl. MwSt), auch der EK von
 * Inter Cars (customerPriceGross). Was Alex wirklich bleibt, ist der
 * Rohertrag NETTO: die MwSt auf die Differenz geht ans Finanzamt.
 *
 *   Rohertrag = (VK − EK) / 1,19
 *   Marge %   = (VK − EK) / VK      (brutto wie netto dasselbe Verhältnis)
 *   Aufschlag = (VK − EK) / EK
 */

export const rund2 = (x: number) => Math.round(x * 100) / 100;
export const netto = (brutto: number, mwst = 19) => brutto / (1 + mwst / 100);
export const brutto = (netto: number, mwst = 19) => netto * (1 + mwst / 100);

export interface Marge {
  /** Rohertrag netto in Euro */
  rohertrag: number;
  /** Marge in % vom Verkaufspreis */
  prozent: number;
  /** Aufschlag in % auf den Einkaufspreis */
  aufschlag: number;
}

export function marge(vkBrutto: number, ekBrutto: number, mwst = 19): Marge {
  const diff = vkBrutto - ekBrutto;
  return {
    rohertrag: rund2(netto(diff, mwst)),
    prozent: vkBrutto > 0 ? (diff / vkBrutto) * 100 : 0,
    aufschlag: ekBrutto > 0 ? (diff / ekBrutto) * 100 : 0,
  };
}

/** Verkaufspreis (brutto), der die Ziel-Marge erreicht — auf den Cent aufgerundet. */
export function vkFuerMarge(ekBrutto: number, zielProzent: number): number {
  const z = Math.min(Math.max(zielProzent, 0), 95);
  return Math.ceil((ekBrutto / (1 - z / 100)) * 100) / 100;
}

/** Grundpreis wie in api/intercars.js: EK × Aufschlag, auf den Cent aufgerundet. */
export const grundpreis = (ekBrutto: number, faktor = 2) => Math.ceil(ekBrutto * faktor * 100) / 100;

export const prozentText = (x: number) => `${x.toFixed(1).replace(".", ",")} %`;

/** "12,5" / "12.5" / "1.234,50" → Zahl; leer oder Unsinn → NaN */
export function zahlAusText(t: string): number {
  const s = String(t || "").trim().replace(/\s|€/g, "");
  if (!s) return NaN;
  const norm = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(norm);
  return Number.isFinite(n) ? n : NaN;
}
