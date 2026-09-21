// ─────────────────────────────────────────────────────────────────────────────
// Interne Aufrufe zwischen den eigenen Server-Funktionen absichern.
//
// Beispiel: Nach einer bestätigten Zahlung ruft der Webhook
// api/membership-email auf. Diesen Weg darf NUR der eigene Server gehen —
// sonst könnte jeder die Freischalt-Mails samt Konto auslösen.
//
// Signatur = HMAC-SHA256(Service-Key, "zweck|teil1|teil2…"). Der Schlüssel
// selbst verlässt den Server nie, nur die Signatur geht mit.
// Funktioniert in Edge- und Node-Funktionen (Web Crypto).
//
// Datei beginnt mit "_" → Vercel macht daraus keinen eigenen Endpunkt.
// ─────────────────────────────────────────────────────────────────────────────

const geheim = () => String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

async function hmacHex(schluessel, text) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(schluessel), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(text));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Signatur für einen internen Aufruf — leer, wenn kein Service-Key da ist. */
export async function internSignatur(zweck, ...teile) {
  const k = geheim();
  if (!k) return "";
  return hmacHex(k, [zweck, ...teile.map((t) => String(t ?? ""))].join("|"));
}

/** Stimmt der Header "x-intern" mit der erwarteten Signatur überein? */
export async function internPruefen(req, zweck, ...teile) {
  const h = req?.headers;
  const kommt = String((typeof h?.get === "function" ? h.get("x-intern") : h?.["x-intern"]) || "");
  const soll = await internSignatur(zweck, ...teile);
  if (!soll || kommt.length !== soll.length) return false;
  let diff = 0;
  for (let i = 0; i < soll.length; i++) diff |= soll.charCodeAt(i) ^ kommt.charCodeAt(i);
  return diff === 0;
}
