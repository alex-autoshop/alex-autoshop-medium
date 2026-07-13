export const config = { runtime: 'edge' };

// ─── Config ──────────────────────────────────────────────────────────────────
const RESEND_API_KEY   = process.env.RESEND_API_KEY;
const SUPABASE_URL     = process.env.VITE_SUPABASE_URL;
const SUPABASE_SVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FROM_EMAIL       = 'Alex Autoshop <mitgliedschaft@alex-autoshop.de>';
const REPLY_TO         = 'info@alex-autoshop.de';
const LOGIN_URL        = 'https://clever-cart-fixer.vercel.app/auth';
const SHOP_URL         = 'https://shop.alex-autoshop.de';
const SITE_URL         = 'https://clever-cart-fixer.vercel.app';

const LEVEL_INFO = {
  1: { name: 'Level 1',  tagline: 'Für Aufbereiter & kleine Werkstätten', discount: 15, welcome: 50,  cashback: '7 %',   cashbackMin: 500  },
  2: { name: 'Level 2',  tagline: 'Der Bestseller für aktive Werkstätten', discount: 28, welcome: 250, cashback: '8,5 %', cashbackMin: 1200 },
  3: { name: 'Level 3',  tagline: 'Höchstrabatt & VIP-Service',            discount: 40, welcome: 500, cashback: '12,5 %',cashbackMin: 2500 },
};

// Netto-Preis und MwSt berechnen (19%)
function calcNet(brutto) {
  const net = Math.round((brutto / 1.19) * 100) / 100;
  const tax = Math.round((brutto - net) * 100) / 100;
  return { net, tax };
}

// ─── ID-Generator ─────────────────────────────────────────────────────────────
function generatePassword(len = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const arr   = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => chars[b % chars.length]).join('');
}

function generateMemberNo(level) {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `AA-L${level}-${year}-${rand}`;
}

function generateInvoiceNo() {
  const year  = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const rand  = Math.floor(1000 + Math.random() * 9000);
  return `RE-${year}${month}-${rand}`;
}

