// ─────────────────────────────────────────────────────────────────────────────
// Teilebörse-Checkout — aus dem Teile-Warenkorb wird eine bezahlbare URL.
//
//   method="stripe"     → Stripe Checkout Session (Einmalzahlung) → { url }
//   method="gocardless" → GoCardless Billing Request (SEPA)       → { url }
//
// GRUNDREGEL: Der Browser darf KEINEN Betrag mitschicken.
// Er schickt nur Artikelnummer, Marke und Menge. Preis und Mitgliedsstufe
// holt dieser Server selbst — sonst kauft sich jemand den Lüfter für 1 Euro,
// indem er den Request in den Entwicklertools umschreibt.
//
// MWST: Inter Cars liefert "Gross" INKLUSIVE MwSt — nachgemessen am 17.09.2026:
//   listPriceNet 39,87 × 1,19 = listPriceGross 47,45, vatPercentage 19,00.
// Der Aufschlag in api/intercars.js rechnet auf diesem Brutto-Wert. Die Preise
// in der Teilebörse enthalten die MwSt also bereits. Hier wird deshalb NICHTS
// mehr aufgeschlagen — sonst zahlt der Kunde die 19 % doppelt.
//
// Vercel-Env-Vars:
//   STRIPE_SECRET_KEY            sk_test_… / sk_live_…
//   GOCARDLESS_ACCESS_TOKEN      sandbox_… / live_…
//   GOCARDLESS_ENVIRONMENT       "sandbox" | "live"   (Default: sandbox)
//   SUPABASE_SERVICE_ROLE_KEY    für die Mitgliedsstufe
//   PUBLIC_BASE_URL              z.B. https://alex-autoshop.de
//   ADMIN_PIN                    für den Ladenverkauf (siehe unten)
//
// LADENVERKAUF ("theke"): Alex bestellt im Laden für den Kunden vor ihm.
//   Dann darf der Browser die Preisstufe DES KUNDEN mitschicken — aber nur,
//   wenn api/_admin.js bestätigt, dass Alex selbst am Rechner sitzt
//   (Admin-Sitzung + PIN). Ohne das wird "theke" abgelehnt, nicht ignoriert.
//   Der Kunde zahlt per QR-Code am eigenen Handy; method="status" sagt Alex,
//   ob die Zahlung durch ist.
// ─────────────────────────────────────────────────────────────────────────────

import { adminPruefen } from "./_admin.js";

const BASE = () => (process.env.PUBLIC_BASE_URL || "https://alex-autoshop.de").replace(/\/+$/, "");
const SUPABASE_URL = process.env.SUPABASE_URL || "https://zasbdvtsxgimcezotlsi.supabase.co";

// Muss mit MEMBER_LEVELS in src/components/TeileportalPricing.tsx übereinstimmen.
const STUFEN = { 1: 15, 2: 28, 3: 40 };
const mitgliedspreis = (grund, pct) => Math.ceil(grund * (1 - pct / 100) * 100) / 100;

const MAX_POSITIONEN = 50;
const MAX_MENGE = 99;
const MAX_SUMME = 25000; // Notbremse: darüber wird nicht online bezahlt

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
  // x-admin-pin bewusst NICHT erlaubt: fremde Seiten sollen ihn nicht senden können.
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function send(res, status, obj) {
  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(status).send(JSON.stringify(obj));
}

// ── Mitgliedsstufe aus dem Konto lesen (nicht aus dem Token — der kann alt sein)
async function stufeErmitteln(authHeader) {
  const token = (authHeader || "").startsWith("Bearer ") ? authHeader.slice(7) : "";
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Gäste dürfen kaufen — dann eben ohne Rabatt.
  if (!token || !svc) return { level: 0, email: "" };
  try {
    const me = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: svc, Authorization: `Bearer ${token}` },
    });
    if (!me.ok) return { level: 0, email: "" };
    const user = await me.json();
    if (!user?.id) return { level: 0, email: "" };

    const acc = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      headers: { apikey: svc, Authorization: `Bearer ${svc}` },
    });
    if (!acc.ok) return { level: 0, email: user.email || "" };
    const data = await acc.json();
    const level = Number(data?.user_metadata?.membership_level) || 0;
    return { level: level >= 1 && level <= 3 ? level : 0, email: user.email || data?.email || "" };
  } catch {
    return { level: 0, email: "" };
  }
}

// ── Preis serverseitig neu auflösen — exakt der Weg, den auch die Liste geht ──
async function preisHolen(articleNumber, brand, origin) {
  try {
    const r = await fetch(`${origin}/api/intercars`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "searchByIndex", index: articleNumber }),
    });
    if (!r.ok) return null;
    const list = await r.json();
    if (!Array.isArray(list) || list.length === 0) return null;

    // Bevorzugt derselbe Hersteller wie im Warenkorb, sonst der erste Treffer.
    const gleich = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
    const treffer = list.find((x) => gleich(x.brand, brand)) || list[0];
    const p = Number(treffer?.price) || 0;
    return p > 0
      ? { price: p, name: treffer.name || "", brand: treffer.brand || brand || "", sku: treffer._sku || "" }
      : null;
  } catch {
    return null;
  }
}

