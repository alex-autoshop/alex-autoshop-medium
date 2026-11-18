import test from "node:test";
import assert from "node:assert/strict";
import checkout from "../api/membership-checkout.js";
import { SEPA_KUNDENTEXT, sepaJson } from "../api/_sepa-fehler.js";

const TOKEN = "sandbox_nur_test_token";
const KONTO = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const MAIL = "mitglied@example.com";

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

function logsSammeln() {
  const zeilen = [];
  const vorher = console.error;
  console.error = (...args) => {
    zeilen.push(args.map((a) => String(a)).join(" "));
  };
  return {
    zeilen,
    nurSepa() {
      return zeilen.filter((z) => z.includes("[sepa-checkout]"));
    },
    ende() {
      console.error = vorher;
    },
  };
}

test("403 ohne JSON: Kunde sieht den SEPA-Hinweis, das Log den Rohtext", async () => {
  const alt = process.env.GOCARDLESS_ACCESS_TOKEN;
  process.env.GOCARDLESS_ACCESS_TOKEN = TOKEN;
  const vorher = globalThis.fetch;
  const protokoll = logsSammeln();
  const html = `<html>${TOKEN} ${"x".repeat(600)}</html>`;
  globalThis.fetch = async (url) => {
    const ziel = String(url);
    if (ziel.endsWith("/auth/v1/user")) return Response.json({ id: KONTO, email: MAIL });
    if (ziel.includes("/billing_requests")) {
      return new Response(html, {
        status: 403,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "x-request-id": "rid-leer",
          "cf-ray": "ray-1",
        },
      });
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
    assert.equal(res.status, 500);
    const text = (await res.json()).error;
    assert.equal(text, SEPA_KUNDENTEXT);
    assert.equal(/gocardless|403|sandbox_|Bearer/i.test(text), false);
    const log = protokoll.nurSepa();
    assert.equal(log.length, 1);
    const eintrag = JSON.parse(log[0].replace("[sepa-checkout] ", ""));
    assert.equal(eintrag.stelle, "membership-checkout billing_requests");
    assert.equal(eintrag.status, 403);
    assert.equal(eintrag.type, null);
    assert.equal(eintrag.headers["x-request-id"], "rid-leer");
    assert.equal(eintrag.headers["cf-ray"], "ray-1");
    assert.match(eintrag.headers["content-type"], /text\/html/);
    assert.equal(eintrag.roh.length, 500);
    assert.equal(eintrag.roh.includes(TOKEN), false);
    assert.equal(log[0].includes(TOKEN), false);
  } finally {
    globalThis.fetch = vorher;
    protokoll.ende();
    if (alt === undefined) delete process.env.GOCARDLESS_ACCESS_TOKEN;
    else process.env.GOCARDLESS_ACCESS_TOKEN = alt;
  }
});

test("Fehlerkörper landet strukturiert im Log, der Flow ebenso", async () => {
  const alt = process.env.GOCARDLESS_ACCESS_TOKEN;
  process.env.GOCARDLESS_ACCESS_TOKEN = TOKEN;
  const vorher = globalThis.fetch;
  const protokoll = logsSammeln();
  const koerper = {
    error: {
      message: "nicht freigeschaltet",
      type: "invalid_api_usage",
      code: 403,
      request_id: "req_abc",
      errors: [{ reason: "feature_disabled", field: "billing_requests", message: "zu" }],
    },
  };
  globalThis.fetch = async (url) => {
    const ziel = String(url);
    if (ziel.endsWith("/auth/v1/user")) return Response.json({ id: KONTO, email: MAIL });
    if (ziel.endsWith("/billing_requests")) {
      return Response.json({ billing_requests: { id: "BR1" } }, { status: 201 });
    }
    if (ziel.includes("billing_request_flows")) {
      return new Response(JSON.stringify(koerper), {
        status: 403,
        headers: {
          "content-type": "application/json",
          "x-request-id": "rid-flow",
          "cf-ray": "ray-flow",
        },
      });
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
    assert.equal((await res.json()).error, SEPA_KUNDENTEXT);
    const log = protokoll.nurSepa();
    assert.equal(log.length, 1);
    const eintrag = JSON.parse(log[0].replace("[sepa-checkout] ", ""));
    assert.equal(eintrag.stelle, "membership-checkout billing_request_flows");
    assert.equal(eintrag.status, 403);
    assert.equal(eintrag.type, "invalid_api_usage");
    assert.equal(eintrag.code, 403);
    assert.equal(eintrag.message, "nicht freigeschaltet");
    assert.deepEqual(eintrag.errors, [{ reason: "feature_disabled", field: "billing_requests" }]);
    assert.equal(eintrag.request_id, "req_abc");
    assert.equal(eintrag.headers["x-request-id"], "rid-flow");
    assert.match(eintrag.roh, /feature_disabled/);
    assert.equal(log[0].includes(TOKEN), false);
  } finally {
    globalThis.fetch = vorher;
    protokoll.ende();
    if (alt === undefined) delete process.env.GOCARDLESS_ACCESS_TOKEN;
    else process.env.GOCARDLESS_ACCESS_TOKEN = alt;
  }
});

test("sepaJson liest den Rohtext und wirft den Kundentext", async () => {
  const protokoll = logsSammeln();
  try {
    await assert.rejects(
      sepaJson(new Response("nicht-json", {
        status: 403,
        headers: { "content-type": "text/plain", "cf-ray": "ray-x" },
      }), "parts-checkout billing_requests"),
      (e) => e instanceof Error && e.message === SEPA_KUNDENTEXT,
    );
    const eintrag = JSON.parse(protokoll.nurSepa()[0].replace("[sepa-checkout] ", ""));
    assert.equal(eintrag.stelle, "parts-checkout billing_requests");
    assert.equal(eintrag.roh, "nicht-json");
    assert.equal(eintrag.headers["cf-ray"], "ray-x");
  } finally {
    protokoll.ende();
  }
});
