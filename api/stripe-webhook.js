// Stripe-Webhook — bestätigt Abo-Zahlung → schaltet Mitgliedschaft frei.
// In Stripe anlegen: Developers → Webhooks → Endpoint
//   URL:    https://alex-autoshop.de/api/stripe-webhook
//   Events: checkout.session.completed
//   Signing secret → Vercel-Env STRIPE_WEBHOOK_SECRET (whsec_…)

export const config = { runtime: "edge" };

import { activateMembership } from "./_activate-membership.js";

// Stripe-Signatur (HMAC-SHA256) mit Web Crypto prüfen
async function verifyStripe(rawBody, sigHeader, secret) {
  if (!sigHeader || !secret) return false;
  const parts = Object.fromEntries(sigHeader.split(",").map((kv) => kv.split("=")));
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${rawBody}`));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  // konstantzeit-ähnlicher Vergleich
  if (hex.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

export default async function handler(req) {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const raw = await req.text();
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  const ok = await verifyStripe(raw, sig, secret);
  if (!ok) return new Response("Signatur ungültig", { status: 400 });

  let event;
  try { event = JSON.parse(raw); } catch { return new Response("Invalid JSON", { status: 400 }); }

  if (event.type === "checkout.session.completed") {
    const s = event.data?.object || {};
    const m = s.metadata || {};
    if (m.email && m.level) {
      const r = await activateMembership({
        email: m.email, level: m.level, modules: m.modules, price: m.price,
        provider: "stripe", providerId: s.subscription || s.id,
      });
      console.log("[stripe-webhook] aktiviert:", JSON.stringify(r));
    }
  }

  // Stripe erwartet 2xx, sonst wird der Event erneut zugestellt.
  return new Response(JSON.stringify({ received: true }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
}
