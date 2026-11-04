import test from "node:test";
import assert from "node:assert/strict";
import { verkaufspreis, gruppenFaktor, mindestpreis, warengruppenText, STANDARD_BASIS, spanneAusEnv } from "../shared/aufschlag.js";

const OHNE_BODEN = { PRICE_FLOOR: "0", PRICE_MARKET_CAP: "0" };

test("Teile ohne Gruppe behalten die Basis 1,35", () => {
  assert.equal(STANDARD_BASIS, 1.35);
  assert.equal(verkaufspreis({ ek: 10, name: "Sensor, Raddrehzahl", env: OHNE_BODEN }), 13.5);
});

test("Standard-Warengruppen greifen ohne Umgebung", () => {
  assert.equal(gruppenFaktor("Ölfilter passt zu: AUDI A3"), 1.25);
  assert.equal(gruppenFaktor("Bremsscheibe vorne L/R passt zu: AUDI A3"), 1.15);
  assert.equal(gruppenFaktor("Batterie BOSCH 12V 60Ah/540A S4 (P+ standardpol)"), 1.12);
  assert.equal(gruppenFaktor("Turbolader"), 1.18);
  assert.equal(gruppenFaktor("Zündkerze"), 1.25);
  assert.equal(gruppenFaktor("Glühlampe"), 1.35);
  assert.equal(verkaufspreis({ ek: 100, name: "Bremsbelagsatz vorne , passt zu: AUDI" }), 115);
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

test("Mindestpreis deckt EK + 2,50 € samt Zahlungsgebühr, Umgebung überschreibt", () => {
  const soll = (ek) => Math.ceil(((ek + 2.5 + 0.25) / (1 - 0.015)) * 100) / 100;
  assert.equal(mindestpreis(10), soll(10));
  assert.equal(verkaufspreis({ ek: 4, name: "Ölfilter" }), soll(4));
  assert.equal(verkaufspreis({ ek: 100, name: "Bremsscheibe" }), 115);
  assert.equal(mindestpreis(10, { PRICE_FLOOR: "0" }), 0);
  const alt = mindestpreis(10, { PRICE_FLOOR_MARGE: "0.04", PRICE_FLOOR_FIX: "1.5", PRICE_FLOOR_RABATT: "0.4" });
  assert.equal(alt, Math.ceil(((10 * 1.04 + 1.5) / 0.6) * 100) / 100);
});

test("Streuung ist standardmäßig 0 und per Umgebung wieder an", () => {
  assert.equal(spanneAusEnv({}), 0);
  assert.equal(spanneAusEnv({ PRICE_SPANNE: "0.05" }), 0.05);
  const ruhig = verkaufspreis({ ek: 10, name: "Sensor", sku: "X", streuung: () => 0, env: { PRICE_FLOOR: "0", PRICE_MARKET_CAP: "0" } });
  const bewegt = verkaufspreis({
    ek: 10, name: "Sensor", sku: "X", streuung: () => 0,
    env: { PRICE_FLOOR: "0", PRICE_MARKET_CAP: "0", PRICE_SPANNE: "0.05" },
  });
  assert.equal(ruhig, 13.5);
  assert.equal(bewegt, 12.83);
});

test("UVP-Deckel ist Standard, \"0\" schaltet ab, nie unter den Mindestpreis", () => {
  assert.equal(verkaufspreis({ ek: 10, listenpreis: 20, env: OHNE_BODEN }), 13.5);
  assert.equal(verkaufspreis({ ek: 10, listenpreis: 12, env: { PRICE_FLOOR: "0" } }), 12);
  const boden = mindestpreis(10, {});
  assert.equal(verkaufspreis({ ek: 10, listenpreis: 12 }), boden);
  assert.ok(boden > 12);
  assert.equal(verkaufspreis({ ek: 10, listenpreis: 30, env: { PRICE_FLOOR: "0" } }), 13.5);
});
