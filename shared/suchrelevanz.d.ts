export function falten(s: string): string;
export function stamm(wort: string): string;
export function suchStamm(query: string): string;
export function istGleicheArtikelart(name: string | undefined, category: string | undefined, query: string): boolean;
export function kategorieIstTreffer(name: string, query: string): boolean;
export function ordneSuchtreffer<T extends { name?: string; category?: string }>(liste: T[], query: string): T[];
export function istDiesel(fuel: string | undefined): boolean;
export function kraftstoffHinweis(fuel: string | undefined, query: string): { text: string; suche: string } | null;
