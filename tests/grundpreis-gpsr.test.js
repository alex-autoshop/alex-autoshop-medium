import test from "node:test";
import assert from "node:assert/strict";
import { grundpreisText } from "../shared/grundpreis.js";
import { gpsrLesen } from "../shared/gpsr.js";

test("Grundpreis nur mit Preis und Bezugseinheit", () => {
  assert.equal(grundpreisText(null), "");
  assert.equal(grundpreisText({
    unitPrice: { amount: "15.9", currencyCode: "EUR" },
    unitPriceMeasurement: { referenceValue: 1, referenceUnit: "L" },
  }), "15,90 € / 1 l");
  assert.equal(grundpreisText({
    unitPrice: { amount: "2.5", currencyCode: "EUR" },
    unitPriceMeasurement: { referenceValue: 100, referenceUnit: "ML" },
  }), "2,50 € / 100 ml");
  assert.equal(grundpreisText({ unitPrice: { amount: "1", currencyCode: "EUR" } }), "");
});

test("GPSR-Block bleibt weg, wenn nichts hinterlegt ist", () => {
  assert.equal(gpsrLesen(null).hat, false);
  assert.equal(gpsrLesen([null, { key: "gpsr_hersteller_name", value: "  " }]).hat, false);
  const da = gpsrLesen([
    { key: "gpsr_hersteller_name", value: "Beispiel GmbH" },
    { key: "gpsr_hersteller_adresse", value: "Beispielweg 1, 10115 Berlin" },
  ]);
  assert.equal(da.hat, true);
  assert.equal(da.eu, "");
  assert.equal(da.name, "Beispiel GmbH");
  const zeilen = gpsrLesen([{ key: "gpsr_hersteller_adresse", value: "Weg 1\n10115 Berlin" }]);
  assert.equal(zeilen.adresse, "Weg 1\n10115 Berlin");
});
