import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import checkout from "../api/membership-checkout.js";
import { gocardlessPost } from "../api/_gocardless.js";
import { SEPA_KUNDENTEXT } from "../api/_sepa-fehler.js";

const KONTO = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const MAIL = "mitglied@example.com";
const WWW = "https://www.alex-autoshop.de";

function anfrage(body) {
  return new Request("https://www.alex-autoshop.de/api/membership-checkout", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer kopf.teil.signatur",
    },
    body: JSON.stringify(body),
  });
}

function produkte() {
  return [{ art: "einzel", id: "1", titel: "Klarlack", rabatt: 15, preis: 20 }];
}

test("Checkout legt nur ein SEPA-Mandat an und schickt auf die gehostete Seite", async () => {
  const alt = process.env.GOCARDLESS_ACCESS_TOKEN;
  process.env.GOCARDLESS_ACCESS_TOKEN = "sandbox_" + "b".repeat(24);
  const vorher = globalThis.fetch;
  const aufrufe = [];
  globalThis.fetch = async (url, init) => {
    const ziel = String(url);
    aufrufe.push({ ziel, method: init?.method || "GET", body: init?.body ? String(init.body) : "" });
    if (ziel.endsWith("/auth/v1/user")) return Response.json({ id: KONTO, email: MAIL });
    if (ziel.endsWith("/billing_requests")) {
      return Response.json({ billing_requests: { id: "BRQ1" } }, { status: 201 });
    }
    if (ziel.endsWith("/billing_request_flows")) {
      return Response.json({
        billing_request_flows: { authorisation_url: "https://pay-sandbox.gocardless.com/billing/static/flow?id=BRF1" },
      }, { status: 201 });
    }
    throw new Error("unerwartet " + ziel);
  };
  try {
    const res = await checkout(anfrage({
      method: "gocardless",
      aboTyp: "produkt",
      produkte: produkte(),
      price: 1,
    }));
    assert.equal(res.status, 200);
    assert.equal((await res.json()).url, "https://pay-sandbox.gocardless.com/billing/static/flow?id=BRF1");
    const posts = aufrufe.filter((a) => a.method === "POST");
    assert.deepEqual(posts.map((a) => a.ziel), [
      "https://api-sandbox.gocardless.com/billing_requests",
      "https://api-sandbox.gocardless.com/billing_request_flows",
    ]);
    for (const a of posts) {
      assert.equal(/\/(customers|customer_bank_accounts|mandates)(\/|$)/.test(new URL(a.ziel).pathname), false);
    }
    const mandat = JSON.parse(posts[0].body);
    assert.deepEqual(mandat.billing_requests.mandate_request, { scheme: "sepa_core" });
    assert.equal("currency" in mandat.billing_requests.mandate_request, false);
    assert.equal(mandat.billing_requests.payment_request, undefined);
    assert.equal(mandat.billing_requests.subscription_request, undefined);
    const flow = JSON.parse(posts[1].body);
    assert.equal(flow.billing_request_flows.redirect_uri, `${WWW}/mitgliedschaft?status=success&provider=gocardless`);
    assert.equal(flow.billing_request_flows.exit_uri, `${WWW}/mitgliedschaft?status=cancel`);
    assert.equal(flow.billing_request_flows.links.billing_request, "BRQ1");
    assert.equal(flow.billing_request_flows.prefilled_customer.email, MAIL);
  } finally {
    globalThis.fetch = vorher;
    if (alt === undefined) delete process.env.GOCARDLESS_ACCESS_TOKEN;
    else process.env.GOCARDLESS_ACCESS_TOKEN = alt;
  }
});

test("Live-Token spricht die Live-API, nicht die Website", async () => {
  const alt = process.env.GOCARDLESS_ACCESS_TOKEN;
  process.env.GOCARDLESS_ACCESS_TOKEN = "live_" + "c".repeat(24);
  const vorher = globalThis.fetch;
  let ziel = "";
  globalThis.fetch = async (url) => {
    ziel = String(url);
    if (ziel.endsWith("/auth/v1/user")) return Response.json({ id: KONTO, email: MAIL });
    if (ziel.endsWith("/billing_requests")) return Response.json({ billing_requests: { id: "BRQ9" } }, { status: 201 });
    if (ziel.endsWith("/billing_request_flows")) {
      return Response.json({ billing_request_flows: { authorisation_url: "https://pay.gocardless.com/flow" } }, { status: 201 });
    }
    throw new Error("unerwartet " + ziel);
  };
  try {
    const res = await checkout(anfrage({ method: "gocardless", aboTyp: "produkt", produkte: produkte(), price: 1 }));
    assert.equal(res.status, 200);
    assert.equal(ziel.startsWith("https://api.gocardless.com/"), true);
  } finally {
    globalThis.fetch = vorher;
    if (alt === undefined) delete process.env.GOCARDLESS_ACCESS_TOKEN;
    else process.env.GOCARDLESS_ACCESS_TOKEN = alt;
  }
});

test("Weiterleitung auf die Website wird nicht nachgeladen", async () => {
  const vorher = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const ziel = String(url);
    if (!ziel.includes("api-sandbox.gocardless.com")) throw new Error("Website aufgerufen: " + ziel);
    return new Response("weg", {
      status: 302,
      headers: { location: "https://gocardless.com/billing_requests" },
    });
  };
  try {
    await assert.rejects(
      gocardlessPost(
        "https://api-sandbox.gocardless.com/billing_requests",
        { Accept: "application/json" },
        { billing_requests: { mandate_request: { scheme: "sepa_core" } } },
        "test",
      ),
      (e) => e instanceof Error && e.message === SEPA_KUNDENTEXT,
    );
  } finally {
    globalThis.fetch = vorher;
  }
});

test("Direkte Kunden-, Konto- und Mandats-Anlage ist gesperrt", async () => {
  const vorher = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("nicht rufen"); };
  try {
    for (const pfad of ["/customers", "/customer_bank_accounts", "/mandates", "/mandates/MD1/actions/reinstate"]) {
      await assert.rejects(
        gocardlessPost(`https://api.gocardless.com${pfad}`, {}, {}, "test"),
        (e) => e instanceof Error && e.message === SEPA_KUNDENTEXT,
      );
    }
  } finally {
    globalThis.fetch = vorher;
  }
});

test("Checkout-Quelle ruft die gesperrten Endpunkte nicht auf", () => {
  const text = readFileSync("api/membership-checkout.js", "utf8");
  assert.equal(text.includes("/customers"), false);
  assert.equal(text.includes("/customer_bank_accounts"), false);
  assert.equal(text.includes("/mandates"), false);
  assert.match(text, /scheme: "sepa_core"/);
  assert.equal(text.includes('scheme: "sepa_core", currency'), false);
});
