import test from "node:test";
import assert from "node:assert/strict";
import { aboListeGesamt, listeNormalisieren, mengenPosition, PRODUKT_ABO_PREISE, warenMitRabatt } from "../shared/produktabo.js";

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
  assert.equal(g.beitrag, 5.12);
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

test("Lack nach Menge: 70,80 € sind 20 % der Ersparnis, nicht der Warenpreis", () => {
  // 10 × 88,50 € = 885 € Normalpreis, 40 % → 531 € Mitglied, Ersparnis 354 €, Beitrag 70,80 €.
  // Dieselbe Funktion rechnet die Zeile in der Liste und die Stripe-/SEPA-Summe.
  const z = mengenPosition({ einzelpreis: 88.5, menge: 10, rabatt: 40 });
  assert.equal(z.normal, 885);
  assert.equal(z.mitglied, 531);
  assert.equal(z.ersparnis, 354);
  assert.equal(z.beitrag, 70.8);
  assert.equal(aboListeGesamt([{ art: "menge", rabatt: 40, einzelpreis: 88.5, menge: 10 }]).beitrag, 70.8);
  assert.equal(PRODUKT_ABO_PREISE[40], 3);
});

test("die drei Wunschfarben-Konfiguratoren fallen aus der Einzel-Liste, Mengen bleiben", () => {
  const n = listeNormalisieren({
    standard: 15,
    produkte: [
      { id: "1", handle: "farben-mix", art: "einzel", titel: "Wunschfarbe", preis: 0, rabatt: 15 },
      { id: "2", handle: "farben-mix", art: "menge", titel: "Wunschfarbe", einzelpreis: 20, menge: 4, rabatt: 15 },
      { id: "3", handle: "schleifpaste", art: "einzel", titel: "Paste", preis: 33, rabatt: 15 },
    ],
  });
  assert.deepEqual(n.produkte.map((p) => p.id), ["2", "3"]);
});

test("Warenkasse rechnet Abo-Zeilen selbst und lässt andere beim Ladenpreis", () => {
  const g = warenMitRabatt([
    { titel: "Spray", einzel: 13.95, menge: 1, rabatt: 40 },
    { titel: "Klarlack", einzel: 92.95, menge: 3, rabatt: 40 },
    { titel: "Tuch", einzel: 4.5, menge: 2, rabatt: 0 },
  ]);
  assert.equal(g.positionen[0].betrag, 8.37);
  assert.equal(g.positionen[1].betrag, 167.31);
  assert.equal(g.positionen[2].betrag, 9);
  assert.equal(g.summe, 184.68);
  assert.equal(warenMitRabatt([]), null);
  assert.equal(warenMitRabatt([{ titel: "x", einzel: 1, menge: 0, rabatt: 15 }]), null);
});
