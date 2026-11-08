import test from "node:test";
import assert from "node:assert/strict";
import { MITGLIEDSPREISE } from "../shared/mitgliedspreise.js";
import {
  ATTRIBUT_FAHRZEUG,
  ATTRIBUT_HINWEIS,
  FARBKONFIGURATOR_HANDLES,
  FARB_ARTEN,
  anzeigePreis,
  farbAttribute,
  istStandardvariante,
  kasseAdresse,
  sichtbareOptionen,
} from "../shared/farbangabe.js";

const set = {
  handle: "smart-repair-set-fur-lackieranfanger",
  options: [{ name: "Title", values: ["Default Title"] }],
  variants: {
    edges: [{ node: { title: "Default Title", price: { amount: "79.95", currencyCode: "EUR" } } }],
  },
};

const wunschfarbe = {
  handle: "individuelle-spraydose-erstellen",
  options: [
    { name: "Hersteller", values: ["Standox (Top Qualität & Teuer)", "Mipa (Gute Qualität & Günstig)"] },
    { name: "Komponenten", values: ["1K Basislack", "2K Lack mit Klarlack"] },
  ],
  variants: {
    edges: [
      { node: { title: "Standox (Top Qualität & Teuer) / 1K Basislack" } },
      { node: { title: "Standox (Top Qualität & Teuer) / 2K Lack mit Klarlack" } },
      { node: { title: "Mipa (Gute Qualität & Günstig) / 1K Basislack" } },
      { node: { title: "Mipa (Gute Qualität & Günstig) / 2K Lack mit Klarlack" } },
    ],
  },
};

test("das Set hängt am Konfigurator und ist eine Standardvariante", () => {
  assert.ok(FARBKONFIGURATOR_HANDLES.includes("smart-repair-set-fur-lackieranfanger"));
  assert.equal(istStandardvariante(set), true);
  assert.deepEqual(sichtbareOptionen(set), []);
});

test("Wunschfarbe bleibt bei Marke und System, der Lackfarben-Rabatt gilt dort weiter", () => {
  assert.ok(FARBKONFIGURATOR_HANDLES.includes("individuelle-spraydose-erstellen"));
  assert.ok(FARBKONFIGURATOR_HANDLES.includes("farben-mix"));
  assert.ok(FARBKONFIGURATOR_HANDLES.includes("individuellen-lackstift-bestellen-20ml"));
  assert.equal(istStandardvariante(wunschfarbe), false);
  assert.deepEqual(sichtbareOptionen(wunschfarbe), ["Hersteller", "Komponenten"]);
  assert.equal(anzeigePreis(22.5, 2, 40, false), 27);
  assert.equal(anzeigePreis(79.95, 1, 40, true), 79.95);
  assert.equal(anzeigePreis(79.95, 2, 40, true), 159.9);
});

test("Mitgliederpreise des Sets bleiben 15, 28 und 40 Prozent auf den Set-Preis", () => {
  assert.equal(MITGLIEDSPREISE[1].rabatt, 15);
  assert.equal(MITGLIEDSPREISE[2].rabatt, 28);
  assert.equal(MITGLIEDSPREISE[3].rabatt, 40);
  const preis = 79.95;
  assert.equal(Math.round(preis * (1 - 0.15) * 100) / 100, 67.96);
  assert.equal(Math.round(preis * (1 - 0.28) * 100) / 100, 57.56);
  assert.equal(Math.round(preis * (1 - 0.40) * 100) / 100, 47.97);
});

test("Pflichtfelder und Attributnamen wie bei der Wunschfarbe", () => {
  assert.deepEqual(farbAttribute({ automarke: "  ", art: "Lackcode", wert: "LY9T" }), {
    ok: false,
    fehler: "Bitte die Automarke angeben",
  });
  assert.deepEqual(farbAttribute({ automarke: "VW", art: "Lackcode", wert: " " }), {
    ok: false,
    fehler: "Bitte Lackcode angeben",
  });
  assert.deepEqual(farbAttribute({ automarke: "Audi", art: "VIN", wert: "" }), {
    ok: false,
    fehler: "Bitte VIN angeben",
  });
  const voll = farbAttribute({
    automarke: "VW",
    modell: "Golf",
    baujahr: "2018",
    art: "Lackcode",
    wert: " LY9T ",
    hinweis: " Foto folgt ",
  });
  assert.equal(voll.ok, true);
  assert.deepEqual(voll.attribute, [
    { key: ATTRIBUT_FAHRZEUG, value: "VW Golf 2018" },
    { key: "Lackcode", value: "LY9T" },
    { key: ATTRIBUT_HINWEIS, value: "Foto folgt" },
  ]);
  const ohneHinweis = farbAttribute({ automarke: "BMW", art: "Lackname", wert: "Alpinweiß" });
  assert.deepEqual(ohneHinweis.attribute.map((eintrag) => eintrag.key), [ATTRIBUT_FAHRZEUG, "Lackname"]);
  assert.deepEqual(FARB_ARTEN, ["Lackcode", "Lackname", "VIN"]);
});

test("die Kasse behält Positions-Attribute und die Shop-Domain", () => {
  const permalink = "https://shop.alex-autoshop.de/cart/57549671661833:1";
  const intern = "https://j1a6sr-q2.myshopify.com/cart/c/abc?key=geheim";
  assert.equal(
    kasseAdresse({ attributeVorhanden: false, checkoutUrl: intern, permalink }),
    permalink,
  );
  assert.equal(
    kasseAdresse({ attributeVorhanden: true, checkoutUrl: null, permalink }),
    permalink,
  );
  assert.equal(
    kasseAdresse({ attributeVorhanden: true, checkoutUrl: intern, permalink }),
    "https://shop.alex-autoshop.de/cart/c/abc?key=geheim",
  );
  assert.equal(
    kasseAdresse({
      attributeVorhanden: true,
      checkoutUrl: "https://shop.alex-autoshop.de/cart/c/abc?key=geheim",
      permalink,
    }),
    "https://shop.alex-autoshop.de/cart/c/abc?key=geheim",
  );
});
