// Widerruf (§ 356a BGB) und Kündigung (§ 312k BGB).
// Edge, nicht Node: ein weiterer Node-Endpunkt sprengt das Serverless-Limit
// (darum ist PR #6 am 04.11.2026 wieder vom main genommen worden).
// RESEND_API_KEY fehlt → 503, die Seite bleibt erreichbar.

export const config = { runtime: "edge" };

const AN_SHOP = "info@alex-autoshop.de";
const VON = "Alex Autoshop <info@alex-autoshop.de>";
const EMAIL_OK = /^[^\s@<>"'`,;]{1,64}@[^\s@<>"'`,;]{1,190}\.[A-Za-z]{2,24}$/;

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
const json = (d, s = 200) => new Response(JSON.stringify(d), {
  status: s,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});

async function mail(an, betreff, text) {
  const key = String(process.env.RESEND_API_KEY || "").trim();
  if (!key) return false;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: VON, to: [an], reply_to: AN_SHOP, subject: betreff,
      text, html: `<pre style="font-family:inherit;white-space:pre-wrap">${html(text)}</pre>`,
    }),
  });
  return r.ok;
}

export default async function handler(req) {
  if (req.method !== "POST") return json({ error: "Nur POST" }, 405);
  let body;
  try { body = await req.json(); } catch { return json({ error: "Ungültige Daten" }, 400); }

  const ip = String(req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "?";
  if (zuViele(ip)) return json({ error: "Zu viele Anfragen — bitte in ein paar Minuten noch einmal oder per E-Mail an info@alex-autoshop.de." }, 429);

  const typ = body?.typ === "kuendigung" ? "kuendigung" : body?.typ === "widerruf" ? "widerruf" : "";
  const name = sauber(body?.name, 120);
  const email = sauber(body?.email, 200);
  const vertrag = sauber(body?.vertrag, 300);
  const datum = sauber(body?.datum, 60);
  const anschrift = sauber(body?.anschrift, 300);
  const zeitpunkt = sauber(body?.zeitpunkt, 80);
  const grund = sauber(body?.grund, 80);
  const hinweis = sauber(body?.hinweis, 1000);

  if (!typ) return json({ error: "Unbekannte Erklärung" }, 400);
  if (!name || !EMAIL_OK.test(email) || !vertrag) {
    return json({ error: "Bitte Name, E-Mail und Bestellnummer bzw. Vertrag angeben." }, 400);
  }
  if (!String(process.env.RESEND_API_KEY || "").trim()) {
    console.warn("[vertrag] RESEND_API_KEY fehlt");
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
