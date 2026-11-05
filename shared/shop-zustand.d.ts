export const SHOP_KEY: string;
export const SORTIERUNGEN: readonly string[];

export interface ShopZustandFilter {
  brands: string[];
  tags: string[];
  priceMax: number | null;
  onlyAvailable: boolean;
  q: string;
  sort: string;
}

export interface ShopZustand {
  pathname: string;
  search: string;
  scroll: number;
}

export function zustandAusSuche(search: string): ShopZustandFilter;
export function sucheAusZustand(z: Partial<ShopZustandFilter> | null | undefined): string;
export function istShopPfad(pathname: string): boolean;
export function zustandNormalisieren(roh: unknown): ShopZustand | null;
export function shopZustandLesen(storage?: Storage | null): ShopZustand | null;
export function shopZustandSchreiben(daten: unknown, storage?: Storage | null): ShopZustand | null;
export function shopZurueckZiel(storage?: Storage | null): { pathname: string; search: string; scroll?: number };
