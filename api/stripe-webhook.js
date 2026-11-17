// Stripe-Webhook — bestätigt Abo-Zahlung → schaltet Mitgliedschaft frei.
// In Stripe anlegen: Developers → Webhooks → Endpoint
//   URL:    https://www.alex-autoshop.de/api/stripe-webhook
//   Events: shared/oeffentliche-basis.js → STRIPE_WEBHOOK_EVENTS
//           (auch .env.example und docs/webhooks.md)
//   checkout.session.expired gibt eingesetztes Empfehlungs-Guthaben zurück.
//   invoice.paid schreibt den Höchstbeitrag der Mindestlaufzeit fort.
//   Abo-Ende nimmt dem Shopify-Kunden das Tag "mitglied". Eine einzelne
//   fehlgeschlagene Rate, die Stripe noch einmal versucht, tut das nicht.
//   Signing secret → Vercel-Env STRIPE_WEBHOOK_SECRET
//   Fehlt das Geheimnis: 500, nichts wird verarbeitet. Falsche Signatur: 400.

export const config = { runtime: "edge" };

import { activateMembership, activateProduktAbo } from "./_activate-membership.js";
import { hatMindestlaufzeit, stripeHoechstMerken, stripeMindestSichern } from "./_abo-mindest.js";
import { shopifyAboStufen, shopifyMitgliedTag } from "./_shopify-order.js";
import { positionenLesen, teileBestellung } from "./_teile-bestellung.js";
import { webhookEinmal } from "./_webhook-einmal.js";
import { EMPFEHLUNGS_PROZENT, empfehlungOffen } from "../shared/empfehlung.js";
import { stripeSignaturPruefen } from "../shared/webhook-signatur.js";

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

// Empfehlungs-Guthaben: bezahlt ein geworbener Kunde, bekommt sein Werber
// automatisch seinen Anteil. Einmal je Zahlung (SQL prüft das), bei einer
// geplatzten Zahlung wird die Gutschrift wieder abgezogen.
async function provisionBuchen(externId) {
  if (!empfehlungOffen()) return;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!svc || !externId) return;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/provision_buchen`, {
    method: "POST",
    headers: { apikey: svc, Authorization: `Bearer ${svc}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_extern_id: externId, p_satz: EMPFEHLUNGS_PROZENT / 100 }),
  }).catch(() => null);
  if (r && !r.ok) console.error("[provision] fehlgeschlagen:", r.status);
}

// Eingesetztes Empfehlungs-Guthaben: bezahlt → eingelöst, sonst zurück aufs Konto.
async function guthabenAbschliessen(externId, bezahlt) {
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!svc || !externId) return;
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/guthaben_abschliessen`, {
    method: "POST",
    headers: { apikey: svc, Authorization: `Bearer ${svc}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_extern: externId, p_bezahlt: !!bezahlt }),
  }).catch(() => {});
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

function istMitgliedsMeta(m) {
  if (!m || m.typ === "teile" || m.typ === "theke") return false;
  return !!(m.email && (m.level || m.paket));
}

async function mitgliedTagEntfernen(email, grund) {
  const mail = String(email || "").trim().toLowerCase();
  if (!mail) {
    console.warn("[stripe-webhook] mitglied-tag nicht entfernt, keine E-Mail:", grund);
    return;
  }
  try {
    const r = await shopifyMitgliedTag(mail, false);
    if (!r.ok) console.error("[stripe-webhook] mitglied-tag:", grund, r.grund);
    else console.log("[stripe-webhook] mitglied-tag:", grund, r.aktion);
  } catch (e) {
    console.error("[stripe-webhook] mitglied-tag:", grund, String(e?.message || e).slice(0, 200));
  }
}

async function stripeAboMeta(subscriptionId) {
  const key = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!key || !subscriptionId || typeof subscriptionId !== "string") return {};
  try {
    const r = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!r.ok) return {};
    const sub = await r.json().catch(() => null);
    return sub?.metadata || {};
  } catch {
    return {};
  }
}

