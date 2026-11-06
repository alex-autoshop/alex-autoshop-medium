/** Namen, die keine Kundenmarke sind (Shop selbst oder Bezugsquelle). */
const LIEFERANT = [/alex\s*autoshop/i, /ds[\s-]?color/i, /inter\s*cars/i];

export function istLieferant(name) {
  const text = String(name || "").trim();
  if (!text) return true;
  return LIEFERANT.some((re) => re.test(text));
}

/** Kleinschreibung für die Adresse: Glasurit → glasurit, RM → rm. */
export function markenSlug(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Nach Anzahl, bei Gleichstand alphabetisch. Lieferanten und „Sonstige“ fallen weg. */
export function markenSortieren(eintraege) {
  return (eintraege || [])
    .filter((e) => e && e.name && e.name !== "Sonstige" && !istLieferant(e.name))
    .sort((a, b) => b.anzahl - a.anzahl || String(a.name).localeCompare(String(b.name), "de"));
}
