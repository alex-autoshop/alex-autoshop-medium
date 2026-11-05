/**
 * Server-Prüfung für die Teilebörse.
 * Öffentlich, wenn der Schalter an ist. Sonst nur eine bestätigte
 * Supabase-Sitzung von info@alex-autoshop.de.
 * Steht im Konto eine Rolle, muss sie "admin" sein (app_metadata, nicht vom
 * Nutzer setzbar). Der Theken-PIN gilt hier nicht: Suche und Kasse schicken
 * ihn nicht mit, das Konto soll die Börse wie bisher bedienen können.
 * Kein Node-Builtin — Edge und Node importieren dieselbe Datei.
 */

import {
  istTeileboerseAdminMail,
  teileboerseOeffentlich,
  TEILEBOERSE_COOKIE,
  TEILEBOERSE_HINWEIS,
} from "./teileboerse-schalter.js";

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

export function tokenAusAnfrage(req) {
  const auth = header(req, "authorization");
  if (auth.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }
  const cookie = header(req, "cookie");
  const treffer = cookie.match(new RegExp("(?:^|;\\s*)" + TEILEBOERSE_COOKIE + "=([^;]*)"));
  if (!treffer) return "";
  try { return decodeURIComponent(treffer[1]).trim(); } catch { return ""; }
}

/** Reine Entscheidung aus dem Supabase-User, ohne Netz. */
export function zugangAusUser(user) {
  const mail = String(user?.email || "").trim().toLowerCase();
  const bestaetigt = !!user?.email_confirmed_at;
  if (!user?.id || !mail || !bestaetigt || !istTeileboerseAdminMail(mail)) {
    return { ok: false, status: 403, error: TEILEBOERSE_HINWEIS };
  }
  const rolle = user?.app_metadata?.rolle;
  if (rolle && rolle !== "admin") {
    return { ok: false, status: 403, error: TEILEBOERSE_HINWEIS };
  }
  return { ok: true, email: mail };
}

/**
 * @returns {Promise<{ok: true, email?: string} | {ok: false, status: number, error: string}>}
 */
export async function teileboerseDarf(req) {
  if (teileboerseOeffentlich()) return { ok: true };
  const token = tokenAusAnfrage(req);
  if (!token || token.split(".").length < 3) {
    return { ok: false, status: 401, error: "Nicht angemeldet." };
  }
  const key = supabaseKey();
  if (!key) return { ok: false, status: 503, error: TEILEBOERSE_HINWEIS };
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return { ok: false, status: 401, error: "Nicht angemeldet." };
    const user = await r.json();
    return zugangAusUser(user);
  } catch {
    return { ok: false, status: 503, error: TEILEBOERSE_HINWEIS };
  }
}
