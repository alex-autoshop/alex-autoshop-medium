export function istLieferant(name?: string | null): boolean;

export function markenSlug(name?: string | null): string;

export function markenSortieren<T extends { name: string; anzahl: number }>(eintraege: T[] | null | undefined): T[];
