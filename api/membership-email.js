export const config = { runtime: 'edge' };

// ─── Config ──────────────────────────────────────────────────────────────────
const RESEND_API_KEY   = process.env.RESEND_API_KEY;
const SUPABASE_URL     = process.env.VITE_SUPABASE_URL;
const SUPABASE_SVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FROM_EMAIL       = 'Alex Autoshop <mitgliedschaft@alex-autoshop.de>';
const REPLY_TO         = 'info@alex-autoshop.de';
const LOGIN_URL        = 'https://www.alex-autoshop.de/konto';
const SHOP_URL         = 'https://www.alex-autoshop.de/shop';
const SITE_URL         = 'https://www.alex-autoshop.de';

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

// ─── Brand tokens (matching alex-autoshop.de website) ────────────────────────
const BRAND = {
  night:      '#0D0D0D',
  surface:    '#141414',
  surfaceAlt: '#111111',
  border:     '#222222',
  borderSub:  '#1a1a1a',
  gold:       '#f1eb5b',   // gold.bright — accent on dark bg
  goldMuted:  '#a89e3a',   // dimmed gold for secondary text
  text:       '#EDE9E3',   // section-dark body text
  textMuted:  '#888888',
  textDim:    '#444444',
  fontHead:   "'Syne', system-ui, sans-serif",
  fontBody:   "'DM Sans', system-ui, sans-serif",
};

// ─── Gemeinsamer E-Mail-Header ────────────────────────────────────────────────
const emailHeader = `
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.night};border-bottom:1px solid ${BRAND.border};">
  <tr><td style="padding:28px 40px 20px;text-align:center;">
    <a href="https://www.alex-autoshop.de" style="display:inline-block;text-decoration:none;">
      <img src="https://www.alex-autoshop.de/images/logo-cropped.png" alt="Alex Autoshop" width="150" style="height:auto;display:block;margin:0 auto;" />
    </a>
    <p style="color:${BRAND.textDim};font-size:9px;margin:10px 0 0;letter-spacing:3px;text-transform:uppercase;font-family:${BRAND.fontBody};">Lackierprodukte &nbsp;·&nbsp; Autoteile &nbsp;·&nbsp; Werkstattbedarf &nbsp;·&nbsp; Wuppertal</p>
  </td></tr>
</table>`;

// ─── Gemeinsamer E-Mail-Footer ────────────────────────────────────────────────
const emailFooter = `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;border-top:1px solid ${BRAND.border};">
  <tr><td style="padding:36px 40px;text-align:center;">
    <img src="https://www.alex-autoshop.de/images/logo-cropped.png" alt="Alex Autoshop" width="90" style="height:auto;display:block;margin:0 auto 16px;" />
    <p style="color:${BRAND.textDim};font-size:12px;margin:0 0 6px;line-height:1.9;font-family:${BRAND.fontBody};">
      Handelstraße 64 · 42277 Wuppertal · Deutschland<br>
      <a href="tel:020282690" style="color:${BRAND.textDim};text-decoration:none;">0202 82690</a>
      &nbsp;·&nbsp;
      <a href="mailto:info@alex-autoshop.de" style="color:${BRAND.textDim};text-decoration:none;">info@alex-autoshop.de</a>
    </p>
    <p style="color:#2e2e2e;font-size:11px;margin:10px 0 0;line-height:1.8;font-family:${BRAND.fontBody};">
      Mo–Fr 9–17:30 · Sa 9–14 &nbsp;|&nbsp; Inhaber: Alexander Haritopoulos
    </p>
    <p style="color:#252525;font-size:10px;margin:12px 0 0;font-family:${BRAND.fontBody};">
      Automatisch generiert — Antworten bitte an <a href="mailto:info@alex-autoshop.de" style="color:#333;text-decoration:none;">info@alex-autoshop.de</a>
    </p>
  </td></tr>
</table>`;

