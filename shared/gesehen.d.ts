export const GESEHEN_KEY: string;
export const GESEHEN_COOKIE: string;

export interface GesehenEintrag {
  h: string;
  m: string;
  k: string;
  a: string;
  f: string[];
  z: number;
}

export interface GesehenProfil {
  marken: Record<string, number>;
  kategorien: Record<string, number>;
  arten: Record<string, number>;
}

export function verlaufMerken(
  alt: unknown,
  eintrag: { h?: string; handle?: string; m?: string; marke?: string; k?: string; kategorie?: string; a?: string; art?: string; f?: string[]; familien?: string[] },
  jetzt?: number,
): GesehenEintrag[];

export function profilAusVerlauf(liste: unknown, jetzt?: number): GesehenProfil;
export function profilLeer(profil: GesehenProfil | null | undefined): boolean;
export function verlaufLesen(): GesehenEintrag[];
export function verlaufSpeichern(liste: unknown): GesehenEintrag[];
export function ansichtMerken(eintrag: Parameters<typeof verlaufMerken>[1]): GesehenEintrag[];
