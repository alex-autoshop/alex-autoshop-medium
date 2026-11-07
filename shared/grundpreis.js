/** Grundpreis nach PAngV aus den Shopify-Feldern unitPrice und unitPriceMeasurement. */

const EINHEIT = {
  ML: "ml",
  CL: "cl",
  L: "l",
  M3: "m³",
  MG: "mg",
  G: "g",
  KG: "kg",
  MM: "mm",
  CM: "cm",
  M: "m",
  M2: "m²",
  ITEM: "Stück",
};

function menge(wert) {
  const n = Number(wert);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (Number.isInteger(n)) return String(n);
  return String(n).replace(".", ",");
}

/**
 * z. B. "15,90 € / 1 l". Leerer Text, wenn die Angabe fehlt oder unvollständig ist.
 * @param {{ unitPrice?: { amount?: string, currencyCode?: string } | null, unitPriceMeasurement?: { referenceValue?: number, referenceUnit?: string } | null } | null} variante
 */
export function grundpreisText(variante) {
  const preis = variante && variante.unitPrice;
  const mass = variante && variante.unitPriceMeasurement;
  const betrag = Number(preis && preis.amount);
  const einheit = EINHEIT[String(mass && mass.referenceUnit || "").toUpperCase()] || "";
  const referenz = menge(mass && mass.referenceValue);
  if (!Number.isFinite(betrag) || betrag < 0 || !einheit || !referenz) return "";
  const geld = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: (preis && preis.currencyCode) || "EUR",
  }).format(betrag);
  return `${geld} / ${referenz} ${einheit}`;
}
