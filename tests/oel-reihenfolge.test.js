import test from "node:test";
import assert from "node:assert/strict";
import { istOelFilter, oeleVorFiltern } from "../shared/oel-reihenfolge.js";

const p = (title, productType, tags) => ({ node: { title, productType, tags, id: title } });

test("Filter an Typ, Tag oder Titel, Filterpapier nicht", () => {
  assert.equal(istOelFilter(p("MANN-FILTER HU820/1y Ölfilter", "Filter")), true);
  assert.equal(istOelFilter(p("Luftfilter", "Filter")), true);
  assert.equal(istOelFilter(p("Innenraumfilter", "")), true);
  assert.equal(istOelFilter(p("Kraftstofffilter", "Motoröl", ["Filter"])), true);
  assert.equal(istOelFilter(p("MANNOL Extreme 5W-40", "Motoröl")), false);
  assert.equal(istOelFilter(p("TITAN GT1 PRO C-3", "Motoröl")), false);
  assert.equal(istOelFilter(p("Getriebeöl ATF", "Getriebeöl")), false);
  assert.equal(istOelFilter(p("Bremsflüssigkeit DOT 4", "Bremsflüssigkeit")), false);
  assert.equal(istOelFilter(p("Kühlmittel", "Kühlmittel & Scheibenreiniger")), false);
  assert.equal(istOelFilter(p("W5 Brake and Parts Cleaner", "Reiniger & Fette")), false);
  assert.equal(istOelFilter(p("Filterpapier P400", "Schleifmittel")), false);
  assert.equal(istOelFilter(p("Nass-Filterpapier Körnung 800", "Schleifpapier")), false);
});

test("Öle behalten ihre Reihenfolge, Filter rutschen geschlossen nach hinten", () => {
  const liste = [
    p("MANN-FILTER HU820/1y", "Filter"),
    p("MANNOL Extreme", "Motoröl"),
    p("Luftfilter", "Filter"),
    p("TITAN GT1", "Motoröl"),
    p("W5 Bremsenreiniger", "Reiniger & Fette"),
  ];
  const namen = oeleVorFiltern(liste, () => 0).map((x) => x.node.title);
  assert.deepEqual(namen, [
    "MANNOL Extreme",
    "TITAN GT1",
    "W5 Bremsenreiniger",
    "MANN-FILTER HU820/1y",
    "Luftfilter",
  ]);
});

test("Preissortierung gilt innerhalb der Gruppe, nicht über die Gruppen hinweg", () => {
  const mitPreis = (title, productType, preis) => ({ ...p(title, productType), preis });
  const liste = [
    mitPreis("Teurer Filter", "Filter", 30),
    mitPreis("Teures Öl", "Motoröl", 20),
    mitPreis("Günstiger Filter", "Filter", 5),
    mitPreis("Günstiges Öl", "Motoröl", 8),
  ];
  const namen = oeleVorFiltern(liste, (a, b) => a.preis - b.preis).map((x) => x.node.title);
  assert.deepEqual(namen, ["Günstiges Öl", "Teures Öl", "Günstiger Filter", "Teurer Filter"]);
});

test("eine nur aus Filtern bestehende Markenauswahl bleibt beisammen", () => {
  const liste = [p("MANN-FILTER HU820", "Filter"), p("MANN-FILTER CUK", "Filter")];
  assert.deepEqual(oeleVorFiltern(liste, () => 0).map((x) => x.node.title), ["MANN-FILTER HU820", "MANN-FILTER CUK"]);
});
