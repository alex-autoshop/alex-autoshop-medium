export interface ProzessSchritt {
  id: string;
  wort: string;
  tip: string;
}

export interface ProzessProdukt {
  title?: string;
  handle?: string;
  productType?: string;
  tags?: string[];
  description?: string;
  prozessSchritte?: { value?: string | null } | string | null;
}

export interface ProzessEinsatz {
  id: string;
  label: string;
  schritte: ProzessSchritt[];
  markiert: string[];
}

export function istSet(produkt: ProzessProdukt | null | undefined): boolean;

export function schritteAusMetafeld(wert: string | null | undefined): string[];

export function einsatzFuer(
  produkt: ProzessProdukt | null | undefined,
  inhalte?: ProzessProdukt[] | null,
): ProzessEinsatz | null;

export function setInhaltTitel(text: string | null | undefined): string[];

export function produktAusZeile(titel: string): ProzessProdukt | null;

export function suchanfrage(titel: string): string;

export function besterTreffer(
  titel: string,
  kandidaten: Array<ProzessProdukt | null | undefined> | null | undefined,
): ProzessProdukt | null;
