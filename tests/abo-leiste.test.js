import test from "node:test";
import assert from "node:assert/strict";
import { aboLeisteAktion, aboLeisteText } from "../shared/abo-leiste.js";

test("Klick öffnet die Übersicht und legt nicht doppelt an", () => {
  assert.equal(aboLeisteAktion(true), "oeffnen");
  assert.equal(aboLeisteAktion(true, "neu"), "oeffnen");
  assert.equal(aboLeisteAktion(false, "neu"), "oeffnen");
  assert.equal(aboLeisteAktion(false, "schon"), "oeffnen");
  assert.equal(aboLeisteAktion(false, "voll"), "ruhig");
  assert.equal(aboLeisteAktion(false, "leer"), "ruhig");
  assert.equal(aboLeisteAktion(false, "konfigurator"), "ruhig");
});

test("Leistentext: ein Produkt, mehrere Produkte, Betrag", () => {
  assert.match(aboLeisteText(1, 1), /^1 Produkt im Abo · 1,00\s€ \/ Monat$/);
  assert.match(aboLeisteText(3, 6), /^3 Produkte im Abo · 6,00\s€ \/ Monat$/);
  assert.match(aboLeisteText(0, 0), /^0 Produkte im Abo · 0,00\s€ \/ Monat$/);
});
