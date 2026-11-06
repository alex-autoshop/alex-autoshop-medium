// Vorschau-Deployments von Vercel nutzen heute dasselbe Supabase-Projekt wie
// der Live-Shop (VITE_SUPABASE_URL / Fallback zasbdvtsxgimcezotlsi).
// Mitgliedschaften, Bestellungen, Guthaben und Shopify-Tags dürfen dort nicht
// angelegt werden.
//
// Gesperrt, solange VERCEL_ENV=preview ist und mindestens eines gilt:
//   • Supabase-URL fehlt oder zeigt auf das Produktionsprojekt
//   • PUBLIC_BASE_URL fehlt oder zeigt auf alex-autoshop.de
//     (sonst ruft die Freischaltung die Live-Seite auf)
// Produktion (VERCEL_ENV=production) bleibt unverändert.
// Eine eigene Test-Datenbank plus eine Vorschau-Basis-URL heben die Sperre.

export const PRODUKTIONS_SUPABASE_REF = "zasbdvtsxgimcezotlsi";

export function supabaseZiel() {
  const env = typeof process !== "undefined" && process.env ? process.env : {};
  const url = String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").trim();
  return url || `https://${PRODUKTIONS_SUPABASE_REF}.supabase.co`;
}

export function erfuellungGesperrt() {
  const env = typeof process !== "undefined" && process.env ? process.env : {};
  if (String(env.VERCEL_ENV || "") !== "preview") return false;
  if (supabaseZiel().includes(PRODUKTIONS_SUPABASE_REF)) return true;
  const base = String(env.PUBLIC_BASE_URL || "").trim().toLowerCase();
  if (!base || base.includes("alex-autoshop.de")) return true;
  return false;
}
