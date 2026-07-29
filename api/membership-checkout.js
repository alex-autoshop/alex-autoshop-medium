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

export const config = { runtime: "edge" };

const BASE = () => process.env.PUBLIC_BASE_URL || "https://alex-autoshop.de";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...CORS } });

// ── Stripe: Checkout Session (subscription) ──────────────────────────────────
async function createStripeSession({ email, level, modules, price }) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { fallback: true };

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
async function createGoCardlessFlow({ email, level, modules, price }) {
  const token = process.env.GOCARDLESS_ACCESS_TOKEN;
  if (!token) return { fallback: true };
  const env = (process.env.GOCARDLESS_ENVIRONMENT || "sandbox").toLowerCase();
  const host = env === "live" ? "https://api.gocardless.com" : "https://api-sandbox.gocardless.com";
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
        metadata: {
          email,
          level: String(level),
          modules: (modules || []).join(","),
          price: String(price),
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
  const { email, level, modules = [], price, method } = body || {};
  if (!email || !level || !price) return json({ error: "email, level, price erforderlich" }, 400);
  if (!["stripe", "gocardless"].includes(method)) return json({ error: "method muss stripe|gocardless sein" }, 400);

  try {
    const result = method === "stripe"
      ? await createStripeSession({ email, level, modules, price })
      : await createGoCardlessFlow({ email, level, modules, price });

    // Anbieter noch nicht konfiguriert → Frontend soll E-Mail-Flow nutzen
    if (result.fallback) return json({ fallback: true, reason: `${method} noch nicht konfiguriert` });
    if (!result.url) return json({ error: "Keine Checkout-URL erhalten" }, 502);
    return json({ url: result.url });
  } catch (err) {
    return json({ error: String(err.message).slice(0, 300) }, 500);
  }
}
