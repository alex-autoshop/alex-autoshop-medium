import test from "node:test";
import assert from "node:assert/strict";
import {
  istGleicheArtikelart, kategorieIstTreffer, ordneSuchtreffer, kraftstoffHinweis,
} from "../shared/suchrelevanz.js";
import { markeFuerKunde, ohneGrosshaendler } from "../shared/grosshaendler.js";

test("Zündkerzen trifft die Zündkerze, nicht Glühkerze, Geber oder Stecker", () => {
  assert.equal(istGleicheArtikelart("Zündkerze", "Zündkerze", "Zündkerzen"), true);
  assert.equal(istGleicheArtikelart("Bosch Zündkerze Super", "", "Zündkerzen"), true);
  assert.equal(istGleicheArtikelart("Bremsbelagsatz", "Zündkerze", "Zündkerzen"), true);
  assert.equal(istGleicheArtikelart("Glühkerze", "Glühkerze", "Zündkerzen"), false);
  assert.equal(istGleicheArtikelart("Impulsgeber", "Impulsgeber", "Zündkerzen"), false);
  assert.equal(istGleicheArtikelart("Nockenwellensensor", "Sensor", "Zündkerzen"), false);
  assert.equal(istGleicheArtikelart("Zündkerzenstecker", "Zündkerzenstecker", "Zündkerzen"), false);
});

test("Obergruppe Zünd-/Glühanlage ist kein Treffer für Zündkerzen", () => {
  assert.equal(kategorieIstTreffer("Zünd-/Glühanlage", "Zündkerzen"), false);
  assert.equal(kategorieIstTreffer("Glühkerze", "Zündkerzen"), false);
  assert.equal(kategorieIstTreffer("Glühkerze", "Glühkerzen"), true);
  assert.equal(kategorieIstTreffer("Impulsgeber", "Zündkerzen"), false);
  assert.equal(kategorieIstTreffer("Zündkerze", "Zündkerzen"), true);
  assert.equal(kategorieIstTreffer("Zündkerzenstecker", "Zündkerzen"), false);
  assert.equal(kategorieIstTreffer("Umlenk-/Führungsrolle", "umlenkrolle"), true);
  assert.equal(kategorieIstTreffer("Filter", "Ölfilter"), false);
  assert.equal(kategorieIstTreffer("Ölfilter", "Ölfilter"), true);
});

test("Fremde Artikelarten fallen aus der Liste", () => {
  const liste = [
    { name: "Glühkerze", category: "Glühkerze" },
    { name: "Impulsgeber", category: "Impulsgeber" },
    { name: "Zündkerze", category: "Zündkerze" },
    { name: "Nockenwellensensor", category: "Sensor" },
  ];
  const aus = ordneSuchtreffer(liste, "Zündkerzen");
  assert.deepEqual(aus.map((a) => a.name), ["Zündkerze"]);
});

test("Diesel-Suche nach Zündkerzen verweist auf Glühkerzen", () => {
  const h = kraftstoffHinweis("Diesel", "Zündkerzen");
  assert.equal(h?.text, "Dein Fahrzeug ist ein Diesel – meintest du Glühkerzen?");
  assert.equal(h?.suche, "Glühkerzen");
  assert.equal(kraftstoffHinweis("Diesel", "Glühkerzen"), null);
  assert.equal(kraftstoffHinweis("Benzin", "Zündkerzen"), null);
  assert.ok(kraftstoffHinweis("Diesel (Partikelfilter)", "zündkerze"));
});

test("Großhändlername verschwindet aus Marke und Lieferzeile", () => {
  assert.equal(markeFuerKunde("Inter Cars"), "");
  assert.equal(markeFuerKunde("InterCars"), "");
  assert.equal(markeFuerKunde("Bosch"), "Bosch");
  assert.equal(ohneGrosshaendler("1 Werktag · Inter Cars"), "1 Werktag");
  assert.equal(ohneGrosshaendler("inkl. MwSt, Inter Cars"), "inkl. MwSt");
});
