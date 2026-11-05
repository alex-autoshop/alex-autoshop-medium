import test from "node:test";
import assert from "node:assert/strict";
import { aboGruppen, aboKategorie } from "../shared/abo-kategorien.js";

test("Lack-Konfiguratoren und echte Typen landen in den Reihen", () => {
  assert.equal(aboKategorie({ handle: "farben-mix", productType: "Wunschfarbe & Lackstift" }), "wunschfarben");
  assert.equal(aboKategorie({ handle: "individuelle-spraydose-erstellen", productType: "Wunschfarbe & Lackstift" }), "spraydosen");
  assert.equal(aboKategorie({ handle: "individuellen-lackstift-bestellen-20ml", productType: "Wunschfarbe & Lackstift" }), "lackstifte");
  assert.equal(aboKategorie({ handle: "x", productType: "Klarlack" }), "klarlack");
  assert.equal(aboKategorie({ handle: "y", productType: "Härter" }), "klarlack");
  assert.equal(aboKategorie({ handle: "z", productType: "Politur & Schleifpaste" }), "pflege");
  assert.equal(aboKategorie({ handle: "g", productType: "Grundierung & Füller" }), "typ:Grundierung & Füller");
  assert.equal(aboKategorie({ handle: "leer", productType: "" }), "zubehoer");
});

test("Gruppen: Alle-Reihenfolge, leere Typen fallen weg, Zubehör am Ende", () => {
  const gruppen = aboGruppen([
    { handle: "oel", productType: "Motoröl" },
    { handle: "k", productType: "Klarlack" },
    { handle: "farben-mix", productType: "Wunschfarbe & Lackstift" },
    { handle: "ohne", productType: "" },
    { handle: "h", productType: "Härter" },
  ]);
  assert.deepEqual(gruppen.map((g) => g.label), [
    "Wunschfarben",
    "Klarlack & Härter",
    "Motoröl",
    "Zubehör",
  ]);
  assert.equal(gruppen.find((g) => g.id === "klarlack").produkte.length, 2);
});
