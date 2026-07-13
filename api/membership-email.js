export const config = { runtime: 'edge' };

// ─── Config ──────────────────────────────────────────────────────────────────
const RESEND_API_KEY    = process.env.RESEND_API_KEY;
const SUPABASE_URL      = process.env.VITE_SUPABASE_URL;
const SUPABASE_SVC_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FROM_EMAIL        = 'Alex Autoshop <noreply@alex-autoshop.de>';
const LOGIN_URL         = 'https://clever-cart-fixer.vercel.app/auth';
const SHOP_URL          = 'https://shop.alex-autoshop.de';

const LEVEL_INFO = {
  1: { name: 'Level 1', tagline: 'Für Aufbereiter & kleine Werkstätten',    discount: 15, welcome: 50  },
  2: { name: 'Level 2', tagline: 'Der Bestseller für aktive Werkstätten',   discount: 28, welcome: 250 },
  3: { name: 'Level 3', tagline: 'Höchstrabatt & VIP-Service',              discount: 40, welcome: 500 },
};

// ─── Password Generator ───────────────────────────────────────────────────────
function generatePassword(len = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => chars[b % chars.length]).join('');
}

// ─── Email 1: Verifizierung ───────────────────────────────────────────────────
function verificationHtml(verifyUrl) {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>E-Mail bestätigen</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:48px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

  <!-- Logo -->
  <tr><td style="padding:0 0 36px;text-align:center;">
    <table cellpadding="0" cellspacing="0" style="display:inline-table;border:2px solid #D4A017;border-radius:12px;padding:10px 22px;">
      <tr><td style="color:#D4A017;font-size:20px;font-weight:900;letter-spacing:-0.5px;">alex autoshop</td></tr>
    </table>
    <p style="color:#555;font-size:11px;margin:8px 0 0;letter-spacing:2.5px;text-transform:uppercase;">Lackierprodukte · Autoteile · Werkstattbedarf</p>
  </td></tr>

  <!-- Card -->
  <tr><td style="background:#141414;border:1px solid #2a2a2a;border-radius:16px;padding:48px 40px;text-align:center;">
    <p style="font-size:40px;margin:0 0 20px;">✉️</p>
    <h1 style="color:#ffffff;font-size:26px;font-weight:700;margin:0 0 14px;letter-spacing:-0.5px;">E-Mail bestätigen</h1>
    <p style="color:#888;font-size:15px;line-height:1.7;margin:0 0 36px;">
      Danke für dein Interesse an einer Alex Autoshop Mitgliedschaft.<br>
      Klicke den Button um deine E-Mail-Adresse zu bestätigen.
    </p>

    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr><td style="background:#D4A017;border-radius:10px;padding:15px 40px;">
        <a href="${verifyUrl}" style="color:#000000;font-size:16px;font-weight:700;text-decoration:none;letter-spacing:0.3px;">E-Mail bestätigen →</a>
      </td></tr>
    </table>

    <p style="color:#444;font-size:12px;margin:32px 0 0;line-height:1.7;">
      Dieser Link ist 24 Stunden gültig.<br>
      Falls du keine Anfrage gestellt hast, ignoriere diese E-Mail.
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:28px 0 0;text-align:center;">
    <p style="color:#3a3a3a;font-size:12px;margin:0;line-height:2;">
      Alex Autoshop · Handelstraße 64 · 42277 Wuppertal<br>
      Tel: 0202 82690 · info@alex-autoshop.de · Mo–Fr 9–17:30 · Sa 9–14
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ─── Email 2: Zugangsdaten + Mitgliedschaft + Bezahlung ──────────────────────
function welcomeHtml({ email, password, level, modules, price }) {
  const info    = LEVEL_INFO[level] ?? { name: `Level ${level}`, tagline: '', discount: 0, welcome: 0 };
  const modList = (modules && modules.length) ? modules.join(', ') : 'keine Module gewählt';
  const isBasis = !modules || modules.length === 0;

  const featureRows = [
    !isBasis && `<tr><td style="color:#ccc;font-size:14px;padding:5px 0;">✓&nbsp;&nbsp;${info.discount}% Rabatt auf alle gewählten Kategorien</td></tr>`,
    `<tr><td style="color:#ccc;font-size:14px;padding:5px 0;">✓&nbsp;&nbsp;NRW Tageslieferung bis 14:00 Uhr</td></tr>`,
    `<tr><td style="color:#ccc;font-size:14px;padding:5px 0;">✓&nbsp;&nbsp;Wuppertal-Express in ~1 Stunde</td></tr>`,
    info.welcome && `<tr><td style="color:#ccc;font-size:14px;padding:5px 0;">✓&nbsp;&nbsp;Willkommensgeschenk ${info.welcome} € auf deine erste Bestellung</td></tr>`,
    `<tr><td style="color:#ccc;font-size:14px;padding:5px 0;">✓&nbsp;&nbsp;Preisschutz ab Mitgliedschaftsstart</td></tr>`,
    `<tr><td style="color:#ccc;font-size:14px;padding:5px 0;">✓&nbsp;&nbsp;Cashback auf Teileumsatz (Modul Autoteile)</td></tr>`,
    level >= 2 && `<tr><td style="color:#ccc;font-size:14px;padding:5px 0;">✓&nbsp;&nbsp;Gratis Wunschfarbe jeden Monat</td></tr>`,
    level >= 2 && `<tr><td style="color:#ccc;font-size:14px;padding:5px 0;">✓&nbsp;&nbsp;Farbfehlerschutz auf unsere Kosten</td></tr>`,
    level >= 3 && `<tr><td style="color:#ccc;font-size:14px;padding:5px 0;">✓&nbsp;&nbsp;Bevorzugte Auftragsbearbeitung (VIP)</td></tr>`,
  ].filter(Boolean).join('\n');

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Willkommen bei Alex Autoshop</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:48px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

  <!-- Logo -->
  <tr><td style="padding:0 0 36px;text-align:center;">
    <table cellpadding="0" cellspacing="0" style="display:inline-table;border:2px solid #D4A017;border-radius:12px;padding:10px 22px;">
      <tr><td style="color:#D4A017;font-size:20px;font-weight:900;letter-spacing:-0.5px;">alex autoshop</td></tr>
    </table>
    <p style="color:#555;font-size:11px;margin:8px 0 0;letter-spacing:2.5px;text-transform:uppercase;">Lackierprodukte · Autoteile · Werkstattbedarf</p>
  </td></tr>

  <!-- Hero Banner -->
  <tr><td style="background:linear-gradient(135deg,#1c1400 0%,#141414 60%);border:1px solid #3a2800;border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;border-bottom:2px solid #D4A017;">
    <p style="color:#D4A017;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 10px;">Alex Autoshop Mitgliedschaft</p>
    <h1 style="color:#ffffff;font-size:30px;font-weight:800;margin:0 0 6px;letter-spacing:-0.5px;">${info.name}</h1>
    <p style="color:#D4A017;font-size:14px;margin:0 0 18px;">${info.tagline}</p>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr><td style="background:rgba(212,160,23,0.12);border:1px solid #D4A017;border-radius:8px;padding:8px 22px;">
        <span style="color:#D4A017;font-size:22px;font-weight:700;">${price} € / Monat</span>
      </td></tr>
    </table>
  </td></tr>

  <!-- Zugangsdaten -->
  <tr><td style="background:#141414;border:1px solid #2a2a2a;border-top:0;padding:32px 40px;">
    <h2 style="color:#ffffff;font-size:17px;font-weight:700;margin:0 0 18px;">🔑 Deine Zugangsdaten</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;overflow:hidden;">
      <tr><td style="background:#1c1c1c;border:1px solid #2e2e2e;border-radius:10px 10px 0 0;padding:14px 18px;">
        <p style="color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1.2px;margin:0 0 4px;">E-Mail</p>
        <p style="color:#ffffff;font-size:15px;font-weight:600;margin:0;">${email}</p>
      </td></tr>
      <tr><td style="background:#1c1c1c;border:1px solid #2e2e2e;border-top:0;border-radius:0 0 10px 10px;padding:14px 18px;">
        <p style="color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1.2px;margin:0 0 4px;">Temporäres Passwort</p>
        <p style="color:#D4A017;font-size:20px;font-weight:700;font-family:Courier New,Courier,monospace;letter-spacing:3px;margin:0;">${password}</p>
      </td></tr>
    </table>
    <p style="color:#444;font-size:12px;margin:10px 0 24px;line-height:1.6;">Bitte ändere dein Passwort nach dem ersten Login unter <strong style="color:#666;">Konto → Einstellungen</strong>.</p>
    <table cellpadding="0" cellspacing="0">
      <tr><td style="background:#D4A017;border-radius:10px;padding:14px 36px;">
        <a href="${LOGIN_URL}" style="color:#000000;font-size:15px;font-weight:700;text-decoration:none;">Jetzt einloggen →</a>
      </td></tr>
    </table>
  </td></tr>

  <!-- Mitgliedschaft Details -->
  <tr><td style="background:#141414;border:1px solid #2a2a2a;border-top:0;padding:0 40px 28px;">
    <hr style="border:0;border-top:1px solid #1e1e1e;margin:0 0 24px;">
    <h2 style="color:#ffffff;font-size:17px;font-weight:700;margin:0 0 16px;">📦 Deine Mitgliedschaft</h2>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="color:#666;font-size:13px;padding:9px 0;border-bottom:1px solid #1e1e1e;">Paket</td>
        <td style="color:#fff;font-size:13px;font-weight:600;text-align:right;padding:9px 0;border-bottom:1px solid #1e1e1e;">${info.name}</td>
      </tr>
      <tr>
        <td style="color:#666;font-size:13px;padding:9px 0;border-bottom:1px solid #1e1e1e;">Aktive Module</td>
        <td style="color:#D4A017;font-size:13px;font-weight:600;text-align:right;padding:9px 0;border-bottom:1px solid #1e1e1e;">${modList}</td>
      </tr>
      <tr>
        <td style="color:#666;font-size:13px;padding:9px 0;border-bottom:1px solid #1e1e1e;">Rabatt</td>
        <td style="color:#fff;font-size:13px;font-weight:600;text-align:right;padding:9px 0;border-bottom:1px solid #1e1e1e;">${isBasis ? '10' : info.discount}% auf alle gewählten Kategorien</td>
      </tr>
      <tr>
        <td style="color:#666;font-size:13px;padding:9px 0;">Monatsbeitrag</td>
        <td style="color:#D4A017;font-size:16px;font-weight:700;text-align:right;padding:9px 0;">${price} €</td>
      </tr>
    </table>
  </td></tr>

  <!-- Was dich erwartet -->
  <tr><td style="background:#141414;border:1px solid #2a2a2a;border-top:0;padding:0 40px 28px;">
    <hr style="border:0;border-top:1px solid #1e1e1e;margin:0 0 24px;">
    <h2 style="color:#ffffff;font-size:17px;font-weight:700;margin:0 0 14px;">⚡ Was dich erwartet</h2>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${featureRows}
    </table>
  </td></tr>

  <!-- Bezahlung -->
  <tr><td style="background:#141414;border:1px solid #2a2a2a;border-top:0;border-radius:0 0 16px 16px;padding:0 40px 40px;">
    <hr style="border:0;border-top:1px solid #1e1e1e;margin:0 0 24px;">
    <h2 style="color:#ffffff;font-size:17px;font-weight:700;margin:0 0 8px;">💳 Bezahlung</h2>
    <p style="color:#666;font-size:13px;margin:0 0 20px;line-height:1.6;">Deine Mitgliedschaft wird nach Zahlungseingang sofort freigeschaltet.</p>

    <!-- Bank -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#1c1c1c;border:1px solid #2e2e2e;border-radius:10px;margin-bottom:12px;">
      <tr><td style="padding:20px;">
        <p style="color:#D4A017;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 14px;">🏦 Banküberweisung</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#555;font-size:13px;padding:3px 0;">Empfänger</td>
            <td style="color:#ddd;font-size:13px;font-weight:600;text-align:right;">Alexander Haritopoulos</td>
          </tr>
          <tr>
            <td style="color:#555;font-size:13px;padding:3px 0;">IBAN</td>
            <td style="color:#D4A017;font-size:13px;font-weight:600;font-family:Courier New,Courier,monospace;text-align:right;">Auf Anfrage: 0202 82690</td>
          </tr>
          <tr>
            <td style="color:#555;font-size:13px;padding:3px 0;">Verwendungszweck</td>
            <td style="color:#ddd;font-size:13px;font-weight:600;text-align:right;">${email} · ${info.name}</td>
          </tr>
          <tr>
            <td style="color:#555;font-size:13px;padding:3px 0;">Betrag</td>
            <td style="color:#D4A017;font-size:16px;font-weight:700;text-align:right;">${price},00 €</td>
          </tr>
        </table>
      </td></tr>
    </table>

    <!-- Online -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#1c1c1c;border:1px solid #2e2e2e;border-radius:10px;margin-bottom:24px;">
      <tr><td style="padding:20px;">
        <p style="color:#D4A017;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 10px;">🛒 Online bezahlen</p>
        <p style="color:#666;font-size:13px;margin:0 0 14px;line-height:1.6;">Kreditkarte oder PayPal — direkt über unseren sicheren Checkout:</p>
        <table cellpadding="0" cellspacing="0">
          <tr><td style="background:#222;border:1px solid #333;border-radius:8px;padding:10px 20px;">
            <a href="${SHOP_URL}" style="color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;">Zum Online-Checkout →</a>
          </td></tr>
        </table>
      </td></tr>
    </table>

    <!-- Kontakt Box -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(212,160,23,0.07);border:1px solid rgba(212,160,23,0.2);border-radius:10px;">
      <tr><td style="padding:18px 20px;">
        <p style="color:#D4A017;font-size:13px;margin:0;line-height:1.8;">
          <strong>Fragen zur Mitgliedschaft?</strong><br>
          📞 <a href="tel:020282690" style="color:#D4A017;text-decoration:none;">0202 82690</a>&nbsp;&nbsp;·&nbsp;&nbsp;
          ✉️ <a href="mailto:info@alex-autoshop.de" style="color:#D4A017;text-decoration:none;">info@alex-autoshop.de</a>
        </p>
      </td></tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:28px 0 0;text-align:center;">
    <p style="color:#333;font-size:12px;margin:0;line-height:2;">
      Alex Autoshop · Handelstraße 64 · 42277 Wuppertal<br>
      Tel: 0202 82690 · info@alex-autoshop.de · Mo–Fr 9–17:30 · Sa 9–14
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonError('Ungültiger Request-Body', 400);
  }

  const { email, level, modules = [], price } = body;
  if (!email || !level) return jsonError('email und level sind erforderlich', 400);
  if (!RESEND_API_KEY)   return jsonError('RESEND_API_KEY nicht konfiguriert', 500);

  const tempPassword = generatePassword(10);
  const levelInfo    = LEVEL_INFO[level] ?? { name: `Level ${level}` };

  // ── 1. Supabase User anlegen (optional, braucht Service Role Key) ──────────
  let verifyUrl = `${LOGIN_URL}?email=${encodeURIComponent(email)}`;

  if (SUPABASE_URL && SUPABASE_SVC_KEY) {
    try {
      // User erstellen
      const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'apikey':        SUPABASE_SVC_KEY,
          'Authorization': `Bearer ${SUPABASE_SVC_KEY}`,
        },
        body: JSON.stringify({
          email,
          password: tempPassword,
          email_confirm: false,
          user_metadata: { level, modules, role: 'member' },
        }),
      });

      // Magic-Link für Verifikations-E-Mail generieren
      if (createRes.ok) {
        const linkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'apikey':        SUPABASE_SVC_KEY,
            'Authorization': `Bearer ${SUPABASE_SVC_KEY}`,
          },
          body: JSON.stringify({ type: 'signup', email }),
        });
        if (linkRes.ok) {
          const linkData = await linkRes.json();
          if (linkData.action_link) verifyUrl = linkData.action_link;
        }
      }

      // Membership Request in DB eintragen
      await fetch(`${SUPABASE_URL}/rest/v1/membership_requests`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'apikey':        SUPABASE_SVC_KEY,
          'Authorization': `Bearer ${SUPABASE_SVC_KEY}`,
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify({
          email,
          level,
          modules,
          status: 'pending',
        }),
      });
    } catch (e) {
      // Non-fatal — weiter mit E-Mail-Versand
      console.error('Supabase error (non-fatal):', e.message);
    }
  }

  // ── 2. Email 1: Verifikation ──────────────────────────────────────────────
  const email1Res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from:    FROM_EMAIL,
      to:      [email],
      subject: '✉️ E-Mail bestätigen — Alex Autoshop Mitgliedschaft',
      html:    verificationHtml(verifyUrl),
    }),
  });

  if (!email1Res.ok) {
    const err = await email1Res.text();
    return jsonError(`Resend Fehler (Email 1): ${err}`, 502);
  }

  // ── 3. Email 2: Zugangsdaten + Mitgliedschaft ─────────────────────────────
  const email2Res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from:    FROM_EMAIL,
      to:      [email],
      subject: `🔑 Deine Zugangsdaten — Alex Autoshop ${levelInfo.name}`,
      html:    welcomeHtml({ email, password: tempPassword, level, modules, price }),
    }),
  });

  if (!email2Res.ok) {
    const err = await email2Res.text();
    return jsonError(`Resend Fehler (Email 2): ${err}`, 502);
  }

  return new Response(
    JSON.stringify({ ok: true, message: 'Beide E-Mails wurden versendet.' }),
    {
      status: 200,
      headers: {
        'Content-Type':                'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}

function jsonError(message, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type':                'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
