/**
 * YouLend-Anbindung — serverseitiger Proxy.
 *
 * WARUM SERVERSEITIG:
 * Das Repo ist oeffentlich. YouLend authentifiziert ueber OAuth 2.0
 * Client Credentials; client_id und client_secret duerfen deshalb NIE ins
 * Frontend-Bundle. Sie liegen ausschliesslich in der Vercel-Env, der Browser
 * spricht nur mit dieser Route und sieht weder Secret noch Access-Token.
 *
 * STAND DER FREISCHALTUNG:
 * YouLend vergibt Zugangsdaten NICHT per Selbstregistrierung. Laut
 * docs.youlend.com/reference/authentication: "If you would like access to our
 * staging environment to begin interacting with our APIs, please get in touch
 * with your implementation manager, or at partnershipmanagement@youlend.com".
 * Solange YOULEND_CLIENT_ID / YOULEND_CLIENT_SECRET nicht gesetzt sind,
 * antwortet diese Route bewusst mit { aktiv: false } und HTTP 200 — die
 * Seite faellt dann auf Telefon und WhatsApp zurueck, nichts bricht.
 *
 * Benoetigte Vercel-Env (erst nach Vertrag mit YouLend setzen):
 *   YOULEND_CLIENT_ID       — OAuth2 client_id von YouLend
 *   YOULEND_CLIENT_SECRET   — OAuth2 client_secret von YouLend
 *   YOULEND_UMGEBUNG        — "staging" (Standard) oder "produktion"
 *   RESEND_API_KEY          — bereits gesetzt, fuer die Benachrichtigung an Alex
 *
 * Quellen (abgerufen 10/2026):
 *   https://docs.youlend.com/reference/authentication
 *   https://docs.youlend.com/docs/partner-hosted-application
 *   https://docs.youlend.com/reference/germany
 */

export const config = { maxDuration: 25 };

const CLIENT_ID = process.env.YOULEND_CLIENT_ID;
const CLIENT_SECRET = process.env.YOULEND_CLIENT_SECRET;
const UMGEBUNG = (process.env.YOULEND_UMGEBUNG || "staging").toLowerCase();
const PRODUKTIV = UMGEBUNG === "produktion" || UMGEBUNG === "production";
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MELDUNG_AN = process.env.YOULEND_MELDUNG_AN || "info@alex-autoshop.de";

// Europa. Werte aus der YouLend-Authentifizierungsreferenz.
const TOKEN_URL = PRODUKTIV
  ? "https://youlend.eu.auth0.com/oauth/token"
  : "https://youlend-stag.eu.auth0.com/oauth/token";

const BASIS_URL = PRODUKTIV
  ? "https://youlendapi.com"
  : "https://partners.staging-youlendapi.com";

const AUDIENCE = {
  onboarding: PRODUKTIV ? "https://youlendapi.com/onboarding" : "https://staging.youlendapi.com/onboarding",
  prequalification: PRODUKTIV ? "https://youlendapi.com/prequalification" : "https://staging.youlendapi.com/prequalification",
  preapproval: PRODUKTIV ? "https://youlendapi.com/preapproval" : "https://staging.youlendapi.com/preapproval",
  loan: PRODUKTIV ? "https://youlendapi.com/loan" : "https://staging.youlendapi.com/loan",
};

/** Firmenformen, die YouLend fuer Deutschland akzeptiert (companyType). */
const FIRMENFORMEN = new Set([
  "EGbr", "EK", "Gbr", "GbrOhg", "GmbhUg", "Gewerbebetrieb", "Kg", "Ohg",
]);

/** Firmenformen, die ohne Handelsregisternummer auskommen. */
const OHNE_HR = new Set(["Gbr", "Gewerbebetrieb"]);

// ── Token-Cache: YouLend-Tokens leben 24 h, also nicht pro Request neu holen ──
const tokenCache = new Map(); // audience -> { token, faellig }

