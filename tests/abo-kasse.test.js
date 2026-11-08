import test from "node:test";
import assert from "node:assert/strict";
import { aboZahlungErgebnis } from "../shared/abo-kasse.js";
import { checkoutBasis } from "../shared/zahlungs-isolation.js";
import membershipCheckout from "../api/membership-checkout.js";

test("Produkt-Abo ohne Bezahlseite schickt keine Anfrage", () => {
  const fallback = aboZahlungErgebnis(200, { fallback: true, reason: "stripe noch nicht konfiguriert" });
  assert.equal(fallback.art, "fehler");
  assert.match(fallback.text, /keine Anfrage/);

  const fehler = aboZahlungErgebnis(500, { error: "Stripe 401" });
  assert.equal(fehler.art, "fehler");
  assert.equal(fehler.text, "Stripe 401");

  const preis = aboZahlungErgebnis(409, { error: "Der Preis hat sich gerade geändert" });
  assert.equal(preis.text, "Der Preis hat sich gerade geändert");

  const ok = aboZahlungErgebnis(200, { url: "https://checkout.stripe.com/c/pay/cs_test_x" });
  assert.deepEqual(ok, { art: "weiter", url: "https://checkout.stripe.com/c/pay/cs_test_x" });
});

test("Vorschau-Erfolgslink bleibt auf der Vorschau-Adresse", () => {
  const vorher = process.env.PUBLIC_BASE_URL;
  delete process.env.PUBLIC_BASE_URL;
  try {
    assert.equal(
      checkoutBasis("alex-autoshop-medium-3rp8maeai-alex-autoshop-s-projects.vercel.app"),
      "https://alex-autoshop-medium-3rp8maeai-alex-autoshop-s-projects.vercel.app",
    );
    assert.equal(checkoutBasis("www.alex-autoshop.de"), "https://alex-autoshop.de");
  } finally {
    if (vorher === undefined) delete process.env.PUBLIC_BASE_URL;
    else process.env.PUBLIC_BASE_URL = vorher;
  }
});

test("Produkt-Checkout setzt den Erfolgslink auf den Vorschau-Host", async () => {
  const vorher = process.env.STRIPE_SECRET_KEY;
  const vorherBase = process.env.PUBLIC_BASE_URL;
  delete process.env.PUBLIC_BASE_URL;
  process.env.STRIPE_SECRET_KEY = "sk_test_isolation1234567890";
  let body = "";
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    body = String(init?.body || "");
    return new Response(JSON.stringify({ url: "https://checkout.stripe.com/c/pay/cs_test_host", id: "cs_test_host" }), { status: 200 });
  };
  try {
    const res = await membershipCheckout(new Request("https://preview.local/api/membership-checkout", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-host": "alex-autoshop-medium-3rp8maeai-alex-autoshop-s-projects.vercel.app",
      },
      body: JSON.stringify({
        aboTyp: "produkt",
        email: "isolation@example.com",
        method: "stripe",
        price: 1,
        produkte: [{ art: "einzel", rabatt: 15, preis: 10, titel: "SprayMax" }],
      }),
    }));
    const data = await res.json();
    assert.equal(data.url, "https://checkout.stripe.com/c/pay/cs_test_host");
    assert.match(body, /success_url=https%3A%2F%2Falex-autoshop-medium-3rp8maeai-alex-autoshop-s-projects\.vercel\.app%2Fmitgliedschaft/);
    assert.doesNotMatch(body, /alex-autoshop\.de/);
  } finally {
    globalThis.fetch = original;
    if (vorher === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = vorher;
    if (vorherBase === undefined) delete process.env.PUBLIC_BASE_URL;
    else process.env.PUBLIC_BASE_URL = vorherBase;
  }
});
