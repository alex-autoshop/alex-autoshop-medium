// ─────────────────────────────────────────────────────────────────────────────
// Empfehlungsprogramm — EIN Wert für Kundenkonto, Willkommens-Mail und die
// automatische Gutschrift (Zahlungs-Webhooks).
//
// Satz ändern: NUR HIER. Texte und Buchung ziehen automatisch mit.
// (Bis 22.09.2026 standen überall 20 % — bei Level 3 mehr als die Marge.)
// ─────────────────────────────────────────────────────────────────────────────

export const EMPFEHLUNGS_PROZENT = 5;

/** Guthaben für einen Einkauf, auf den Cent gerundet. */
export const provisionFuer = (betrag) => Math.round(Number(betrag || 0) * EMPFEHLUNGS_PROZENT) / 100;
