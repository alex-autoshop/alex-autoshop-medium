// Kundenkonto-Pflicht fürs Abo. Normaler Warenkorb bleibt Gast.
// Reines JavaScript, damit Edge-Funktionen und Tests dieselbe Prüfung nutzen.

export const ABO_KONTO_HINWEIS =
  "Für ein Abo brauchst du ein Kundenkonto – melde dich an oder registriere dich.";

const EMAIL_OK = /^[^\s@<>"'`,;]{1,64}@[^\s@<>"'`,;]{1,190}\.[A-Za-z]{2,24}$/;
const UUID_OK = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SUPABASE_URL = (
  (typeof process !== "undefined" && (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)) ||
  "https://zasbdvtsxgimcezotlsi.supabase.co"
).replace(/\/+$/, "");

function supabaseKey() {
  const env = typeof process !== "undefined" && process.env ? process.env : {};
  return (
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "sb_publishable_hMoY8Rgjjb9cvmeMaTEJoQ_AkBoF3FX"
  );
}

function header(req, name) {
  const h = req?.headers;
  if (!h) return "";
  if (typeof h.get === "function") return String(h.get(name) || "");
  const v = h[name.toLowerCase()] ?? h[name];
  return String(Array.isArray(v) ? v[0] : v || "");
}

export function tokenAusKopf(req) {
  const auth = header(req, "authorization");
  if (!auth.startsWith("Bearer ")) return "";
  return auth.slice(7).trim();
}

/** Konto aus der Supabase-Antwort, ohne Netz. */
export function kundeAusUser(user) {
  const email = String(user?.email || "").trim().toLowerCase();
  const userId = String(user?.id || "").trim();
  if (!UUID_OK.test(userId) || !EMAIL_OK.test(email)) {
    return { ok: false, status: 401, error: ABO_KONTO_HINWEIS };
  }
  return { ok: true, email, userId };
}

/**
 * Gültige Sitzung oder 401. Ohne erreichbare Anmeldung 503 — dann wird kein Abo angelegt.
 * @param {Request | { headers?: unknown }} req
 * @param {typeof fetch} [holen]
 */
export async function kundeAusAnfrage(req, holen = fetch) {
  const token = tokenAusKopf(req);
  if (!token || token.split(".").length < 3) {
    return { ok: false, status: 401, error: ABO_KONTO_HINWEIS };
  }
  const key = supabaseKey();
  if (!key) return { ok: false, status: 503, error: "Anmeldung ist gerade nicht erreichbar." };
  try {
    const r = await holen(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return { ok: false, status: 401, error: "Sitzung abgelaufen — bitte neu anmelden." };
    const user = await r.json().catch(() => null);
    return kundeAusUser(user);
  } catch {
    return { ok: false, status: 503, error: "Anmeldung ist gerade nicht erreichbar." };
  }
}

/** Hängt die Konto-ID an ein bestehendes Paket. GoCardless hat nur drei Metadaten-Felder. */
export function paketMitKonto(paket, userId) {
  const id = String(userId || "").trim().toLowerCase();
  const basis = String(paket || "");
  if (!UUID_OK.test(id)) return basis;
  if (basis.toLowerCase().endsWith("|" + id)) return basis;
  return basis ? `${basis}|${id}` : id;
}

/** Letztes Paket-Segment, wenn es eine Konto-ID ist. */
export function userIdAusPaket(paket) {
  const teile = String(paket || "").split("|");
  const letzte = String(teile[teile.length - 1] || "").trim();
  return UUID_OK.test(letzte) ? letzte.toLowerCase() : "";
}