// ── Stripe: Einmalzahlung ────────────────────────────────────────────────────
async function stripeSession({ positionen, summe, email, fahrzeug, vin, theke }) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { fallback: true };

  const form = new URLSearchParams();
  form.set("mode", "payment");
  if (email) form.set("customer_email", email);
  if (theke) {
    // Kunde steht im Laden und nimmt das Teil mit bzw. holt es ab:
    // keine Lieferadresse, und der QR-Code verfällt nach 30 Minuten
    // (Stripe verlangt mindestens 30 — 31 mit Puffer).
    form.set("success_url", `${BASE()}/teileboerse?zahlung=ok&theke=1`);
    form.set("cancel_url", `${BASE()}/teileboerse?zahlung=abbruch&theke=1`);
    form.set("billing_address_collection", "auto");
    form.set("expires_at", String(Math.floor(Date.now() / 1000) + 31 * 60));
  } else {
    form.set("success_url", `${BASE()}/teileboerse?zahlung=ok&session_id={CHECKOUT_SESSION_ID}`);
    form.set("cancel_url", `${BASE()}/teileboerse?zahlung=abbruch`);
    form.set("billing_address_collection", "required");
    form.set("shipping_address_collection[allowed_countries][0]", "DE");
    form.set("shipping_address_collection[allowed_countries][1]", "AT");
  }

  positionen.forEach((pos, i) => {
    form.set(`line_items[${i}][quantity]`, String(pos.quantity));
    form.set(`line_items[${i}][price_data][currency]`, "eur");
    form.set(`line_items[${i}][price_data][unit_amount]`, String(Math.round(pos.einzel * 100)));
    form.set(`line_items[${i}][price_data][product_data][name]`, `${pos.brand} ${pos.name}`.trim().slice(0, 120));
    form.set(
      `line_items[${i}][price_data][product_data][description]`,
      `Art.-Nr. ${pos.articleNumber} · inkl. 19 % MwSt`.slice(0, 200),
    );
  });

  // Kompakte Metadaten — Stripe erlaubt 500 Zeichen pro Wert.
  form.set("metadata[typ]", theke ? "theke" : "teile");
  if (theke) {
    form.set("metadata[kunde]", String(theke.kunde || "").slice(0, 120));
    form.set("metadata[stufe]", String(theke.stufe || 0));
    form.set("metadata[verkauft_von]", String(theke.von || "").slice(0, 120));
  }
  form.set("metadata[fahrzeug]", String(fahrzeug || "").slice(0, 200));
  form.set("metadata[vin]", String(vin || "").slice(0, 40));
  form.set("metadata[summe]", summe.toFixed(2));
  form.set(
    "metadata[positionen]",
    positionen.map((p) => `${p.quantity}x${p.articleNumber}@${p.einzel.toFixed(2)}`).join("|").slice(0, 480),
  );

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${JSON.stringify(data?.error || data).slice(0, 300)}`);
  return { url: data.url, sessionId: data.id };
}

// ── Ladenverkauf: ist die QR-Zahlung durch? ──────────────────────────────────
async function stripeStatus(sessionId) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { fallback: true };
  const id = String(sessionId || "");
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return { error: "Ungültige Sitzung." };
  const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${id}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const d = await r.json().catch(() => null);
  if (!r.ok) return { error: `Stripe ${r.status}` };
  return {
    bezahlt: d?.payment_status === "paid",
    status: d?.status || "",
    betrag: Number(d?.amount_total || 0) / 100,
  };
}

// ── GoCardless: einmalige SEPA-Zahlung ───────────────────────────────────────
async function gocardlessFlow({ positionen, summe, email, fahrzeug, vin }) {
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

  const brRes = await fetch(`${host}/billing_requests`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      billing_requests: {
        mandate_request: { scheme: "sepa_core", currency: "EUR" },
        payment_request: {
          description: `Alex Autoshop Teilebestellung${fahrzeug ? ` — ${fahrzeug}` : ""}`.slice(0, 100),
          amount: Math.round(summe * 100),
          currency: "EUR",
          scheme: "sepa_core",
        },
        metadata: {
          typ: "teile",
          vin: String(vin || "").slice(0, 40),
          positionen: positionen.map((p) => `${p.quantity}x${p.articleNumber}`).join("|").slice(0, 490),
        },
      },
    }),
  });
  const br = await brRes.json().catch(() => null);
  if (!brRes.ok) throw new Error(`GoCardless BR ${brRes.status}: ${JSON.stringify(br?.error || br).slice(0, 300)}`);

  const flowRes = await fetch(`${host}/billing_request_flows`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      billing_request_flows: {
        redirect_uri: `${BASE()}/teileboerse?zahlung=ok&anbieter=gocardless`,
        exit_uri: `${BASE()}/teileboerse?zahlung=abbruch`,
        ...(email ? { prefilled_customer: { email } } : {}),
        links: { billing_request: br?.billing_requests?.id },
      },
    }),
  });
  const flow = await flowRes.json().catch(() => null);
  if (!flowRes.ok) throw new Error(`GoCardless Flow ${flowRes.status}: ${JSON.stringify(flow?.error || flow).slice(0, 300)}`);
  return { url: flow?.billing_request_flows?.authorisation_url };
}

// ─────────────────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
    return res.status(204).end();
  }
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  } catch {
    return send(res, 400, { error: "Ungültige Anfrage." });
  }
  if (!body || typeof body !== "object") return send(res, 400, { error: "Ungültige Anfrage." });
  const { items, method, email: emailAusFormular, vehicleLabel, vin, theke: thekeRoh, sessionId } = body;

  // ── Ladenverkauf: nur Alex. Geprüft wird VOR allem anderen. ─────────────────
  let theke = null;
  if (thekeRoh || method === "status") {
    const zugang = await adminPruefen(req);
    if (!zugang.ok) return send(res, zugang.status, { error: zugang.error, pinFalsch: !!zugang.pinFalsch });
    if (method === "status") {
      try {
        const st = await stripeStatus(sessionId);
        if (st.fallback) return send(res, 200, { fallback: true });
        if (st.error) return send(res, 400, { error: st.error });
        return send(res, 200, st);
      } catch (err) {
        return send(res, 500, { error: String(err?.message || err).slice(0, 200) });
      }
    }
    const stufe = Math.floor(Number(thekeRoh?.stufe));
    theke = {
      stufe: stufe >= 1 && stufe <= 3 ? stufe : 0,
      kunde: String(thekeRoh?.kunde || "").trim().slice(0, 120),
      email: String(thekeRoh?.email || "").trim().slice(0, 200),
      von: zugang.email,
    };
    if (method !== "stripe") return send(res, 400, { error: "Im Laden geht nur die Kartenzahlung per QR-Code." });
  }

  if (!Array.isArray(items) || items.length === 0) return send(res, 400, { error: "Warenkorb ist leer." });
  if (items.length > MAX_POSITIONEN) return send(res, 400, { error: "Zu viele Positionen." });
  if (!["stripe", "gocardless"].includes(method)) return send(res, 400, { error: "method muss stripe|gocardless sein." });

  const origin = BASE();

  try {
    let level;
    let email;
    if (theke) {
      // Preisstufe und E-Mail DES KUNDEN — nicht die von Alex' Konto.
      level = theke.stufe;
      email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(theke.email) ? theke.email : "";
    } else {
      const konto = await stufeErmitteln(req.headers.authorization);
      level = konto.level;
      email = konto.email || String(emailAusFormular || "").trim();
    }
    const pct = STUFEN[level] || 0;

    // Preise parallel neu auflösen — der Client-Preis wird bewusst ignoriert.
    const aufgeloest = await Promise.all(
      items.slice(0, MAX_POSITIONEN).map(async (i) => {
        const artNr = String(i?.articleNumber || "").trim();
        const menge = Math.min(MAX_MENGE, Math.max(1, Math.floor(Number(i?.quantity) || 1)));
        if (!artNr) return null;
        const p = await preisHolen(artNr, i?.brand, origin);
        if (!p) return { articleNumber: artNr, quantity: menge, ohnePreis: true };
        const einzel = pct > 0 ? mitgliedspreis(p.price, pct) : p.price;
        return {
          articleNumber: artNr,
          quantity: menge,
          name: p.name || String(i?.name || ""),
          brand: p.brand,
          listenpreis: p.price,
          einzel,
        };
      }),
    );

    const positionen = aufgeloest.filter((p) => p && !p.ohnePreis);
    const ohnePreis = aufgeloest.filter((p) => p && p.ohnePreis).map((p) => p.articleNumber);

    if (positionen.length === 0) {
      return send(res, 409, {
        error: "Für keine Position konnte ein Preis bestätigt werden.",
        ohnePreis,
      });
    }

    const summe = Math.round(positionen.reduce((s, p) => s + p.einzel * p.quantity, 0) * 100) / 100;
    if (!(summe > 0)) return send(res, 409, { error: "Summe ist null." });
    if (summe > MAX_SUMME) {
      return send(res, 409, { error: "Der Betrag ist zu hoch für die Online-Zahlung — bitte ruf uns an." });
    }

    const arg = { positionen, summe, email, fahrzeug: vehicleLabel, vin, theke };
    const ergebnis = method === "stripe" ? await stripeSession(arg) : await gocardlessFlow(arg);

    if (ergebnis.fallback) {
      return send(res, 200, { fallback: true, grund: `${method} ist noch nicht konfiguriert.` });
    }
    if (!ergebnis.url) return send(res, 502, { error: "Keine Zahlungs-URL erhalten." });

    return send(res, 200, {
      url: ergebnis.url,
      ...(theke ? { sessionId: ergebnis.sessionId } : {}),
      summe,
      level,
      rabattProzent: pct,
      positionen: positionen.length,
      ohnePreis,
    });
  } catch (err) {
    return send(res, 500, { error: String(err?.message || err).slice(0, 300) });
  }
}
