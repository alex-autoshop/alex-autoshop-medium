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
//   GOCARDLESS_ENVIRONMENT       "sandbox" | "live"   (wird sonst am Token erkannt)
//   ZAHLUNG_LIMIT_NEU            Grenze für Neukunden/Gäste in € (Standard 500)
//   ZAHLUNG_LIMIT_STAMM          Grenze nach 5 bezahlten Bestellungen an 5 Tagen (Standard 5000)
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
const MAX_SUMME = 25000; // absolute Notbremse (gilt auch an der Theke)

// ── Zahlungsgrenze: erst Vertrauen, dann höhere Beträge ─────────────────────
// Neukunden und Gäste zahlen online nur bis LIMIT_NEU. Nach 5 bezahlten
// Bestellungen an 5 verschiedenen Tagen gilt LIMIT_STAMM. Grundlage ist die
// Tabelle teile_zahlungen, die nur die Zahlungs-Webhooks beschreiben.
const zahlEnv = (name, standard) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : standard;
};
const LIMIT_NEU = () => zahlEnv("ZAHLUNG_LIMIT_NEU", 500);
const LIMIT_STAMM = () => zahlEnv("ZAHLUNG_LIMIT_STAMM", 5000);
const STAMM_AB_TAGEN = 5;

const euro = (x) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency", currency: "EUR", maximumFractionDigits: Number.isInteger(x) ? 0 : 2,
  }).format(x);

// Nur echte Schlüssel zählen. Ein Platzhalter wie "no value" in Vercel soll
// den freundlichen Hinweis zeigen, nicht einen Stripe-Fehler.
const stripeKey = () => {
  const k = String(process.env.STRIPE_SECRET_KEY || "").trim();
  return /^(sk|rk)_(live|test)_[A-Za-z0-9]{10,}$/.test(k) ? k : "";
};
const gcToken = () => {
  const t = String(process.env.GOCARDLESS_ACCESS_TOKEN || "").trim();
  return /^(live|sandbox)_[A-Za-z0-9_-]{10,}$/.test(t) ? t : "";
};
// Live oder Test ergibt sich aus dem Token selbst — eine vergessene
// GOCARDLESS_ENVIRONMENT-Variable kann so nichts mehr kaputt machen.
const gcHost = (token) => {
  if (token.startsWith("live_")) return "https://api.gocardless.com";
  if (token.startsWith("sandbox_")) return "https://api-sandbox.gocardless.com";
  return (process.env.GOCARDLESS_ENVIRONMENT || "sandbox").toLowerCase() === "live"
    ? "https://api.gocardless.com"
    : "https://api-sandbox.gocardless.com";
};

const tagInBerlin = (iso) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date(iso));

/** An wie vielen verschiedenen Tagen hat dieses Konto schon bezahlt? */
async function bezahlteTage(userId) {
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!svc || !/^[0-9a-f-]{36}$/i.test(String(userId || ""))) return 0;
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/teile_zahlungen?select=bezahlt_am,erstellt_am&user_id=eq.${userId}&status=eq.bezahlt&limit=500`,
      { headers: { apikey: svc, Authorization: `Bearer ${svc}` } },
    );
    if (!r.ok) return 0; // Tabelle fehlt noch → wie Neukunde behandeln
    const zeilen = await r.json();
    if (!Array.isArray(zeilen)) return 0;
    return new Set(zeilen.map((z) => tagInBerlin(z.bezahlt_am || z.erstellt_am))).size;
  } catch {
    return 0;
  }
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
  // x-admin-pin bewusst NICHT erlaubt: fremde Seiten sollen ihn nicht senden können.
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
  if (!token || !svc) return { level: 0, email: "", userId: "" };
  try {
    const me = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: svc, Authorization: `Bearer ${token}` },
    });
    if (!me.ok) return { level: 0, email: "", userId: "" };
    const user = await me.json();
    if (!user?.id) return { level: 0, email: "", userId: "" };

    const acc = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      headers: { apikey: svc, Authorization: `Bearer ${svc}` },
    });
    if (!acc.ok) return { level: 0, email: user.email || "", userId: user.id };
    const data = await acc.json();
    // NUR app_metadata — user_metadata kann jeder Nutzer selbst beschreiben.
    const level = Number(data?.app_metadata?.membership_level) || 0;
    return { level: level >= 1 && level <= 3 ? level : 0, email: user.email || data?.email || "", userId: user.id };
  } catch {
    return { level: 0, email: "", userId: "" };
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
async function stripeSession({ positionen, summe, email, fahrzeug, vin, theke, userId }) {
  const key = stripeKey();
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
  // Für die Zahlungsgrenze: der Webhook ordnet die Zahlung diesem Konto zu.
  if (userId) form.set("metadata[user_id]", String(userId));
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
  const key = stripeKey();
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
async function gocardlessFlow({ positionen, summe, email, fahrzeug, vin, userId }) {
  const token = gcToken();
  if (!token) return { fallback: true };
  const host = gcHost(token);
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
          // GoCardless erlaubt höchstens 3 Metadaten-Felder.
          user_id: String(userId || ""),
          positionen: [vin ? `FIN ${String(vin).slice(0, 20)}` : "", ...positionen.map((p) => `${p.quantity}x${p.articleNumber}`)]
            .filter(Boolean).join("|").slice(0, 490),
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
  // Welche Zahlarten sind eingerichtet? Nur ja/nein — keine Schlüssel.
  if (req.method === "GET") {
    return send(res, 200, { karte: !!stripeKey(), sepa: !!gcToken() });
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
    let userId = "";
    if (theke) {
      // Preisstufe und E-Mail DES KUNDEN — nicht die von Alex' Konto.
      level = theke.stufe;
      email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(theke.email) ? theke.email : "";
    } else {
      const konto = await stufeErmitteln(req.headers.authorization);
      level = konto.level;
      email = konto.email || String(emailAusFormular || "").trim();
      userId = konto.userId || "";
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

    // Zahlungsgrenze — nicht an der Theke: dort steht Alex selbst daneben.
    if (!theke) {
      const tage = await bezahlteTage(userId);
      const stamm = tage >= STAMM_AB_TAGEN;
      const grenze = stamm ? LIMIT_STAMM() : LIMIT_NEU();
      if (summe > grenze) {
        const text = stamm
          ? `Online geht es bis ${euro(grenze)}. Diese Bestellung schick uns bitte als Anfrage oder ruf an: 0202 82690.`
          : `Als Neukunde kannst du online bis ${euro(grenze)} bezahlen. Nach ${STAMM_AB_TAGEN} bezahlten Bestellungen an ` +
            `${STAMM_AB_TAGEN} verschiedenen Tagen geht es bis ${euro(LIMIT_STAMM())}` +
            (userId ? ` (bisher: ${tage} von ${STAMM_AB_TAGEN})` : " — dafür bitte mit Kundenkonto bestellen") +
            `. Diese Bestellung schick uns bitte als Anfrage oder ruf an: 0202 82690.`;
        return send(res, 409, {
          error: text,
          grenze: { betrag: grenze, tage, noetig: STAMM_AB_TAGEN, stammBetrag: LIMIT_STAMM() },
        });
      }
    }

    const arg = { positionen, summe, email, fahrzeug: vehicleLabel, vin, theke, userId };
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
