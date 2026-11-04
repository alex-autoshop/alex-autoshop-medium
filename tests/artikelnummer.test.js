import test from "node:test";
import assert from "node:assert/strict";
import { artikelVarianten, siehtNachNummer } from "../shared/artikelnummer.js";
import { versandkosten, istStarterbatterie, pfandBetrag, DHL_EUR } from "../shared/versand.js";
import { pfadErlaubt } from "../api/autoparts.js";

test("HU 719/6x erzeugt die TecDoc-Schreibweise mit Leerzeichen vor x", () => {
  const v = artikelVarianten("HU 719/6x");
  assert.ok(v.includes("HU 719/6 x"), v.join(" | "));
  assert.ok(v.includes("HU 719/6 X"), v.join(" | "));
  assert.ok(v.some((x) => x.toUpperCase().replace(/\s+/g, "") === "HU719/6X"));
});

test("kompakte MANN-Nummer wird auseinandergezogen, OE-Nummer nicht", () => {
  const mann = artikelVarianten("HU719/6x");
  assert.ok(mann.some((x) => x.toUpperCase().startsWith("HU 719")));
  const oe = artikelVarianten("1J0615301D");
  assert.ok(oe.includes("1J0615301D"));
  assert.equal(oe.some((x) => x.includes(" ")), false);
});

test("siehtNachNummer trennt Nummern von Freitext", () => {
  assert.equal(siehtNachNummer("HU 719/6x"), true);
  assert.equal(siehtNachNummer("1J0615301D"), true);
  assert.equal(siehtNachNummer("W 712/75"), true);
  assert.equal(siehtNachNummer("Bremsbeläge"), false);
  assert.equal(siehtNachNummer("Golf 7"), false);
  assert.equal(siehtNachNummer("Ölfilter"), false);
});

test("Versand: DHL 7,49, frei ab 150, bezahlte Mitglieder und Abholung umsonst", () => {
  assert.equal(DHL_EUR, 7.49);
  assert.equal(versandkosten({ summe: 40 }), DHL_EUR);
  assert.equal(versandkosten({ summe: 150 }), 0);
  assert.equal(versandkosten({ summe: 20, mitglied: true }), 0);
  assert.equal(versandkosten({ summe: 20, abholung: true }), 0);
});

test("Katalog-Proxy lässt nur die Pfade der Teilebörse durch", () => {
  assert.equal(pfadErlaubt("/manufacturers/list/type-id/1"), true);
  assert.equal(pfadErlaubt("/types/type-id/1/list-vehicles-types/8025/lang-id/1/country-filter-id/63"), true);
  assert.equal(pfadErlaubt("/articles/search-by-article-no"), true);
  assert.equal(pfadErlaubt("/category/type-id/1/products-groups-variant-2/31607/lang-id/1"), true);
  assert.equal(pfadErlaubt("/admin/users"), false);
  assert.equal(pfadErlaubt("/manufacturers/../secret"), false);
  assert.equal(pfadErlaubt("https://evil.example/manufacturers/list"), false);
  assert.equal(pfadErlaubt(""), false);
});

test("Batteriepfand nur für Starterbatterien", () => {
  assert.equal(istStarterbatterie("Starterbatterie 12 V 70 Ah"), true);
  assert.equal(istStarterbatterie("Batterie 12V 60Ah"), true);
  assert.equal(istStarterbatterie("Batteriepolfett"), false);
  assert.equal(istStarterbatterie("Bremsscheibe"), false);
  const p = pfandBetrag([{ name: "Starterbatterie 12 V 70 Ah", menge: 2 }]);
  assert.equal(p.stueck, 2);
  assert.equal(p.betrag, 15);
});
