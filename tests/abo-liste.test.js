import test from "node:test";
import assert from "node:assert/strict";
import { aboListeErgaenzen, ABO_RABATTE } from "../shared/produktabo.js";

test("Produkt landet mit der Standardstufe in der Abo-Liste, ein zweites Mal nicht", () => {
  const neu = aboListeErgaenzen(null, {
    id: "gid://shopify/Product/1",
    handle: "schleifpaste",
    titel: "Schleifpaste Perfect Heavy Cut",
    preis: 33,
    waehrung: "EUR",
  });
  assert.equal(neu.ergebnis, "neu");
  assert.equal(neu.standard, 15);
  assert.equal(neu.produkte.length, 1);
  assert.equal(neu.produkte[0].rabatt, 15);
  assert.equal(neu.produkte[0].preis, 33);
  assert.deepEqual(ABO_RABATTE, [15, 28, 40]);

  const nochmal = aboListeErgaenzen(neu, { id: "gid://shopify/Product/1", titel: "Schleifpaste" });
  assert.equal(nochmal.ergebnis, "schon");
  assert.equal(nochmal.produkte.length, 1);
});

test("leere Angaben und eine volle Liste werden abgelehnt", () => {
  assert.equal(aboListeErgaenzen(null, { id: "", titel: "x" }).ergebnis, "leer");
  const voll = { standard: 28, produkte: Array.from({ length: 100 }, (_, i) => ({ id: String(i), rabatt: 28 })) };
  const abgelehnt = aboListeErgaenzen(voll, { id: "neu", titel: "Noch eins", preis: 1 });
  assert.equal(abgelehnt.ergebnis, "voll");
  assert.equal(abgelehnt.produkte.length, 100);
});
