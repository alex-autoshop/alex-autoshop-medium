export const WHATSAPP_NUMMER: string;
export const WHATSAPP_ANZEIGE: string;
export const WHATSAPP_TEL: string;

export const FELD_MAX: {
  marke: number;
  modell: number;
  baujahr: number;
  hsn: number;
  tsn: number;
  fin: number;
  teil: number;
  anmerkung: number;
  plz: number;
};

export type AnfrageAngaben = {
  marke?: string;
  modell?: string;
  baujahr?: string;
  hsn?: string;
  tsn?: string;
  fin?: string;
  teil?: string;
  anmerkung?: string;
  plz?: string;
};

export function feldText(wert: unknown, max?: number): string;
export function anfrageText(angaben?: AnfrageAngaben): string;
export function anfrageBereit(angaben?: AnfrageAngaben): boolean;
export function whatsappChatUrl(): string;
export function whatsappAnfrageUrl(angaben?: AnfrageAngaben): string;
