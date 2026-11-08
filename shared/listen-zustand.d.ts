export const LISTEN_KEY: string;
export const VON_KEY: string;
export const LISTEN_SCHRITT: number;

export interface ListenZusatz {
  kat: string;
  q: string;
  marke: string;
  reihen: Record<string, { bis: number; x: number }>;
  reihenMarke: Record<string, string>;
}

export interface ListenEintrag {
  pathname: string;
  search: string;
  scroll: number;
  seite: number;
  handle: string;
  label: string;
  historyLength: number | null;
  zusatz: ListenZusatz | null;
}

export interface ZurueckZiel {
  history: boolean;
  shopZurueck: boolean;
  pathname: string;
  search: string;
  label: string;
}

export function istListenPfad(pathname: string): boolean;
export function seiteAusSuche(search: string): number;
export function queryMitSeite(search: string, seite: number): string;
export function labelFuer(pathname: string, search?: string): string;
export function eintragNormalisieren(roh: unknown): ListenEintrag | null;
export function leseListen(pathname: string, search?: string, storage?: Storage | null): ListenEintrag | null;
export function leseLetzteListe(storage?: Storage | null): ListenEintrag | null;
export function listenSchreiben(teil: unknown, storage?: Storage | null): ListenEintrag | null;
export function vonMerken(eintrag: unknown, storage?: Storage | null): { handle: string; url: string; historyLength: number } | null;
export function leseVon(storage?: Storage | null): { handle: string; url: string; historyLength: number } | null;
export function listeBeimProdukt(teil: unknown, storage?: Storage | null): ListenEintrag | null;
export function zurueckZiel(
  eingabe?: { historyLength?: number; produktHandle?: string; sammlungen?: Array<{ handle?: string; title?: string } | null> },
  storage?: Storage | null,
): ZurueckZiel;
