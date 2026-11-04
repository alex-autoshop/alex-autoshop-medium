export const DHL_EUR: number;
export const VERSAND_FREI_AB: number;
export const BATTERIEPFAND_EUR: number;
export function istStarterbatterie(name: string): boolean;
export function versandkosten(wahl: { summe: number; mitglied?: boolean; abholung?: boolean }): number;
export function pfandBetrag(namenMitMenge: Array<{ name?: string; menge?: number }>): { stueck: number; betrag: number };
