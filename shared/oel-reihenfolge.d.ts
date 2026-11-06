export const OEL_KATEGORIE: string;

export function istOelFilter(produkt: {
  node?: { productType?: string; title?: string; tags?: string[] };
  productType?: string;
  title?: string;
  tags?: string[];
} | null | undefined): boolean;

export function oeleVorFiltern<T>(liste: T[] | null | undefined, vergleich?: (a: T, b: T) => number): T[];