// ─── EMAIL 1: Verifikation ─────────────────────────────────────────────────────
function buildVerificationEmail(verifyUrl) {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>E-Mail bestätigen — Alex Autoshop</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${BRAND.night};">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.night};padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${BRAND.night};border-radius:16px;overflow:hidden;border:1px solid ${BRAND.border};">

  ${emailHeader}

  <!-- Body -->
  <tr><td style="padding:56px 40px 48px;text-align:center;background:${BRAND.surfaceAlt};">

    <!-- Akzent-Linie oben -->
    <table width="60" cellpadding="0" cellspacing="0" style="margin:0 auto 36px;">
      <tr><td style="height:3px;background:${BRAND.gold};border-radius:2px;"></td></tr>
    </table>

    <h1 style="color:#ffffff;font-size:30px;font-weight:800;margin:0 0 16px;letter-spacing:-0.04em;font-family:${BRAND.fontHead};">E-Mail bestätigen</h1>
    <p style="color:${BRAND.textMuted};font-size:15px;line-height:1.8;margin:0 0 40px;max-width:400px;margin-left:auto;margin-right:auto;font-family:${BRAND.fontBody};">
      Du hast gerade eine Mitgliedschaft bei Alex Autoshop beantragt.
      Bestätige deine E-Mail-Adresse um fortzufahren.
    </p>

    <!-- CTA Button -->
    <table cellpadding="0" cellspacing="0" style="margin:0 auto 40px;">
      <tr><td style="background:${BRAND.gold};border-radius:10px;padding:15px 44px;">
        <a href="${verifyUrl}" style="color:${BRAND.night};font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.2px;font-family:${BRAND.fontBody};">
          E-Mail bestätigen →
        </a>
      </td></tr>
    </table>

    <!-- Divider -->
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="border-top:1px solid ${BRAND.border};"></td>
      <td style="padding:0 14px;color:${BRAND.textDim};font-size:11px;white-space:nowrap;font-family:${BRAND.fontBody};">oder direkt öffnen</td>
      <td style="border-top:1px solid ${BRAND.border};"></td>
    </tr></table>

    <p style="color:#2e2e2e;font-size:11px;margin:16px 0 0;word-break:break-all;font-family:'Courier New',monospace;">${verifyUrl}</p>

    <p style="color:#303030;font-size:12px;margin:28px 0 0;line-height:1.8;font-family:${BRAND.fontBody};">
      Dieser Link ist <strong style="color:${BRAND.textDim};">24 Stunden</strong> gültig.<br>
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
  const B = BRAND; // shorthand

  const featureRows = [
    `<tr><td style="color:${B.textMuted};font-size:14px;padding:7px 0;border-bottom:1px solid ${B.border};font-family:${B.fontBody};"><span style="color:${B.gold};margin-right:8px;">✓</span>${discount}% Rabatt auf alle aktiven Kategorien ab sofort</td></tr>`,
    `<tr><td style="color:${B.textMuted};font-size:14px;padding:7px 0;border-bottom:1px solid ${B.border};font-family:${B.fontBody};"><span style="color:${B.gold};margin-right:8px;">✓</span>NRW Tageslieferung bis 14:00 Uhr (3 Touren täglich)</td></tr>`,
    `<tr><td style="color:${B.textMuted};font-size:14px;padding:7px 0;border-bottom:1px solid ${B.border};font-family:${B.fontBody};"><span style="color:${B.gold};margin-right:8px;">✓</span>Wuppertal-Express in ~1 Stunde</td></tr>`,
    info.welcome ? `<tr><td style="color:${B.gold};font-size:14px;padding:7px 0;border-bottom:1px solid ${B.border};font-family:${B.fontBody};font-weight:600;">🎁 Willkommensgeschenk ${info.welcome} € auf deine erste Bestellung</td></tr>` : '',
    `<tr><td style="color:${B.textMuted};font-size:14px;padding:7px 0;border-bottom:1px solid ${B.border};font-family:${B.fontBody};"><span style="color:${B.gold};margin-right:8px;">✓</span>Preisschutz ab Mitgliedschaftsstart (eingefroren für immer)</td></tr>`,
    modules && modules.includes('Autoteile') ? `<tr><td style="color:${B.textMuted};font-size:14px;padding:7px 0;border-bottom:1px solid ${B.border};font-family:${B.fontBody};"><span style="color:${B.gold};margin-right:8px;">✓</span>${info.cashback} Cashback ab ${info.cashbackMin?.toLocaleString('de-DE')} € Teileumsatz/Monat</td></tr>` : '',
    level >= 2 ? `<tr><td style="color:${B.textMuted};font-size:14px;padding:7px 0;border-bottom:1px solid ${B.border};font-family:${B.fontBody};"><span style="color:${B.gold};margin-right:8px;">✓</span>Gratis Wunschfarbe (${level === 2 ? '1 L' : '2 L'}) jeden Monat</td></tr>` : '',
    level >= 2 ? `<tr><td style="color:${B.textMuted};font-size:14px;padding:7px 0;border-bottom:1px solid ${B.border};font-family:${B.fontBody};"><span style="color:${B.gold};margin-right:8px;">✓</span>Farbfehlerschutz — Neumischung auf unsere Kosten</td></tr>` : '',
    level >= 3 ? `<tr><td style="color:${B.textMuted};font-size:14px;padding:7px 0;border-bottom:1px solid ${B.border};font-family:${B.fontBody};"><span style="color:${B.gold};margin-right:8px;">✓</span>Kundenvermittlung im Alex-Werkstattnetzwerk</td></tr>` : '',
    level >= 3 ? `<tr><td style="color:${B.textMuted};font-size:14px;padding:7px 0;font-family:${B.fontBody};"><span style="color:${B.gold};margin-right:8px;">✓</span>Bevorzugte VIP-Auftragsbearbeitung</td></tr>` : '',
  ].filter(Boolean).join('\n');

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Willkommen bei Alex Autoshop — ${info.name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${B.night};">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${B.night};padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${B.night};border-radius:20px;overflow:hidden;border:1px solid ${B.border};">

  ${emailHeader}

  <!-- ① HERO BANNER -->
  <tr><td style="background:linear-gradient(135deg,#111008 0%,#0e0e0a 50%,${B.night} 100%);padding:44px 40px 36px;text-align:center;border-bottom:2px solid ${B.gold};">
    <p style="color:${B.gold};font-size:10px;letter-spacing:3.5px;text-transform:uppercase;margin:0 0 12px;font-family:${B.fontBody};">Mitgliedschaft bestätigt</p>
    <h1 style="color:#ffffff;font-size:34px;font-weight:900;margin:0 0 6px;letter-spacing:-1.5px;font-family:${B.fontHead};">${info.name}</h1>
    <p style="color:${B.textMuted};font-size:14px;margin:0 0 22px;font-family:${B.fontBody};">${info.tagline}</p>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr><td style="background:rgba(241,235,91,0.1);border:1px solid rgba(241,235,91,0.35);border-radius:10px;padding:10px 26px;">
        <span style="color:${B.gold};font-size:26px;font-weight:800;font-family:${B.fontHead};">${price},00 € / Monat</span>
      </td></tr>
    </table>
    <p style="color:${B.textDim};font-size:11px;margin:10px 0 0;font-family:${B.fontBody};">Mitgliedsnr.: <strong style="color:#555;">${memberNo}</strong></p>
  </td></tr>

  <!-- ② ZUGANGSDATEN -->
  <tr><td style="background:${B.surface};padding:36px 40px;border-bottom:1px solid ${B.borderSub};">
    <h2 style="color:#fff;font-size:18px;font-weight:800;margin:0 0 20px;letter-spacing:-0.5px;font-family:${B.fontHead};">Deine Zugangsdaten</h2>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:${B.surfaceAlt};border:1px solid ${B.border};border-radius:10px 10px 0 0;padding:16px 20px;border-bottom:1px solid ${B.borderSub};">
          <p style="color:${B.textDim};font-size:10px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 5px;font-family:${B.fontBody};">E-Mail-Adresse</p>
          <p style="color:#ffffff;font-size:15px;font-weight:600;margin:0;font-family:${B.fontBody};">${email}</p>
        </td>
      </tr>
      <tr>
        <td style="background:${B.surfaceAlt};border:1px solid ${B.border};border-top:0;border-radius:0 0 10px 10px;padding:16px 20px;">
          <p style="color:${B.textDim};font-size:10px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 5px;font-family:${B.fontBody};">Temporäres Passwort — bitte nach Login ändern</p>
          <p style="color:${B.gold};font-size:22px;font-weight:700;font-family:'Courier New',Courier,monospace;letter-spacing:4px;margin:0;">${password}</p>
        </td>
      </tr>
    </table>
    <p style="color:${B.textDim};font-size:12px;margin:10px 0 22px;line-height:1.7;font-family:${B.fontBody};">
      Bitte ändere dein Passwort nach dem ersten Login unter <strong style="color:${B.textMuted};">Konto → Einstellungen</strong>.
    </p>
    <table cellpadding="0" cellspacing="0">
      <tr><td style="background:${B.gold};border-radius:10px;padding:14px 36px;box-shadow:0 4px 24px rgba(241,235,91,0.2);">
        <a href="${LOGIN_URL}" style="color:${B.night};font-size:15px;font-weight:800;text-decoration:none;font-family:${B.fontHead};">Jetzt einloggen →</a>
      </td></tr>
    </table>
  </td></tr>

  <!-- ③ MITGLIEDSCHAFT-ÜBERSICHT -->
  <tr><td style="background:${B.surface};padding:36px 40px;border-bottom:1px solid ${B.borderSub};">
    <h2 style="color:#fff;font-size:18px;font-weight:800;margin:0 0 18px;letter-spacing:-0.5px;font-family:${B.fontHead};">Deine Mitgliedschaft</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;overflow:hidden;border:1px solid ${B.border};">
      <tr style="background:${B.surfaceAlt};">
        <td style="color:${B.textDim};font-size:12px;padding:13px 18px;font-family:${B.fontBody};">Paket</td>
        <td style="color:#fff;font-size:13px;font-weight:600;text-align:right;padding:13px 18px;font-family:${B.fontBody};">${info.name} — ${info.tagline}</td>
      </tr>
      <tr style="background:${B.night};border-top:1px solid ${B.border};">
        <td style="color:${B.textDim};font-size:12px;padding:13px 18px;font-family:${B.fontBody};">Aktive Module</td>
        <td style="color:${B.gold};font-size:13px;font-weight:600;text-align:right;padding:13px 18px;font-family:${B.fontBody};">${modList}</td>
      </tr>
      <tr style="background:${B.surfaceAlt};border-top:1px solid ${B.border};">
        <td style="color:${B.textDim};font-size:12px;padding:13px 18px;font-family:${B.fontBody};">Rabatt</td>
        <td style="color:#fff;font-size:13px;font-weight:600;text-align:right;padding:13px 18px;font-family:${B.fontBody};">${discount}% auf alle aktiven Kategorien</td>
      </tr>
      <tr style="background:${B.night};border-top:1px solid ${B.border};">
        <td style="color:${B.textDim};font-size:12px;padding:13px 18px;font-family:${B.fontBody};">Mitgliedsnummer</td>
        <td style="color:#fff;font-size:13px;font-weight:600;text-align:right;padding:13px 18px;font-family:'Courier New',monospace;">${memberNo}</td>
      </tr>
      <tr style="background:${B.surfaceAlt};border-top:1px solid ${B.border};">
        <td style="color:${B.textDim};font-size:12px;padding:13px 18px;font-family:${B.fontBody};">Startdatum</td>
        <td style="color:#fff;font-size:13px;font-weight:600;text-align:right;padding:13px 18px;font-family:${B.fontBody};">${invoiceDate} (nach Zahlungseingang)</td>
      </tr>
    </table>
  </td></tr>

  <!-- ④ WAS DICH ERWARTET -->
  <tr><td style="background:${B.surface};padding:36px 40px;border-bottom:1px solid ${B.borderSub};">
    <h2 style="color:#fff;font-size:18px;font-weight:800;margin:0 0 16px;letter-spacing:-0.5px;font-family:${B.fontHead};">Was dich ab Tag 1 erwartet</h2>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${featureRows}
    </table>
  </td></tr>

  <!-- ⑤ BEZAHLUNG -->
  <tr><td style="background:${B.surface};padding:36px 40px;border-bottom:1px solid ${B.borderSub};">
    <h2 style="color:#fff;font-size:18px;font-weight:800;margin:0 0 8px;letter-spacing:-0.5px;font-family:${B.fontHead};">Bezahlung</h2>
    <p style="color:${B.textMuted};font-size:13px;margin:0 0 20px;line-height:1.7;font-family:${B.fontBody};">
      Deine Mitgliedschaft wird <strong style="color:${B.text};">innerhalb von 1 Werktag</strong> nach Zahlungseingang freigeschaltet.
    </p>

    <!-- Banküberweisung -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${B.surfaceAlt};border:1px solid ${B.border};border-radius:12px;margin-bottom:14px;">
      <tr><td style="padding:22px 24px;">
        <p style="color:${B.gold};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px;font-family:${B.fontBody};">Banküberweisung</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:${B.textDim};font-size:12px;padding:5px 0;font-family:${B.fontBody};">Empfänger</td>
            <td style="color:${B.text};font-size:13px;font-weight:600;text-align:right;font-family:${B.fontBody};">Alexander Haritopoulos</td>
          </tr>
          <tr>
            <td style="color:${B.textDim};font-size:12px;padding:5px 0;font-family:${B.fontBody};">IBAN</td>
            <td style="color:${B.gold};font-size:13px;font-weight:600;text-align:right;font-family:'Courier New',monospace;">Auf Anfrage: 0202 82690</td>
          </tr>
          <tr>
            <td style="color:${B.textDim};font-size:12px;padding:5px 0;font-family:${B.fontBody};">Verwendungszweck</td>
            <td style="color:${B.text};font-size:12px;font-weight:600;text-align:right;font-family:'Courier New',monospace;">${invoiceNo} · ${email}</td>
          </tr>
          <tr>
            <td style="color:${B.textDim};font-size:12px;padding:10px 0 0;font-family:${B.fontBody};">Betrag</td>
            <td style="color:${B.gold};font-size:20px;font-weight:800;text-align:right;padding:10px 0 0;font-family:${B.fontHead};">${price},00 €</td>
          </tr>
        </table>
      </td></tr>
    </table>

    <!-- Online -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${B.surfaceAlt};border:1px solid ${B.border};border-radius:12px;">
      <tr><td style="padding:22px 24px;">
        <p style="color:${B.gold};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;font-family:${B.fontBody};">Online bezahlen — Kreditkarte / PayPal</p>
        <p style="color:${B.textMuted};font-size:13px;margin:0 0 16px;font-family:${B.fontBody};">Direkt und sicher über unseren verifizierten Shopify Checkout:</p>
        <table cellpadding="0" cellspacing="0">
          <tr><td style="background:${B.night};border:1px solid ${B.border};border-radius:8px;padding:11px 22px;">
            <a href="${SHOP_URL}" style="color:#fff;font-size:13px;font-weight:700;text-decoration:none;font-family:${B.fontBody};">Zum sicheren Checkout →</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <!-- ⑥ PROFORMA-RECHNUNG ────────────────────────────────────────────── -->
  <tr><td style="background:${B.night};padding:36px 40px;border-bottom:1px solid ${B.borderSub};">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${B.surface};border:1px solid ${B.border};border-radius:14px;overflow:hidden;">

      <!-- Rechnung Header -->
      <tr><td style="background:linear-gradient(90deg,${B.surfaceAlt} 0%,${B.surface} 100%);padding:24px 28px;border-bottom:1px solid ${B.border};">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <p style="color:${B.gold};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px;font-family:${B.fontBody};">Proforma-Rechnung</p>
              <p style="color:#fff;font-size:20px;font-weight:800;margin:0;letter-spacing:-0.5px;font-family:${B.fontHead};">${invoiceNo}</p>
            </td>
            <td style="text-align:right;vertical-align:top;">
              <p style="color:${B.textDim};font-size:11px;margin:0 0 3px;font-family:${B.fontBody};">Ausgestellt am</p>
              <p style="color:${B.text};font-size:13px;font-weight:600;margin:0;font-family:${B.fontBody};">${invoiceDate}</p>
              <p style="color:${B.textDim};font-size:11px;margin:6px 0 3px;font-family:${B.fontBody};">Zahlungsziel</p>
              <p style="color:${B.gold};font-size:13px;font-weight:600;margin:0;font-family:${B.fontBody};">${dueDateStr}</p>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Absender & Empfänger -->
      <tr><td style="padding:22px 28px;border-bottom:1px solid ${B.borderSub};">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:50%;vertical-align:top;">
              <p style="color:${B.gold};font-size:10px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 8px;font-family:${B.fontBody};">Rechnungssteller</p>
              <p style="color:${B.textMuted};font-size:12px;line-height:1.9;margin:0;font-family:${B.fontBody};">
                <strong style="color:#fff;">Alex Autoshop</strong><br>
                Alexander Haritopoulos<br>
                Handelstraße 64<br>
                42277 Wuppertal<br>
                Tel: 0202 82690<br>
                info@alex-autoshop.de
              </p>
            </td>
            <td style="width:50%;vertical-align:top;padding-left:24px;">
              <p style="color:${B.gold};font-size:10px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 8px;font-family:${B.fontBody};">Rechnungsempfänger</p>
              <p style="color:${B.textMuted};font-size:12px;line-height:1.9;margin:0;font-family:${B.fontBody};">
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
          <tr style="background:${B.surfaceAlt};border-radius:6px;">
            <td style="color:${B.textDim};font-size:10px;text-transform:uppercase;letter-spacing:1px;padding:10px 12px;font-family:${B.fontBody};">Beschreibung</td>
            <td style="color:${B.textDim};font-size:10px;text-transform:uppercase;letter-spacing:1px;padding:10px 12px;text-align:center;font-family:${B.fontBody};">Menge</td>
            <td style="color:${B.textDim};font-size:10px;text-transform:uppercase;letter-spacing:1px;padding:10px 12px;text-align:right;font-family:${B.fontBody};">Betrag</td>
          </tr>
          <!-- Position 1 -->
          <tr style="border-top:1px solid ${B.borderSub};">
            <td style="padding:14px 12px;vertical-align:top;">
              <p style="color:#fff;font-size:13px;font-weight:600;margin:0 0 4px;font-family:${B.fontBody};">Mitgliedschaft ${info.name} — Monatsbeitrag</p>
              <p style="color:${B.textDim};font-size:11px;margin:0;font-family:${B.fontBody};">Module: ${modList}</p>
              <p style="color:${B.textDim};font-size:11px;margin:2px 0 0;font-family:${B.fontBody};">Mitgliedsnr.: ${memberNo}</p>
            </td>
            <td style="color:${B.textMuted};font-size:13px;padding:14px 12px;text-align:center;vertical-align:top;font-family:${B.fontBody};">1 Monat</td>
            <td style="color:#fff;font-size:13px;font-weight:600;padding:14px 12px;text-align:right;vertical-align:top;font-family:${B.fontBody};">${net.toFixed(2).replace('.', ',')} €</td>
          </tr>
          <!-- Summen -->
          <tr style="border-top:1px solid ${B.border};">
            <td colspan="2" style="color:${B.textDim};font-size:12px;padding:10px 12px;text-align:right;font-family:${B.fontBody};">Nettobetrag</td>
            <td style="color:${B.textMuted};font-size:12px;padding:10px 12px;text-align:right;font-family:${B.fontBody};">${net.toFixed(2).replace('.', ',')} €</td>
          </tr>
          <tr>
            <td colspan="2" style="color:${B.textDim};font-size:12px;padding:4px 12px;text-align:right;font-family:${B.fontBody};">MwSt 19%</td>
            <td style="color:${B.textMuted};font-size:12px;padding:4px 12px;text-align:right;font-family:${B.fontBody};">${tax.toFixed(2).replace('.', ',')} €</td>
          </tr>
          <tr style="border-top:2px solid ${B.gold};">
            <td colspan="2" style="color:#fff;font-size:15px;font-weight:800;padding:14px 12px;text-align:right;font-family:${B.fontHead};">Gesamtbetrag (brutto)</td>
            <td style="color:${B.gold};font-size:18px;font-weight:800;padding:14px 12px;text-align:right;font-family:${B.fontHead};">${price},00 €</td>
          </tr>
        </table>

        <p style="color:${B.textDim};font-size:11px;margin:18px 0 0;line-height:1.7;font-family:${B.fontBody};">
          Dies ist eine Proforma-Rechnung. Die offizielle Rechnung erhältst du nach Zahlungseingang und Freischaltung per E-Mail.<br>
          Zahlungsziel: <strong style="color:${B.textMuted};">${dueDateStr}</strong> · Rechnungsnummer bitte immer als Verwendungszweck angeben.
        </p>
      </td></tr>
    </table>
  </td></tr>

  <!-- ⑦ KONTAKT-BOX -->
  <tr><td style="background:${B.surface};padding:28px 40px;border-bottom:1px solid ${B.borderSub};">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(241,235,91,0.05);border:1px solid rgba(241,235,91,0.15);border-radius:12px;padding:22px 24px;">
      <tr><td>
        <p style="color:${B.gold};font-size:14px;font-weight:700;margin:0 0 10px;font-family:${B.fontHead};">Fragen? Wir sind für dich da.</p>
        <p style="color:${B.textMuted};font-size:13px;margin:0;line-height:1.9;font-family:${B.fontBody};">
          📞 <a href="tel:020282690" style="color:${B.text};text-decoration:none;font-weight:600;">0202 82690</a>&nbsp;&nbsp;·&nbsp;&nbsp;
          ✉️ <a href="mailto:info@alex-autoshop.de" style="color:${B.text};text-decoration:none;font-weight:600;">info@alex-autoshop.de</a><br>
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
