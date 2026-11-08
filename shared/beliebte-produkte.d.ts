// Typen für shared/beliebte-produkte.js (die Datei selbst ist reines JavaScript,
// damit auch die Server-Funktionen in api/ sie ohne Umweg laden können).

export declare const BELIEBTE_MAX: number;
export declare const BELIEBTE_ANFRAGE: number;
export declare const BELIEBTE_HANDLES: string[];

export declare function beliebteHandles(liste?: string[]): string[];
export declare function beliebteKarte(node: unknown): boolean;

export interface BeliebteSeite {
  edges: Array<{ node: unknown }>;
  pageInfo: { hasNextPage: boolean; endCursor: null };
}

export declare function beliebteKanten(knoten: unknown[]): BeliebteSeite["edges"];

export declare function beliebteHolen(
  storefront: (query: string) => Promise<{ data?: Record<string, unknown | null> } | null | undefined>,
  liste?: string[],
): Promise<BeliebteSeite>;
