// GoCardless-Webhook — bestätigt SEPA-Mandat → legt monatliches Abo an + schaltet frei.
// In GoCardless anlegen: Developers → Webhook endpoints
//   URL:    https://alex-autoshop.de/api/gocardless-webhook
//   Secret → Vercel-Env GOCARDLESS_WEBHOOK_SECRET
//
// Ablauf: Kunde autorisiert SEPA-Mandat (Billing Request) → Event
// billing_requests "fulfilled" → wir holen Mandat + Metadaten, erstellen ein
// monatliches Abo (Subscription) und schalten die Mitgliedschaft frei.

export const config = { runtime: "edge" };

import { activateMembership } from "./_activate-membership.js";

const gcHost = () =>
  (process.env.GOCARDLESS_ENVIRONMENT || "sandbox").toLowerCase() === "live"
    ? "https://api.gocardless.com"
    : "https://api-sandbox.gocardless.com";

const gcHeaders = () => ({
  Authorization: `Bearer ${process.env.GOCARDLESS_ACCESS_TOKEN}`,
  "GoCardless-Version": "2015-07-06",
  "Content-Type": "application/json",
  Accept: "application/json",
});

async function verifyGoCardless(rawBody, sigHeader, secret) {
  if (!sigHeader || !secret) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== sigHeader.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ sigHeader.charCodeAt(i);
  return diff === 0;
}

async function handleBillingRequestFulfilled(billingRequestId) {
  // 1) Billing Request laden → Metadaten + Mandat
  const brRes = await fetch(`${gcHost()}/billing_requests/${billingRequestId}`, { headers: gcHeaders() });
  const br = (await brRes.json().catch(() => null))?.billing_requests;
  if (!br) return;
  const meta = br.metadata || {};
  const mandateId = br.links?.mandate_request_mandate;
  const price = Number(meta.price);

  // 2) Monatliches Abo anlegen (best effort — Fehler blockt Freischaltung nicht)
  if (mandateId && price > 0) {
    try {
      await fetch(`${gcHost()}/subscriptions`, {
        method: "POST",
        headers: gcHeaders(),
        body: JSON.stringify({
          subscriptions: {
            amount: Math.round(price * 100),
            currency: "EUR",
            interval_unit: "monthly",
            name: `Alex Autoshop Mitgliedschaft Level ${meta.level}`,
            links: { mandate: mandateId },
            metadata: meta,
          },
        }),
      });
    } catch (e) {
      console.error("[gocardless-webhook] subscription:", e.message);
    }
  }

  // 3) Mitgliedschaft freischalten + Shopify-Bestellung
  if (meta.email && meta.level) {
    const r = await activateMembership({ ...meta, provider: "gocardless", providerId: mandateId });
    console.log("[gocardless-webhook] aktiviert:", JSON.stringify(r));
  }
}

export default async function handler(req) {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const raw = await req.text();
  const sig = req.headers.get("webhook-signature");
  const ok = await verifyGoCardless(raw, sig, process.env.GOCARDLESS_WEBHOOK_SECRET);
  if (!ok) return new Response("Signatur ungültig", { status: 498 });

  let payload;
  try { payload = JSON.parse(raw); } catch { return new Response("Invalid JSON", { status: 400 }); }

  for (const ev of payload.events || []) {
    try {
      if (ev.resource_type === "billing_requests" && ev.action === "fulfilled") {
        await handleBillingRequestFulfilled(ev.links?.billing_request);
      }
      // payments "confirmed"/"paid_out" → hier optional Umsatz/Statuspflege
    } catch (e) {
      console.error("[gocardless-webhook] event error:", e.message);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
}
