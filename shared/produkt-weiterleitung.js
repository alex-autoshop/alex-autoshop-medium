/**
 * Gelöschte Produkte. Die alte Adresse antwortet mit 308, die Zielseite bleibt.
 * Dieselbe Zuordnung steht in vercel.json (permanent = 308).
 */
export const PRODUKT_WEITERLEITUNG = {
  "a1-der-wax-schwamm": "/produkt/a1-speed-polish-dr-wack",
};

/** Zielpfad oder leerer String. */
export function produktWeiterleitung(handle) {
  return PRODUKT_WEITERLEITUNG[handle] || "";
}
