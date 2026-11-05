export interface EmpfehlungsKandidat {
  handle: string;
  title: string;
  marke: string;
  art: string;
  kategorie: string;
  familien: string[];
  verfuegbar: boolean;
}

export interface GesehenProfilEingabe {
  marken?: Record<string, number>;
  kategorien?: Record<string, number>;
  arten?: Record<string, number>;
}

export interface WarenkorbAffinitaet {
  marken?: string[];
  familien?: string[];
  handles?: string[];
}

export interface EmpfehlungsKontext {
  handle?: string;
  produkt: EmpfehlungsKandidat;
  profil?: GesehenProfilEingabe | null;
  warenkorb?: WarenkorbAffinitaet | null;
  sperre?: (handle: string) => boolean;
}

export function familienVon(text: string): string[];
export function kategorieVon(tags: string[] | null | undefined): string;
export function kandidatBauen(input: {
  handle?: string;
  title?: string;
  marke?: string;
  art?: string;
  tags?: string[] | null;
  verfuegbar?: boolean;
}): EmpfehlungsKandidat;
export function suchanfragen(produkt: EmpfehlungsKandidat): string[];
export function punkteFuer(kandidat: EmpfehlungsKandidat, kontext: EmpfehlungsKontext): number;
export function empfehle(katalog: EmpfehlungsKandidat[], kontext: EmpfehlungsKontext, limit?: number): EmpfehlungsKandidat[];
export const EMPFEHLUNGS_ANZAHL: number;
