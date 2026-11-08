import { aboEinzelAktualisieren, aboEinzelEntfernen, aboListeErgaenzen, listeNormalisieren } from "../../shared/produktabo.js";

export const ABO_SPEICHER = "alex-produktabo-v1";
export const ABO_EREIGNIS = "alex-abo-liste";
export const ABO_HINWEIS = "alex-abo-entdeckt";
const ABO_AKTIV = "alex-abo-aktiv";

export interface AboMerkProdukt {
  id: string;
  handle: string;
  titel: string;
  preis: number;
  waehrung: string;
  bild?: string;
}

export function aboListeLesen() {
  try {
    const roh = localStorage.getItem(ABO_SPEICHER);
    if (!roh) return listeNormalisieren(null);
    return listeNormalisieren(JSON.parse(roh));
  } catch {
    return listeNormalisieren(null);
  }
}

function schreiben(standard: number, produkte: unknown[]) {
  try {
    localStorage.setItem(ABO_SPEICHER, JSON.stringify({ standard, produkte }));
  } catch { /* privater Modus */ }
  window.dispatchEvent(new Event(ABO_EREIGNIS));
}

export function aboProduktMerken(produkt: AboMerkProdukt & { rabatt?: number }) {
  const bisher = aboListeLesen();
  const neu = aboListeErgaenzen(bisher, produkt);
  if (neu.ergebnis === "neu") schreiben(neu.standard, neu.produkte);
  return neu.ergebnis;
}

export function aboEinzelMerken(produkt: AboMerkProdukt & { rabatt: number }) {
  const bisher = aboListeLesen();
  const neu = aboListeErgaenzen(bisher, produkt);
  if (neu.ergebnis === "neu") schreiben(neu.standard, neu.produkte);
  else if (neu.ergebnis === "schon") {
    const aktualisiert = aboEinzelAktualisieren(neu, produkt);
    if (aktualisiert.ergebnis === "neu") schreiben(aktualisiert.standard, aktualisiert.produkte);
  }
  return neu.ergebnis;
}

export function aboEinzelLoeschen(id: string) {
  const bisher = aboListeLesen();
  const neu = aboEinzelEntfernen(bisher, id);
  if (neu.ergebnis === "weg") schreiben(neu.standard, neu.produkte);
  return neu.ergebnis;
}

export function aboHinweisGesehen(): boolean {
  try { return localStorage.getItem(ABO_HINWEIS) === "1"; } catch { return true; }
}

export function aboHinweisMerken() {
  try { localStorage.setItem(ABO_HINWEIS, "1"); } catch { /* bleibt für diesen Lauf über die Modul-Sperre aus */ }
}

/** Nach bezahltem Abo: die gewählten Stufen gelten im Warenkorb. */
export function aboAktivLesen(): boolean {
  try { return localStorage.getItem(ABO_AKTIV) === "1"; } catch { return false; }
}

export function aboAktivMerken() {
  try { localStorage.setItem(ABO_AKTIV, "1"); } catch { /* privat */ }
  window.dispatchEvent(new Event(ABO_EREIGNIS));
}

const ABO_ZURUECK = "alex-abo-zurueck";
const ZURUECK_MS = 2 * 60 * 60 * 1000;

/** Nach der Anmeldung wieder auf die Mitgliedschaft, solange die Abo-Liste noch gilt. */
export function aboZielMerken(pfad = "/mitgliedschaft") {
  const ziel = pfad.startsWith("/mitgliedschaft") ? pfad : "/mitgliedschaft";
  try {
    localStorage.setItem(ABO_ZURUECK, JSON.stringify({ pfad: ziel, bis: Date.now() + ZURUECK_MS }));
  } catch { /* privater Modus */ }
}

export function aboZielLesen(): string | null {
  try {
    const roh = localStorage.getItem(ABO_ZURUECK);
    if (!roh) return null;
    const daten = JSON.parse(roh) as { pfad?: string; bis?: number };
    if (!daten?.pfad || !daten.pfad.startsWith("/mitgliedschaft")) return null;
    if (typeof daten.bis === "number" && daten.bis < Date.now()) {
      localStorage.removeItem(ABO_ZURUECK);
      return null;
    }
    return daten.pfad;
  } catch {
    return null;
  }
}

export function aboZielVergessen() {
  try { localStorage.removeItem(ABO_ZURUECK); } catch { /* privat */ }
}
