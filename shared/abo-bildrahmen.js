/**
 * Anzeige-Zuschnitt nur für die Produkt-Abo-Karten.
 * Die Bilddateien im Shop bleiben unverändert.
 *
 * scale/x/y: CSS-Transform um die Kachelmitte, in Prozent der Kachel.
 * Gemessen am Produktkörper (Ecklogo ausgenommen), damit die graue Dose
 * dieselbe Höhe und Lage bekommt wie die schwarze. Die vier FRIZ-Polituren
 * haben in der Datei schon dieselbe Flaschenhöhe (rund 82 % der Kachel)
 * und brauchen keinen eigenen Zuschnitt.
 */
const RAHMEN = {
  "troton-ubs-steinschlagschutz-korrosionsschutz-unterbodenschutz-grau-500ml": {
    scale: 1.42,
    x: -1,
    y: -22,
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
