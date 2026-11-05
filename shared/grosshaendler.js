/**
 * Der Name der Bezugsquelle gehört nicht in die Teilebörse.
 * Kunden sehen Lieferzeit und Teilemarke (Bosch, MANN), nie den Großhandel.
 */

const NAME = /inter\s*cars/gi;

export function ohneGrosshaendler(text) {
  return String(text || "")
    .replace(NAME, "")
    .replace(/\s*·\s*(?:·\s*)+/g, " · ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s·,.-]+|[\s·,.-]+$/g, "")
    .trim();
}

/** Leerer String, wenn die "Marke" nur der Großhändler ist. */
export function markeFuerKunde(name) {
  const roh = String(name || "").trim();
  if (!roh || /^inter\s*cars$/i.test(roh)) return "";
  return ohneGrosshaendler(roh);
}
