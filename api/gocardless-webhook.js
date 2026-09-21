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
import { EMPFEHLUNGS_PROZENT } from "../shared/empfehlung.js";

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

async function guthabenUmhaengen(alt, neu) {
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!svc || !alt || !neu) return;
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/guthaben_umhaengen`, {
    method: "POST",
    headers: { apikey: svc, Authorization: `Bearer ${svc}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_alt: alt, p_neu: neu }),
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

const gcToken = () => String(process.env.GOCARDLESS_ACCESS_TOKEN || "").trim();
// live/sandbox ergibt sich aus dem Token selbst
const gcHost = () =>
  gcToken().startsWith("live_") ||
  (!gcToken().startsWith("sandbox_") && (process.env.GOCARDLESS_ENVIRONMENT || "sandbox").toLowerCase() === "live")
    ? "https://api.gocardless.com"
    : "https://api-sandbox.gocardless.com";

const gcHeaders = () => ({
  Authorization: `Bearer ${gcToken()}`,
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

// Mitgliedschaft: seit 22.09.2026 steckt die Auswahl kompakt in "paket"
// ("L2|Autoteile,Lackfarben|180|farbe|aufb"), weil GoCardless nur 3
// Metadaten-Felder erlaubt. Ältere Anfragen hatten einzelne Felder.
function paketAuspacken(meta) {
  if (meta.paket) {
    const [l, mods, preis] = String(meta.paket).split("|");
    return {
      email: meta.email,
      level: Number(String(l || "").replace(/^L/i, "")),
      modules: mods && mods !== "-" ? mods : "",
      price: Number(preis),
      ref: meta.ref || "",
    };
  }
  return { email: meta.email, level: Number(meta.level), modules: meta.modules || "", price: Number(meta.price), ref: meta.ref || "" };
}

async function handleBillingRequestFulfilled(billingRequestId) {
  // 1) Billing Request laden → Metadaten + Mandat
  const brRes = await fetch(`${gcHost()}/billing_requests/${billingRequestId}`, { headers: gcHeaders() });
  const br = (await brRes.json().catch(() => null))?.billing_requests;
  if (!br) return;
  const meta = br.metadata || {};

  // Teile-Bestellung per SEPA: festhalten, bezahlt ist sie erst bei "confirmed".
  if (meta.typ === "teile") {
    // Reserviertes Guthaben hing an der Anfrage — ab jetzt an der Zahlung
    if (br.links?.payment_request_payment) await guthabenUmhaengen(br.id, br.links.payment_request_payment);
    await zahlungSpeichern({
      extern_id: br.links?.payment_request_payment || br.id,
      anbieter: "gocardless",
      typ: "teile",
      user_id: istUuid(meta.user_id) ? meta.user_id : null,
      betrag: Number(br.payment_request?.amount || 0) / 100,
      status: "offen",
    });
    return;
  }

  const mandateId = br.links?.mandate_request_mandate;
  const paket = paketAuspacken(meta);
  const price = paket.price;

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
            name: `Alex Autoshop Mitgliedschaft Level ${paket.level}`,
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
  if (paket.email && paket.level) {
    const r = await activateMembership({ ...paket, provider: "gocardless", providerId: mandateId });
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
      // Teile-Zahlungen: erst eingezogen zählt sie für die Zahlungsgrenze
      if (ev.resource_type === "payments") {
        const id = ev.links?.payment;
        if (["confirmed", "paid_out"].includes(ev.action)) { await zahlungStatus(id, "bezahlt"); await provisionBuchen(id); await guthabenAbschliessen(id, true); }
        if (["failed", "cancelled", "charged_back", "late_failure_settled"].includes(ev.action)) { await zahlungStatus(id, "fehlgeschlagen"); await provisionBuchen(id); await guthabenAbschliessen(id, false); }
      }
      // Lastschrift-Anfrage abgebrochen → eingesetztes Guthaben zurück
      if (ev.resource_type === "billing_requests" && ev.action === "cancelled") {
        await guthabenAbschliessen(ev.links?.billing_request, false);
      }
    } catch (e) {
      console.error("[gocardless-webhook] event error:", e.message);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
}
