// ─────────────────────────────────────────────────────────────────────────────
// Versand und Pfand — eine Quelle für die Versandseite, den Warenkorb und
// die Kasse. Die Beträge stehen so auch auf /versand. Ein Anwalt sollte die
// Formulierung in AGB und Widerruf prüfen; hier stehen nur die Zahlen, die
// die Seite dem Kunden schon nennt.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DHL-Pauschale innerhalb Deutschlands.
 * Aktive bezahlte Mitgliedschaft (Level 1–3) zahlt sie nie.
 * Alle anderen: dieser Betrag, kostenlos ab VERSAND_FREI_AB.
 * Die kostenlose Teststunde ist keine bezahlte Mitgliedschaft.
 */
export const DHL_EUR = 7.49;

/** Ab diesem Warenwert (Teile, ohne Pfand) ist der DHL-Versand inklusive. */
export const VERSAND_FREI_AB = 150;

/**
 * Batteriepfand je Starterbatterie. Üblicher Satz nach Batteriegesetz,
 * derselbe Betrag, den der Vergleich im Audit bei kfzteile24 gesehen hat.
 * Kein Altteilpfand — den gibt es hier nicht, und es wird keiner erfunden.
 */
export const BATTERIEPFAND_EUR = 7.5;

/** Starterbatterie, nicht Polfett, Klemme oder Ladekabel. */
export function istStarterbatterie(name) {
  const n = String(name || "").toLowerCase();
  if (/polfett|polklemme|batterieklemme|batteriehalter|batteriepol|ladekabel|erhaltungslad|batteriesäure|batteriesaeure/.test(n)) {
    return false;
  }
  if (/starterbatterie/.test(n)) return true;
  return /\bbatterie\b/.test(n) && /(\d+\s?ah|\b12\s?v\b)/.test(n);
}

/**
 * @param {{ summe: number, mitglied?: boolean, abholung?: boolean }} wahl
 * summe = Warenwert ohne Versand und ohne Pfand.
 * mitglied = aktive bezahlte Mitgliedschaft (Level 1–3), nicht die Teststunde.
 */
export function versandkosten(wahl) {
  if (wahl && wahl.abholung) return 0;
  if (wahl && wahl.mitglied) return 0;
  const summe = Number(wahl && wahl.summe) || 0;
  if (summe >= VERSAND_FREI_AB) return 0;
  return DHL_EUR;
}

export function pfandBetrag(namenMitMenge) {
  const liste = Array.isArray(namenMitMenge) ? namenMitMenge : [];
  const stueck = liste.reduce((n, p) => {
    if (!istStarterbatterie(p && p.name)) return n;
    const m = Math.max(0, Math.floor(Number(p.menge) || 0));
    return n + m;
  }, 0);
  return { stueck, betrag: Math.round(stueck * BATTERIEPFAND_EUR * 100) / 100 };
}
