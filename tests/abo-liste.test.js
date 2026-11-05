import test from "node:test";
import assert from "node:assert/strict";
import { aboEinzelAktualisieren, aboEinzelEntfernen, aboListeErgaenzen, ABO_RABATTE, mitgliedZeile } from "../shared/produktabo.js";

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

test("Warenkorb übernimmt die gewählte Stufe und rechnet die Zeile", () => {
  const liste = aboListeErgaenzen(null, {
    id: "p1",
    titel: "Paste",
    preis: 33,
    rabatt: 40,
  });
  assert.equal(liste.produkte[0].rabatt, 40);
  const neu = aboEinzelAktualisieren(liste, { id: "p1", rabatt: 28, preis: 33 });
  assert.equal(neu.produkte[0].rabatt, 28);
  const weg = aboEinzelEntfernen(neu, "p1");
  assert.equal(weg.ergebnis, "weg");
  assert.equal(weg.produkte.length, 0);
  const zeile = mitgliedZeile(10, 2, 15);
  assert.equal(zeile.normal, 20);
  assert.equal(zeile.mitglied, 17);
  assert.equal(zeile.ersparnis, 3);
  assert.equal(mitgliedZeile(10, 2, 12), null);
});

test("leere Angaben und eine volle Liste werden abgelehnt", () => {
  assert.equal(aboListeErgaenzen(null, { id: "", titel: "x" }).ergebnis, "leer");
  const voll = { standard: 28, produkte: Array.from({ length: 100 }, (_, i) => ({ id: String(i), rabatt: 28 })) };
  const abgelehnt = aboListeErgaenzen(voll, { id: "neu", titel: "Noch eins", preis: 1 });
  assert.equal(abgelehnt.ergebnis, "voll");
  assert.equal(abgelehnt.produkte.length, 100);
});
