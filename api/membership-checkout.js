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

import { mitgliedsbeitrag, rabattName, DIENSTLEISTUNG_BUCHBAR } from "../shared/mitgliedspreise.js";
import { aboListeGesamt, istWunschfarbeMenge, mengenAngabeNormalisieren, warenMitRabatt, wunschfarbeAboTitel } from "../shared/produktabo.js";
import { versandkosten } from "../shared/versand.js";
import { empfehlungSichtbar } from "../shared/empfehlung.js";
import { kundeAusAnfrage, paketMitKonto } from "../shared/abo-konto.js";

const REF_OK = /^[A-Z0-9]{6,8}$/;
const refAus = (email, x) => {
  if (!empfehlungSichtbar(email)) return "";
  const r = String(x || "").trim().toUpperCase();
  return REF_OK.test(r) ? r : "";
};

const BASE = () => process.env.PUBLIC_BASE_URL || "https://alex-autoshop.de";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Stripe-Abo an das Kundenkonto hängen: E-Mail plus Konto-ID, nicht an eine frei gewählte Adresse. */
function stripeKontoSetzen(form, email, userId) {
  form.set("customer_email", email);
  form.set("client_reference_id", String(userId || ""));
  form.set("metadata[email]", email);
  form.set("metadata[user_id]", String(userId || ""));
  form.set("subscription_data[metadata][email]", email);
  form.set("subscription_data[metadata][user_id]", String(userId || ""));
}
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...CORS } });

// ── Stripe: Checkout Session (subscription) ──────────────────────────────────
async function createStripeSession({ email, userId, level, modules, price, paket, ref, titel }) {
  const key = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!/^(sk|rk)_(live|test)_[A-Za-z0-9]{10,}$/.test(key)) return { fallback: true };

  const cents = Math.round(Number(price) * 100);
  const form = new URLSearchParams();
  form.set("mode", "subscription");
  stripeKontoSetzen(form, email, userId);
  form.set("success_url", `${BASE()}/mitgliedschaft?status=success&session_id={CHECKOUT_SESSION_ID}`);
  form.set("cancel_url", `${BASE()}/mitgliedschaft?status=cancel`);
  form.set("line_items[0][quantity]", "1");
  form.set("line_items[0][price_data][currency]", "eur");
  form.set("line_items[0][price_data][recurring][interval]", "month");
  form.set("line_items[0][price_data][unit_amount]", String(cents));
  form.set("line_items[0][price_data][product_data][name]", titel || `Alex Autoshop Mitgliedschaft — ${rabattName(level)}`);
  form.set("line_items[0][price_data][product_data][description]", `Module: ${(modules || []).join(", ") || "Basis"}`);
  // Metadaten für den Webhook (Aktivierung + Shopify-Bestellung)
  form.set("metadata[level]", String(level));
  form.set("metadata[modules]", (modules || []).join(","));
  form.set("metadata[price]", String(price));
  form.set("metadata[paket]", paket);
  if (ref) form.set("metadata[ref]", ref);
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

