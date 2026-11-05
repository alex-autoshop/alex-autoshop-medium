import { aboListeErgaenzen, listeNormalisieren } from "../../shared/produktabo.js";

export const ABO_SPEICHER = "alex-produktabo-v1";
export const ABO_EREIGNIS = "alex-abo-liste";
export const ABO_HINWEIS = "alex-abo-entdeckt";

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

export function aboProduktMerken(produkt: AboMerkProdukt) {
  const bisher = aboListeLesen();
  const neu = aboListeErgaenzen(bisher, produkt);
  if (neu.ergebnis === "neu") {
    try {
      localStorage.setItem(ABO_SPEICHER, JSON.stringify({ standard: neu.standard, produkte: neu.produkte }));
    } catch { /* privater Modus */ }
    window.dispatchEvent(new Event(ABO_EREIGNIS));
  }
  return neu.ergebnis;
}

export function aboHinweisGesehen(): boolean {
  try { return localStorage.getItem(ABO_HINWEIS) === "1"; } catch { return true; }
}

export function aboHinweisMerken() {
  try { localStorage.setItem(ABO_HINWEIS, "1"); } catch { /* bleibt für diesen Lauf über die Modul-Sperre aus */ }
}
