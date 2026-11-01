// Typen für shared/mitgliedspreise.js (die Datei selbst ist reines JavaScript,
// damit auch die Server-Funktionen in api/ sie ohne Umweg laden können).

export declare const DIENSTLEISTUNG_BUCHBAR: boolean;

export declare const MODULE: string[];

export declare function rabattName(level: number | string): string;

export interface Preisstufe {
  /** Rabatt in Prozent, den diese Stufe gewaehrt */
  rabatt: number;
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
