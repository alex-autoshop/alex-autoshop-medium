import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  GOCARDLESS_WEBHOOK_AKTIONEN,
  OEFFENTLICHE_BASIS_DEFAULT,
  STRIPE_WEBHOOK_EVENTS,
  WEBHOOK_GOCARDLESS_URL,
  WEBHOOK_STRIPE_URL,
  oeffentlicheBasis,
} from "../shared/oeffentliche-basis.js";
import checkout from "../api/membership-checkout.js";

const WWW = "https://www.alex-autoshop.de";

function mitBasis(wert, fn) {
  const alt = process.env.PUBLIC_BASE_URL;
  if (wert === undefined) delete process.env.PUBLIC_BASE_URL;
  else process.env.PUBLIC_BASE_URL = wert;
  try {
    return fn();
  } finally {
    if (alt === undefined) delete process.env.PUBLIC_BASE_URL;
    else process.env.PUBLIC_BASE_URL = alt;
  }
}

test("Default und Apex zeigen auf www, andere Hosts bleiben", () => {
  assert.equal(OEFFENTLICHE_BASIS_DEFAULT, WWW);
  assert.equal(WEBHOOK_STRIPE_URL, `${WWW}/api/stripe-webhook`);
  assert.equal(WEBHOOK_GOCARDLESS_URL, `${WWW}/api/gocardless-webhook`);
  mitBasis(undefined, () => {
    assert.equal(oeffentlicheBasis(), WWW);
  });
  mitBasis("https://alex-autoshop.de", () => {
    assert.equal(oeffentlicheBasis(), WWW);
  });
  mitBasis("https://alex-autoshop.de/", () => {
    assert.equal(oeffentlicheBasis(), WWW);
  });
  mitBasis("https://www.alex-autoshop.de/", () => {
    assert.equal(oeffentlicheBasis(), WWW);
  });
  mitBasis("https://preview.example.test/shop/", () => {
    assert.equal(oeffentlicheBasis(), "https://preview.example.test/shop");
  });
});

test("Doku nennt Webhook-URLs und jedes Stripe-Event inklusive invoice.paid", () => {
  const beispiel = readFileSync(".env.example", "utf8");
  const doku = readFileSync("docs/webhooks.md", "utf8");
  const handler = readFileSync("api/stripe-webhook.js", "utf8");
  for (const text of [beispiel, doku]) {
    assert.match(text, /https:\/\/www\.alex-autoshop\.de\/api\/stripe-webhook/);
    assert.match(text, /https:\/\/www\.alex-autoshop\.de\/api\/gocardless-webhook/);
    for (const event of STRIPE_WEBHOOK_EVENTS) assert.ok(text.includes(event), event);
    for (const eintrag of GOCARDLESS_WEBHOOK_AKTIONEN) {
      assert.ok(text.includes(eintrag.ressource), eintrag.ressource);
      for (const aktion of eintrag.aktionen) assert.ok(text.includes(aktion), aktion);
    }
  }
  assert.ok(STRIPE_WEBHOOK_EVENTS.includes("invoice.paid"));
  for (const event of STRIPE_WEBHOOK_EVENTS) assert.ok(handler.includes(event), event);
  assert.equal(beispiel.includes("https://alex-autoshop.de/api/"), false);
});

test("ignoreCommand gilt nur für das Test-Webhook-Projekt", () => {
  const haupt = JSON.parse(readFileSync("vercel.json", "utf8"));
  const testProjekt = JSON.parse(readFileSync("hosts/test-webhooks/vercel.json", "utf8"));
  assert.equal(haupt.ignoreCommand, undefined);
  assert.equal(testProjekt.ignoreCommand, "node ignore-build.js");
  const lauf = spawnSync(process.execPath, ["ignore-build.js"], { cwd: "hosts/test-webhooks" });
  assert.equal(lauf.status, 0);
});

test("Checkout-Rücksprung nutzt www, auch wenn PUBLIC_BASE_URL noch die Apex ist", async () => {
  const altKey = process.env.STRIPE_SECRET_KEY;
  const altGc = process.env.GOCARDLESS_ACCESS_TOKEN;
  const altBasis = process.env.PUBLIC_BASE_URL;
  process.env.STRIPE_SECRET_KEY = "sk_test_" + "a".repeat(24);
  process.env.GOCARDLESS_ACCESS_TOKEN = "sandbox_" + "b".repeat(24);
  process.env.PUBLIC_BASE_URL = "https://alex-autoshop.de";
  const vorher = globalThis.fetch;
  const stripeBodies = [];
  const gcBodies = [];
  globalThis.fetch = async (url, init) => {
    const ziel = String(url);
    if (ziel.endsWith("/auth/v1/user")) return Response.json({ id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", email: "mitglied@example.com" });
    if (ziel.includes("api.stripe.com")) {
      stripeBodies.push(String(init?.body || ""));
      return Response.json({ url: "https://checkout.example/karte" });
    }
    if (ziel.includes("billing_requests")) {
      gcBodies.push(String(init?.body || ""));
      return Response.json({ billing_requests: { id: "BR1" } });
    }
    if (ziel.includes("billing_request_flows")) {
      gcBodies.push(String(init?.body || ""));
      return Response.json({ billing_request_flows: { authorisation_url: "https://checkout.example/sepa" } });
    }
    throw new Error("unerwartet " + ziel);
  };
  const produkte = [{ art: "einzel", id: "1", titel: "Klarlack", rabatt: 15, preis: 20 }];
  const anfrage = (body) => new Request("https://www.alex-autoshop.de/api/membership-checkout", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer kopf.teil.signatur" },
    body: JSON.stringify(body),
  });
  try {
    const karte = await checkout(anfrage({ method: "stripe", aboTyp: "produkt", produkte, price: 1 }));
    assert.equal(karte.status, 200);
    const stripe = new URLSearchParams(stripeBodies[0]);
    assert.equal(
      stripe.get("success_url"),
      `${WWW}/mitgliedschaft?status=success&session_id={CHECKOUT_SESSION_ID}`,
    );
    assert.equal(stripe.get("cancel_url"), `${WWW}/mitgliedschaft?status=cancel`);

    const sepa = await checkout(anfrage({ method: "gocardless", aboTyp: "produkt", produkte, price: 1 }));
    assert.equal(sepa.status, 200);
    const flow = JSON.parse(gcBodies.find((b) => b.includes("redirect_uri")));
    assert.equal(flow.billing_request_flows.redirect_uri, `${WWW}/mitgliedschaft?status=success&provider=gocardless`);
    assert.equal(flow.billing_request_flows.exit_uri, `${WWW}/mitgliedschaft?status=cancel`);
  } finally {
    globalThis.fetch = vorher;
    if (altKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = altKey;
    if (altGc === undefined) delete process.env.GOCARDLESS_ACCESS_TOKEN;
    else process.env.GOCARDLESS_ACCESS_TOKEN = altGc;
    if (altBasis === undefined) delete process.env.PUBLIC_BASE_URL;
    else process.env.PUBLIC_BASE_URL = altBasis;
  }
});
