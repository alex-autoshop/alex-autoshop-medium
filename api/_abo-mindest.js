// Mindestlaufzeit am laufenden Abo.
//
// Stripe: Kündigt der Kunde vor dem dritten bezahlten Monat zum Periodenende,
// läuft das Abo bis zum Ende von Monat 3 weiter, und zwar zum höchsten
// bisherigen Monatsbeitrag. Ist das Abo schon gelöscht, stellen wir die
// offenen Monate einmalig in Rechnung und ziehen sie ein.
//
// GoCardless kennt kein cancel_at. Dort wird bei vorzeitiger Kündigung eine
// einmalige Lastschrift über die offenen Monate auf das noch gültige Mandat
// gelegt. Alte Abos ohne Kennzeichen „3“ bleiben unberührt.

import {
  MINDEST_MONATE,
  aboCentAusRechnung,
  mindestEingriff,
  standAusRechnungen,
} from "../shared/abo-laufzeit.js";

function stripeKey() {
  return String(process.env.STRIPE_SECRET_KEY || "").trim();
}

async function stripeForm(method, path, params, idempotenz) {
  const key = stripeKey();
  if (!key) return { ok: false, data: null };
  const headers = { Authorization: `Bearer ${key}` };
  if (method !== "GET") headers["Content-Type"] = "application/x-www-form-urlencoded";
  if (idempotenz) headers["Idempotency-Key"] = idempotenz;
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers,
    body: method === "GET" || !params ? undefined : new URLSearchParams(params),
  });
  const data = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, data };
}

export function hatMindestlaufzeit(meta) {
  const wert = String(meta?.mindest_monate || meta?.laufzeit || "");
  return wert === String(MINDEST_MONATE);
}

function produktId(item) {
  const product = item?.price?.product;
  if (!product) return "";
  return typeof product === "string" ? product : String(product.id || "");
}

async function rechnungsCents(subscriptionId) {
  const liste = [];
  let start = "";
  for (let seite = 0; seite < 4; seite++) {
    const query = `invoices?subscription=${encodeURIComponent(subscriptionId)}&status=paid&limit=20${start ? `&starting_after=${encodeURIComponent(start)}` : ""}`;
    const r = await stripeForm("GET", query);
    if (!r.ok || !r.data) return null;
    const data = r.data.data || [];
    for (const inv of data) {
      const cent = aboCentAusRechnung(inv);
      if (cent > 0) liste.push(cent);
    }
    if (!r.data.has_more || !data.length) break;
    start = data[data.length - 1].id;
  }
  return liste;
}

async function ausgleichsrechnung(customer, cent, subId) {
  const basis = `mindest-${subId}`;
  const posten = await stripeForm("POST", "invoiceitems", {
    customer,
    amount: String(cent),
    currency: "eur",
    description: "Produkt-Abo, offene Monate der Mindestlaufzeit",
    "metadata[ausgleich]": subId,
  }, `${basis}-posten`);
  if (!posten.ok) {
    console.error("[abo-mindest] Rechnungsposten:", posten.status, JSON.stringify(posten.data?.error || posten.data).slice(0, 240));
    return false;
  }
  const inv = await stripeForm("POST", "invoices", {
    customer,
    collection_method: "charge_automatically",
    auto_advance: "true",
    pending_invoice_items_behavior: "include",
    "metadata[ausgleich]": subId,
    "metadata[abo]": "produkt",
  }, `${basis}-rechnung`);
  if (!inv.ok || !inv.data?.id) {
    console.error("[abo-mindest] Rechnung:", inv.status, JSON.stringify(inv.data?.error || inv.data).slice(0, 240));
    return false;
  }
  const fertig = await stripeForm("POST", `invoices/${inv.data.id}/finalize`, {}, `${basis}-fest`);
  const ziel = fertig.data?.id || inv.data.id;
  const zahlung = await stripeForm("POST", `invoices/${ziel}/pay`, {}, `${basis}-zahlung`);
  if (!zahlung.ok && zahlung.status !== 402) {
    console.error("[abo-mindest] Einzug:", zahlung.status, JSON.stringify(zahlung.data?.error || zahlung.data).slice(0, 240));
  }
  return true;
}

async function bisMonatDrei(sub, eingriff) {
  const item = sub.items?.data?.[0];
  const params = {
    cancel_at: String(eingriff.cancelAt),
    cancel_at_period_end: "false",
    proration_behavior: "none",
  };
  const aktuell = Math.round(Number(item?.price?.unit_amount) || 0);
  const product = produktId(item);
  if (item?.id && product && aktuell < eingriff.preisCent) {
    params["items[0][id]"] = item.id;
    params["items[0][price_data][currency]"] = "eur";
    params["items[0][price_data][unit_amount]"] = String(eingriff.preisCent);
    params["items[0][price_data][recurring][interval]"] = "month";
    params["items[0][price_data][product]"] = product;
  }
  const r = await stripeForm("POST", `subscriptions/${encodeURIComponent(sub.id)}`, params);
  if (!r.ok) {
    console.error("[abo-mindest] Verlängern:", r.status, JSON.stringify(r.data?.error || r.data).slice(0, 240));
  }
}

