export interface Gefahrstoff {
  ist: boolean;
  hSaetze: string[];
  pSaetze: string[];
  piktogramme: string[];
  signalwort: "" | "Gefahr" | "Achtung";
  sdbUrl: string;
  tdsUrl: string;
  sdbStand: string;
  unNr: string;
  mindestalter: number | null;
  versandHinweis: string;
}

export function gefahrstoffLesen(
  felder?: Array<{ key?: string; value?: string } | null> | null,
): Gefahrstoff;

export function hSatzText(code: string): string;

export function pSatzText(code: string): string;

export function gefahrstoffUnvollstaendig(g: Gefahrstoff | null | undefined): boolean;

export function sdbVeraltet(stand: string, heute: string): boolean;

export function gefahrstoffVonKnoten(knoten?: { gefahrstoffMetafelder?: Array<{ key?: string; value?: string } | null> | null } | null): Gefahrstoff;

export function kaufGesperrt(g: Gefahrstoff | null | undefined): boolean;
