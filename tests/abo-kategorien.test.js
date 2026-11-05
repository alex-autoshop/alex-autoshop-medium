import test from "node:test";
import assert from "node:assert/strict";
import { aboGruppen, aboKategorie, aboReiheOrdnen } from "../shared/abo-kategorien.js";
import { aboBildrahmen } from "../shared/abo-bildrahmen.js";

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

test("Pflege: 250 g vor 750 g, Hochglanz vor Schleifpaste, ohne Größe dahinter", () => {
  const titel = aboGruppen([
    { handle: "a1", productType: "Politur & Schleifpaste", title: "A1 Speed Polish" },
    { handle: "s750", productType: "Politur & Schleifpaste", title: "Schleifpaste Perfect Heavy Cut 750g silikonfrei FRIZ" },
    { handle: "h750", productType: "Politur & Schleifpaste", title: "Hochglanz-Antihologramm-Politur 750g FRIZ" },
    { handle: "s250", productType: "Politur & Schleifpaste", title: "Friz Schleifpaste – Perfect Heavy Cut 250\u00a0g" },
    { handle: "h250", productType: "Politur & Schleifpaste", title: "Hochglanz-Antihologramm-Politur 250g FRIZ" },
    { handle: "schwarz", productType: "Steinschlag- & Rostschutz", title: "Unterbodenschutz Schwarz 500ml" },
    { handle: "grau", productType: "Steinschlag- & Rostschutz", title: "Unterbodenschutz Grau 500ml" },
  ]).map((g) => ({ id: g.id, titel: g.produkte.map((p) => p.handle) }));

  assert.deepEqual(titel, [
    {
      id: "pflege",
      titel: ["h250", "s250", "h750", "s750", "a1"],
    },
    {
      id: "typ:Steinschlag- & Rostschutz",
      titel: ["schwarz", "grau"],
    },
  ]);
});

test("Reihe ordnen lässt Produkte ohne Menge in der bisherigen Folge", () => {
  const handles = aboReiheOrdnen([
    { title: "Schwamm" },
    { title: "Politur 1 l" },
    { title: "Politur 500 ml" },
    { title: "Wachs" },
  ]).map((p) => p.title);
  assert.deepEqual(handles, ["Politur 500 ml", "Politur 1 l", "Schwamm", "Wachs"]);
});

test("Anzeige-Zuschnitt nur für die graue Dose und die schmalere 750-g-Politur", () => {
  assert.deepEqual(
    aboBildrahmen("troton-ubs-steinschlagschutz-korrosionsschutz-unterbodenschutz-grau-500ml"),
    { scale: 1.42, x: -1, y: -22 },
  );
  assert.deepEqual(
    aboBildrahmen("hochglanz-antihologramm-politur-750g-friz"),
    { scale: 1.08, x: 0, y: 0 },
  );
  assert.equal(aboBildrahmen("troton-ubs-steinschlagschutz-korrosionsschutz-unterbodenschutz-500ml"), null);
  assert.equal(aboBildrahmen("schleifpaste-perfect-heavy-cut-750g-silikonfrei-friz"), null);
});
