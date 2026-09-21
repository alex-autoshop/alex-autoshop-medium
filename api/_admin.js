// ─────────────────────────────────────────────────────────────────────────────
// Admin-Prüfung für alles, was Kunden NIE sehen oder auslösen dürfen:
// Einkaufspreis und Marge, Bestellungen bei Inter Cars, IC-Rechnungen,
// Preisstufe für einen Kunden an der Theke setzen.
//
// Zwei Schlüssel, BEIDE Pflicht:
//   1. gültige Supabase-Sitzung eines Admin-Kontos   (Header Authorization)
//   2. der Admin-PIN                                  (Header x-admin-pin)
//
// Warum beides: Das Repo ist öffentlich — die Admin-Mails stehen im Code.
// Und einen PIN kann an der Theke jemand mitlesen. Zusammen nützt weder das
// eine noch das andere allein etwas.
//
// Reihenfolge ist Absicht: ERST die Sitzung, DANN der PIN. Andersherum ließe
// sich der PIN ohne Konto durchprobieren, weil "falscher PIN" und "keine
// Sitzung" unterschiedlich antworten würden.
//
// Datei beginnt mit "_" → Vercel macht daraus keinen eigenen Endpunkt.
//
// Vercel-Env:
//   ADMIN_PIN                  frei wählbar, NICHT "alex2024" (steht im Repo)
//   SUPABASE_SERVICE_ROLE_KEY  (oder SUPABASE_ANON_KEY) — zum Prüfen der Sitzung
//   ADMIN_EMAILS               optional, Komma-Liste; sonst die zwei unten
// ─────────────────────────────────────────────────────────────────────────────
import { timingSafeEqual } from "node:crypto";

const SUPABASE_URL = (
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://zasbdvtsxgimcezotlsi.supabase.co"
).replace(/\/+$/, "");

export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "alexanderharitopoulos@gmail.com,info@alex-autoshop.de")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/** Konstante Laufzeit — der Vergleich verrät nicht, wie viele Zeichen stimmen. */
function gleich(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

/** Header lesen — Node liefert ein Objekt (Namen klein), Edge ein Headers. */
function kopf(req, name) {
  const h = req?.headers;
  if (!h) return "";
  if (typeof h.get === "function") return String(h.get(name) || "");
  const v = h[name.toLowerCase()];
  return String(Array.isArray(v) ? v[0] : v || "");
}

/**
 * @returns {Promise<{ok: true, email: string} | {ok: false, status: number, error: string, pinFalsch?: boolean}>}
 */
export async function adminPruefen(req) {
  const soll = process.env.ADMIN_PIN || "";
  if (!soll) {
    return { ok: false, status: 503, error: "ADMIN_PIN ist in Vercel nicht gesetzt." };
  }

  const auth = kopf(req, "authorization");
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return { ok: false, status: 401, error: "Nicht angemeldet." };

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  if (!key) return { ok: false, status: 500, error: "Supabase-Schlüssel fehlt auf dem Server." };

  let user = null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
    });
    if (r.ok) user = await r.json();
  } catch {
    /* unten abgelehnt */
  }

  const mail = String(user?.email || "").trim().toLowerCase();
  // Nur die E-MAIL-Bestätigung zählt — confirmed_at gilt auch für Telefon-Konten.
  const bestaetigt = !!user?.email_confirmed_at;
  if (!user?.id || !mail || !bestaetigt || !ADMIN_EMAILS.includes(mail)) {
    return { ok: false, status: 403, error: "Kein Admin-Zugang." };
  }

  if (!gleich(kopf(req, "x-admin-pin"), soll)) {
    return { ok: false, status: 403, error: "Falscher PIN.", pinFalsch: true };
  }
  return { ok: true, email: mail };
}
