import test from "node:test";
import assert from "node:assert/strict";
import { produktanfangZiel } from "../shared/produktanfang.js";

test("unter der Produktliste geht es nach oben, oberhalb bleibt alles", () => {
  assert.equal(produktanfangZiel(1800, 900, 140), 760);
  assert.equal(produktanfangZiel(760, 900, 140), null);
  assert.equal(produktanfangZiel(100, 900, 140), null);
  assert.equal(produktanfangZiel(762, 900, 140), null);
});

test("Abstand für Kopf und Chip-Leiste wird abgezogen", () => {
  assert.equal(produktanfangZiel(400, 200, 80), 120);
  assert.equal(produktanfangZiel(50, 40, 80), 0);
  assert.equal(produktanfangZiel(0, 40, 80), null);
});
