/**
 * Empfehlungslink auswerten — der angemeldete Nutzer kam über ?ref=CODE.
 *
 * Die Seite merkt sich den Code aus dem Link (src/lib/empfehlung.ts) und
 * schickt ihn nach Registrierung bzw. Anmeldung hierher. Eingetragen wird
 * der Werber NUR hier auf dem Server (app_metadata, vom Nutzer nicht
 * änderbar) — über die Supabase-Funktion werber_zuordnen, die prüft:
 *   • noch kein Werber eingetragen   • Konto jünger als 30 Tage
 *   • Code existiert                 • nicht der eigene Code
 *
 * Antwort: { ergebnis: "ok" | "schon_zugeordnet" | "zu_alt" | "code_unbekannt"
 *                      | "eigener_code" | "kein_konto" }
 *
 * Vercel-Env: SUPABASE_SERVICE_ROLE_KEY (bereits gesetzt)
 */

export const config = { runtime: "nodejs", maxDuration: 10 };

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://zasbdvtsxgimcezotlsi.supabase.co").replace(/\/+$/, "");
const REF_OK = /^[A-Z0-9]{6,8}$/;

function send(res, status, obj) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(status).end(JSON.stringify(obj));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Nur POST." });
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!svc) return send(res, 500, { error: "Server nicht eingerichtet." });

  const auth = String(req.headers.authorization || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return send(res, 401, { error: "Bitte anmelden." });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body || "{}"); } catch { body = {}; } }
  const code = String(body?.code || "").trim().toUpperCase();
  if (!REF_OK.test(code)) return send(res, 400, { ergebnis: "code_unbekannt" });

  try {
    const me = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: svc, Authorization: `Bearer ${token}` } });
    if (!me.ok) return send(res, 401, { error: "Sitzung abgelaufen." });
    const user = await me.json();
    if (!user?.id) return send(res, 401, { error: "Bitte anmelden." });

    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/werber_zuordnen`, {
      method: "POST",
      headers: { apikey: svc, Authorization: `Bearer ${svc}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ziel: user.id, code }),
    });
    // Funktion fehlt (SQL-Datei noch nicht ausgeführt) → später nochmal versuchen
    if (!r.ok) return send(res, 503, { error: "Noch nicht eingerichtet." });
    const ergebnis = String((await r.json()) || "");
    return send(res, 200, { ergebnis });
  } catch (err) {
    return send(res, 500, { error: String(err?.message || err).slice(0, 200) });
  }
}
