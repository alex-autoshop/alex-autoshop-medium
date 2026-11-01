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
