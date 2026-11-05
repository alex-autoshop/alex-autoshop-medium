export function istAboKonfigurator(handle?: string | null): boolean;

export function aboKategorie(produkt: {
  handle?: string;
  productType?: string;
}): string;

export function aboKategorieLabel(id: string): string;

export function aboGruppen<T extends { handle?: string; productType?: string }>(
  liste: T[] | null | undefined,
): Array<{ id: string; label: string; produkte: T[] }>;
