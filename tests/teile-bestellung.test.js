import test from "node:test";
import assert from "node:assert/strict";
import { positionenLesen } from "../api/_teile-bestellung.js";

test("Positionen aus der Zahlungs-Metadatenzeile, Versand und Pfand getrennt", () => {
  const g = positionenLesen("FIN WVWZZZ|1xHU719/6X@12.64|2xW712@6.36|v:7.49|p:7.50");
  assert.equal(g.positionen.length, 2);
  assert.equal(g.positionen[0].artikelnummer, "HU719/6X");
  assert.equal(g.positionen[0].preis, 12.64);
  assert.equal(g.positionen[1].menge, 2);
  assert.equal(g.versand, 7.49);
  assert.equal(g.pfand, 7.5);
});

test("alte Zeile ohne Preis bleibt lesbar", () => {
  const g = positionenLesen("1xABC123");
  assert.equal(g.positionen[0].preis, 0);
  assert.equal(g.versand, 0);
});
