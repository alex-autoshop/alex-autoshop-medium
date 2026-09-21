/**
 * Empfehlungslink (…?ref=CODE) — der Code wird im Browser gemerkt, bis das
 * Konto existiert. Eingetragen wird der Werber erst auf dem Server
 * (api/empfehlung.js bzw. nach der Mitgliedsbuchung), nie hier.
 *
 * Merkfrist 30 Tage. Klickt jemand später einen anderen Link, gilt der neue.
 */

const KEY = "aa:ref";
const FRIST_MS = 30 * 24 * 60 * 60 * 1000;
const CODE_OK = /^[A-Z0-9]{6,8}$/;

export function empfehlungMerken(search: string) {
  try {
    const code = (new URLSearchParams(search).get("ref") || "").trim().toUpperCase();
    if (!CODE_OK.test(code)) return;
    localStorage.setItem(KEY, JSON.stringify({ code, zeit: Date.now() }));
  } catch { /* privater Modus — dann eben ohne */ }
}

export function empfehlungLesen(): string | null {
  try {
    const roh = localStorage.getItem(KEY);
    if (!roh) return null;
    const d = JSON.parse(roh) as { code?: string; zeit?: number };
    if (!d?.code || !CODE_OK.test(d.code) || !d.zeit || Date.now() - d.zeit > FRIST_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return d.code;
  } catch {
    return null;
  }
}

export function empfehlungVergessen() {
  try { localStorage.removeItem(KEY); } catch { /* egal */ }
}
