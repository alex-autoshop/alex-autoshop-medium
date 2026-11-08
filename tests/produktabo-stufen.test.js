import test from "node:test";
import assert from "node:assert/strict";
import {
  ABO_2K_AUFSCHLAG, aboListeGesamt, istWunschfarbeMenge, LACKSYSTEM_1K, LACKSYSTEM_2K,
  listeNormalisieren, mengenPosition, mischBedarf, PRODUKT_ABO_PREISE, warenMitRabatt,
  wunschfarbeAboTitel, wunschfarbeDetail,
} from "../shared/produktabo.js";

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

test("2K-Aufschlag liegt auf dem Normalpreis, Rabatt und Beitrag folgen daraus", () => {
  const gebinde = [{ label: "1 Liter", liter: 1, preis: 110 }];
  const wahl = { bedarfLiter: 20, anteilB: 0, gebindeA: gebinde, gebindeB: [], rabatt: 40 };
  const ohne = mischBedarf(wahl);
  const mit = mischBedarf({ ...wahl, aufschlag: ABO_2K_AUFSCHLAG });
  assert.equal(ABO_2K_AUFSCHLAG, 0.25);
  assert.equal(ohne.normal, 2200);
  assert.equal(ohne.mitglied, 1320);
  assert.equal(ohne.ersparnis, 880);
  assert.equal(ohne.beitrag, 176);
  assert.equal(mit.teilA.preis, 2200);
  assert.equal(mit.normal, 2750);
  assert.equal(mit.mitglied, 1650);
  assert.equal(mit.ersparnis, 1100);
  assert.equal(mit.beitrag, 220);
  assert.equal(mischBedarf({ ...wahl, aufschlag: 0 }).normal, 2200);
});

test("altes egal wird 1K bevorzugt, alter 2K-Preis bekommt den Aufschlag einmal", () => {
  const n = listeNormalisieren({
    standard: 40,
    produkte: [
      {
        id: "farben-mix::0::egal::L", art: "menge", titel: "Wunschfarbe",
        variante: "Standox · egal · 20 L / Monat", lacksystem: "egal",
        einzelpreis: 205.75, menge: 20, rabatt: 40,
      },
      {
        id: "farben-mix::100::2k::L", art: "menge", titel: "Wunschfarbe",
        variante: "Mipa · 2K · 20 L / Monat", lacksystem: "2K",
        einzelpreis: 22, menge: 20, rabatt: 40,
      },
      {
        id: "farben-mix::0::1k::L", art: "menge", titel: "Wunschfarbe",
        variante: "Standox · 1K · 20 L / Monat", lacksystem: "1K",
        einzelpreis: 205.75, menge: 20, rabatt: 40,
      },
      {
        id: "farben-mix::0::2k::L", art: "menge", titel: "Wunschfarbe",
        variante: "Standox · 2K bevorzugt · 20 L / Monat", lacksystem: LACKSYSTEM_2K,
        einzelpreis: 137.5, menge: 20, rabatt: 40,
      },
    ],
  });
  assert.equal(n.produkte[0].lacksystem, LACKSYSTEM_1K);
  assert.equal(n.produkte[0].variante, "Standox · 1K bevorzugt · 20 L / Monat");
  assert.equal(n.produkte[0].id, "farben-mix::0::1k::L");
  assert.equal(n.produkte[0].einzelpreis, 205.75);
  assert.equal(n.produkte[1].lacksystem, LACKSYSTEM_2K);
  assert.equal(n.produkte[1].variante, "Mipa · 2K bevorzugt · 20 L / Monat");
  assert.equal(n.produkte[1].einzelpreis, 27.5);
  assert.equal(n.produkte[2].lacksystem, LACKSYSTEM_1K);
  assert.equal(n.produkte[2].variante, "Standox · 1K bevorzugt · 20 L / Monat");
  assert.equal(n.produkte[2].einzelpreis, 205.75);
  assert.equal(n.produkte[3].einzelpreis, 137.5);
  const nochmal = listeNormalisieren(n);
  assert.equal(nochmal.produkte[1].einzelpreis, 27.5);
  assert.equal(nochmal.produkte[1].variante, "Mipa · 2K bevorzugt · 20 L / Monat");
});

test("Wunschfarbe-Titel folgt Stufe und Litern, Spraydose bleibt draußen", () => {
  assert.equal(wunschfarbeAboTitel(40, 4), "40 % auf 4 L Wunschfarbe im Monat");
  assert.equal(wunschfarbeAboTitel(15, 1.5), "15 % auf 1,5 L Wunschfarbe im Monat");
  assert.equal(wunschfarbeAboTitel(28, 20), "28 % auf 20 L Wunschfarbe im Monat");
  assert.equal(wunschfarbeAboTitel(40, 0), null);
  assert.equal(
    wunschfarbeDetail("10 % Standox · 90 % Mipa · 1K bevorzugt · 4 L / Monat", 1.5),
    "10 % Standox · 90 % Mipa · 1K bevorzugt · 1,5 L / Monat",
  );
  assert.equal(istWunschfarbeMenge({ art: "menge", handle: "farben-mix", id: "farben-mix::10::1k::L" }), true);
  assert.equal(istWunschfarbeMenge({ art: "menge", handle: "individuelle-spraydose-erstellen", id: "spray::0::1k::S" }), false);
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