async function token(audience) {
  const jetzt = Date.now();
  const c = tokenCache.get(audience);
  if (c && c.faellig > jetzt + 60_000) return c.token;

  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      audience,
    }),
  });
  if (!r.ok) throw new Error(`YouLend-Token (${r.status}): ${(await r.text()).slice(0, 300)}`);
  const d = await r.json();
  if (!d.access_token) throw new Error("YouLend-Token: kein access_token in der Antwort");
  tokenCache.set(audience, {
    token: d.access_token,
    faellig: jetzt + (Number(d.expires_in) || 86400) * 1000,
  });
  return d.access_token;
}

async function youlend(pfad, audience, body, methode = "POST") {
  const t = await token(audience);
  const r = await fetch(`${BASIS_URL}${pfad}`, {
    method: methode,
    headers: {
      authorization: `Bearer ${t}`,
      accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let daten = null;
  try { daten = text ? JSON.parse(text) : null; } catch { daten = { rohtext: text.slice(0, 500) }; }
  if (!r.ok) {
    const e = new Error(`YouLend ${pfad} (${r.status})`);
    e.status = r.status;
    e.daten = daten;
    throw e;
  }
  return daten;
}

// ── Eingaben pruefen ──────────────────────────────────────────────────────────
const txt = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

function anfragePruefen(b) {
  const f = {
    firma: txt(b.firma, 120),
    firmenform: txt(b.firmenform, 20),
    handelsregister: txt(b.handelsregister, 40),
    strasse: txt(b.strasse, 120),
    plz: txt(b.plz, 10),
    ort: txt(b.ort, 80),
    ansprechpartner: txt(b.ansprechpartner, 120),
    email: txt(b.email, 160),
    telefon: txt(b.telefon, 32).replace(/[^\d+]/g, ""),
    webseite: txt(b.webseite, 160),
    jahresumsatz: Number(b.jahresumsatz) || 0,
    wunschsumme: Number(b.wunschsumme) || 0,
    zweck: txt(b.zweck, 600),
    bonitaetspruefung: b.bonitaetspruefung === true,
  };
  const fehler = [];
  if (f.firma.length < 2) fehler.push("Firmenname fehlt");
  if (!FIRMENFORMEN.has(f.firmenform)) fehler.push("Rechtsform ungültig");
  if (!OHNE_HR.has(f.firmenform) && f.handelsregister.length < 4) fehler.push("Handelsregisternummer fehlt");
  if (f.plz.length < 4 || f.ort.length < 2 || f.strasse.length < 3) fehler.push("Anschrift unvollständig");
  if (f.ansprechpartner.length < 2) fehler.push("Ansprechpartner fehlt");
  if (!EMAIL.test(f.email)) fehler.push("E-Mail ungültig");
  if (!/^\+?\d{6,}$/.test(f.telefon)) fehler.push("Telefonnummer ungültig");
  if (f.wunschsumme < 1000) fehler.push("Wunschsumme zu klein");
  if (!f.bonitaetspruefung) fehler.push("Einwilligung zur Bonitätsprüfung fehlt");
  return { f, fehler };
}

/** Deutsche Nummer in das von YouLend verlangte Format +49xxxxxxxxx bringen. */
function telefonIntl(n) {
  const r = n.replace(/[^\d+]/g, "");
  if (r.startsWith("+")) return r;
  if (r.startsWith("00")) return "+" + r.slice(2);
  if (r.startsWith("0")) return "+49" + r.slice(1);
  return "+49" + r;
}

/** Lead-Rumpf nach der deutschen Feldliste von YouLend. */
function leadKoerper(f, kundenId) {
  return {
    thirdPartyCustomerId: kundenId,
    confirmedCreditSearch: true,       // der Haken im Formular ist Pflicht
    countryISOCode: "DEU",
    loanCurrencyISOCode: "EUR",
    keyContactName: f.ansprechpartner,
    companyType: f.firmenform,
    companyName: f.firma,
    tradingName: f.firma,
    ...(f.handelsregister ? { companyNumber: f.handelsregister } : {}),
    ...(f.webseite ? { companyWebsite: f.webseite } : {}),
    registeredAddress: {
      line1: f.strasse,
      city: f.ort,
      region: f.ort,
      areaCode: f.plz,
      countryISOCode: "DEU",
    },
    contactPhoneNumber: telefonIntl(f.telefon),
    contactEmailAddress: f.email,
    additionalInfo: { languagePreference: "de" },
  };
}

async function alexBenachrichtigen(f, ergebnis) {
  if (!RESEND_API_KEY) return;
  const z = (a, b) => `<tr><td style="padding:4px 12px 4px 0;color:#9a9a92;">${a}</td><td style="padding:4px 0;"><strong>${b || "—"}</strong></td></tr>`;
  const html = `<!DOCTYPE html><html lang="de"><body style="font-family:system-ui,sans-serif;background:#0D0D0D;color:#EDE9E3;padding:28px 22px;max-width:560px;margin:0 auto;">
    <h2 style="color:#f1eb5b;margin:0 0 14px;">Neue Finanzierungsanfrage</h2>
    <table style="font-size:14px;border-collapse:collapse;">
      ${z("Firma", f.firma)}${z("Rechtsform", f.firmenform)}${z("HR-Nummer", f.handelsregister)}
      ${z("Anschrift", `${f.strasse}, ${f.plz} ${f.ort}`)}
      ${z("Ansprechpartner", f.ansprechpartner)}${z("E-Mail", f.email)}${z("Telefon", f.telefon)}
      ${z("Jahresumsatz", f.jahresumsatz ? f.jahresumsatz.toLocaleString("de-DE") + " €" : "")}
      ${z("Wunschsumme", f.wunschsumme.toLocaleString("de-DE") + " €")}
      ${z("Verwendung", f.zweck)}
      ${z("An YouLend übergeben", ergebnis?.leadId ? `ja — Lead ${ergebnis.leadId}` : "nein, nur Anfrage")}
    </table>
  </body></html>`;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Alex Autoshop System <mitgliedschaft@alex-autoshop.de>",
      reply_to: f.email,
      to: [MELDUNG_AN],
      subject: `💶 Finanzierungsanfrage: ${f.firma} — ${f.wunschsumme.toLocaleString("de-DE")} €`,
      html,
    }),
  }).catch((e) => console.error("Resend (nicht kritisch):", e?.message));
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ aktiv: Boolean(CLIENT_ID && CLIENT_SECRET), umgebung: PRODUKTIV ? "produktion" : "staging" });
  }
  if (req.method !== "POST") return res.status(405).json({ fehler: "Methode nicht erlaubt" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

  if (body.aktion === "status") {
    return res.status(200).json({ aktiv: Boolean(CLIENT_ID && CLIENT_SECRET) });
  }
  if (body.aktion !== "anfrage") return res.status(400).json({ fehler: "Unbekannte Aktion" });

  const { f, fehler } = anfragePruefen(body);
  if (fehler.length) return res.status(400).json({ fehler: fehler.join(", ") });

  // Noch kein Vertrag mit YouLend: Anfrage trotzdem annehmen und per Mail
  // weiterreichen, damit niemand ins Leere laeuft.
  if (!CLIENT_ID || !CLIENT_SECRET) {
    await alexBenachrichtigen(f, null);
    return res.status(200).json({
      aktiv: false,
      angenommen: true,
      hinweis: "Anfrage ist bei uns eingegangen. Wir melden uns persönlich.",
    });
  }

  const kundenId = `alexautoshop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    const antwort = await youlend("/onboarding/leads", AUDIENCE.onboarding, leadKoerper(f, kundenId));
    const leadId = antwort?.leadId || antwort?.id || antwort?.data?.leadId || null;
    await alexBenachrichtigen(f, { leadId });
    return res.status(200).json({ aktiv: true, angenommen: true, leadId, kundenId });
  } catch (e) {
    console.error("YouLend-Fehler:", e?.message, e?.daten);
    // Der Kunde darf das nicht ausbaden: Anfrage bleibt angenommen.
    await alexBenachrichtigen(f, null);
    return res.status(200).json({
      aktiv: true,
      angenommen: true,
      uebergabeFehlgeschlagen: true,
      hinweis: "Anfrage ist bei uns eingegangen. Wir melden uns persönlich.",
    });
  }
}