function formatDate(d) {
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Gemeinsamer E-Mail-Header (Logo + Nav-Strip) ────────────────────────────
const emailHeader = `
<table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(180deg,#0f0f0f 0%,#0a0a0a 100%);border-bottom:1px solid #1e1e1e;">
  <tr><td style="padding:28px 40px;text-align:center;">
    <table cellpadding="0" cellspacing="0" style="display:inline-table;border:2px solid #D4A017;border-radius:10px;padding:9px 20px;">
      <tr><td style="color:#D4A017;font-size:19px;font-weight:900;letter-spacing:-0.5px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">alex autoshop</td></tr>
    </table>
    <p style="color:#444;font-size:10px;margin:7px 0 0;letter-spacing:2.5px;text-transform:uppercase;font-family:-apple-system,sans-serif;">Lackierprodukte · Autoteile · Werkstattbedarf · Wuppertal</p>
  </td></tr>
</table>`;

// ─── Gemeinsamer E-Mail-Footer ────────────────────────────────────────────────
const emailFooter = `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;border-top:1px solid #1a1a1a;">
  <tr><td style="padding:32px 40px;text-align:center;">
    <p style="color:#D4A017;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 10px;font-family:-apple-system,sans-serif;">Alex Autoshop</p>
    <p style="color:#333;font-size:12px;margin:0 0 6px;line-height:1.8;font-family:-apple-system,sans-serif;">
      Handelstraße 64 · 42277 Wuppertal · Deutschland<br>
      Tel: <a href="tel:020282690" style="color:#444;text-decoration:none;">0202 82690</a> ·
      E-Mail: <a href="mailto:info@alex-autoshop.de" style="color:#444;text-decoration:none;">info@alex-autoshop.de</a>
    </p>
    <p style="color:#2a2a2a;font-size:11px;margin:12px 0 0;font-family:-apple-system,sans-serif;">
      Öffnungszeiten: Mo–Fr 9–17:30 Uhr · Sa 9–14 Uhr<br>
      Inhaber: Alexander Haritopoulos · USt-IdNr.: DE [EINTRAGEN] · Steuernr.: [EINTRAGEN]
    </p>
    <p style="color:#222;font-size:10px;margin:14px 0 0;font-family:-apple-system,sans-serif;">
      Diese E-Mail wurde automatisch generiert. Bitte antworte nicht direkt auf diese E-Mail —<br>
      schreib uns stattdessen an <a href="mailto:info@alex-autoshop.de" style="color:#333;text-decoration:none;">info@alex-autoshop.de</a>
    </p>
  </td></tr>
</table>`;

// ─── EMAIL 1: Verifikation ─────────────────────────────────────────────────────
function buildVerificationEmail(verifyUrl) {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>E-Mail bestätigen — Alex Autoshop</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#0a0a0a;border-radius:20px;overflow:hidden;border:1px solid #1e1e1e;">

  ${emailHeader}

  <!-- Body -->
  <tr><td style="padding:52px 40px;text-align:center;background:#0d0d0d;">
    <!-- Icon -->
    <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
      <tr><td style="width:72px;height:72px;background:rgba(212,160,23,0.1);border:1px solid rgba(212,160,23,0.3);border-radius:50%;text-align:center;vertical-align:middle;">
        <span style="font-size:32px;line-height:72px;">✉️</span>
      </td></tr>
    </table>

    <h1 style="color:#ffffff;font-size:28px;font-weight:800;margin:0 0 14px;letter-spacing:-0.5px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">E-Mail bestätigen</h1>
    <p style="color:#666;font-size:15px;line-height:1.8;margin:0 0 36px;max-width:440px;margin-left:auto;margin-right:auto;font-family:-apple-system,sans-serif;">
      Du hast gerade eine Mitgliedschaft bei Alex Autoshop beantragt.<br>
      Bitte bestätige deine E-Mail-Adresse um fortzufahren.
    </p>

    <!-- CTA Button -->
    <table cellpadding="0" cellspacing="0" style="margin:0 auto 36px;">
      <tr><td style="background:#D4A017;border-radius:12px;padding:16px 48px;box-shadow:0 4px 24px rgba(212,160,23,0.3);">
        <a href="${verifyUrl}" style="color:#000000;font-size:16px;font-weight:800;text-decoration:none;letter-spacing:0.3px;font-family:-apple-system,sans-serif;">
          E-Mail bestätigen →
        </a>
      </td></tr>
    </table>

    <!-- Divider -->
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="border-top:1px solid #1e1e1e;"></td>
      <td style="padding:0 16px;color:#333;font-size:12px;white-space:nowrap;font-family:-apple-system,sans-serif;">oder direkt öffnen</td>
      <td style="border-top:1px solid #1e1e1e;"></td>
    </tr></table>

    <p style="color:#333;font-size:11px;margin:16px 0 0;word-break:break-all;font-family:Courier New,monospace;">${verifyUrl}</p>

    <p style="color:#2e2e2e;font-size:12px;margin:28px 0 0;line-height:1.7;font-family:-apple-system,sans-serif;">
      ⏳ Dieser Link ist <strong style="color:#444;">24 Stunden</strong> gültig.<br>
      Falls du keine Anfrage gestellt hast, ignoriere diese E-Mail einfach.
    </p>
  </td></tr>

  ${emailFooter}

</table>
</td></tr>
</table>
</body></html>`;
}

// ─── EMAIL 2: Willkommen + Zugangsdaten + Rechnung ───────────────────────────
function buildWelcomeEmail({ email, password, level, modules, price, memberNo, invoiceNo, invoiceDate, dueDateStr }) {
  const info     = LEVEL_INFO[level] ?? { name: `Level ${level}`, tagline: '', discount: 0, welcome: 0 };
  const modList  = (modules && modules.length) ? modules.join(', ') : 'Basis (kein Modul)';
  const isBasis  = !modules || modules.length === 0;
  const { net, tax } = calcNet(price);
  const discount = isBasis ? 10 : info.discount;

  const featureRows = [
    `<tr><td style="color:#aaa;font-size:13px;padding:5px 0;font-family:-apple-system,sans-serif;">✓&nbsp; ${discount}% Rabatt auf alle aktiven Kategorien ab sofort</td></tr>`,
    `<tr><td style="color:#aaa;font-size:13px;padding:5px 0;font-family:-apple-system,sans-serif;">✓&nbsp; NRW Tageslieferung bis 14:00 Uhr (3 Touren täglich)</td></tr>`,
    `<tr><td style="color:#aaa;font-size:13px;padding:5px 0;font-family:-apple-system,sans-serif;">✓&nbsp; Wuppertal-Express in ~1 Stunde</td></tr>`,
    info.welcome ? `<tr><td style="color:#D4A017;font-size:13px;padding:5px 0;font-family:-apple-system,sans-serif;">🎁&nbsp; Willkommensgeschenk ${info.welcome} € auf deine erste Bestellung</td></tr>` : '',
    `<tr><td style="color:#aaa;font-size:13px;padding:5px 0;font-family:-apple-system,sans-serif;">✓&nbsp; Preisschutz ab Mitgliedschaftsstart (eingefroren für immer)</td></tr>`,
    modules && modules.includes('Autoteile') ? `<tr><td style="color:#aaa;font-size:13px;padding:5px 0;font-family:-apple-system,sans-serif;">✓&nbsp; ${info.cashback} Cashback ab ${info.cashbackMin?.toLocaleString('de-DE')} € Teileumsatz/Monat</td></tr>` : '',
    level >= 2 ? `<tr><td style="color:#aaa;font-size:13px;padding:5px 0;font-family:-apple-system,sans-serif;">✓&nbsp; Gratis Wunschfarbe (${level === 2 ? '1 L' : '2 L'}) jeden Monat</td></tr>` : '',
    level >= 2 ? `<tr><td style="color:#aaa;font-size:13px;padding:5px 0;font-family:-apple-system,sans-serif;">✓&nbsp; Farbfehlerschutz — Neumischung auf unsere Kosten</td></tr>` : '',
    level >= 3 ? `<tr><td style="color:#aaa;font-size:13px;padding:5px 0;font-family:-apple-system,sans-serif;">✓&nbsp; Kundenvermittlung im Alex-Werkstattnetzwerk</td></tr>` : '',
    level >= 3 ? `<tr><td style="color:#aaa;font-size:13px;padding:5px 0;font-family:-apple-system,sans-serif;">✓&nbsp; Bevorzugte VIP-Auftragsbearbeitung</td></tr>` : '',
  ].filter(Boolean).join('\n');

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Willkommen bei Alex Autoshop — ${info.name}</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#0a0a0a;border-radius:20px;overflow:hidden;border:1px solid #1e1e1e;">

  ${emailHeader}

  <!-- ① HERO BANNER -->
  <tr><td style="background:linear-gradient(135deg,#1a1200 0%,#111100 50%,#0d0d0d 100%);padding:44px 40px 36px;text-align:center;border-bottom:2px solid #D4A017;">
    <p style="color:#D4A017;font-size:10px;letter-spacing:3.5px;text-transform:uppercase;margin:0 0 12px;font-family:-apple-system,sans-serif;">Mitgliedschaft bestätigt</p>
    <h1 style="color:#ffffff;font-size:32px;font-weight:900;margin:0 0 6px;letter-spacing:-1px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">${info.name}</h1>
    <p style="color:#888;font-size:14px;margin:0 0 22px;font-family:-apple-system,sans-serif;">${info.tagline}</p>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr><td style="background:rgba(212,160,23,0.12);border:1px solid rgba(212,160,23,0.5);border-radius:10px;padding:10px 26px;">
        <span style="color:#D4A017;font-size:26px;font-weight:800;font-family:-apple-system,sans-serif;">${price},00 € / Monat</span>
      </td></tr>
    </table>
    <p style="color:#3a3a3a;font-size:11px;margin:10px 0 0;font-family:-apple-system,sans-serif;">Mitgliedsnr.: <strong style="color:#555;">${memberNo}</strong></p>
  </td></tr>

  <!-- ② ZUGANGSDATEN -->
  <tr><td style="background:#0d0d0d;padding:36px 40px;border-bottom:1px solid #161616;">
    <h2 style="color:#fff;font-size:16px;font-weight:700;margin:0 0 20px;font-family:-apple-system,sans-serif;">🔑 Deine Zugangsdaten</h2>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#141414;border:1px solid #2a2a2a;border-radius:10px 10px 0 0;padding:16px 20px;border-bottom:1px solid #1a1a1a;">
          <p style="color:#555;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 5px;font-family:-apple-system,sans-serif;">E-Mail-Adresse</p>
          <p style="color:#ffffff;font-size:15px;font-weight:600;margin:0;font-family:-apple-system,sans-serif;">${email}</p>
        </td>
      </tr>
      <tr>
        <td style="background:#141414;border:1px solid #2a2a2a;border-top:0;border-radius:0 0 10px 10px;padding:16px 20px;">
          <p style="color:#555;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 5px;font-family:-apple-system,sans-serif;">Temporäres Passwort — bitte nach Login ändern</p>
          <p style="color:#D4A017;font-size:22px;font-weight:700;font-family:'Courier New',Courier,monospace;letter-spacing:4px;margin:0;">${password}</p>
        </td>
      </tr>
    </table>
    <p style="color:#333;font-size:12px;margin:10px 0 22px;line-height:1.7;font-family:-apple-system,sans-serif;">
      Bitte ändere dein Passwort nach dem ersten Login unter <strong style="color:#555;">Konto → Einstellungen</strong>.
    </p>
    <table cellpadding="0" cellspacing="0">
      <tr><td style="background:#D4A017;border-radius:10px;padding:14px 36px;box-shadow:0 4px 20px rgba(212,160,23,0.25);">
        <a href="${LOGIN_URL}" style="color:#000;font-size:15px;font-weight:800;text-decoration:none;font-family:-apple-system,sans-serif;">Jetzt einloggen →</a>
      </td></tr>
    </table>
  </td></tr>

  <!-- ③ MITGLIEDSCHAFT-ÜBERSICHT -->
  <tr><td style="background:#0d0d0d;padding:36px 40px;border-bottom:1px solid #161616;">
    <h2 style="color:#fff;font-size:16px;font-weight:700;margin:0 0 18px;font-family:-apple-system,sans-serif;">📦 Deine Mitgliedschaft auf einen Blick</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;overflow:hidden;border:1px solid #222;">
      <tr style="background:#141414;">
        <td style="color:#555;font-size:12px;padding:12px 18px;font-family:-apple-system,sans-serif;">Paket</td>
        <td style="color:#fff;font-size:13px;font-weight:600;text-align:right;padding:12px 18px;font-family:-apple-system,sans-serif;">${info.name} — ${info.tagline}</td>
      </tr>
      <tr style="background:#111;border-top:1px solid #1e1e1e;">
        <td style="color:#555;font-size:12px;padding:12px 18px;font-family:-apple-system,sans-serif;">Aktive Module</td>
        <td style="color:#D4A017;font-size:13px;font-weight:600;text-align:right;padding:12px 18px;font-family:-apple-system,sans-serif;">${modList}</td>
      </tr>
      <tr style="background:#141414;border-top:1px solid #1e1e1e;">
        <td style="color:#555;font-size:12px;padding:12px 18px;font-family:-apple-system,sans-serif;">Rabatt</td>
        <td style="color:#fff;font-size:13px;font-weight:600;text-align:right;padding:12px 18px;font-family:-apple-system,sans-serif;">${discount}% auf alle aktiven Kategorien</td>
      </tr>
      <tr style="background:#111;border-top:1px solid #1e1e1e;">
        <td style="color:#555;font-size:12px;padding:12px 18px;font-family:-apple-system,sans-serif;">Mitgliedsnummer</td>
        <td style="color:#fff;font-size:13px;font-weight:600;text-align:right;padding:12px 18px;font-family:Courier New,monospace;">${memberNo}</td>
      </tr>
      <tr style="background:#141414;border-top:1px solid #1e1e1e;">
        <td style="color:#555;font-size:12px;padding:12px 18px;font-family:-apple-system,sans-serif;">Startdatum</td>
        <td style="color:#fff;font-size:13px;font-weight:600;text-align:right;padding:12px 18px;font-family:-apple-system,sans-serif;">${invoiceDate} (nach Zahlungseingang)</td>
      </tr>
    </table>
  </td></tr>

  <!-- ④ WAS DICH ERWARTET -->
  <tr><td style="background:#0d0d0d;padding:36px 40px;border-bottom:1px solid #161616;">
    <h2 style="color:#fff;font-size:16px;font-weight:700;margin:0 0 16px;font-family:-apple-system,sans-serif;">⚡ Was dich ab Tag 1 erwartet</h2>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${featureRows}
    </table>
  </td></tr>

  <!-- ⑤ BEZAHLUNG -->
  <tr><td style="background:#0d0d0d;padding:36px 40px;border-bottom:1px solid #161616;">
    <h2 style="color:#fff;font-size:16px;font-weight:700;margin:0 0 8px;font-family:-apple-system,sans-serif;">💳 Bezahlung</h2>
    <p style="color:#555;font-size:13px;margin:0 0 20px;line-height:1.7;font-family:-apple-system,sans-serif;">
      Deine Mitgliedschaft wird <strong style="color:#888;">innerhalb von 1 Werktag</strong> nach Zahlungseingang freigeschaltet.
    </p>

    <!-- Banküberweisung -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222;border-radius:12px;margin-bottom:14px;">
      <tr><td style="padding:22px 24px;">
        <p style="color:#D4A017;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px;font-family:-apple-system,sans-serif;">🏦 Banküberweisung</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#444;font-size:12px;padding:4px 0;font-family:-apple-system,sans-serif;">Empfänger</td>
            <td style="color:#ccc;font-size:13px;font-weight:600;text-align:right;font-family:-apple-system,sans-serif;">Alexander Haritopoulos</td>
          </tr>
          <tr>
            <td style="color:#444;font-size:12px;padding:4px 0;font-family:-apple-system,sans-serif;">IBAN</td>
            <td style="color:#D4A017;font-size:13px;font-weight:600;text-align:right;font-family:Courier New,monospace;">Auf Anfrage: 0202 82690</td>
          </tr>
          <tr>
            <td style="color:#444;font-size:12px;padding:4px 0;font-family:-apple-system,sans-serif;">Verwendungszweck</td>
            <td style="color:#ccc;font-size:12px;font-weight:600;text-align:right;font-family:Courier New,monospace;">${invoiceNo} · ${email}</td>
          </tr>
          <tr>
            <td style="color:#444;font-size:12px;padding:8px 0 0;font-family:-apple-system,sans-serif;">Betrag</td>
            <td style="color:#D4A017;font-size:18px;font-weight:800;text-align:right;padding:8px 0 0;font-family:-apple-system,sans-serif;">${price},00 €</td>
          </tr>
        </table>
      </td></tr>
    </table>

    <!-- Online -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222;border-radius:12px;">
      <tr><td style="padding:22px 24px;">
        <p style="color:#D4A017;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;font-family:-apple-system,sans-serif;">🛒 Online bezahlen — Kreditkarte / PayPal</p>
        <p style="color:#444;font-size:13px;margin:0 0 16px;font-family:-apple-system,sans-serif;">Direkt und sicher über unseren verifizierten Shopify Checkout:</p>
        <table cellpadding="0" cellspacing="0">
          <tr><td style="background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:11px 22px;">
            <a href="${SHOP_URL}" style="color:#fff;font-size:13px;font-weight:700;text-decoration:none;font-family:-apple-system,sans-serif;">Zum sicheren Checkout →</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <!-- ⑥ PROFORMA-RECHNUNG ────────────────────────────────────────────── -->
  <tr><td style="background:#080808;padding:36px 40px;border-bottom:1px solid #161616;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #2a2a2a;border-radius:14px;overflow:hidden;">

      <!-- Rechnung Header -->
      <tr><td style="background:linear-gradient(90deg,#111 0%,#0d0d0d 100%);padding:24px 28px;border-bottom:1px solid #222;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <p style="color:#D4A017;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px;font-family:-apple-system,sans-serif;">Proforma-Rechnung</p>
              <p style="color:#fff;font-size:18px;font-weight:800;margin:0;font-family:-apple-system,sans-serif;">${invoiceNo}</p>
            </td>
            <td style="text-align:right;vertical-align:top;">
              <p style="color:#555;font-size:11px;margin:0 0 3px;font-family:-apple-system,sans-serif;">Ausgestellt am</p>
              <p style="color:#ccc;font-size:13px;font-weight:600;margin:0;font-family:-apple-system,sans-serif;">${invoiceDate}</p>
              <p style="color:#555;font-size:11px;margin:6px 0 3px;font-family:-apple-system,sans-serif;">Zahlungsziel</p>
              <p style="color:#D4A017;font-size:13px;font-weight:600;margin:0;font-family:-apple-system,sans-serif;">${dueDateStr}</p>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Absender & Empfänger -->
      <tr><td style="padding:22px 28px;border-bottom:1px solid #1a1a1a;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:50%;vertical-align:top;">
              <p style="color:#D4A017;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 8px;font-family:-apple-system,sans-serif;">Rechnungssteller</p>
              <p style="color:#ccc;font-size:12px;line-height:1.9;margin:0;font-family:-apple-system,sans-serif;">
                <strong style="color:#fff;">Alex Autoshop</strong><br>
                Alexander Haritopoulos<br>
                Handelstraße 64<br>
                42277 Wuppertal<br>
                Tel: 0202 82690<br>
                info@alex-autoshop.de
              </p>
            </td>
            <td style="width:50%;vertical-align:top;padding-left:24px;">
              <p style="color:#D4A017;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 8px;font-family:-apple-system,sans-serif;">Rechnungsempfänger</p>
              <p style="color:#ccc;font-size:12px;line-height:1.9;margin:0;font-family:-apple-system,sans-serif;">
                <strong style="color:#fff;">${email}</strong><br>
                Mitgliedsnr.: ${memberNo}
              </p>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Positionen -->
      <tr><td style="padding:22px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <!-- Kopfzeile -->
          <tr style="background:#111;border-radius:6px;">
            <td style="color:#444;font-size:10px;text-transform:uppercase;letter-spacing:1px;padding:10px 12px;font-family:-apple-system,sans-serif;">Beschreibung</td>
            <td style="color:#444;font-size:10px;text-transform:uppercase;letter-spacing:1px;padding:10px 12px;text-align:center;font-family:-apple-system,sans-serif;">Menge</td>
            <td style="color:#444;font-size:10px;text-transform:uppercase;letter-spacing:1px;padding:10px 12px;text-align:right;font-family:-apple-system,sans-serif;">Betrag</td>
          </tr>
          <!-- Position 1 -->
          <tr style="border-top:1px solid #1a1a1a;">
            <td style="padding:14px 12px;vertical-align:top;">
              <p style="color:#fff;font-size:13px;font-weight:600;margin:0 0 4px;font-family:-apple-system,sans-serif;">Mitgliedschaft ${info.name} — Monatsbeitrag</p>
              <p style="color:#444;font-size:11px;margin:0;font-family:-apple-system,sans-serif;">Module: ${modList}</p>
              <p style="color:#444;font-size:11px;margin:2px 0 0;font-family:-apple-system,sans-serif;">Mitgliedsnr.: ${memberNo}</p>
            </td>
            <td style="color:#888;font-size:13px;padding:14px 12px;text-align:center;vertical-align:top;font-family:-apple-system,sans-serif;">1 Monat</td>
            <td style="color:#fff;font-size:13px;font-weight:600;padding:14px 12px;text-align:right;vertical-align:top;font-family:-apple-system,sans-serif;">${net.toFixed(2).replace('.', ',')} €</td>
          </tr>
          <!-- Summen -->
          <tr style="border-top:1px solid #222;">
            <td colspan="2" style="color:#444;font-size:12px;padding:10px 12px;text-align:right;font-family:-apple-system,sans-serif;">Nettobetrag</td>
            <td style="color:#888;font-size:12px;padding:10px 12px;text-align:right;font-family:-apple-system,sans-serif;">${net.toFixed(2).replace('.', ',')} €</td>
          </tr>
          <tr>
            <td colspan="2" style="color:#444;font-size:12px;padding:4px 12px;text-align:right;font-family:-apple-system,sans-serif;">MwSt 19%</td>
            <td style="color:#888;font-size:12px;padding:4px 12px;text-align:right;font-family:-apple-system,sans-serif;">${tax.toFixed(2).replace('.', ',')} €</td>
          </tr>
          <tr style="border-top:2px solid #D4A017;">
            <td colspan="2" style="color:#fff;font-size:15px;font-weight:800;padding:14px 12px;text-align:right;font-family:-apple-system,sans-serif;">Gesamtbetrag (brutto)</td>
            <td style="color:#D4A017;font-size:17px;font-weight:800;padding:14px 12px;text-align:right;font-family:-apple-system,sans-serif;">${price},00 €</td>
          </tr>
        </table>

        <p style="color:#2e2e2e;font-size:11px;margin:18px 0 0;line-height:1.7;font-family:-apple-system,sans-serif;">
          Dies ist eine Proforma-Rechnung. Die offizielle Rechnung erhältst du nach Zahlungseingang und Freischaltung per E-Mail.<br>
          Zahlungsziel: <strong style="color:#444;">${dueDateStr}</strong> · Rechnungsnummer bitte immer als Verwendungszweck angeben.
        </p>
      </td></tr>
    </table>
  </td></tr>

  <!-- ⑦ KONTAKT-BOX -->
  <tr><td style="background:#0d0d0d;padding:28px 40px;border-bottom:1px solid #161616;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(212,160,23,0.06);border:1px solid rgba(212,160,23,0.18);border-radius:12px;padding:22px 24px;">
      <tr><td>
        <p style="color:#D4A017;font-size:13px;font-weight:700;margin:0 0 10px;font-family:-apple-system,sans-serif;">Fragen? Wir sind für dich da.</p>
        <p style="color:#666;font-size:13px;margin:0;line-height:1.9;font-family:-apple-system,sans-serif;">
          📞 <a href="tel:020282690" style="color:#888;text-decoration:none;font-weight:600;">0202 82690</a>&nbsp;&nbsp;·&nbsp;&nbsp;
          ✉️ <a href="mailto:info@alex-autoshop.de" style="color:#888;text-decoration:none;font-weight:600;">info@alex-autoshop.de</a><br>
          🕐 Mo–Fr 9–17:30 Uhr · Sa 9–14 Uhr&nbsp;&nbsp;·&nbsp;&nbsp;
          📍 Handelstraße 64, 42277 Wuppertal
        </p>
      </td></tr>
    </table>
  </td></tr>

  ${emailFooter}

</table>
</td></tr>
</table>
</body></html>`;
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
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  let body;
  try { body = await req.json(); }
  catch { return jsonError('Ungültiger Request-Body', 400); }

  const { email, level, modules = [], price } = body;
  if (!email || !level) return jsonError('email und level sind erforderlich', 400);
  if (!RESEND_API_KEY)  return jsonError('RESEND_API_KEY nicht konfiguriert — bitte in Vercel Environment Variables eintragen', 500);

  const tempPassword = generatePassword(10);
  const memberNo     = generateMemberNo(level);
  const invoiceNo    = generateInvoiceNo();
  const now          = new Date();
  const dueDate      = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // +14 Tage
  const invoiceDate  = formatDate(now);
  const dueDateStr   = formatDate(dueDate);

  // ── Supabase: User anlegen + Request speichern ─────────────────────────────
  let verifyUrl = `${LOGIN_URL}?email=${encodeURIComponent(email)}`;

  if (SUPABASE_URL && SUPABASE_SVC_KEY) {
    try {
      const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'apikey':        SUPABASE_SVC_KEY,
          'Authorization': `Bearer ${SUPABASE_SVC_KEY}`,
        },
        body: JSON.stringify({
          email,
          password:       tempPassword,
          email_confirm:  false,
          user_metadata:  { level, modules, member_no: memberNo, role: 'member' },
        }),
      });

      if (createRes.ok) {
        // Magic-Link generieren
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
          const d = await linkRes.json();
          if (d.action_link) verifyUrl = d.action_link;
        }
      }

      // Mitgliedschaftsantrag speichern
      await fetch(`${SUPABASE_URL}/rest/v1/membership_requests`, {
        method:  'POST',
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
          status:    'pending',
          member_no: memberNo,
        }),
      });
    } catch (e) {
      console.error('Supabase (non-fatal):', e?.message);
    }
  }

  // ── Email 1: Verifikation ──────────────────────────────────────────────────
  const r1 = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:     FROM_EMAIL,
      reply_to: REPLY_TO,
      to:       [email],
      subject:  '✉️ Bitte bestätige deine E-Mail — Alex Autoshop',
      html:     buildVerificationEmail(verifyUrl),
    }),
  });
  if (!r1.ok) return jsonError(`Resend Fehler (Email 1): ${await r1.text()}`, 502);

  // ── Email 2: Willkommen + Zugangsdaten + Proforma-Rechnung ────────────────
  const r2 = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:     FROM_EMAIL,
      reply_to: REPLY_TO,
      to:       [email],
      subject:  `🔑 Willkommen & Zugangsdaten — Alex Autoshop ${LEVEL_INFO[level]?.name ?? `Level ${level}`}`,
      html:     buildWelcomeEmail({ email, password: tempPassword, level, modules, price, memberNo, invoiceNo, invoiceDate, dueDateStr }),
    }),
  });
  if (!r2.ok) return jsonError(`Resend Fehler (Email 2): ${await r2.text()}`, 502);

  return new Response(
    JSON.stringify({ ok: true, memberNo, invoiceNo }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    }
  );
}

function jsonError(msg, status = 500) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
