export function markeSlug(marke: string): string;
export function nummerKodieren(nummer: string): string;
export function nummerDekodieren(kodiert: string): string;
export function teileSlug(marke: string, nummer: string): string;
export function teilePfad(marke: string, nummer: string): string;
export function ausTeileSlug(slug: string): { marke: string; nummer: string };
export const TEILE_BELIEBT: ReadonlyArray<{ marke: string; nummer: string }>;
