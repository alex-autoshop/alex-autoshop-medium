// Typen für shared/produktabo.js (die Datei selbst ist reines JavaScript,
// damit auch die Server-Funktionen in api/ sie ohne Umweg laden können).

export declare const PRODUKT_ABO_PREISE: Record<number, number>;
export declare const MIN_PRODUKTE: number;
export declare const MAX_PRODUKTE: number;
export declare const ABO_RABATTE: number[];

export interface AboBeitrag {
  rabatt: number;
  anzahl: number;
  proProdukt: number;
  preis: number;
}

export declare function produktAboBeitrag(wahl: {
  rabatt: number | string;
  anzahl: number | string;
}): AboBeitrag | null;

export declare function produktAboErsparnis(
  summeNormalpreise: number,
  rabatt: number
): number;

export declare const ANTEIL_AN_ERSPARNIS: number;
export declare const MENGE_MINDESTBEITRAG: number;

export interface MengenRechnung {
  normal: number;
  mitglied: number;
  ersparnis: number;
  beitrag: number;
}

export declare function mengenPosition(pos: {
  einzelpreis: number;
  menge: number;
  rabatt: number;
}): MengenRechnung | null;

export declare function rabattGueltig(wert: number | string): boolean;

export declare function listeNormalisieren(roh: {
  rabatt?: number;
  standard?: number;
  produkte?: Array<Record<string, unknown>>;
} | null): { standard: number; produkte: Array<Record<string, unknown> & { rabatt: number }> };

export declare function aboListeErgaenzen(
  roh: { rabatt?: number; standard?: number; produkte?: Array<Record<string, unknown>> } | null,
  produkt: { id?: string; handle?: string; titel?: string; preis?: number; waehrung?: string; bild?: string; rabatt?: number; ab?: boolean }
): {
  standard: number;
  produkte: Array<Record<string, unknown> & { rabatt: number }>;
  ergebnis: "neu" | "schon" | "voll" | "leer";
};

export declare function aboEinzelAktualisieren(
  roh: { rabatt?: number; standard?: number; produkte?: Array<Record<string, unknown>> } | null,
  produkt: { id?: string; rabatt?: number; preis?: number }
): {
  standard: number;
  produkte: Array<Record<string, unknown> & { rabatt: number }>;
  ergebnis: "neu" | "schon" | "leer";
};

export declare function aboEinzelEntfernen(
  roh: { rabatt?: number; standard?: number; produkte?: Array<Record<string, unknown>> } | null,
  id: string
): {
  standard: number;
  produkte: Array<Record<string, unknown> & { rabatt: number }>;
  ergebnis: "weg" | "schon" | "leer";
};

export declare function mitgliedZeile(
  einzel: number,
  menge: number,
  rabatt: number
): { normal: number; mitglied: number; ersparnis: number; rabatt: number } | null;

export declare function beitragPosition(pos: {
  art?: string;
  rabatt: number;
  preis?: number;
  einzelpreis?: number;
  menge?: number;
}): MengenRechnung | null;

export declare function aboListeGesamt(positionen: Array<{
  art?: string;
  rabatt: number;
  preis?: number;
  einzelpreis?: number;
  menge?: number;
}>): { beitrag: number; ersparnis: number; zeilen: MengenRechnung[] } | null;

export declare function aboGesamt(liste: {
  rabatt: number;
  einzelAnzahl: number;
  mengen: Array<{ einzelpreis: number; menge: number }>;
}): { rabatt: number; einzelAnzahl: number; mengenAnzahl: number; beitrag: number; ersparnisMengen: number } | null;

export declare function literAus(bezeichnung: string): number | null;

export interface GebindeTeil { label: string; liter: number; preis: number; anzahl: number }
export interface Kombi { teile: GebindeTeil[]; liter: number; preis: number }

export declare function guenstigsteKombi(
  gebinde: Array<{ label: string; liter: number; preis: number }>,
  bedarfLiter: number
): Kombi | null;

export declare function mischBedarf(wahl: {
  bedarfLiter: number;
  anteilB: number;
  gebindeA: Array<{ label: string; liter: number; preis: number }>;
  gebindeB: Array<{ label: string; liter: number; preis: number }>;
  rabatt: number;
}): {
  literA: number; literB: number;
  teilA: Kombi; teilB: Kombi;
  literGesamt: number;
  normal: number; mitglied: number; ersparnis: number; beitrag: number;
} | null;
