/**
 * Admin-Zugriff auf den Live-Chat — mit dem Service-Role-Key, serverseitig.
 *
 * Vorher las die Admin-Seite direkt aus der Datenbank, abgesichert nur durch
 * eine PIN, die fest im Frontend-Code stand. Beides war wirkungslos: die PIN
 * landet im JS-Bundle, und die Tabellen waren fuer jeden lesbar, der den
 * oeffentlichen Key aus dem Repo nimmt.
 *
 * Jetzt gilt: die Tabellen sind per RLS zu (siehe Migration
 * 20260917_chat_zugriff_schliessen.sql), und der einzige Weg an alle Chats
 * fuehrt hier durch — mit einem Geheimnis, das nur in Vercel steht.
 *
 * Vercel → Settings → Environment Variables:
 *   ADMIN_PIN                  — frei waehlbar, NICHT "alex2024" (die steht
 *                                fuer immer in der oeffentlichen Git-Historie)
 *   SUPABASE_SERVICE_ROLE_KEY  — Supabase → Settings → API → service_role
 *   VITE_SUPABASE_URL          — Projekt-URL
 */
export const config = { runtime: 'nodejs', maxDuration: 15 };

import { adminPruefen } from './_admin.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zasbdvtsxgimcezotlsi.supabase.co';
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_PIN = process.env.ADMIN_PIN;

function send(res, status, obj) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).end(JSON.stringify(obj));
}

async function db(pfad, init = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${pfad}`, {
    ...init,
    headers: {
      apikey: SVC,
      Authorization: `Bearer ${SVC}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await r.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* kein JSON */ }
  return { ok: r.ok, status: r.status, json, text };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });

  if (!ADMIN_PIN || !SVC) {
    return send(res, 500, {
      error: 'Serverseitig nicht eingerichtet.',
      hinweis: 'In Vercel fehlen ADMIN_PIN und/oder SUPABASE_SERVICE_ROLE_KEY. Danach neu deployen.',
    });
  }
  // Admin-Sitzung + PIN (api/_admin.js). Der PIN allein ließ sich hier
  // ohne Konto durchprobieren (Prüfung 21.09.2026).
  const zugang = await adminPruefen(req);
  if (!zugang.ok) {
    return send(res, zugang.pinFalsch ? 401 : zugang.status, { error: zugang.pinFalsch ? 'Falsche PIN.' : zugang.error });
  }

  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  const was = url.searchParams.get('was') || 'sitzungen';

  try {
    if (was === 'sitzungen') {
      const r = await db('chat_sessions?select=*&order=last_msg_at.desc&limit=100');
      if (!r.ok) return send(res, 502, { error: 'Datenbank antwortet nicht', detail: r.text?.slice(0, 200) });
      return send(res, 200, { sitzungen: r.json ?? [] });
    }

    if (was === 'nachrichten') {
      const id = url.searchParams.get('session');
      if (!id) return send(res, 400, { error: 'session fehlt' });
      const r = await db(`chat_messages?select=*&session_id=eq.${encodeURIComponent(id)}&order=created_at.asc`);
      if (!r.ok) return send(res, 502, { error: 'Datenbank antwortet nicht', detail: r.text?.slice(0, 200) });
      return send(res, 200, { nachrichten: r.json ?? [] });
    }

    if (was === 'antworten') {
      if (req.method !== 'POST') return send(res, 405, { error: 'POST erwartet' });
      let body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { /* */ } }
      const { session, text } = body ?? {};
      if (!session || !String(text || '').trim()) return send(res, 400, { error: 'session und text nötig' });

      const r = await db('chat_messages', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ session_id: session, sender: 'agent', message: String(text).trim() }),
      });
      if (!r.ok) return send(res, 502, { error: 'Antwort konnte nicht gespeichert werden', detail: r.text?.slice(0, 200) });
      await db(`chat_sessions?id=eq.${encodeURIComponent(session)}`, {
        method: 'PATCH',
        body: JSON.stringify({ last_msg_at: new Date().toISOString() }),
      });
      return send(res, 200, { gespeichert: r.json?.[0] ?? null });
    }

    if (was === 'schliessen') {
      if (req.method !== 'POST') return send(res, 405, { error: 'POST erwartet' });
      let body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { /* */ } }
      const id = body?.session;
      if (!id) return send(res, 400, { error: 'session fehlt' });
      const r = await db(`chat_sessions?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'closed' }),
      });
      if (!r.ok) return send(res, 502, { error: 'Konnte nicht geschlossen werden' });
      return send(res, 200, { ok: true });
    }

    return send(res, 400, { error: `Unbekannt: ${was}` });
  } catch (e) {
    return send(res, 500, { error: String(e).slice(0, 200) });
  }
}
