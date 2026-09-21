// Mitgliedschafts-Checkout — erzeugt je nach Zahlungsart eine bezahlbare URL:
//   method="stripe"     → Stripe Checkout Session (Abo, monatlich)   → { url }
//   method="gocardless" → GoCardless Billing Request Flow (SEPA)      → { url }
// Fällt zurück auf { fallback:true }, wenn der gewählte Anbieter noch
// keine Keys hat — das Frontend nutzt dann den bisherigen E-Mail-Anfrage-Flow.
//
// Vercel-Env-Vars:
//   STRIPE_SECRET_KEY            (sk_test_… / sk_live_…)
//   GOCARDLESS_ACCESS_TOKEN      (sandbox_… / live_…)
//   GOCARDLESS_ENVIRONMENT       "sandbox" | "live"  (Default: sandbox)
//   PUBLIC_BASE_URL              z.B. https://alex-autoshop.de (Default gesetzt)
//
// PREIS: Der Beitrag wird HIER berechnet (shared/mitgliedspreise.js) — der
// Browser schickt nur die Auswahl. Bis 22.09.2026 kam der Betrag aus dem
// Browser: mit einer umgeschriebenen Anfrage gab es Level 3 für 1 Cent/Monat.

export const config = { runtime: "edge" };

import { mitgliedsbeitrag } from "../shared/mitgliedspreise.js";

const EMAIL_OK = /^[^\s@<>"'`,;]{1,64}@[^\s@<>"'`,;]{1,190}\.[A-Za-z]{2,24}$/;
const REF_OK = /^[A-Z0-9]{6,8}$/;
const refAus = (x) => { const r = String(x || "").trim().toUpperCase(); return REF_OK.test(r) ? r : ""; };

const BASE = () => process.env.PUBLIC_BASE_URL || "https://alex-autoshop.de";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...CORS } });

