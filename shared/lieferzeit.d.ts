export const LIEFERZEIT_STANDARD: { min: number; max: number };

export function lieferzahl(wert: unknown): number | null;

export function lieferzeitAusFeldern(felder: unknown): { min: number; max: number } | null;

export function lieferzeitWaehlen(
  produktFelder: unknown,
  variantenFelder?: unknown
): { min: number; max: number };

export function lieferzeitText(spanne: { min: number; max: number }): string;

export function laengsteLieferzeit(
  spannen: Array<{ min: number; max: number } | null | undefined> | null | undefined
): { min: number; max: number };

export function lieferzeitenVerschieden(
  spannen: Array<{ min: number; max: number } | null | undefined> | null | undefined
): boolean;
