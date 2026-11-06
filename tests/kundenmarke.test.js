import test from "node:test";
import assert from "node:assert/strict";
import { istLieferant, markenSortieren } from "../shared/kundenmarke.js";

test("Lieferanten sind keine Marken", () => {
  assert.equal(istLieferant("DS Color"), true);
  assert.equal(istLieferant("Inter Cars"), true);
  assert.equal(istLieferant("Alex Autoshop"), true);
  assert.equal(istLieferant("Mipa"), false);
});

test("Marken nach Anzahl, Lieferanten fallen weg", () => {
  const liste = markenSortieren([
    { name: "FRIZ", anzahl: 2 },
    { name: "DS Color", anzahl: 9 },
    { name: "Mipa", anzahl: 5 },
    { name: "Sonstige", anzahl: 8 },
    { name: "Inter Cars", anzahl: 4 },
  ]);
  assert.deepEqual(liste.map((m) => m.name), ["Mipa", "FRIZ"]);
});
