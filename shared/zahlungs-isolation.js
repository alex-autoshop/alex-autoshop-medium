// Die Produktionsdatenbank darf nur der Live-Shop beschreiben.
// Jedes andere Vercel-Projekt (Webhook-Host, lokale Tests) ist gesperrt,
// sobald die Supabase-URL fehlt oder das Projekt zasbdvtsxgimcezotlsi ist.
//
// Vorschau des Live-Shops bleibt zusätzlich gesperrt, bis BEIDES gilt:
//   • Supabase-URL zeigt auf ein anderes Projekt
//   • PUBLIC_BASE_URL ist gesetzt und zeigt nicht auf alex-autoshop.de

export const PRODUKTIONS_SUPABASE_REF = "zasbdvtsxgimcezotlsi";
export const LIVE_SHOP_PROJECT_ID = "prj_c0sRkrUnvHGqAb8rTYC3UPFZhqnG";

export function supabaseZiel() {
  const env = typeof process !== "undefined" && process.env ? process.env : {};
  const url = String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").trim();
  return url || `https://${PRODUKTIONS_SUPABASE_REF}.supabase.co`;
}

export function erfuellungGesperrt() {
  const env = typeof process !== "undefined" && process.env ? process.env : {};
  const prodDb = supabaseZiel().includes(PRODUKTIONS_SUPABASE_REF);
  const liveShop = String(env.VERCEL_PROJECT_ID || "") === LIVE_SHOP_PROJECT_ID;
  if (prodDb && !liveShop) return true;
  if (String(env.VERCEL_ENV || "") !== "preview") return false;
  if (prodDb) return true;
  const base = String(env.PUBLIC_BASE_URL || "").trim().toLowerCase();
  if (!base || base.includes("alex-autoshop.de")) return true;
  return false;
}