async function createProduktSession({ email, userId, price, zeilen, positionen, ref }) {
  const key = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!/^(sk|rk)_(live|test)_[A-Za-z0-9]{10,}$/.test(key)) return { fallback: true };
  const form = new URLSearchParams();
  form.set("mode", "subscription");
  stripeKontoSetzen(form, email, userId);
  form.set("success_url", `${BASE()}/mitgliedschaft?status=success&session_id={CHECKOUT_SESSION_ID}`);
  form.set("cancel_url", `${BASE()}/mitgliedschaft?status=cancel`);
  zeilen.forEach((z, i) => {
    form.set(`line_items[${i}][quantity]`, "1");
    form.set(`line_items[${i}][price_data][currency]`, "eur");
    form.set(`line_items[${i}][price_data][recurring][interval]`, "month");
    form.set(`line_items[${i}][price_data][unit_amount]`, String(Math.round(z.betrag * 100)));
    form.set(`line_items[${i}][price_data][product_data][name]`, z.name);
  });
  form.set("metadata[abo]", "produkt");
  form.set("metadata[price]", String(price));
  form.set("metadata[positionen]", positionen);
  form.set("subscription_data[metadata][abo]", "produkt");
  form.set("subscription_data[metadata][price]", String(price));
  form.set("subscription_data[metadata][positionen]", positionen);
  if (ref) form.set("metadata[ref]", ref);
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${JSON.stringify(data?.error || data).slice(0, 300)}`);
  return { url: data.url };
}

/** Eine Zahlung: Abo monatlich wiederkehrend, Ware einmalig auf der ersten Rechnung. */
async function createWarenAboSession({ email, userId, monat, waren, versand, positionen, ref }) {
  const key = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!/^(sk|rk)_(live|test)_[A-Za-z0-9]{10,}$/.test(key)) return { fallback: true };
  const form = new URLSearchParams();
  form.set("mode", "subscription");
  form.set("locale", "de");
  stripeKontoSetzen(form, email, userId);
  form.set("success_url", `${BASE()}/warenkorb?status=success&session_id={CHECKOUT_SESSION_ID}`);
  form.set("cancel_url", `${BASE()}/warenkorb?status=cancel`);
  form.set("line_items[0][quantity]", "1");
  form.set("line_items[0][price_data][currency]", "eur");
  form.set("line_items[0][price_data][recurring][interval]", "month");
  form.set("line_items[0][price_data][unit_amount]", String(Math.round(Number(monat) * 100)));
  form.set("line_items[0][price_data][product_data][name]", "Produkt-Abo, monatlich kündbar");
  let zeile = 1;
  const einmaligDazu = (name, betrag) => {
    form.set(`line_items[${zeile}][quantity]`, "1");
    form.set(`line_items[${zeile}][price_data][currency]`, "eur");
    form.set(`line_items[${zeile}][price_data][unit_amount]`, String(Math.round(Number(betrag) * 100)));
    form.set(`line_items[${zeile}][price_data][product_data][name]`, String(name).slice(0, 120));
    zeile += 1;
  };
  waren.forEach((w) => {
    einmaligDazu(w.menge > 1 ? `${w.menge}× ${w.titel}` : w.titel, w.betrag);
  });
  if (versand > 0) einmaligDazu("Versand", versand);
  const einmalig = Math.round((waren.reduce((s, w) => s + Number(w.betrag), 0) + Number(versand || 0)) * 100) / 100;
  const monatText = Number(monat).toFixed(2).replace(".", ",");
  const wareText = einmalig.toFixed(2).replace(".", ",");
  form.set("custom_text[submit][message]", `Zahlungspflichtig bestellen. Einmalig ${wareText} €, dazu ${monatText} € im Monat. Monatlich kündbar, keine Mindestlaufzeit.`);
  form.set("metadata[abo]", "produkt");
  form.set("metadata[price]", String(monat));
  form.set("metadata[einmalig]", String(einmalig));
  form.set("metadata[positionen]", positionen);
  form.set("subscription_data[metadata][abo]", "produkt");
  form.set("subscription_data[metadata][price]", String(monat));
  form.set("subscription_data[metadata][positionen]", positionen);
  if (ref) form.set("metadata[ref]", ref);
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2024-06-20",
    },
    body: form,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${JSON.stringify(data?.error || data).slice(0, 300)}`);
  return { url: data.url };
}

async function createProduktFlow({ email, userId, price, paket, positionen }) {
  const token = String(process.env.GOCARDLESS_ACCESS_TOKEN || "").trim();
  if (!/^(live|sandbox)_[A-Za-z0-9_-]{10,}$/.test(token)) return { fallback: true };
  const host = token.startsWith("live_") ? "https://api.gocardless.com" : "https://api-sandbox.gocardless.com";
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
        metadata: {
          email,
          paket: paketMitKonto(paket, userId),
          positionen: String(positionen || "").slice(0, 200),
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
        redirect_uri: `${BASE()}/mitgliedschaft?status=success&provider=gocardless`,
        exit_uri: `${BASE()}/mitgliedschaft?status=cancel`,
        prefilled_customer: { email },
        links: { billing_request: br?.billing_requests?.id },
      },
    }),
  });
  const flow = await flowRes.json().catch(() => null);
  if (!flowRes.ok) throw new Error(`GoCardless Flow ${flowRes.status}: ${JSON.stringify(flow?.error || flow).slice(0, 300)}`);
  return { url: flow?.billing_request_flows?.authorisation_url };
}

