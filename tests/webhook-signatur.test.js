import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import stripeWebhook from "../api/stripe-webhook.js";
import gocardlessWebhook from "../api/gocardless-webhook.js";
import { webhookEinmal, webhookErinnerungLeeren } from "../api/_webhook-einmal.js";
import { STRIPE_TOLERANZ_SEKUNDEN, gocardlessSignaturPruefen, stripeSignaturPruefen } from "../shared/webhook-signatur.js";

const STRIPE_GEHEIMNIS = "whsec_test_nur_fuer_unit_tests";
const GC_GEHEIMNIS = "gc_test_nur_fuer_unit_tests";

beforeEach(() => {
  webhookErinnerungLeeren();
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.GOCARDLESS_WEBHOOK_SECRET;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.GOCARDLESS_ACCESS_TOKEN;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.VITE_SUPABASE_URL;
});

async function hmacHex(secret, payload) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function stripeKopf(raw, geheimnis = STRIPE_GEHEIMNIS, zeit = Math.floor(Date.now() / 1000)) {
  const hex = await hmacHex(geheimnis, `${zeit}.${raw}`);
  return { kopf: `t=${zeit},v1=${hex}`, hex, zeit };
}

function stripeAnfrage(raw, kopf) {
  return new Request("https://www.alex-autoshop.de/api/stripe-webhook", {
    method: "POST",
    headers: kopf ? { "stripe-signature": kopf } : {},
    body: raw,
  });
}

function gcAnfrage(raw, kopf) {
  return new Request("https://www.alex-autoshop.de/api/gocardless-webhook", {
    method: "POST",
    headers: kopf ? { "Webhook-Signature": kopf } : {},
    body: raw,
  });
}

test("Stripe-Signatur gilt für den Roh-Body und jede v1-Signatur", async () => {
  const raw = JSON.stringify({ id: "evt_roh", type: "invoice.paid", data: { object: {} } });
  const { kopf, hex, zeit } = await stripeKopf(raw);
  assert.equal(await stripeSignaturPruefen(raw, kopf, `  ${STRIPE_GEHEIMNIS}  `), true);
  assert.equal(await stripeSignaturPruefen(`${raw} `, kopf, STRIPE_GEHEIMNIS), false);
  assert.equal(await stripeSignaturPruefen(raw, `t=${zeit}, v1=${hex}`, STRIPE_GEHEIMNIS), true);
  const falsch = "ab".repeat(32);
  assert.equal(
    await stripeSignaturPruefen(raw, `t=${zeit},v1=${hex},v1=${falsch}`, STRIPE_GEHEIMNIS),
    true,
  );
  const alt = zeit - STRIPE_TOLERANZ_SEKUNDEN - 5;
  const altHex = await hmacHex(STRIPE_GEHEIMNIS, `${alt}.${raw}`);
  assert.equal(await stripeSignaturPruefen(raw, `t=${alt},v1=${altHex}`, STRIPE_GEHEIMNIS), false);
});

test("Stripe: fehlendes Geheimnis ist 500, falsche Signatur 400, Erfolg 200", async () => {
  const raw = JSON.stringify({
    id: "evt_mitglied_1",
    type: "checkout.session.completed",
    data: { object: { id: "cs_1", payment_status: "paid", metadata: { email: "mitglied@example.com", level: "2", price: "10" } } },
  });
  let netz = 0;
  const vorher = globalThis.fetch;
  globalThis.fetch = async () => {
    netz += 1;
    return new Response("{}", { status: 200 });
  };
  try {
    const ohne = await stripeWebhook(stripeAnfrage(raw, "t=1,v1=abc"));
    assert.equal(ohne.status, 500);
    assert.equal(await ohne.text(), "STRIPE_WEBHOOK_SECRET fehlt");
    assert.equal(netz, 0);

    process.env.STRIPE_WEBHOOK_SECRET = STRIPE_GEHEIMNIS;
    const falsch = await stripeWebhook(stripeAnfrage(raw, "t=1,v1=dead"));
    assert.equal(falsch.status, 400);
    assert.equal(netz, 0);

    const { kopf } = await stripeKopf(raw);
    const ok = await stripeWebhook(stripeAnfrage(raw, kopf));
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).duplicate, undefined);
    const nachErstem = netz;
    assert.ok(nachErstem > 0);

    const nochmal = await stripeWebhook(stripeAnfrage(raw, kopf));
    assert.equal(nochmal.status, 200);
    assert.equal((await nochmal.json()).duplicate, true);
    assert.equal(netz, nachErstem);

    const get = await stripeWebhook(new Request("https://www.alex-autoshop.de/api/stripe-webhook", { method: "GET" }));
    assert.equal(get.status, 405);

    const kaputt = await stripeWebhook(stripeAnfrage("{kein-json", (await stripeKopf("{kein-json")).kopf));
    assert.equal(kaputt.status, 400);
  } finally {
    globalThis.fetch = vorher;
  }
});

