/**
 * Alex-Notfallnummer — exklusiv für Level-3-Mitglieder.
 *
 * Die private Handynummer darf NICHT im Frontend stehen: das Repo ist
 * öffentlich und alles im Bundle ist für jeden lesbar. Deshalb liegt sie
 * ausschließlich in der Vercel-Env und wird erst nach Prüfung herausgegeben.
 *
 * Geprüft wird serverseitig und immer frisch:
 *   1. Access-Token des angemeldeten Nutzers -> welche User-ID?
 *   2. Mit dem Service-Key das Konto laden -> aktuelle membership_level
 * (Der Token allein reicht nicht: er kann eine veraltete Stufe enthalten,
 *  z.B. nach einer Kündigung oder Herabstufung.)
 *
 * WICHTIG: Ein laufender Gratis-Trial auf Level 3 gibt die Nummer NICHT frei.
 * Sonst könnte sich jeder für eine Stunde anmelden und die Nummer abgreifen.
 *
 * Benötigte Vercel-Env:
 *   ALEX_HOTLINE               — die Handynummer, international: +49151...
 *   ALEX_HOTLINE_WHATSAPP      — optional, falls WhatsApp eine andere Nummer nutzt
 *   SUPABASE_SERVICE_ROLE_KEY  — bereits gesetzt
 *   VITE_SUPABASE_URL          — bereits gesetzt
 */

export const config = { runtime: 'nodejs', maxDuration: 15 };

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zasbdvtsxgimcezotlsi.supabase.co';
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HOTLINE = process.env.ALEX_HOTLINE;
const HOTLINE_WA = process.env.ALEX_HOTLINE_WHATSAPP || process.env.ALEX_HOTLINE;

function send(res, status, obj) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, private');
  res.status(status).end(JSON.stringify(obj));
}

export default async function handler(req, res) {
  if (!HOTLINE) {
    return send(res, 503, {
      error: 'Notfallnummer ist noch nicht hinterlegt.',
      hinweis: 'Vercel → Settings → Environment Variables → ALEX_HOTLINE anlegen (Format +4915112345678), dann neu deployen.',
    });
  }
  if (!SVC) return send(res, 500, { error: 'SUPABASE_SERVICE_ROLE_KEY fehlt.' });

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return send(res, 401, { error: 'Nicht angemeldet.' });

  try {
    // 1) Wer ist das? (Token gegen Supabase prüfen)
    const me = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SVC, Authorization: `Bearer ${token}` },
    });
    if (!me.ok) return send(res, 401, { error: 'Sitzung abgelaufen — bitte neu anmelden.' });
    const user = await me.json();
    if (!user?.id) return send(res, 401, { error: 'Nicht angemeldet.' });

    // 2) Aktuelle Stufe aus dem Konto lesen (nicht aus dem Token — der kann alt sein)
    const acc = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      headers: { apikey: SVC, Authorization: `Bearer ${SVC}` },
    });
    if (!acc.ok) return send(res, 502, { error: 'Konto konnte nicht geprüft werden.' });
    const data = await acc.json();
    const level = Number(data?.user_metadata?.membership_level) || 0;

    if (level < 3) {
      return send(res, 403, {
        error: 'Die Notfallnummer ist Level-3-Mitgliedern vorbehalten.',
        level,
      });
    }

    return send(res, 200, {
      phone: HOTLINE,
      whatsapp: `https://wa.me/${String(HOTLINE_WA).replace(/[^0-9]/g, '')}`,
      hinweis: 'Bitte nur im Notfall — und bitte nicht weitergeben.',
    });
  } catch (err) {
    return send(res, 500, { error: String(err).slice(0, 200) });
  }
}