// ── GoCardless: Billing Request + Flow (SEPA-Mandat) ─────────────────────────
async function createGoCardlessFlow({ email, userId, level, modules, price, paket, ref, titel }) {
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
          paket: paketMitKonto(paket, userId),
          ...(ref ? { ref } : { user_id: String(userId || "") }),
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
  const konto = await kundeAusAnfrage(req);
  if (!konto.ok) return json({ error: konto.error }, konto.status);
  // Adresse und Konto kommen aus der Sitzung. Eine mitgeschickte E-Mail wird ignoriert.
  const email = konto.email;
  const userId = konto.userId;
  const { level, modules = [], price, method, freePaint, aufbereitung, ref: refRoh,
          aboTyp, rabatt, produkte = [], waren, einmalig } = body || {};
  if (!["stripe", "gocardless"].includes(method)) return json({ error: "method muss stripe|gocardless sein" }, 400);

  // ── Produkt-Abo: eigener Weg. Die Dienstleistungs-Mitgliedschaft unten bleibt unberührt. ──
  if (aboTyp === "produkt") {
    const liste = (Array.isArray(produkte) ? produkte : []).map((p) => {
      const art = p?.art === "menge" || p?.einzelpreis != null ? "menge" : "einzel";
      const norm = art === "menge" ? mengenAngabeNormalisieren({ ...p, art }) : p;
      const zeile = {
        art,
        handle: norm?.handle,
        id: norm?.id,
        rabatt: norm?.rabatt,
        preis: norm?.preis,
        einzelpreis: norm?.einzelpreis,
        menge: norm?.menge,
        lacksystem: art === "menge" ? norm?.lacksystem : undefined,
      };
      const dyn = istWunschfarbeMenge(zeile) ? wunschfarbeAboTitel(zeile.rabatt, zeile.menge) : null;
      return {
        ...zeile,
        titel: String(dyn || norm?.titel || norm?.handle || "Produkt").slice(0, 120),
      };
    });
    const g = aboListeGesamt(liste);
    if (!g) return json({ error: "Unbekannte Rabattstufe oder leere Produktliste." }, 400);
    if (price !== undefined && Number(price) !== g.beitrag) {
      return json({ error: "Der Preis hat sich gerade geändert — bitte die Seite neu laden.", preis: g.beitrag }, 409);
    }
    const zeilen = liste.map((p, i) => ({
      name: istWunschfarbeMenge(p)
        ? p.titel
        : [p.titel, p.lacksystem, `${p.rabatt} %`].filter(Boolean).join(" · "),
      betrag: g.zeilen[i].beitrag,
    }));
    const positionen = liste.map((p) => (
      p.lacksystem ? `${p.titel} (${p.lacksystem}):${p.rabatt}` : `${p.titel}:${p.rabatt}`
    )).join(";").slice(0, 450);
    const stufen = [...new Set(liste.map((p) => p.rabatt))].join(",");
    const paket = paketMitKonto(["Pmix", String(g.beitrag), stufen].join("|"), userId);
    const wareDabei = Array.isArray(waren) && waren.length > 0;
    try {
      if (wareDabei) {
        if (method !== "stripe") return json({ error: "Ware und Abo werden zusammen nur per Karte abgeschlossen." }, 400);
        const gerechnet = warenMitRabatt(waren.map((w) => ({
          titel: w?.titel,
          einzel: w?.einzel,
          menge: w?.menge,
          rabatt: w?.rabatt,
        })));
        if (!gerechnet) return json({ error: "Die Warenpreise sind unvollständig." }, 400);
        const versand = versandkosten({ summe: gerechnet.summe });
        const summe = Math.round((gerechnet.summe + versand) * 100) / 100;
        if (einmalig !== undefined && Number(einmalig) !== summe) {
          return json({ error: "Der Warenpreis hat sich gerade geändert — bitte die Seite neu laden.", einmalig: summe }, 409);
        }
        const r = await createWarenAboSession({
          email, userId, monat: g.beitrag, waren: gerechnet.positionen, versand, positionen, ref: refAus(email, refRoh),
        });
        if (r.fallback) return json({ fallback: true, reason: "stripe noch nicht konfiguriert" });
        if (!r.url) return json({ error: "Keine Checkout-URL erhalten" }, 502);
        return json({ url: r.url });
      }
      const r = method === "stripe"
        ? await createProduktSession({ email, userId, price: g.beitrag, zeilen, positionen, ref: refAus(email, refRoh) })
        : await createProduktFlow({ email, userId, price: g.beitrag, paket, positionen });
      if (r.fallback) return json({ fallback: true, reason: `${method} noch nicht konfiguriert` });
      if (!r.url) return json({ error: "Keine Checkout-URL erhalten" }, 502);
      return json({ url: r.url });
    } catch (err) {
      return json({ error: String(err.message).slice(0, 300) }, 500);
    }
  }

  // Die Dienstleistungs-Mitgliedschaft wird gerade nicht angeboten. Bestehende
  // Mitglieder sind davon nicht betroffen — nur Neubuchungen sind zu.
  if (!DIENSTLEISTUNG_BUCHBAR) {
    return json({ error: "Diese Mitgliedschaft wird gerade nicht angeboten. Ruf uns an: 0202 82690." }, 400);
  }

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
  const paket = paketMitKonto([
    `L${b.level}`,
    b.module.join(",") || "-",
    String(b.preis),
    b.freePaint ? "farbe" : "ohneFarbe",
    b.aufbereitung ? "aufb" : "ohneAufb",
  ].join("|"), userId);
  const arg = { email, userId, level: b.level, modules: b.module, price: b.preis, paket, ref: refAus(email, refRoh) };

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