/** Stripe-Abo: vorzeitige Kündigung auf Monat 3 ziehen oder die Differenz berechnen. */
export async function stripeMindestSichern(sub, geloescht) {
  if (!sub?.id || !hatMindestlaufzeit(sub.metadata)) return;
  const item = sub.items?.data?.[0];
  const preisCent = Math.round(Number(item?.price?.unit_amount) || 0);
  const cents = await rechnungsCents(sub.id);
  const stand = standAusRechnungen(cents, preisCent || Number(sub.metadata?.hoechst_cent) || 0, geloescht ? "canceled" : sub.status);
  if (!stand) {
    console.error("[abo-mindest] Rechnungen nicht lesbar:", sub.id);
    return;
  }
  const eingriff = mindestEingriff({
    mindest: true,
    geloescht: !!geloescht,
    bezahlt: stand.bezahlt,
    hoechstCent: Math.max(stand.hoechstCent, Number(sub.metadata?.hoechst_cent) || 0),
    preisCent,
    periodEnd: Number(sub.current_period_end) || 0,
    cancelAtPeriodEnd: !!sub.cancel_at_period_end,
    cancelAt: sub.cancel_at || 0,
  });
  if (eingriff.art === "rechnung") {
    const customer = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
    if (customer) await ausgleichsrechnung(customer, eingriff.cent, sub.id);
    return;
  }
  if (eingriff.art === "verlaengern") await bisMonatDrei(sub, eingriff);
}

/** Nach einer bezahlten Abo-Rechnung den Höchstbeitrag und die Zahl der Monate merken. */
export async function stripeHoechstMerken(invoice) {
  const subId = typeof invoice?.subscription === "string" ? invoice.subscription : invoice?.subscription?.id;
  if (!subId) return;
  const cent = aboCentAusRechnung(invoice);
  if (!(cent > 0)) return;
  const sub = await stripeForm("GET", `subscriptions/${encodeURIComponent(subId)}`);
  if (!sub.ok || !hatMindestlaufzeit(sub.data?.metadata)) return;
  const bisher = Math.round(Number(sub.data.metadata?.hoechst_cent) || 0);
  const monate = Math.max(0, Math.floor(Number(sub.data.metadata?.bezahlt_monate) || 0));
  const letzte = String(sub.data.metadata?.letzte_rechnung || "");
  if (letzte === invoice.id) return;
  await stripeForm("POST", `subscriptions/${encodeURIComponent(subId)}`, {
    "metadata[hoechst_cent]": String(Math.max(bisher, cent)),
    "metadata[bezahlt_monate]": String(monate + 1),
    "metadata[letzte_rechnung]": String(invoice.id || ""),
  });
}

function gcToken() {
  return String(process.env.GOCARDLESS_ACCESS_TOKEN || "").trim();
}

function gcHost() {
  const token = gcToken();
  return token.startsWith("live_") ||
    (!token.startsWith("sandbox_") && (process.env.GOCARDLESS_ENVIRONMENT || "sandbox").toLowerCase() === "live")
    ? "https://api.gocardless.com"
    : "https://api-sandbox.gocardless.com";
}

async function gcSenden(method, path, body, idempotenz) {
  const token = gcToken();
  if (!token) return null;
  const headers = {
    Authorization: `Bearer ${token}`,
    "GoCardless-Version": "2015-07-06",
    Accept: "application/json",
  };
  if (body) headers["Content-Type"] = "application/json";
  if (idempotenz) headers["Idempotency-Key"] = idempotenz;
  const r = await fetch(`${gcHost()}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, data };
}

/**
 * GoCardless: vor dem dritten erfolgreichen Einzug die offenen Monate
 * einmalig vom Mandat einziehen. Schlägt das fehl (Mandat schon weg),
 * bleibt der Fehlschlag im Log — der Webhook nimmt den Rabatt trotzdem zurück.
 */
export async function gocardlessMindestSichern(subscriptionId) {
  if (!subscriptionId || !gcToken()) return;
  const gelesen = await gcSenden("GET", `/subscriptions/${encodeURIComponent(subscriptionId)}`);
  const sub = gelesen?.data?.subscriptions;
  if (!sub || !hatMindestlaufzeit(sub.metadata)) return;
  const zahlungen = await gcSenden("GET", `/payments?subscription=${encodeURIComponent(subscriptionId)}&limit=50`);
  if (!zahlungen?.ok) {
    console.error("[abo-mindest] GoCardless-Zahlungen nicht lesbar:", subscriptionId);
    return;
  }
  const zaehlbar = new Set(["pending_submission", "submitted", "confirmed", "paid_out"]);
  const relevante = (zahlungen.data?.payments || []).filter((p) => zaehlbar.has(p.status));
  const hoechst = Math.max(Number(sub.amount) || 0, ...relevante.map((p) => Number(p.amount) || 0), 0);
  const eingriff = mindestEingriff({
    mindest: true,
    geloescht: true,
    bezahlt: relevante.length,
    hoechstCent: hoechst,
    preisCent: Number(sub.amount) || 0,
  });
  if (eingriff.art !== "rechnung") return;
  const mandat = sub.links?.mandate;
  if (!mandat) {
    console.error("[abo-mindest] kein Mandat für", subscriptionId);
    return;
  }
  const zahlung = await gcSenden("POST", "/payments", {
    payments: {
      amount: eingriff.cent,
      currency: sub.currency || "EUR",
      description: "Mindestlaufzeit Produkt-Abo",
      links: { mandate: mandat },
      metadata: {
        ausgleich: String(subscriptionId).slice(0, 50),
        email: String(sub.metadata?.email || "").slice(0, 50),
      },
    },
  }, `mindest-${subscriptionId}`);
  if (!zahlung?.ok) {
    console.error("[abo-mindest] GoCardless-Ausgleich:", zahlung?.status, JSON.stringify(zahlung?.data?.error || zahlung?.data).slice(0, 240));
  }
}
