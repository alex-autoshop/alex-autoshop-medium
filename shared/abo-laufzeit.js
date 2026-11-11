// ─────────────────────────────────────────────────────────────────────────────
// Mindestlaufzeit des Produkt-Abos. Eine Quelle für Texte, Webhooks und Tests.
//
// Drei Monate. Danach monatlich zum Periodenende kündbar.
// Wer vorher kündigt, zahlt die offenen Monate zum höchsten Monatsbeitrag,
// der bis dahin berechnet wurde. Die Ersparnis auf die Ware bleibt ungekürzt.
// ─────────────────────────────────────────────────────────────────────────────

export const MINDEST_MONATE = 3;

/** Sie-Form, Kasse und AGB. */
export const LAUFZEIT_KURZ =
  "Mindestlaufzeit 3 Monate, danach monatlich zum Monatsende kündbar. Bei früherer Kündigung berechnen wir die offenen Monate zum höchsten bisherigen Monatsbeitrag.";

/** Du-Form, wo die Seite sonst duzt. */
export const LAUFZEIT_KURZ_DU =
  "Mindestlaufzeit 3 Monate, danach monatlich kündbar. Kündigst du früher, berechnen wir die offenen Monate zum höchsten bisherigen Monatsbeitrag.";

export function kassenText(einmaligEuro, monatEuro) {
  const geld = (n) => Number(n).toFixed(2).replace(".", ",");
  return `Zahlungspflichtig bestellen. Einmalig ${geld(einmaligEuro)} €, dazu ${geld(monatEuro)} € im Monat. ${LAUFZEIT_KURZ}`;
}

/** Kalendermonate auf einen Unix-Zeitpunkt (UTC) addieren. */
export function monateAddieren(unix, monate) {
  const start = Math.floor(Number(unix) || 0);
  const n = Math.floor(Number(monate) || 0);
  if (!start || n === 0) return start;
  const d = new Date(start * 1000);
  const tag = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + n);
  if (d.getUTCDate() < tag) d.setUTCDate(0);
  return Math.floor(d.getTime() / 1000);
}

/**
 * Bezahlte Abo-Rechnungen (nur der wiederkehrende Beitrag, nicht die Ware).
 * `cents == null` heißt: die Liste ist unbekannt, dann nicht raten.
 * Läuft das Abo und die Liste ist leer, zählt der laufende Monat als bezahlt.
 */
export function standAusRechnungen(cents, aktuellerCent, status) {
  if (cents == null) return null;
  const liste = (Array.isArray(cents) ? cents : [])
    .map((n) => Math.round(Number(n) || 0))
    .filter((n) => n > 0);
  const aktuell = Math.max(0, Math.round(Number(aktuellerCent) || 0));
  let bezahlt = liste.length;
  let hoechstCent = Math.max(aktuell, ...liste, 0);
  if (bezahlt === 0 && (status === "active" || status === "past_due") && aktuell > 0) {
    bezahlt = 1;
    hoechstCent = aktuell;
  }
  return { bezahlt, hoechstCent };
}

/** Wiederkehrender Anteil einer Stripe-Rechnung, in Cent. Einmalige Ware zählt nicht. */
export function aboCentAusRechnung(invoice) {
  const lines = (invoice && invoice.lines && invoice.lines.data) || [];
  let sum = 0;
  for (const line of lines) {
    const wiederkehrend = line && ((line.price && line.price.recurring) || line.type === "subscription");
    if (!wiederkehrend) continue;
    sum += Math.round(Number(line.amount) || 0);
  }
  return sum;
}

/**
 * Was bei einer Kündigung innerhalb der Mindestlaufzeit zu tun ist.
 *
 * verlaengern: Abo bis zum Ende von Monat 3 laufen lassen, zum Höchstbeitrag.
 * rechnung:    Abo ist schon beendet — die offenen Monate einmalig einziehen.
 * keine:       Nach Monat 3, oder es ist gar keine vorzeitige Kündigung.
 */
export function mindestEingriff(lage) {
  if (!lage || !lage.mindest) return { art: "keine" };
  const bezahlt = Math.max(0, Math.floor(Number(lage.bezahlt) || 0));
  const hoechstCent = Math.max(
    0,
    Math.round(Number(lage.hoechstCent) || 0),
    Math.round(Number(lage.preisCent) || 0),
  );
  const rest = Math.max(0, MINDEST_MONATE - bezahlt);
  if (rest <= 0 || hoechstCent <= 0) return { art: "keine" };
  if (lage.geloescht) return { art: "rechnung", monate: rest, cent: rest * hoechstCent };

  const periodEnd = Math.floor(Number(lage.periodEnd) || 0);
  if (!periodEnd) return { art: "keine" };
  const ziel = monateAddieren(periodEnd, rest);
  const cancelAt = lage.cancelAt ? Math.floor(Number(lage.cancelAt)) : 0;
  const willFrueh = !!lage.cancelAtPeriodEnd || (cancelAt > 0 && cancelAt + 3600 < ziel);
  if (!willFrueh) return { art: "keine" };
  const preisOk = Math.round(Number(lage.preisCent) || 0) >= hoechstCent;
  const zeitOk = !lage.cancelAtPeriodEnd && cancelAt + 3600 >= ziel;
  if (preisOk && zeitOk) return { art: "keine" };
  return { art: "verlaengern", monate: rest, cancelAt: ziel, preisCent: hoechstCent };
}
