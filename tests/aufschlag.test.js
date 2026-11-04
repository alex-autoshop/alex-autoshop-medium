import test from "node:test";
import assert from "node:assert/strict";
import { verkaufspreis, gruppenFaktor, STANDARD_BASIS } from "../shared/aufschlag.js";

test("ohne Umgebung bleibt der Faktor 2,0 und es gibt keinen Deckel", () => {
  assert.equal(verkaufspreis({ ek: 10, sku: "A", name: "Ölfilter", listenpreis: 12 }), 20);
  assert.equal(STANDARD_BASIS, 2);
});

test("Warengruppe ersetzt die Basis nur, wenn sie gesetzt ist", () => {
  const env = { PRICE_MARKUP_GROUPS: JSON.stringify({ ölfilter: 1.35, filter: 1.5 }) };
  assert.equal(gruppenFaktor("MANN Ölfilter", env), 1.35);
  assert.equal(verkaufspreis({ ek: 10, name: "MANN Ölfilter", env }), 13.5);
  assert.equal(verkaufspreis({ ek: 10, name: "Bremsscheibe", env }), 20);
});

test("Marktpreis-Deckel gilt nur, wenn er eingeschaltet ist", () => {
  assert.equal(verkaufspreis({ ek: 10, listenpreis: 15 }), 20);
  assert.equal(verkaufspreis({ ek: 10, listenpreis: 15, env: { PRICE_MARKET_CAP: "1" } }), 15);
  assert.equal(verkaufspreis({ ek: 10, listenpreis: 30, env: { PRICE_MARKET_CAP: "1" } }), 20);
});
