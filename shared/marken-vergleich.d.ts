export const ART_REIHENFOLGE: readonly string[];

export function produktArt(produkt: unknown): string;

export function nachArtMischen(
  produkte: unknown[] | null | undefined,
  opts?: {
    markeVon?: (produkt: unknown) => string;
    markenFolge?: string[];
  },
): {
  produkte: unknown[];
  gruppen: { vorId: string; titel: string }[];
};