// ── Stripe: Checkout Session (subscription) ──────────────────────────────────
async function createStripeSession({ email, level, modules, price, paket, ref }) {
  const key = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!/^(sk|rk)_(live|test)_[A-Za-z0-9]{10,}$/.test(key)) return { fallback: true };

  const cents = Math.round(Number(price) * 100);
  const form = new URLSearchParams();
  form.set("mode", "subscription");
  form.set("customer_email", email);
  form.set("success_url", `${BASE()}/mitgliedschaft?status=success&session_id={CHECKOUT_SESSION_ID}`);
  form.set("cancel_url", `${BASE()}/mitgliedschaft?status=cancel`);
  form.set("line_items[0][quantity]", "1");
  form.set("line_items[0][price_data][currency]", "eur");
  form.set("line_items[0][price_data][recurring][interval]", "month");
  form.set("line_items[0][price_data][unit_amount]", String(cents));
  form.set("line_items[0][price_data][product_data][name]", `Alex Autoshop Mitgliedschaft Level ${level}`);
  form.set("line_items[0][price_data][product_data][description]", `Module: ${(modules || []).join(", ") || "Basis"}`);
  // Metadaten für den Webhook (Aktivierung + Shopify-Bestellung)
  form.set("metadata[email]", email);
  form.set("metadata[level]", String(level));
  form.set("metadata[modules]", (modules || []).join(","));
  form.set("metadata[price]", String(price));
  form.set("metadata[paket]", paket);
  if (ref) form.set("metadata[ref]", ref);
  form.set("subscription_data[metadata][email]", email);
  form.set("subscription_data[metadata][level]", String(level));
  form.set("subscription_data[metadata][modules]", (modules || []).join(","));
  form.set("subscription_data[metadata][price]", String(price));

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${JSON.stringify(data?.error || data).slice(0, 300)}`);
  return { url: data.url };
}

// ── GoCardless: Billing Request + Flow (SEPA-Mandat) ─────────────────────────
async function createGoCardlessFlow({ email, level, modules, price, paket, ref }) {
  // Nur ein echter Token zählt (Platzhalter in Vercel → freundlicher Hinweis),
  // und live/sandbox ergibt sich aus dem Token selbst.
  const token = String(process.env.GOCARDLESS_ACCESS_TOKEN || "").trim();
  if (!/^(live|sandbox)_[A-Za-z0-9_-]{10,}$/.test(token)) return { fallback: true };
  const host = token.startsWith("live_") ? "https://api.gocardless.com" : "https://api-sandbox.gocardless.com";
  const headers = {
    Authorization: `Bearer ${token}`,
    "GoCardless-Version": "2015-07-06",
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  // 1) Billing Request mit SEPA-Mandatsanfrage. Betrag/Intervall werden nach
  //    Mandats-Aktivierung im Webhook als Subscription angelegt.
  const brRes = await fetch(`${host}/billing_requests`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      billing_requests: {
        mandate_request: { scheme: "sepa_core", currency: "EUR" },
        // GoCardless erlaubt höchstens 3 Metadaten-Felder (vorher 4 → die
        // SEPA-Buchung wäre abgelehnt worden). Der Webhook packt "paket" aus.
        metadata: {
          email,
          paket,
          ...(ref ? { ref } : {}),
        },
      },
    }),
  });
  const br = await brRes.json().catch(() => null);
  if (!brRes.ok) throw new Error(`GoCardless BR ${brRes.status}: ${JSON.stringify(br?.error || br).slice(0, 300)}`);
  const brId = br?.billing_requests?.id;

  // 2) Billing Request Flow → gibt die Kunden-Autorisierungs-URL zurück
  const flowRes = await fetch(`${host}/billing_request_flows`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      billing_request_flows: {
        redirect_uri: `${BASE()}/mitgliedschaft?status=success&provider=gocardless`,
        exit_uri: `${BASE()}/mitgliedschaft?status=cancel`,
        prefilled_customer: { email },
        links: { billing_request: brId },
      },
    }),
  });
  const flow = await flowRes.json().catch(() => null);
  if (!flowRes.ok) throw new Error(`GoCardless Flow ${flowRes.status}: ${JSON.stringify(flow?.error || flow).slice(0, 300)}`);
  return { url: flow?.billing_request_flows?.authorisation_url };
}

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const { email: emailRoh, level, modules = [], price, method, freePaint, aufbereitung, ref: refRoh } = body || {};
  const email = String(emailRoh || "").trim().toLowerCase();
  if (!EMAIL_OK.test(email)) return json({ error: "Bitte eine gültige E-Mail-Adresse angeben." }, 400);
  if (!["stripe", "gocardless"].includes(method)) return json({ error: "method muss stripe|gocardless sein" }, 400);

  // Beitrag hier rechnen — der Browser-Preis dient nur zum Abgleich.
  const b = mitgliedsbeitrag({ level, modules, freePaint, aufbereitung });
  if (!b) return json({ error: "Unbekannte Mitgliedsstufe." }, 400);
  if (price !== undefined && Number(price) !== b.preis) {
    return json({
      error: "Der Preis hat sich gerade geändert — bitte die Seite neu laden.",
      preis: b.preis,
    }, 409);
  }
  if (!(b.preis > 0)) return json({ error: "Dieser Beitrag kann nicht online gebucht werden — bitte ruf uns an." }, 400);

  // Kompakt für GoCardless (max. 3 Felder) — Webhook liest es wieder aus.
  const paket = [
    `L${b.level}`,
    b.module.join(",") || "-",
    String(b.preis),
    b.freePaint ? "farbe" : "ohneFarbe",
    b.aufbereitung ? "aufb" : "ohneAufb",
  ].join("|");
  const arg = { email, level: b.level, modules: b.module, price: b.preis, paket, ref: refAus(refRoh) };

  try {
    const result = method === "stripe"
      ? await createStripeSession(arg)
      : await createGoCardlessFlow(arg);

    // Anbieter noch nicht konfiguriert → Frontend soll E-Mail-Flow nutzen
    if (result.fallback) return json({ fallback: true, reason: `${method} noch nicht konfiguriert` });
    if (!result.url) return json({ error: "Keine Checkout-URL erhalten" }, 502);
    return json({ url: result.url });
  } catch (err) {
    return json({ error: String(err.message).slice(0, 300) }, 500);
  }
}
