import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { erfuellungGesperrt, PRODUKTIONS_SUPABASE_REF, LIVE_SHOP_PROJECT_ID } from "../shared/zahlungs-isolation.js";
import { activateMembership } from "../api/_activate-membership.js";
import membershipCheckout from "../api/membership-checkout.js";
import membershipEmail from "../api/membership-email.js";
import stripeWebhook from "../api/stripe-webhook.js";
import gocardlessWebhook from "../api/gocardless-webhook.js";

const ENV_KEYS = [
  "VERCEL_ENV",
  "SUPABASE_URL",
  "VITE_SUPABASE_URL",
  "PUBLIC_BASE_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "GOCARDLESS_ACCESS_TOKEN",
  "GOCARDLESS_WEBHOOK_SECRET",
  "GOCARDLESS_ENVIRONMENT",
  "SHOPIFY_ADMIN_TOKEN",
  "VERCEL_PROJECT_ID",
  "ZAHLUNG_WEBHOOK_HOST",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const vorherEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

function envZurueck() {
  for (const k of ENV_KEYS) {
    if (vorherEnv[k] === undefined) delete process.env[k];
    else process.env[k] = vorherEnv[k];
  }
}

function envLeeren() {
  for (const k of ENV_KEYS) delete process.env[k];
}

function post(url, raw, headers) {
  return new Request(url, {
    method: "POST",
    body: raw,
    headers: { "content-type": "application/json", ...headers },
  });
}

function stripeSignatur(secret, raw) {
  const t = String(Math.floor(Date.now() / 1000));
  const v1 = createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

function gcSignatur(secret, raw) {
  return createHmac("sha256", secret).update(raw).digest("hex");
}

const produkt = {
  aboTyp: "produkt",
  email: "isolation@example.com",
  method: "stripe",
  produkte: [{ art: "einzel", rabatt: 15, preis: 10, titel: "Testlack" }],
};

test("Zahlungs-Erfüllung auf der Vorschau", { concurrency: false }, async (t) => {
  t.after(envZurueck);

  await t.test("Produktion bleibt offen, Vorschau auf die Livedatenbank ist zu", () => {
    envLeeren();
    assert.equal(erfuellungGesperrt(), true, "ohne Live-Projekt keine Produktionsdatenbank");

    process.env.VERCEL_ENV = "production";
    process.env.VITE_SUPABASE_URL = `https://${PRODUKTIONS_SUPABASE_REF}.supabase.co`;
    assert.equal(erfuellungGesperrt(), true);

    process.env.VERCEL_PROJECT_ID = LIVE_SHOP_PROJECT_ID;
    assert.equal(erfuellungGesperrt(), false);

    process.env.VERCEL_PROJECT_ID = "prj_webhook_host_test";
    assert.equal(erfuellungGesperrt(), true, "ein anderes Projekt darf die Livedatenbank nicht beschreiben");
    process.env.VERCEL_PROJECT_ID = LIVE_SHOP_PROJECT_ID;

    process.env.VERCEL_ENV = "preview";
    assert.equal(erfuellungGesperrt(), true);

    delete process.env.VITE_SUPABASE_URL;
    assert.equal(erfuellungGesperrt(), true, "fehlende URL fällt auf das Produktionsprojekt zurück");

    process.env.SUPABASE_URL = "https://testprojekt.supabase.co";
    assert.equal(erfuellungGesperrt(), true, "ohne eigene Basis-URL würde die Live-Seite aufgerufen");

    process.env.PUBLIC_BASE_URL = "https://www.alex-autoshop.de";
    assert.equal(erfuellungGesperrt(), true);

    process.env.PUBLIC_BASE_URL = "https://alex-autoshop-medium-abc.vercel.app";
    assert.equal(erfuellungGesperrt(), true, "Vorschau schreibt nicht, auch mit Testdatenbank");
  });

  await t.test("Mitgliedschafts-Checkout öffnet keine Session ohne Schlüssel und ruft Stripe nicht auf", async () => {
    envLeeren();
    const urls = [];
    const original = globalThis.fetch;
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      throw new Error("netz");
    };
    try {
      const res = await membershipCheckout(post("https://preview.local/api/membership-checkout", JSON.stringify(produkt)));
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.equal(data.fallback, true);
      assert.deepEqual(urls, []);
    } finally {
      globalThis.fetch = original;
    }
  });

  await t.test("Hosted Checkout im Testmodus fragt nur Stripe, nicht Supabase", async () => {
    envLeeren();
    process.env.STRIPE_SECRET_KEY = "sk_test_isolation1234567890";
    const urls = [];
    const original = globalThis.fetch;
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return new Response(JSON.stringify({ url: "https://checkout.stripe.com/c/pay/cs_test_isolation", id: "cs_test_isolation" }), { status: 200 });
    };
    try {
      const res = await membershipCheckout(post("https://preview.local/api/membership-checkout", JSON.stringify(produkt)));
      const data = await res.json();
      assert.equal(data.url, "https://checkout.stripe.com/c/pay/cs_test_isolation");
      assert.equal(urls.length, 1);
      assert.match(urls[0], /^https:\/\/api\.stripe\.com\/v1\/checkout\/sessions$/);
    } finally {
      globalThis.fetch = original;
    }
  });

  await t.test("Dienstleistungs-Mitgliedschaft bleibt geschlossen", async () => {
    envLeeren();
    process.env.STRIPE_SECRET_KEY = "sk_test_isolation1234567890";
    let aufrufe = 0;
    const original = globalThis.fetch;
    globalThis.fetch = async () => { aufrufe += 1; throw new Error("netz"); };
    try {
      const res = await membershipCheckout(post("https://preview.local/api/membership-checkout", JSON.stringify({
        email: "isolation@example.com", method: "stripe", level: 1, modules: [], price: 19,
      })));
      assert.equal(res.status, 400);
      assert.equal(aufrufe, 0);
    } finally {
      globalThis.fetch = original;
    }
  });

  await t.test("Vorschau nimmt keine Mitgliedschafts-Anfrage an", async () => {
    envLeeren();
    process.env.VERCEL_ENV = "preview";
    let aufrufe = 0;
    const original = globalThis.fetch;
    globalThis.fetch = async () => { aufrufe += 1; throw new Error("netz"); };
    try {
      const res = await membershipEmail(post("https://preview.local/api/membership-email", JSON.stringify(produkt)));
      assert.equal(res.status, 409);
      assert.equal(aufrufe, 0);
      const frei = await activateMembership({ email: "isolation@example.com", level: 1, price: 19, modules: [] });
      assert.equal(frei.gesperrt, true);
      assert.equal(aufrufe, 0);
    } finally {
      globalThis.fetch = original;
    }
  });

  await t.test("Stripe-Webhook prüft die Signatur und legt auf der Vorschau nichts an", async () => {
    envLeeren();
    const secret = "whsec_test_isolation";
    process.env.STRIPE_WEBHOOK_SECRET = secret;
    process.env.VERCEL_ENV = "preview";
    const raw = JSON.stringify({
      id: "evt_test_isolation",
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_isolation", payment_status: "paid", metadata: { email: "isolation@example.com", level: "1", price: "19" } } },
    });
    let aufrufe = 0;
    const original = globalThis.fetch;
    globalThis.fetch = async () => { aufrufe += 1; throw new Error("netz"); };
    try {
      const ohne = await stripeWebhook(post("https://preview.local/api/stripe-webhook", raw, { "stripe-signature": "t=1,v1=00" }));
      assert.equal(ohne.status, 400);
      assert.equal(aufrufe, 0);

      const mit = await stripeWebhook(post("https://preview.local/api/stripe-webhook", raw, { "stripe-signature": stripeSignatur(secret, raw) }));
      assert.equal(mit.status, 200);
      assert.equal((await mit.json()).erfuellung, "gesperrt");
      assert.equal(aufrufe, 0);
    } finally {
      globalThis.fetch = original;
    }
  });

  await t.test("GoCardless-Webhook prüft die Signatur und legt auf der Vorschau nichts an", async () => {
    envLeeren();
    const secret = "gc_test_isolation_secret";
    process.env.GOCARDLESS_WEBHOOK_SECRET = secret;
    process.env.VERCEL_ENV = "preview";
    const raw = JSON.stringify({
      events: [{ resource_type: "billing_requests", action: "fulfilled", links: { billing_request: "BR123" } }],
    });
    let aufrufe = 0;
    const original = globalThis.fetch;
    globalThis.fetch = async () => { aufrufe += 1; throw new Error("netz"); };
    try {
      const ohne = await gocardlessWebhook(post("https://preview.local/api/gocardless-webhook", raw, { "webhook-signature": "00" }));
      assert.equal(ohne.status, 498);
      assert.equal(aufrufe, 0);

      const mit = await gocardlessWebhook(post("https://preview.local/api/gocardless-webhook", raw, { "webhook-signature": gcSignatur(secret, raw) }));
      assert.equal(mit.status, 200);
      assert.equal((await mit.json()).erfuellung, "gesperrt");
      assert.equal(aufrufe, 0);
    } finally {
      globalThis.fetch = original;
    }
  });

  await t.test("Gültiger Stripe-Webhook erfüllt nur außerhalb der gesperrten Vorschau", async () => {
    envLeeren();
    const secret = "whsec_test_isolation";
    process.env.STRIPE_WEBHOOK_SECRET = secret;
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_PROJECT_ID = LIVE_SHOP_PROJECT_ID;
    delete process.env.SHOPIFY_ADMIN_TOKEN;
    const raw = JSON.stringify({
      id: "evt_test_prod",
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_prod", payment_status: "paid", metadata: { email: "isolation@example.com", level: "1", modules: "", price: "19" } } },
    });
    const urls = [];
    const original = globalThis.fetch;
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return new Response("{}", { status: 200 });
    };
    try {
      const res = await stripeWebhook(post("https://shop.local/api/stripe-webhook", raw, { "stripe-signature": stripeSignatur(secret, raw) }));
      assert.equal(res.status, 200);
      assert.equal((await res.json()).received, true);
      assert.ok(urls.some((u) => u.includes("/api/membership-email")));
      assert.equal(urls.some((u) => u.includes(PRODUKTIONS_SUPABASE_REF)), false);
    } finally {
      globalThis.fetch = original;
    }
  });

  await t.test("Webhook-Host ruft die Freischaltung nicht auf der Live-Seite auf", async () => {
    envLeeren();
    process.env.ZAHLUNG_WEBHOOK_HOST = "1";
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_PROJECT_ID = "prj_webhook_host_test";
    process.env.SUPABASE_URL = "https://testprojekt.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service_role_test_nicht_echt";
    process.env.PUBLIC_BASE_URL = "https://alex-autoshop-webhooks.vercel.app";
    const urls = [];
    const original = globalThis.fetch;
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return new Response("{}", { status: 200 });
    };
    try {
      const frei = await activateMembership({ email: "isolation@example.com", level: 1, modules: [], price: 19, provider: "stripe" });
      assert.notEqual(frei.gesperrt, true);
      assert.equal(frei.membershipEmail, true);
      assert.equal(urls.some((u) => u.includes("alex-autoshop.de")), false);
      assert.equal(urls.some((u) => u.includes(PRODUKTIONS_SUPABASE_REF)), false);
    } finally {
      globalThis.fetch = original;
    }
  });

  await t.test("Webhook-Host veröffentlicht nur die zwei Signatur-Routen", async () => {
    const routen = (await readdir(new URL("../hosts/test-webhooks/api/", import.meta.url))).sort();
    assert.deepEqual(routen, ["gocardless-webhook.js", "stripe-webhook.js"]);
    await import("../hosts/test-webhooks/assemble.mjs");
    const lib = await readdir(new URL("../hosts/test-webhooks/lib/", import.meta.url));
    assert.equal(lib.includes("admin-members.js"), false);
    assert.equal(lib.includes("parts-checkout.js"), false);
    assert.equal(lib.includes("membership-checkout.js"), false);
    assert.ok(lib.includes("stripe-webhook.js"));
    assert.ok(lib.includes("gocardless-webhook.js"));
  });

  await t.test("Teile-Kasse schreibt auf der Vorschau nicht nach Supabase", () => {
    const quelle = readFileSync(new URL("../api/parts-checkout.js", import.meta.url), "utf8");
    assert.match(quelle, /async function rpc\(name, args\) \{\n  if \(erfuellungGesperrt\(\)\) return \{ ok: false, daten: null \};/);
    assert.match(quelle, /async function offeneKlaeren\(userId\) \{\n  if \(erfuellungGesperrt\(\)\) return false;/);
  });
});
