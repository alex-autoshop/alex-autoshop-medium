/**
 * Was der Abo-Knopf mit der Übersicht macht.
 * Schon in der Liste: nur öffnen. Neu hinzugefügt: öffnen.
 * Voll, leer oder ungeeignet: nichts aufklappen und nichts doppelt anlegen.
 */
export function aboLeisteAktion(drin, ergebnis) {
  if (drin) return "oeffnen";
  if (ergebnis === "neu" || ergebnis === "schon") return "oeffnen";
  return "ruhig";
}

/**
 * Text der mobilen Abo-Leiste. Der Betrag ist der Monatsbeitrag der Liste.
 */
export function aboLeisteText(anzahl, beitrag) {
  const n = Math.max(0, Math.floor(Number(anzahl) || 0));
  const wort = n === 1 ? "1 Produkt im Abo" : `${n} Produkte im Abo`;
  const geld = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    Number.isFinite(Number(beitrag)) ? Number(beitrag) : 0,
  );
  return `${wort} · ${geld} / Monat`;
}
