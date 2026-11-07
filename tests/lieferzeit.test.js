import test from "node:test";
import assert from "node:assert/strict";
import {
  laengsteLieferzeit,
  lieferzeitAusFeldern,
  lieferzeitText,
  lieferzeitenVerschieden,
  lieferzeitWaehlen,
} from "../shared/lieferzeit.js";

const felder = (min, max) => [
  { key: "lieferzeit_min", value: String(min) },
  { key: "lieferzeit_max", value: String(max) },
];

test("fehlende Felder werden 2–3 Werktage, nicht 1–2", () => {
  assert.deepEqual(lieferzeitWaehlen(null, null), { min: 2, max: 3 });
  assert.equal(lieferzeitAusFeldern([{ key: "lieferzeit_min", value: "5" }]), null);
  assert.equal(lieferzeitText({ min: 2, max: 3 }), "2–3 Werktage");
  assert.equal(lieferzeitText({ min: 1, max: 1 }), "1 Werktag");
});

test("Variante schlägt das Produkt", () => {
  const gewaehlt = lieferzeitWaehlen(felder(2, 4), felder(2, 5));
  assert.deepEqual(gewaehlt, { min: 2, max: 5 });
  assert.deepEqual(lieferzeitWaehlen(felder(5, 7), [null, null]), { min: 5, max: 7 });
});

test("der Warenkorb nimmt die längste Spanne", () => {
  const liste = [{ min: 2, max: 4 }, { min: 5, max: 7 }, { min: 1, max: 2 }];
  assert.deepEqual(laengsteLieferzeit(liste), { min: 5, max: 7 });
  assert.equal(lieferzeitenVerschieden(liste), true);
  assert.equal(lieferzeitenVerschieden([{ min: 2, max: 3 }, { min: 2, max: 3 }]), false);
});
