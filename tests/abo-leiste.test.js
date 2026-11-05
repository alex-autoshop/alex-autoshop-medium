import test from "node:test";
import assert from "node:assert/strict";
import { aboLeisteText } from "../shared/abo-leiste.js";

test("Leistentext: ein Produkt, mehrere Produkte, Betrag", () => {
  assert.match(aboLeisteText(1, 1), /^1 Produkt im Abo · 1,00\s€ \/ Monat$/);
  assert.match(aboLeisteText(3, 6), /^3 Produkte im Abo · 6,00\s€ \/ Monat$/);
  assert.match(aboLeisteText(0, 0), /^0 Produkte im Abo · 0,00\s€ \/ Monat$/);
});
