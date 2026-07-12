// TEMPORÄRER Migrations-Endpoint — wird nach dem Umzug sofort wieder gelöscht. (v3)
// Kopiert die Inter-Cars-Secrets aus den Vercel-Env-Vars in die Supabase-Secrets
// des NEUEN Projekts (fest verdrahtet). Die Werte werden dabei NIE ausgegeben.
// Sicherheit: Wirkt nur mit einem Supabase-Access-Token, der Schreibrecht auf
// genau dieses Projekt hat (also nur Alex' Token). Response enthält keine Werte.
export const config = { maxDuration: 15 };

const ZIEL_PROJEKT = "zasbdvtsxgimcezotlsi"; // fest — keine Exfiltration in fremde Projekte möglich

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "POST required" }); return; }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const token = body && body.token;
  if (!token || typeof token !== "string" || !token.startsWith("sbp_")) {
    res.status(400).json({ error: "Supabase access token (sbp_...) required" });
    return;
  }

  const id = process.env.INTERCARS_CLIENT_ID;
  const secret = process.env.INTERCARS_CLIENT_SECRET;
  if (!id || !secret) {
    res.status(500).json({ error: "INTERCARS_CLIENT_ID/SECRET fehlen in den Vercel-Env-Vars" });
    return;
  }

  const payload = [
    { name: "INTERCARS_CLIENT_ID", value: id },
    { name: "INTERCARS_CLIENT_SECRET", value: secret },
  ];

  const r = await fetch(`https://api.supabase.com/v1/projects/${ZIEL_PROJEKT}/secrets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await r.text();
  res.status(200).json({
    ok: r.ok,
    status: r.status,
    // Diagnose ohne Werte: nur Länge + erste 4 Zeichen der Client-ID
    idHint: `${id.slice(0, 4)}… (${id.length} Zeichen)`,
    detail: r.ok ? "Secrets im Zielprojekt gesetzt" : text.slice(0, 200),
  });
}
