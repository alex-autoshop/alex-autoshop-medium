import test from "node:test";
import assert from "node:assert/strict";
import { verkaufspreis, gruppenFaktor, mindestpreis, warengruppenText, STANDARD_BASIS } from "../shared/aufschlag.js";

const OHNE_BODEN = { PRICE_FLOOR: "0", PRICE_MARKET_CAP: "0" };

test("Teile ohne Gruppe behalten die Basis 2,0", () => {
  assert.equal(STANDARD_BASIS, 2);
  assert.equal(verkaufspreis({ ek: 10, name: "Sensor, Raddrehzahl", env: OHNE_BODEN }), 20);
});

test("Standard-Warengruppen greifen ohne Umgebung", () => {
  assert.equal(gruppenFaktor("Ölfilter passt zu: AUDI A3"), 1.85);
  assert.equal(gruppenFaktor("Bremsscheibe vorne L/R passt zu: AUDI A3"), 1.78);
  assert.equal(gruppenFaktor("Batterie BOSCH 12V 60Ah/540A S4 (P+ standardpol)"), 1.82);
  assert.equal(verkaufspreis({ ek: 100, name: "Bremsbelagsatz vorne , passt zu: AUDI" }), 178);
});

test("Fahrzeugliste im Namen zählt nicht als Warengruppe", () => {
  assert.equal(warengruppenText("Ölfilter passt zu: AUDI A1, A3"), "Ölfilter");
  // „feder“ steckt nur in der Fahrzeugliste, nicht in der Warengruppe
  assert.equal(gruppenFaktor("Sensor passt zu: FEDERAL XYZ"), null);
});

test("PRICE_MARKUP_GROUPS ersetzt die Standards, \"aus\" schaltet sie ab", () => {
  const env = { PRICE_MARKUP_GROUPS: JSON.stringify({ ölfilter: 1.9 }), ...OHNE_BODEN };
  assert.equal(gruppenFaktor("MANN Ölfilter", env), 1.9);
  assert.equal(gruppenFaktor("Bremsscheibe", env), null);
  assert.equal(gruppenFaktor("Ölfilter", { PRICE_MARKUP_GROUPS: "aus" }), null);
});

test("Mindestpreis: auch mit 40 % Rabatt bleibt EK + 4 % + 1,50 €", () => {
  for (const ek of [2, 3.86, 10.1, 44.6, 74.9]) {
    const vk = verkaufspreis({ ek, name: "Bremsscheibe", streuung: () => 0, sku: "X" });
    const l3 = Math.ceil(vk * 0.6 * 100) / 100;
    assert.ok(l3 >= ek * 1.04 + 1.5 - 0.01, `ek ${ek}: L3 ${l3}`);
  }
  assert.equal(mindestpreis(10, { PRICE_FLOOR: "0" }), 0);
});

test("UVP-Deckel ist Standard, \"0\" schaltet ab, nie unter den Mindestpreis", () => {
  assert.equal(verkaufspreis({ ek: 10, listenpreis: 15, env: OHNE_BODEN }), 20);
  assert.equal(verkaufspreis({ ek: 10, listenpreis: 15, env: { PRICE_FLOOR: "0" } }), 15);
  assert.equal(verkaufspreis({ ek: 10, listenpreis: 15 }), mindestpreis(10, {}));
  assert.equal(verkaufspreis({ ek: 10, listenpreis: 30, env: { PRICE_FLOOR: "0" } }), 20);
});
