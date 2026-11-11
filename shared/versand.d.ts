export const DHL_EUR: number;
export const VERSAND_FREI_AB: number;
export const BATTERIEPFAND_EUR: number;
export const PAKET_MAX_KG: number;
export const SPEDITION_AB_PAKET: number;
export const FALLBACK_KG: number;
export const VERSAND_ANFRAGE: string;
export const VERSAND_MAIL: string;
export const GEWICHT_STUFEN: Array<{ bisKg: number; euro: number }>;

export function versandMailto(betreff?: string): string;
export function kgAusShopify(weight?: number | null, unit?: string | null): number | null;
export function kgAusText(text: string): number | null;
export function stueckKg(angabe: { kg?: number; einheit?: string; name?: string; titel?: string } | null | undefined): number;
export function preisFuerGewicht(kg: number): number;
export function paketePacken(stueckeKg: number[]): { zuSchwer: boolean; pakete: Array<{ kg: number; gramm: number }> };

export interface VersandZeile { kg: number; preis: number }
export interface VersandPlan {
  art: "abholung" | "frei" | "paket" | "spedition";
  betrag: number | null;
  pakete: number;
  zeilen: VersandZeile[];
  text: string;
}

export function versandPlan(wahl: {
  summe?: number;
  abholung?: boolean;
  positionen?: Array<{ menge?: number; kg?: number; einheit?: string; name?: string; titel?: string }>;
}): VersandPlan;
export function versandText(plan: VersandPlan | null | undefined): string;
export function versandkosten(wahl: {
  summe?: number;
  abholung?: boolean;
  positionen?: Array<{ menge?: number; kg?: number; einheit?: string; name?: string; titel?: string }>;
}): number | null;
export function istStarterbatterie(name: string): boolean;
export function pfandBetrag(namenMitMenge: Array<{ name?: string; menge?: number }>): { stueck: number; betrag: number };
