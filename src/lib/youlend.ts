/**
 * Frontend-Seite der YouLend-Anbindung.
 *
 * Hier stehen bewusst KEINE Zugangsdaten. Der Browser spricht ausschliesslich
 * mit unserer eigenen Route /api/youlend, die serverseitig das OAuth-Token
 * holt. Das Repo ist oeffentlich — alles, was hier steht, ist fuer jeden lesbar.
 */

/** Rechtsformen, die YouLend fuer Deutschland akzeptiert (companyType). */
export const RECHTSFORMEN = [
  { wert: "Gewerbebetrieb", label: "Einzelunternehmen / Gewerbebetrieb", hrPflicht: false },
  { wert: "EK", label: "Eingetragener Kaufmann (e.K.)", hrPflicht: true },
  { wert: "GmbhUg", label: "GmbH oder UG (haftungsbeschränkt)", hrPflicht: true },
  { wert: "Gbr", label: "GbR", hrPflicht: false },
  { wert: "EGbr", label: "Eingetragene GbR (eGbR)", hrPflicht: true },
  { wert: "Ohg", label: "OHG", hrPflicht: true },
  { wert: "Kg", label: "KG", hrPflicht: true },
  { wert: "GbrOhg", label: "GbR / OHG (gemischt)", hrPflicht: true },
] as const;

export type Rechtsform = (typeof RECHTSFORMEN)[number]["wert"];

export function brauchtHandelsregister(form: string): boolean {
  return RECHTSFORMEN.find((r) => r.wert === form)?.hrPflicht ?? true;
}

export interface Finanzierungsanfrage {
  firma: string;
  firmenform: string;
  handelsregister: string;
  strasse: string;
  plz: string;
  ort: string;
  ansprechpartner: string;
  email: string;
  telefon: string;
  webseite: string;
  jahresumsatz: number;
  wunschsumme: number;
  zweck: string;
  bonitaetspruefung: boolean;
}

export interface AnfrageAntwort {
  aktiv: boolean;
  angenommen?: boolean;
  leadId?: string | null;
  uebergabeFehlgeschlagen?: boolean;
  hinweis?: string;
  fehler?: string;
}

export async function anfrageSenden(daten: Finanzierungsanfrage): Promise<AnfrageAntwort> {
  const r = await fetch("/api/youlend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ aktion: "anfrage", ...daten }),
  });
  const antwort = (await r.json()) as AnfrageAntwort;
  if (!r.ok) throw new Error(antwort?.fehler || "Die Anfrage konnte nicht gesendet werden.");
  return antwort;
}

/** Zahl aus einer Eingabe wie "250.000" oder "250000 €" lesen. */
export function zahl(eingabe: string): number {
  const n = Number(eingabe.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export const euro = (n: number) => n.toLocaleString("de-DE") + " €";
