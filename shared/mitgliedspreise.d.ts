// Typen für shared/mitgliedspreise.js (die Datei selbst ist reines JavaScript,
// damit auch die Server-Funktionen in api/ sie ohne Umweg laden können).

export declare const MODULE: string[];

export interface Preisstufe {
  basePrice: number;
  modulePrices: Record<string, number>;
  freePaintValue: number;
  detailingPrice: number;
}

export declare const MITGLIEDSPREISE: Record<1 | 2 | 3, Preisstufe>;

export interface Beitrag {
  level: number;
  module: string[];
  freePaint: boolean;
  aufbereitung: boolean;
  preis: number;
}

export declare function mitgliedsbeitrag(wahl: {
  level: number | string;
  modules?: string[];
  freePaint?: boolean;
  aufbereitung?: boolean;
}): Beitrag | null;
