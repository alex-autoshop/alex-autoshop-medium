import test from "node:test";
import assert from "node:assert/strict";
import { aboListeGesamt, listeNormalisieren, PRODUKT_ABO_PREISE } from "../shared/produktabo.js";

test("jede Position behält ihre Stufe, der Beitrag ist die Summe", () => {
  const g = aboListeGesamt([
    { art: "einzel", rabatt: 15, preis: 10 },
    { art: "einzel", rabatt: 40, preis: 33 },
    { art: "menge", rabatt: 28, einzelpreis: 10, menge: 2 },
  ]);
  assert.equal(g.zeilen[0].beitrag, PRODUKT_ABO_PREISE[15]);
  assert.equal(g.zeilen[0].mitglied, 8.5);
  assert.equal(g.zeilen[1].beitrag, PRODUKT_ABO_PREISE[40]);
  assert.equal(g.zeilen[1].mitglied, 19.8);
  // 20 € normal, 28 % → 14,40 Mitglied, Ersparnis 5,60, Beitrag max(1, 1,12) = 1,12
  assert.equal(g.zeilen[2].beitrag, 1.12);
  assert.equal(g.beitrag, 3.62);
});

test("eine alte globale Stufe wandert auf jedes Produkt", () => {
  const n = listeNormalisieren({
    rabatt: 28,
    produkte: [{ id: "a", titel: "Alt" }, { id: "b", rabatt: 40 }],
  });
  assert.equal(n.standard, 28);
  assert.equal(n.produkte[0].rabatt, 28);
  assert.equal(n.produkte[1].rabatt, 40);
  assert.equal(listeNormalisieren(null).standard, 15);
});
