export const config = { runtime: "edge" };

const EMAIL_OK = /^[^\s@<>"'`,;]{1,64}@[^\s@<>"'`,;]{1,190}\.[A-Za-z]{2,24}$/;

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function rein(wert, max) {
  return String(wert || "").replace(/[<>]/g, "").trim().slice(0, max);
}

export default async function handler(req) {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let body;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const name = rein(body.name, 80);
  const email = rein(body.email, 190);
  const firma = rein(body.firma, 120);
  const produkt = rein(body.produkt, 160);
  const handle = rein(body.handle, 120);
  if (!name || !EMAIL_OK.test(email) || !produkt) return json({ error: "Bitte Name, E-Mail und Produkt angeben." }, 400);

  const key = process.env.RESEND_API_KEY;
  if (!key) return json({ error: "Anfrage gerade nicht möglich. Schreib an info@alex-autoshop.de." }, 503);

  const text = [
    "Anfrage Sicherheitsdatenblatt",
    `Name: ${name}`,
    `E-Mail: ${email}`,
    firma ? `Firma: ${firma}` : "",
    `Produkt: ${produkt}`,
    handle ? `Adresse: https://www.alex-autoshop.de/produkt/${handle}` : "",
  ].filter(Boolean).join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Alex Autoshop <mitgliedschaft@alex-autoshop.de>",
      to: ["info@alex-autoshop.de"],
      reply_to: email,
      subject: `Sicherheitsdatenblatt: ${produkt}`.slice(0, 140),
      text,
    }),
  });
  if (!res.ok) return json({ error: "Versand fehlgeschlagen. Schreib an info@alex-autoshop.de." }, 502);
  return json({ ok: true });
}
