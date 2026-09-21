// Stripe-Webhook — bestätigt Abo-Zahlung → schaltet Mitgliedschaft frei.
// In Stripe anlegen: Developers → Webhooks → Endpoint
//   URL:    https://alex-autoshop.de/api/stripe-webhook
//   Events: checkout.session.completed
//   Signing secret → Vercel-Env STRIPE_WEBHOOK_SECRET (whsec_…)

export const config = { runtime: "edge" };

import { activateMembership } from "./_activate-membership.js";

// ── Teile-Zahlungen für die Zahlungsgrenze festhalten (nur Server) ──────────
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://zasbdvtsxgimcezotlsi.supabase.co").replace(/\/+$/, "");
const istUuid = (v) => /^[0-9a-f-]{36}$/i.test(String(v || ""));

async function zahlungSpeichern(zeile) {
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!svc || !zeile.extern_id) return;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/teile_zahlungen?on_conflict=extern_id`, {
    method: "POST",
    headers: {
      apikey: svc, Authorization: `Bearer ${svc}`, "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(zeile),
  }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }));
  if (!r.ok) console.error("[zahlung] speichern fehlgeschlagen:", r.status, (await r.text()).slice(0, 200));
}

async function zahlungStatus(externId, status) {
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!svc || !externId) return;
  await fetch(`${SUPABASE_URL}/rest/v1/teile_zahlungen?extern_id=eq.${encodeURIComponent(externId)}`, {
    method: "PATCH",
    headers: { apikey: svc, Authorization: `Bearer ${svc}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ status, ...(status === "bezahlt" ? { bezahlt_am: new Date().toISOString() } : {}) }),
  }).catch(() => {});
}

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

  // Teile-Bestellungen (Teilebörse + Theke) — Grundlage der Zahlungsgrenze.
  // Events in Stripe: checkout.session.completed (+ für Lastschrift über
  // Stripe: checkout.session.async_payment_succeeded / _failed).
  if (event.type.startsWith("checkout.session.")) {
    const s = event.data?.object || {};
    const m = s.metadata || {};
    if (m.typ === "teile" || m.typ === "theke") {
      const bezahlt =
        event.type === "checkout.session.async_payment_succeeded" ||
        (event.type === "checkout.session.completed" && s.payment_status === "paid");
      const fehl = event.type === "checkout.session.async_payment_failed" || event.type === "checkout.session.expired";
      if (event.type === "checkout.session.completed" || bezahlt || fehl) {
        await zahlungSpeichern({
          extern_id: s.id,
          anbieter: "stripe",
          typ: m.typ,
          user_id: istUuid(m.user_id) ? m.user_id : null,
          email: s.customer_details?.email || s.customer_email || null,
          betrag: Number(s.amount_total || 0) / 100,
          status: fehl ? "fehlgeschlagen" : bezahlt ? "bezahlt" : "offen",
          ...(bezahlt ? { bezahlt_am: new Date().toISOString() } : {}),
        });
      }
    }
  }

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
