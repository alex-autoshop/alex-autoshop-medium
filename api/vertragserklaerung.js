// ─────────────────────────────────────────────────────────────────────────────
// Widerrufsfunktion (§ 356a BGB, seit 19.06.2026) und Kündigungsbutton
// (§ 312k BGB) — EIN Endpunkt für beide Erklärungen.
//
// Was das Gesetz verlangt und was hier passiert:
//   1. Der Kunde gibt auf /widerruf bzw. /kuendigen seine Daten ein und
//      bestätigt im zweiten Schritt („Widerruf bestätigen“ / „Jetzt kündigen“).
//   2. Dieser Endpunkt schickt die Erklärung an info@ und dem Kunden SOFORT
//      eine Eingangsbestätigung mit Inhalt, Datum und Uhrzeit per E-Mail
//      (dauerhafter Datenträger).
//   3. Bearbeitet wird von Hand (Erstattung, Abo bei Stripe/GoCardless beenden).
//      Die Erklärung ist mit Zugang wirksam — nicht erst mit der Bearbeitung.
//
// Umgebung: RESEND_API_KEY (dieselbe wie für die Mitgliedschafts-Mails).
// ─────────────────────────────────────────────────────────────────────────────
export const config = { runtime: "nodejs" };

const RESEND_API_KEY = () => process.env.RESEND_API_KEY || "";
const AN_SHOP = "info@alex-autoshop.de";
const VON = "Alex Autoshop <info@alex-autoshop.de>";
const EMAIL_OK = /^[^\s@<>"'`,;]{1,64}@[^\s@<>"'`,;]{1,190}\.[A-Za-z]{2,24}$/;

// einfache Bremse gegen Spam: 5 Erklärungen je IP und 10 Minuten
const treffer = new Map();
function zuViele(ip) {
  const jetzt = Date.now();
  const liste = (treffer.get(ip) || []).filter((t) => jetzt - t < 10 * 60 * 1000);
  liste.push(jetzt);
  treffer.set(ip, liste);
  return liste.length > 5;
}

const sauber = (v, max = 300) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
const html = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function mail(an, betreff, text) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: VON, to: [an], reply_to: AN_SHOP, subject: betreff,
      text, html: `<pre style="font-family:inherit;white-space:pre-wrap">${html(text)}</pre>`,
    }),
  });
  return r.ok;
}

export default async function handler(req, res) {
  const json = (d, s = 200) => { res.statusCode = s; res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(d)); };
  if (req.method !== "POST") return json({ error: "Nur POST" }, 405);
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { return json({ error: "Ungültige Daten" }, 400); } }

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "?";
  if (zuViele(ip)) return json({ error: "Zu viele Anfragen — bitte in ein paar Minuten noch einmal oder per E-Mail an info@alex-autoshop.de." }, 429);

  const typ = body?.typ === "kuendigung" ? "kuendigung" : body?.typ === "widerruf" ? "widerruf" : "";
  const name = sauber(body?.name, 120);
  const email = sauber(body?.email, 200);
  const vertrag = sauber(body?.vertrag, 300);       // Bestellnummer / Mitgliedschaft
  const datum = sauber(body?.datum, 60);            // Bestellt am / erhalten am
  const anschrift = sauber(body?.anschrift, 300);
  const zeitpunkt = sauber(body?.zeitpunkt, 80);    // nur Kündigung: „nächstmöglich“ oder Datum
  const grund = sauber(body?.grund, 80);            // nur Kündigung: ordentlich/außerordentlich
  const hinweis = sauber(body?.hinweis, 1000);

  if (!typ) return json({ error: "Unbekannte Erklärung" }, 400);
  if (!name || !EMAIL_OK.test(email) || !vertrag) {
    return json({ error: "Bitte Name, E-Mail und Bestellnummer bzw. Vertrag angeben." }, 400);
  }
  if (!RESEND_API_KEY()) {
    return json({ error: "Gerade technisch nicht möglich. Bitte per E-Mail an info@alex-autoshop.de — das gilt genauso." }, 503);
  }

  const eingang = new Date();
  const zeit = eingang.toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "full", timeStyle: "medium" });
  const titel = typ === "widerruf" ? "Widerruf" : "Kündigung";
  const inhalt = [
    typ === "widerruf"
      ? "Hiermit widerrufe ich den von mir abgeschlossenen Vertrag."
      : "Hiermit kündige ich den folgenden Vertrag.",
    "",
    `Name: ${name}`,
    `E-Mail: ${email}`,
    anschrift && `Anschrift: ${anschrift}`,
    `Vertrag / Bestellnummer: ${vertrag}`,
    datum && `Bestellt am / erhalten am: ${datum}`,
    typ === "kuendigung" && `Art der Kündigung: ${grund || "ordentlich"}`,
    typ === "kuendigung" && `Zeitpunkt: ${zeitpunkt || "zum nächstmöglichen Zeitpunkt"}`,
    hinweis && `Hinweis: ${hinweis}`,
    "",
    `Eingegangen am: ${zeit} (Europe/Berlin)`,
  ].filter(Boolean).join("\n");

  const okShop = await mail(AN_SHOP, `${titel} eingegangen — ${vertrag}`, inhalt);
  const okKunde = await mail(email, `Eingangsbestätigung Ihres ${typ === "widerruf" ? "Widerrufs" : "Kündigung"} — Alex Autoshop`,
    `Guten Tag ${name},\n\nwir bestätigen den Eingang Ihrer folgenden Erklärung:\n\n${inhalt}\n\n` +
    (typ === "kuendigung"
      ? "Wir teilen Ihnen in Kürze mit, zu welchem Zeitpunkt der Vertrag endet.\n\n"
      : "Wir melden uns zur Rücksendung und Erstattung.\n\n") +
    "Alex Autoshop · Alexander Haritopoulos · Handelstraße 64 · 42277 Wuppertal · info@alex-autoshop.de · 0202 82690");

  if (!okShop || !okKunde) {
    return json({ error: "Die Bestätigung konnte nicht verschickt werden. Bitte zusätzlich per E-Mail an info@alex-autoshop.de." }, 502);
  }
  return json({ ok: true, eingang: eingang.toISOString(), zeit });
}
