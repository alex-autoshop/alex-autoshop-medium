/**
 * Mitglieder-Übersicht für Alex (intern).
 *
 * Liefert alle registrierten Konten mit Mitgliedschaftsstufe, Trial-Status,
 * Firmendaten und Bestell-Kennzahlen — die Daten liegen verstreut in
 * `auth.users.user_metadata` und in der Tabelle `orders`.
 *
 * Zugriff NUR mit PIN: Header `x-admin-pin` muss `ADMIN_PIN` entsprechen.
 * Ohne gesetzte ADMIN_PIN antwortet der Endpunkt gar nicht — sonst könnte
 * jeder die Kundenliste abrufen (das Repo ist öffentlich).
 *
 * Benötigte Vercel-Env:
 *   ADMIN_PIN                  — frei wählbar, nur Alex kennt ihn
 *   SUPABASE_SERVICE_ROLE_KEY  — bereits gesetzt (nutzt auch membership-email)
 *   VITE_SUPABASE_URL          — bereits gesetzt
 */

export const config = { runtime: 'nodejs', maxDuration: 30 };

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zasbdvtsxgimcezotlsi.supabase.co';
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_PIN = process.env.ADMIN_PIN;

function send(res, status, obj) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).end(JSON.stringify(obj));
}

async function sb(path) {
  const r = await fetch(`${SUPABASE_URL}${path}`, {
    headers: { apikey: SVC, Authorization: `Bearer ${SVC}` },
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

export default async function handler(req, res) {
  if (!ADMIN_PIN) {
    return send(res, 503, {
      error: 'ADMIN_PIN ist in Vercel nicht gesetzt.',
      hinweis: 'Vercel → Settings → Environment Variables → ADMIN_PIN anlegen, dann neu deployen.',
    });
  }
  if ((req.headers['x-admin-pin'] || '') !== ADMIN_PIN) {
    return send(res, 401, { error: 'Falscher PIN' });
  }
  if (!SVC) {
    return send(res, 500, { error: 'SUPABASE_SERVICE_ROLE_KEY fehlt in den Umgebungsvariablen.' });
  }

  try {
    // 1) Alle Konten (Admin-API, seitenweise)
    const users = [];
    for (let page = 1; page <= 20; page++) {
      const data = await sb(`/auth/v1/admin/users?page=${page}&per_page=200`);
      const batch = Array.isArray(data) ? data : data.users || [];
      users.push(...batch);
      if (batch.length < 200) break;
    }

    // 2) Bestellungen je Konto zusammenfassen
    const stats = new Map();
    try {
      const orders = await sb('/rest/v1/orders?select=user_id,total,status,created_at&order=created_at.desc');
      for (const o of orders) {
        const s = stats.get(o.user_id) || { count: 0, sum: 0, last: null };
        s.count += 1;
        s.sum += Number(o.total) || 0;
        if (!s.last || new Date(o.created_at) > new Date(s.last)) s.last = o.created_at;
        stats.set(o.user_id, s);
      }
    } catch {
      /* Tabelle evtl. leer oder nicht lesbar — dann eben ohne Bestellzahlen */
    }

    const now = Date.now();
    const members = users.map((u) => {
      const m = u.user_metadata || {};
      const st = stats.get(u.id) || { count: 0, sum: 0, last: null };
      const trialExpires = m.trial_expires_at || null;
      const trialActive = !!trialExpires && new Date(trialExpires).getTime() > now;
      return {
        id: u.id,
        email: u.email,
        company: m.company_name || '',
        contact: m.contact_name || '',
        phone: m.phone || '',
        address: m.address || '',
        level: typeof m.membership_level === 'number' ? m.membership_level : 0,
        modules: m.membership_modules || [],
        trialUsed: !!m.trial_used,
        trialLevel: m.trial_level ?? null,
        trialExpires,
        trialActive,
        referralCode: m.referral_code || '',
        referredBy: m.referred_by || '',
        affiliateCredit: Number(m.affiliate_credit) || 0,
        sepa: !!m.sepa_mandate_accepted,
        createdAt: u.created_at,
        lastSignIn: u.last_sign_in_at || null,
        confirmed: !!(u.email_confirmed_at || u.confirmed_at),
        orders: st.count,
        revenue: Math.round(st.sum * 100) / 100,
        lastOrder: st.last,
      };
    });

    members.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const monthAgo = now - 30 * 86400000;
    const summary = {
      konten: members.length,
      mitglieder: members.filter((m) => m.level > 0).length,
      level1: members.filter((m) => m.level === 1).length,
      level2: members.filter((m) => m.level === 2).length,
      level3: members.filter((m) => m.level === 3).length,
      trialAktiv: members.filter((m) => m.trialActive).length,
      trialGenutzt: members.filter((m) => m.trialUsed).length,
      neu30Tage: members.filter((m) => new Date(m.createdAt).getTime() > monthAgo).length,
      bestellungen: members.reduce((s, m) => s + m.orders, 0),
      umsatz: Math.round(members.reduce((s, m) => s + m.revenue, 0) * 100) / 100,
    };

    return send(res, 200, { summary, members, stand: new Date().toISOString() });
  } catch (e) {
    return send(res, 502, { error: String(e).slice(0, 300) });
  }
}
