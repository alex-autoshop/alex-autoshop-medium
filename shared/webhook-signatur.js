// Signaturen der Zahlungs-Webhooks. Der Vergleich läuft über den unveränderten
// Roh-Body (req.text()), nie über neu serialisiertes JSON.

export const STRIPE_TOLERANZ_SEKUNDEN = 300;

function zeitgleich(a, b) {
  const links = String(a || "");
  const rechts = String(b || "");
  const laenge = Math.max(links.length, rechts.length);
  let diff = links.length === rechts.length ? 0 : 1;
  for (let i = 0; i < laenge; i++) {
    diff |= links.charCodeAt(i) ^ rechts.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacHex(secret, payload) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Stripe-Signature: t=…,v1=… (mehrere v1 bei Schlüsselwechsel). Roh-Body. */
export async function stripeSignaturPruefen(rawBody, kopf, geheimnis, jetztMs = Date.now()) {
  const secret = String(geheimnis || "").trim();
  const header = String(kopf || "").trim();
  if (!secret || !header) return false;
  let zeit = "";
  const v1 = [];
  for (const teil of header.split(",")) {
    const stueck = teil.trim();
    const eq = stueck.indexOf("=");
    if (eq <= 0) continue;
    const name = stueck.slice(0, eq).trim();
    const wert = stueck.slice(eq + 1).trim();
    if (name === "t") zeit = wert;
    else if (name === "v1" && wert) v1.push(wert.toLowerCase());
  }
  if (!/^\d+$/.test(zeit) || v1.length === 0) return false;
  const alter = Math.abs(jetztMs / 1000 - Number(zeit));
  if (alter > STRIPE_TOLERANZ_SEKUNDEN) return false;
  const mac = await hmacHex(secret, `${zeit}.${rawBody}`);
  let ok = false;
  for (const sig of v1) ok = zeitgleich(mac, sig) || ok;
  return ok;
}

/** GoCardless Webhook-Signature: Hex-HMAC-SHA256 über den Roh-Body. */
export async function gocardlessSignaturPruefen(rawBody, kopf, geheimnis) {
  const secret = String(geheimnis || "").trim();
  const header = String(kopf || "").trim().toLowerCase();
  if (!secret || !header) return false;
  const mac = await hmacHex(secret, String(rawBody ?? ""));
  return zeitgleich(mac, header);
}
