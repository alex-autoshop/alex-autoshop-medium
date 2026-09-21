/**
 * Gratis-Teststunde starten — das darf NUR der Server.
 *
 * Vorher schrieb der Browser trial_level / trial_expires_at selbst in
 * user_metadata. Die kann jeder Nutzer ändern: eine Zeile in der Konsole,
 * und die "Teststunde" lief bis 2099. Jetzt stehen die Werte in
 * app_metadata, die nur mit dem Service-Key beschreibbar ist.
 *
 * Einmal pro Konto, 60 Minuten.
 *
 * Vercel-Env: SUPABASE_SERVICE_ROLE_KEY (bereits gesetzt)
 */

export const config = { runtime: "nodejs", maxDuration: 15 };

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://zasbdvtsxgimcezotlsi.supabase.co").replace(/\/+$/, "");
const DAUER_MIN = 60;

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
  if (!token) return send(res, 401, { error: "Bitte zuerst anmelden." });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body || "{}"); } catch { body = {}; } }
  const level = Math.floor(Number(body?.level));
  if (!(level >= 1 && level <= 3)) return send(res, 400, { error: "Ungültige Stufe." });

  try {
    const me = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: svc, Authorization: `Bearer ${token}` } });
    if (!me.ok) return send(res, 401, { error: "Sitzung abgelaufen — bitte neu anmelden." });
    const user = await me.json();
    if (!user?.id) return send(res, 401, { error: "Bitte zuerst anmelden." });

    // Frisch aus der Datenbank, nicht aus dem Token
    const kontoRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      headers: { apikey: svc, Authorization: `Bearer ${svc}` },
    });
    if (!kontoRes.ok) return send(res, 502, { error: "Konto konnte nicht geprüft werden." });
    const konto = await kontoRes.json();
    const a = konto?.app_metadata || {};

    if (a.trial_used) return send(res, 409, { error: "Du hast deine kostenlose Teststunde bereits genutzt." });

    const trial_expires_at = new Date(Date.now() + DAUER_MIN * 60 * 1000).toISOString();
    const neu = { ...a, trial_level: level, trial_expires_at, trial_used: true };

    const upd = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method: "PUT",
      headers: { apikey: svc, Authorization: `Bearer ${svc}`, "Content-Type": "application/json" },
      body: JSON.stringify({ app_metadata: neu }),
    });
    if (!upd.ok) return send(res, 502, { error: "Teststunde konnte nicht gestartet werden." });

    return send(res, 200, { trial_level: level, trial_expires_at });
  } catch (err) {
    return send(res, 500, { error: String(err?.message || err).slice(0, 200) });
  }
}
