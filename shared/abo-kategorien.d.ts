export function istAboKonfigurator(handle?: string | null): boolean;

export function aboKategorie(produkt: {
  handle?: string;
  productType?: string;
}): string;

export function aboKategorieLabel(id: string): string;

export function aboReiheOrdnen<T extends { title?: string; titel?: string }>(produkte: T[] | null | undefined): T[];

export function aboGruppen<T extends { handle?: string; productType?: string; title?: string; titel?: string }>(
  liste: T[] | null | undefined,
): Array<{ id: string; label: string; produkte: T[] }>;
