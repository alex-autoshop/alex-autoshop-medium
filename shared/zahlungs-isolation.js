// Die Produktionsdatenbank darf nur der Live-Shop beschreiben.
// Jedes andere Projekt ist gesperrt, sobald die Supabase-URL fehlt oder
// das Projekt zasbdvtsxgimcezotlsi ist.
//
// Jede Vorschau des Live-Shops bleibt gesperrt, auch mit der Testdatenbank.
// Dort liegt weiterhin der Produktions-Service-Key. Schreiben darf nur der
// separate Webhook-Host (VERCEL_ENV=production, andere Projekt-ID, Test-URL).

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
  if (String(env.VERCEL_ENV || "") === "preview") return true;
  if (prodDb && !liveShop) return true;
  return false;
}

/** Erfolgslink der Bezahlseite. Eine Vorschau-Adresse bleibt auf der Vorschau. */
export function checkoutBasis(host) {
  const env = typeof process !== "undefined" && process.env ? process.env : {};
  const fest = String(env.PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");
  if (fest) return fest;
  const h = String(host || "").split(",")[0].trim().toLowerCase();
  if (/^[a-z0-9.-]+\.vercel\.app$/.test(h)) return `https://${h}`;
  return "https://alex-autoshop.de";
}
