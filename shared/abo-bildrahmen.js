/**
 * Anzeige-Zuschnitt nur für die Produkt-Abo-Karten.
 * Die Bilddateien im Shop bleiben unverändert.
 *
 * scale/x/y: CSS-Transform um die Kachelmitte, in Prozent der Kachel.
 * Gemessen am Produktkörper (Ecklogo ausgenommen).
 * Die graue Dose sitzt tief in der Datei und wird an die schwarze angeglichen.
 * Die Hochglanz-750-g-Flasche (blauer Deckel) ist an der Schulter schmaler
 * als die grüne Schleifpaste derselben Größe; 1,08 gleicht die Breite an.
 * Die anderen drei FRIZ-Polituren haben schon dieselbe Flaschenhöhe.
 */
const RAHMEN = {
  "troton-ubs-steinschlagschutz-korrosionsschutz-unterbodenschutz-grau-500ml": {
    scale: 1.42,
    x: -1,
    y: -22,
  },
  "hochglanz-antihologramm-politur-750g-friz": {
    scale: 1.08,
    x: 0,
    y: 0,
  },
};

export function aboBildrahmen(handle) {
  return RAHMEN[String(handle || "").toLowerCase()] || null;
}

export function aboBildStil(handle) {
  const r = aboBildrahmen(handle);
  if (!r) return undefined;
  return { transform: `translate(${r.x}%, ${r.y}%) scale(${r.scale})` };
}
