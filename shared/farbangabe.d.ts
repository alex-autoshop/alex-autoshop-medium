export const FARBKONFIGURATOR_HANDLES: string[];
export const ATTRIBUT_FAHRZEUG: string;
export const ATTRIBUT_HINWEIS: string;
export const FARB_ARTEN: string[];

export function istStandardvariante(produkt: {
  options?: Array<{ name?: string; values?: string[] } | null> | null;
  variants?: { edges?: Array<{ node?: { title?: string } | null } | null> | null } | null;
} | null | undefined): boolean;

export function sichtbareOptionen(produkt: {
  options?: Array<{ name?: string; values?: string[] } | null> | null;
  variants?: { edges?: Array<{ node?: { title?: string } | null } | null> | null } | null;
} | null | undefined): string[];

export function anzeigePreis(
  betrag: number,
  menge: number,
  rabattProzent: number,
  standardvariante: boolean,
): number;

export function farbAttribute(eingabe: {
  automarke?: string;
  modell?: string;
  baujahr?: string;
  art?: string;
  wert?: string;
  hinweis?: string;
}): { ok: true; attribute: { key: string; value: string }[] } | { ok: false; fehler: string };

export function kasseAdresse(eingabe: {
  attributeVorhanden: boolean;
  checkoutUrl?: string | null;
  permalink: string;
}): string;
