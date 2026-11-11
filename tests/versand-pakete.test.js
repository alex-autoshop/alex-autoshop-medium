import test from "node:test";
import assert from "node:assert/strict";
import {
  DHL_EUR, FALLBACK_KG, GEWICHT_STUFEN, PAKET_MAX_KG, SPEDITION_AB_PAKET, VERSAND_ANFRAGE,
  kgAusShopify, kgAusText, paketePacken, preisFuerGewicht, stueckKg, versandPlan, versandkosten,
} from "../shared/versand.js";

test("ohne Gewichte bleibt es bei einem Paket: 7,49 €, frei ab 150, Abholung 0", () => {
  assert.equal(DHL_EUR, 7.49);
  assert.equal(GEWICHT_STUFEN.every((s) => s.euro === 7.49), true);
  assert.equal(versandkosten({ summe: 40 }), DHL_EUR);
  assert.equal(versandkosten({ summe: 150 }), 0);
  assert.equal(versandkosten({ summe: 20, abholung: true }), 0);
});

test("5 × 5,4 kg sind ein Paket, das sechste öffnet das zweite", () => {
  const fuenf = versandPlan({
    summe: 500,
    positionen: [{ menge: 5, kg: 5.4 }],
  });
  assert.equal(fuenf.pakete, 1);
  assert.equal(fuenf.betrag, 0);
  const sechs = versandPlan({
    summe: 600,
    positionen: [{ menge: 6, kg: 5.4 }],
  });
  assert.equal(sechs.pakete, 2);
  assert.equal(sechs.betrag, DHL_EUR);
  const sechsKlein = versandPlan({
    summe: 40,
    positionen: [{ menge: 6, kg: 5.4 }],
  });
  assert.equal(sechsKlein.betrag, Math.round(DHL_EUR * 2 * 100) / 100);
});

test("ab vier Paketen oder einem Stück über 30 kg: Spedition, kein Preis", () => {
  const vier = versandPlan({
    summe: 2000,
    positionen: [{ menge: 16, kg: 5.4 }],
  });
  assert.equal(vier.art, "spedition");
  assert.equal(vier.betrag, null);
  assert.equal(vier.text, VERSAND_ANFRAGE);
  assert.equal(versandkosten({ summe: 2000, positionen: [{ menge: 16, kg: 5.4 }] }), null);
  const schwer = versandPlan({ summe: 80, positionen: [{ menge: 1, kg: 31 }] });
  assert.equal(schwer.art, "spedition");
  assert.equal(SPEDITION_AB_PAKET, 4);
  assert.equal(PAKET_MAX_KG, 30);
});

test("Gewicht aus Shopify-Gramm, sonst aus dem Gebinde, sonst Fallback", () => {
  assert.equal(kgAusShopify(5400, "GRAMS"), 5.4);
  assert.equal(kgAusShopify(0, "KILOGRAMS"), null);
  assert.equal(kgAusShopify(5.8, "KILOGRAMS"), 5.8);
  assert.equal(kgAusText("Klarlack 5 L"), 5.4);
  assert.equal(kgAusText("Spray 400 ml"), 0.432);
  assert.equal(stueckKg({ name: "Ölfilter" }), FALLBACK_KG);
  assert.equal(stueckKg({ kg: 5400, einheit: "GRAMS", name: "irgendwas 1 L" }), 5.4);
  assert.equal(preisFuerGewicht(1.2), 7.49);
  assert.equal(preisFuerGewicht(27), 7.49);
  const gepackt = paketePacken([5.4, 5.4, 5.4, 5.4, 5.4]);
  assert.equal(gepackt.zuSchwer, false);
  assert.equal(gepackt.pakete.length, 1);
  assert.equal(gepackt.pakete[0].kg, 27);
});