async function stripeKundenEmail(customerId) {
  const key = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!key || !customerId || typeof customerId !== "string" || customerId.startsWith("{")) return "";
  try {
    const r = await fetch(`https://api.stripe.com/v1/customers/${encodeURIComponent(customerId)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!r.ok) return "";
    const c = await r.json().catch(() => null);
    return c?.email || "";
  } catch {
    return "";
  }
}

function jsonAntwort(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { "Content-Type": "application/json" },
  });
}

async function stripeEreignis(event) {
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
        if (m.typ === "teile" && (bezahlt || fehl)) await provisionBuchen(s.id);
        if (m.typ === "teile" && (bezahlt || fehl)) await guthabenAbschliessen(s.id, bezahlt);
        if (bezahlt) {
          const gelesen = positionenLesen(m.positionen);
          const addr = s.shipping_details?.address || s.customer_details?.address || {};
          await teileBestellung({
            externId: s.id,
            anbieter: "stripe",
            status: "bezahlt",
            email: s.customer_details?.email || s.customer_email || "",
            name: m.liefer_name || s.shipping_details?.name || s.customer_details?.name || "",
            strasse: m.liefer_strasse || addr.line1 || "",
            plz: m.liefer_plz || addr.postal_code || "",
            ort: m.liefer_ort || addr.city || "",
            positionen: gelesen.positionen,
            warenwert: m.summe != null && m.summe !== "" ? Number(m.summe) : null,
            versand: m.versand != null && m.versand !== "" ? Number(m.versand) : gelesen.versand,
            pfand: m.pfand != null && m.pfand !== "" ? Number(m.pfand) : gelesen.pfand,
            summe: Number(s.amount_total || 0) / 100,
            fahrzeug: m.fahrzeug || "",
            vin: m.vin || "",
          });
        }
      }
    }
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const s = event.data?.object || {};
    const m = s.metadata || {};
    const bezahlt = event.type === "checkout.session.async_payment_succeeded"
      || s.payment_status === "paid"
      || s.payment_status === "no_payment_required";
    if (m.email && m.abo === "produkt" && (bezahlt || m.einmalig == null || m.einmalig === "")) {
      if (bezahlt || event.type === "checkout.session.completed") {
        const r = await activateProduktAbo({
          email: m.email, price: m.price, stufen: m.positionen, positionen: m.positionen,
          provider: "stripe", providerId: s.subscription || s.id,
        });
        console.log("[stripe-webhook] produkt-abo:", JSON.stringify(r));
      }
    } else if (event.type === "checkout.session.completed" && m.email && m.level) {
      const r = await activateMembership({
        email: m.email, level: m.level, modules: m.modules, price: m.price,
        provider: "stripe", providerId: s.subscription || s.id, ref: m.ref || "",
      });
      console.log("[stripe-webhook] aktiviert:", JSON.stringify(r));
    }
  }

  // Erste Lastschrift der Mitgliedschaft endgültig fehlgeschlagen.
  if (event.type === "checkout.session.async_payment_failed") {
    const s = event.data?.object || {};
    const m = s.metadata || {};
    if (istMitgliedsMeta(m)) await mitgliedTagEntfernen(m.email, "async_payment_failed");
  }

  // Bezahlter Monat: Höchstbeitrag für die Mindestlaufzeit fortschreiben.
  if (event.type === "invoice.paid") {
    try {
      await stripeHoechstMerken(event.data?.object || {});
    } catch (e) {
      console.error("[stripe-webhook] höchstbeitrag:", String(e?.message || e).slice(0, 200));
    }
  }

  // Abo gekündigt, abgelaufen oder nach fehlender Zahlung beendet.
  // past_due bleibt Mitglied: Stripe versucht die Rate noch einmal.
  // Mindestlaufzeit: vor Monat 3 nicht einfach auslaufen lassen.
  if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
    const sub = event.data?.object || {};
    const status = String(sub.status || "");
    const ende = event.type === "customer.subscription.deleted"
      || ["canceled", "unpaid", "incomplete_expired"].includes(status);
    const meta = sub.metadata || {};
    const kuendigt = ende || sub.cancel_at_period_end || sub.cancel_at;
    if (kuendigt && hatMindestlaufzeit(meta)) {
      try {
        await stripeMindestSichern(sub, event.type === "customer.subscription.deleted" || status === "canceled");
      } catch (e) {
        console.error("[stripe-webhook] mindestlaufzeit:", String(e?.message || e).slice(0, 200));
        throw e;
      }
    }
    if (ende && (istMitgliedsMeta(meta) || meta.abo === "produkt")) {
      const email = meta.email || await stripeKundenEmail(sub.customer);
      await mitgliedTagEntfernen(email, `${event.type}:${status || "deleted"}`);
      if (meta.abo === "produkt") await shopifyAboStufen(email, []);
    } else if (ende) {
      console.warn("[stripe-webhook] Abo-Ende ohne Mitglieds-Metadaten:", sub.id || "");
    }
  }

  // Keine weitere Rate mehr — das Abo ist am Ende, auch wenn das Status-Event
  // später kommt. Eine Rechnung mit gesetztem nächsten Versuch bleibt unberührt.
  if (event.type === "invoice.payment_failed") {
    const inv = event.data?.object || {};
    if (!inv.next_payment_attempt) {
      let meta = inv.subscription_details?.metadata || inv.metadata || inv.lines?.data?.[0]?.metadata || {};
      if (!istMitgliedsMeta(meta) && meta.abo !== "produkt" && inv.subscription) meta = await stripeAboMeta(inv.subscription);
      if (istMitgliedsMeta(meta) || meta.abo === "produkt") {
        const email = meta.email || inv.customer_email;
        await mitgliedTagEntfernen(email, "invoice.payment_failed");
        if (meta.abo === "produkt") await shopifyAboStufen(email, []);
      }
    }
  }

}

export default async function handler(req) {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const geheimnis = String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  if (!geheimnis) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET fehlt");
    return new Response("STRIPE_WEBHOOK_SECRET fehlt", { status: 500 });
  }

  // Roh-Body: die Signatur gilt für die Bytes, nicht für neu gebautes JSON.
  const raw = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!(await stripeSignaturPruefen(raw, sig, geheimnis))) {
    return new Response("Signatur ungültig", { status: 400 });
  }

  let event;
  try { event = JSON.parse(raw); } catch { return new Response("Invalid JSON", { status: 400 }); }
  if (!event || typeof event !== "object" || typeof event.type !== "string") {
    return new Response("Invalid JSON", { status: 400 });
  }

  try {
    const erg = await webhookEinmal("stripe", event.id, () => stripeEreignis(event));
    return jsonAntwort({ received: true, ...(erg.doppelt ? { duplicate: true } : {}) });
  } catch (e) {
    console.error("[stripe-webhook]", String(e?.message || e).slice(0, 200));
    return new Response("Verarbeitung fehlgeschlagen", { status: 500 });
  }
}
