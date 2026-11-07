// Sicherheitsdatenblätter an Gewerbekunden.
// Shopify: Einstellungen → Benachrichtigungen → Webhooks
//   Ereignis: Order payment (orders/paid)
//   URL:      https://alex-autoshop.de/api/shopify-bestellung
//   Secret →  Vercel-Env SHOPIFY_WEBHOOK_SECRET
// Außerdem: SHOPIFY_ADMIN_TOKEN (Metafelder) und RESEND_API_KEY (Mail).
// Fehlt eines davon, wird keine Mail verschickt und der Webhook antwortet 503.

export const config = { runtime: "edge" };

import { istGeschaeftskunde } from "../shared/geschaeftskunde.js";

const VERSION = "2024-10";

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function signaturOk(raw, kopf, geheimnis) {
  if (!kopf || !geheimnis) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(geheimnis),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
  let bin = "";
  for (const b of sig) bin += String.fromCharCode(b);
  const erwartet = btoa(bin);
  if (erwartet.length !== kopf.length) return false;
  let abweichung = 0;
  for (let i = 0; i < erwartet.length; i++) abweichung |= erwartet.charCodeAt(i) ^ kopf.charCodeAt(i);
  return abweichung === 0;
}

async function metafelder(produktId, token, domain) {
  const res = await fetch(
    `https://${domain}/admin/api/${VERSION}/products/${produktId}/metafields.json?namespace=gefahrstoff`,
    { headers: { "X-Shopify-Access-Token": token } },
  );
  if (!res.ok) return [];
  const daten = await res.json().catch(() => null);
  return Array.isArray(daten?.metafields) ? daten.metafields : [];
}

function blatt(felder) {
  const roh = {};
  for (const feld of felder) if (feld?.key) roh[feld.key] = feld.value;
  const ist = roh.ist_gefahrstoff === true || String(roh.ist_gefahrstoff || "").trim().toLowerCase() === "true";
  if (!ist) return null;
  const url = /^https:\/\/\S+$/i.test(String(roh.sdb_url || "").trim()) ? String(roh.sdb_url).trim() : "";
  return { url };
}

export default async function handler(req) {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const geheimnis = String(process.env.SHOPIFY_WEBHOOK_SECRET || "").trim();
  const token = String(process.env.SHOPIFY_ADMIN_TOKEN || "").trim();
  const mailKey = String(process.env.RESEND_API_KEY || "").trim();
  if (!geheimnis || !token || !mailKey) {
    console.warn("[sdb-bestellung] fehlt:", [!geheimnis && "SHOPIFY_WEBHOOK_SECRET", !token && "SHOPIFY_ADMIN_TOKEN", !mailKey && "RESEND_API_KEY"].filter(Boolean).join(", "));
    return json({ error: "Sicherheitsdatenblatt-Mail ist noch nicht eingerichtet." }, 503);
  }
  const raw = await req.text();
  const ok = await signaturOk(raw, req.headers.get("x-shopify-hmac-sha256") || "", geheimnis);
  if (!ok) return json({ error: "Signatur ungültig" }, 401);
  const thema = req.headers.get("x-shopify-topic") || "";
  if (thema && thema !== "orders/paid") return json({ ok: true, skipped: "thema" });
  let order;
  try { order = JSON.parse(raw); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (!istGeschaeftskunde(order)) return json({ ok: true, skipped: "privat" });
  const email = String(order.email || order.customer?.email || "").trim();
  if (!email) return json({ ok: true, skipped: "ohne-mail" });

  const domain = process.env.SHOPIFY_STORE_DOMAIN || "shop.alex-autoshop.de";
  const zeilen = Array.isArray(order.line_items) ? order.line_items : [];
  const gesehen = new Set();
  const links = [];
  for (const zeile of zeilen) {
    const id = zeile?.product_id;
    if (!id || gesehen.has(id)) continue;
    gesehen.add(id);
    const blattDa = blatt(await metafelder(id, token, domain));
    if (blattDa) links.push({ titel: String(zeile.title || "Artikel").slice(0, 160), url: blattDa.url });
  }
  if (!links.length) return json({ ok: true, skipped: "kein-blatt" });

  const nummer = String(order.name || order.order_number || order.id || "").slice(0, 40);
  const text = [
    `Sicherheitsdatenblätter zu Ihrer Bestellung ${nummer}`,
    "",
    "Für die folgenden Gefahrstoffe aus dieser Bestellung liegt ein Sicherheitsdatenblatt vor:",
    ...links.map((l) => (l.url ? `- ${l.titel}: ${l.url}` : `- ${l.titel}: Datenblatt liegt noch nicht als Link vor. Anfordern: info@alex-autoshop.de`)),
    "",
    "Alex Autoshop, Handelstraße 64, 42277 Wuppertal",
  ].join("\n");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${mailKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `sdb-${order.id || nummer}`,
    },
    body: JSON.stringify({
      from: "Alex Autoshop <mitgliedschaft@alex-autoshop.de>",
      to: [email],
      subject: `Sicherheitsdatenblätter zur Bestellung ${nummer}`.slice(0, 140),
      text,
    }),
  });
  if (!res.ok) {
    console.error("[sdb-bestellung] mail", res.status);
    return json({ error: "Mail nicht zugestellt" }, 502);
  }
  return json({ ok: true, blaetter: links.length });
}
