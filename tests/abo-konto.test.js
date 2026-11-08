import test from "node:test";
import assert from "node:assert/strict";
import {
  ABO_KONTO_HINWEIS,
  kundeAusUser,
  kundeAusAnfrage,
  paketMitKonto,
  userIdAusPaket,
} from "../shared/abo-konto.js";
import checkout from "../api/membership-checkout.js";
import { aboListeGesamt } from "../shared/produktabo.js";

const KONTO = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const MAIL = "mitglied@example.com";

function anfrage(body, token) {
  return new Request("https://alex-autoshop.de/api/membership-checkout", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

test("ohne Kundenkonto kein Abo", () => {
  assert.equal(kundeAusUser(null).status, 401);
  assert.equal(kundeAusUser({ id: KONTO }).status, 401);
  assert.equal(kundeAusUser({ id: "kein-uuid", email: MAIL }).status, 401);
  assert.equal(kundeAusUser({ id: KONTO, email: MAIL }).ok, true);
});

test("Paket trägt die Konto-ID, ohne die Preis-Felder zu verschieben", () => {
  const paket = paketMitKonto("Pmix|1|15,40", KONTO);
  assert.equal(paket, `Pmix|1|15,40|${KONTO}`);
  assert.equal(paketMitKonto(paket, KONTO), paket);
  assert.equal(userIdAusPaket(paket), KONTO);
  assert.equal(userIdAusPaket("L2|Autoteile|180|farbe|aufb"), "");
  const dienst = paketMitKonto("L2|Autoteile|180|farbe|aufb", KONTO);
  assert.equal(dienst.split("|")[2], "180");
  assert.equal(userIdAusPaket(dienst), KONTO);
});

test("Checkout ohne Sitzung ist 401 und ruft keinen Zahlungsdienst", async () => {
  const vorher = globalThis.fetch;
  let netz = false;
  globalThis.fetch = async () => {
    netz = true;
    throw new Error("Netz darf hier nicht drankommen");
  };
  try {
    const res = await checkout(anfrage({
      email: "gast@example.com",
      method: "stripe",
      aboTyp: "produkt",
      produkte: [{ art: "einzel", titel: "Klarlack", rabatt: 15, preis: 20 }],
      price: 1,
    }));
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error, ABO_KONTO_HINWEIS);
    assert.equal(netz, false);
  } finally {
    globalThis.fetch = vorher;
  }
});

test("ungültige Sitzung ist 401", async () => {
  const vorher = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes("/auth/v1/user")) return new Response("{}", { status: 401 });
    throw new Error("Zahlungsdienst ohne Konto: " + url);
  };
  try {
    const erg = await kundeAusAnfrage({ headers: { authorization: "Bearer a.b.c" } });
    assert.equal(erg.status, 401);
    const res = await checkout(anfrage({ method: "gocardless", aboTyp: "produkt" }, "a.b.c"));
    assert.equal(res.status, 401);
  } finally {
    globalThis.fetch = vorher;
  }
});

test("Abo hängt an der Konto-E-Mail, nicht an der mitgeschickten Adresse", async () => {
  const beitrag = aboListeGesamt([{ art: "einzel", rabatt: 15, preis: 20 }]);
  assert.equal(beitrag.beitrag, 1);
  const keyVorher = process.env.STRIPE_SECRET_KEY;
  const gcVorher = process.env.GOCARDLESS_ACCESS_TOKEN;
  process.env.STRIPE_SECRET_KEY = "sk_test_" + "a".repeat(24);
  process.env.GOCARDLESS_ACCESS_TOKEN = "sandbox_" + "b".repeat(24);
  const vorher = globalThis.fetch;
  const aufrufe = [];
  globalThis.fetch = async (url, init) => {
    const ziel = String(url);
    aufrufe.push(ziel);
    if (ziel.endsWith("/auth/v1/user")) {
      return Response.json({ id: KONTO, email: MAIL });
    }
    if (ziel.includes("api.stripe.com")) {
      aufrufe.push(String(init?.body || ""));
      return Response.json({ url: "https://checkout.example/karte" });
    }
    if (ziel.includes("billing_requests")) {
      aufrufe.push(String(init?.body || ""));
      return Response.json({ billing_requests: { id: "BR1" } });
    }
    if (ziel.includes("billing_request_flows")) {
      return Response.json({ billing_request_flows: { authorisation_url: "https://checkout.example/sepa" } });
    }
    throw new Error("unerwartet " + ziel);
  };
  const produkte = [{ art: "einzel", id: "1", titel: "Klarlack", rabatt: 15, preis: 20 }];
  try {
    const karte = await checkout(anfrage({
      email: "fremd@example.com",
      method: "stripe",
      aboTyp: "produkt",
      produkte,
      price: 1,
    }, "kopf.teil.signatur"));
    assert.equal(karte.status, 200);
    const stripeBody = aufrufe.find((e) => e.includes("customer_email="));
    assert.ok(stripeBody);
    assert.match(stripeBody, /customer_email=mitglied%40example\.com/);
    assert.doesNotMatch(stripeBody, /fremd%40example\.com/);
    assert.match(stripeBody, new RegExp("client_reference_id=" + KONTO));
    assert.match(stripeBody, new RegExp("metadata%5Buser_id%5D=" + KONTO));
    assert.match(stripeBody, new RegExp("subscription_data%5Bmetadata%5D%5Buser_id%5D=" + KONTO));

    const sepa = await checkout(anfrage({
      email: "fremd@example.com",
      method: "gocardless",
      aboTyp: "produkt",
      produkte,
      price: 1,
    }, "kopf.teil.signatur"));
    assert.equal(sepa.status, 200);
    assert.equal((await sepa.json()).url, "https://checkout.example/sepa");
    const gcBody = aufrufe.find((e) => String(e).includes("mandate_request"));
    assert.match(gcBody, new RegExp(KONTO));
    assert.match(gcBody, /mitglied@example.com/);
    assert.doesNotMatch(gcBody, /fremd@example.com/);
  } finally {
    globalThis.fetch = vorher;
    if (keyVorher === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = keyVorher;
    if (gcVorher === undefined) delete process.env.GOCARDLESS_ACCESS_TOKEN;
    else process.env.GOCARDLESS_ACCESS_TOKEN = gcVorher;
  }
});