test("GoCardless: fehlendes Geheimnis ist 500, falsche Webhook-Signature ist 498", async () => {
  const raw = JSON.stringify({ events: [] });
  let netz = 0;
  const vorher = globalThis.fetch;
  globalThis.fetch = async () => {
    netz += 1;
    return new Response("{}", { status: 200 });
  };
  try {
    const ohne = await gocardlessWebhook(gcAnfrage(raw, "abc"));
    assert.equal(ohne.status, 500);
    assert.equal(await ohne.text(), "GOCARDLESS_WEBHOOK_SECRET fehlt");
    assert.equal(netz, 0);

    process.env.GOCARDLESS_WEBHOOK_SECRET = `  ${GC_GEHEIMNIS}  `;
    const hex = (await hmacHex(GC_GEHEIMNIS, raw)).toUpperCase();
    assert.equal(await gocardlessSignaturPruefen(raw, hex, GC_GEHEIMNIS), true);
    assert.equal(await gocardlessSignaturPruefen(`${raw}\n`, hex, GC_GEHEIMNIS), false);

    const falsch = await gocardlessWebhook(gcAnfrage(raw, "00".repeat(32)));
    assert.equal(falsch.status, 498);
    assert.equal(await falsch.text(), "Signatur ungültig");
    assert.equal(netz, 0);

    const ok = await gocardlessWebhook(gcAnfrage(raw, hex));
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).received, true);
    assert.equal(netz, 0);

    const get = await gocardlessWebhook(new Request("https://www.alex-autoshop.de/api/gocardless-webhook", { method: "GET" }));
    assert.equal(get.status, 405);
  } finally {
    globalThis.fetch = vorher;
  }
});

test("GoCardless-Abo ist über die Billing-Request-ID idempotent", async () => {
  process.env.GOCARDLESS_WEBHOOK_SECRET = GC_GEHEIMNIS;
  process.env.GOCARDLESS_ACCESS_TOKEN = "sandbox_" + "c".repeat(24);
  const raw = JSON.stringify({
    events: [{
      id: "EVTEST1",
      resource_type: "billing_requests",
      action: "fulfilled",
      links: { billing_request: "BRQ123" },
    }],
  });
  const hex = await hmacHex(GC_GEHEIMNIS, raw);
  const schluessel = [];
  const vorher = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const ziel = String(url);
    if (ziel.endsWith("/billing_requests/BRQ123")) {
      return Response.json({
        billing_requests: {
          id: "BRQ123",
          metadata: { email: "mitglied@example.com", paket: "L2|Autoteile|10" },
          links: { mandate_request_mandate: "MD123" },
        },
      });
    }
    if (ziel.endsWith("/subscriptions") && init?.method === "POST") {
      schluessel.push(init.headers?.["Idempotency-Key"] || "");
      return Response.json({ subscriptions: { id: "SB1" } });
    }
    return new Response("{}", { status: 200 });
  };
  try {
    const erste = await gocardlessWebhook(gcAnfrage(raw, hex));
    assert.equal(erste.status, 200);
    assert.deepEqual(schluessel, ["abo-BRQ123"]);
    const zweite = await gocardlessWebhook(gcAnfrage(raw, hex));
    assert.equal(zweite.status, 200);
    assert.equal((await zweite.json()).duplicate, true);
    assert.deepEqual(schluessel, ["abo-BRQ123"]);
  } finally {
    globalThis.fetch = vorher;
  }
});

test("Fehlgeschlagene Verarbeitung bleibt wiederholbar", async () => {
  let versuche = 0;
  await assert.rejects(webhookEinmal("stripe", "evt_fehler", async () => {
    versuche += 1;
    throw new Error("kurz weg");
  }));
  const erg = await webhookEinmal("stripe", "evt_fehler", async () => {
    versuche += 1;
  });
  assert.equal(versuche, 2);
  assert.equal(erg.doppelt, false);
  const nochmal = await webhookEinmal("stripe", "evt_fehler", async () => {
    versuche += 1;
  });
  assert.equal(nochmal.doppelt, true);
  assert.equal(versuche, 2);
});
