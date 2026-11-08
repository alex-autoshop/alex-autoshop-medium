import test from "node:test";
import assert from "node:assert/strict";
import { KARTEN_FELDER, PRODUKT_FELDER } from "../shared/katalog-regeln.js";
import {
  besterTreffer,
  einsatzFuer,
  produktAusZeile,
  setInhaltTitel,
  suchanfrage,
} from "../shared/prozess.js";

const kat = (name) => [`Kategorie: ${name}`];

test("Klarlack, Füller und Silikonentferner sitzen im Lackierprozess", () => {
  const klarlack = einsatzFuer({
    title: "Baslac 40-440 2K-VOC-Klarlack 5L",
    productType: "Klarlack",
    tags: [...kat("Lackierbedarf"), "Klarlack"],
  });
  assert.equal(klarlack.label, "Lackierprozess");
  assert.deepEqual(klarlack.markiert, ["klarlack"]);
  assert.equal(klarlack.schritte.length, 7);

  const fueller = einsatzFuer({
    title: "Mipa 2K-Acrylfiller",
    productType: "Grundierung & Füller",
    tags: kat("Lackierbedarf"),
  });
  assert.deepEqual(fueller.markiert, ["fuellern"]);

  const friz = einsatzFuer({
    title: "FRIZ Silikonentferner mild – 1L",
    productType: "Verdünnung & Zusätze",
    tags: [...kat("Lackierbedarf"), "Silikonentferner"],
  });
  assert.deepEqual(friz.markiert, ["reinigen"]);

  const glasurit = einsatzFuer({
    title: "Glasurit Silikonentferner P-P-26 5 L",
    productType: "Additiv",
    tags: kat("Lackierbedarf"),
  });
  assert.deepEqual(glasurit.markiert, ["reinigen"]);
});

test("Verdünnung ohne Silikon markiert mehrere Lackschritte", () => {
  const v = einsatzFuer({
    title: "Mipa V10 Verdünnung kurz – 1L",
    productType: "Verdünnung & Zusätze",
    tags: kat("Lackierbedarf"),
  });
  assert.deepEqual(v.markiert, ["fuellern", "basislack", "klarlack"]);
});

test("Motoröl und Getriebeöl bekommen verschiedene Ketten", () => {
  const oel = einsatzFuer({
    title: "Castrol EDGE 5W-30 LL Motoröl",
    productType: "Motoröl",
    tags: kat("Öle"),
  });
  assert.equal(oel.label, "Ölwechsel");
  assert.deepEqual(oel.markiert, ["einfuellen"]);
  assert.equal(oel.schritte.map((s) => s.id).includes("filter"), true);

  const getriebe = einsatzFuer({
    title: "Getriebeöl ATF",
    productType: "Getriebeöl",
    tags: kat("Öle"),
  });
  assert.equal(getriebe.label, "Getriebeöl");
  assert.deepEqual(getriebe.markiert, ["einfuellen"]);
  assert.equal(getriebe.schritte.some((s) => s.id === "filter"), false);
});

test("Pflege: Shampoo, Felgenreiniger, Scheiben und Detailer", () => {
  assert.deepEqual(einsatzFuer({
    title: "A1 Speed Shampoo – Schnell, schonend, stark",
    productType: "Pflegemittel & Versiegelung",
    tags: kat("Autopflege & Detailing"),
  }).markiert, ["waesche"]);

  assert.deepEqual(einsatzFuer({
    title: "SONAX FelgenStar Felgenreiniger 750 ml",
    productType: "Felgen & Reifen",
    tags: kat("Autopflege & Detailing"),
  }).markiert, ["felgen"]);

  assert.deepEqual(einsatzFuer({
    title: "Felgenreiniger sauer",
    productType: "Pflegemittel & Versiegelung",
    tags: kat("Autopflege & Detailing"),
  }).markiert, ["felgen"]);

  assert.deepEqual(einsatzFuer({
    title: "SONAX ScheibenStar Glasreiniger 750 ml",
    productType: "Pflegemittel & Versiegelung",
    tags: [...kat("Autopflege & Detailing"), "Scheibe"],
  }).markiert, ["scheiben"]);

  assert.deepEqual(einsatzFuer({
    title: "SONAX XTREME Ceramic Quick Detailer 750 ml",
    productType: "Pflegemittel & Versiegelung",
    tags: kat("Autopflege & Detailing"),
  }).markiert, ["versiegeln"]);

  assert.deepEqual(einsatzFuer({
    title: "SONAX CockpitStar 750 ml – Innenraumpflege",
    productType: "Pflegemittel & Versiegelung",
    tags: kat("Autopflege & Detailing"),
  }).markiert, ["innenraum"]);
});

test("Glasurit im Namen löst nicht den Scheibenschritt aus", () => {
  const klar = einsatzFuer({
    title: "Glasurit Klarlack",
    productType: "Klarlack",
    tags: kat("Lackierbedarf"),
  });
  assert.deepEqual(klar.markiert, ["klarlack"]);
});

test("ohne sichere Zuordnung bleibt die Leiste weg", () => {
  assert.equal(einsatzFuer({
    title: "Kfz Verbandskasten – Erste Hilfe",
    productType: "Sicherheit & Erste Hilfe",
    tags: kat("Sets & Sonstiges"),
  }), null);
  assert.equal(einsatzFuer({
    title: "Rupes Elektrische Orbital-poliermaschine 75MM",
    productType: "Werkzeug",
    tags: kat("Lackierbedarf"),
  }), null);
  assert.equal(einsatzFuer({
    title: "Liqui Moly Klimaanlagenreiniger",
    productType: "Klimaanlage",
    tags: kat("Werkstattchemie"),
  }), null);
  assert.equal(einsatzFuer({
    title: "Härter irgendwo",
    productType: "Härter",
    tags: [],
  }).markiert.join(","), "fuellern,klarlack");
});

test("Metafeld überschreibt, Ungültiges fällt auf die Regeln zurück", () => {
  const ueber = einsatzFuer({
    title: "Baslac Klarlack",
    productType: "Klarlack",
    tags: kat("Lackierbedarf"),
    prozessSchritte: { value: '["polieren"]' },
  });
  assert.deepEqual(ueber.markiert, ["polieren"]);

  const liste = einsatzFuer({
    title: "Baslac Klarlack",
    productType: "Klarlack",
    tags: kat("Lackierbedarf"),
    prozessSchritte: "klarlack, schleifen",
  });
  assert.deepEqual(liste.markiert, ["schleifen", "klarlack"]);

  const muell = einsatzFuer({
    title: "Baslac Klarlack",
    productType: "Klarlack",
    tags: kat("Lackierbedarf"),
    prozessSchritte: "kein-schritt",
  });
  assert.deepEqual(muell.markiert, ["klarlack"]);

  assert.equal(einsatzFuer({
    title: "Irgendwas",
    productType: "Reiniger",
    tags: [],
    prozessSchritte: '["reinigen"]',
  }), null);
});

const AUTOWASCHE = `
Autowäsche-Set. Sieben Teile – Shampoo, Waschhandschuh, Trockentuch, Felgenreiniger, Quick Detailer, Cockpit- und Scheibenpflege.
Im Set enthalten
1× SONAX XTREME RichFoam Shampoo 1 l – 18,95 €
1× SONAX Microfaser WaschHandschuh – 12,95 €
1× Drying Master 500 g/m² (Blau) – 6,19 €
1× SONAX FelgenStar Felgenreiniger 750 ml – 16,99 €
1× SONAX XTREME Ceramic Quick Detailer 750 ml – 20,95 €
1× SONAX CockpitStar 750 ml – 14,95 €
1× SONAX ScheibenStar Glasreiniger 750 ml – 13,95 €
Einzelpreis zusammen: 104,93 €
Kurze Anleitung Auto nass machen.
`;

const INHALTE = [
  { title: "SONAX XTREME RichFoam Shampoo – Autopflege", productType: "Pflegemittel & Versiegelung", tags: kat("Autopflege & Detailing") },
  { title: "SONAX Microfaser WaschHandschuh – Autopflege-Zubehör", productType: "Waschzubehör", tags: kat("Autopflege & Detailing") },
  { title: "Drying Master 500g/m², blau", productType: "Trocknen & Leder", tags: kat("Autopflege & Detailing") },
  { title: "SONAX FelgenStar Felgenreiniger 750 ml", productType: "Felgen & Reifen", tags: kat("Autopflege & Detailing") },
  { title: "SONAX XTREME Ceramic Quick Detailer 750 ml – Autopflege", productType: "Pflegemittel & Versiegelung", tags: kat("Autopflege & Detailing") },
  { title: "SONAX CockpitStar 750 ml – Innenraumpflege", productType: "Pflegemittel & Versiegelung", tags: kat("Autopflege & Detailing") },
  { title: "SONAX ScheibenStar Glasreiniger 750 ml", productType: "Pflegemittel & Versiegelung", tags: kat("Autopflege & Detailing") },
];

test("Autowäsche-Set markiert die enthaltenen Schritte, nicht Vorwäsche", () => {
  const zeilen = setInhaltTitel(AUTOWASCHE);
  assert.equal(zeilen.length, 7);
  assert.match(zeilen[6], /ScheibenStar/);
  assert.equal(zeilen.some((z) => /vorwäsche/i.test(z)), false);

  const set = {
    title: "Autowäsche-Set",
    productType: "Sets",
    tags: ["Autopflege", "Bundle", "Kategorie: Sets & Sonstiges", "Set", "Waschen"],
    description: AUTOWASCHE,
  };
  assert.equal(einsatzFuer(set), null);
  const erg = einsatzFuer(set, INHALTE);
  assert.equal(erg.label, "Fahrzeugwäsche & Pflege");
  assert.deepEqual(erg.markiert, ["felgen", "waesche", "trocknen", "versiegeln", "innenraum", "scheiben"]);
  assert.equal(erg.markiert.includes("vorwaesche"), false);
});

const lack = () => kat("Lackierbedarf");

test("Smart-Repair für Anfänger: Wunschfarbe ist Basislack, Füllern bleibt aus", () => {
  const set = {
    title: "Smart-Repair-Set für Lackieranfänger",
    productType: "Sets",
    tags: ["Bundle", "Kategorie: Sets & Sonstiges", "Lackierbedarf", "Set", "Smart Repair"],
  };
  const dose = produktAusZeile("Wunschfarbe-Spraydose 1K Basislack 400 ml");
  assert.equal(dose.productType, "Wunschfarbe & Lackstift");
  const erg = einsatzFuer(set, [
    { title: "Silikonentferner mild 1 L", productType: "Verdünnung & Zusätze", tags: [...lack(), "Silikonentferner"] },
    { title: "Schleifschwamm P120–P180", productType: "Schleifmittel", tags: lack() },
    { title: "Abdeckband 19 mm", productType: "Abdecken", tags: lack() },
    { title: "Abdeckband 30 mm", productType: "Abdecken", tags: lack() },
    dose,
    { title: "2K-Klarlack 400 ml", productType: "Klarlack", tags: lack() },
    { title: "Staubbindetücher, 10 Stück", productType: "Verbrauchsmaterial", tags: lack() },
  ]);
  assert.deepEqual(erg.markiert, ["schleifen", "reinigen", "basislack", "klarlack"]);
});

test("Smart-Repair mit Pistole: Füller ja, Basislack nein", () => {
  const set = {
    title: "Smart-Repair-Set mit Lackierpistole",
    productType: "Sets",
    tags: ["Bundle", "Kategorie: Sets & Sonstiges", "Lackierbedarf", "Set", "Smart Repair"],
  };
  const erg = einsatzFuer(set, [
    { title: "Anest Iwata Airgunsa", productType: "Lackierpistolen & Zubehör", tags: lack() },
    { title: "Troton Acryl Filler 4:1", productType: "Grundierung & Füller", tags: lack() },
    { title: "FRIZ 2K-Klarlack", productType: "Klarlack", tags: lack() },
    { title: "FRIZ Härter 10", productType: "Härter", tags: lack() },
    { title: "Mipa V10 Verdünnung", productType: "Verdünnung & Zusätze", tags: lack() },
    { title: "FRIZ Silikonentferner mild", productType: "Verdünnung & Zusätze", tags: [...lack(), "Silikonentferner"] },
    { title: "Schleifschwamm", productType: "Schleifmittel", tags: lack() },
    { title: "Green Tape", productType: "Abdecken", tags: lack() },
    { title: "Colad Staubbindetücher", productType: "Verbrauchsmaterial", tags: lack() },
    { title: "Colad Farbsiebe", productType: "Verbrauchsmaterial", tags: lack() },
  ]);
  assert.deepEqual(erg.markiert, ["schleifen", "reinigen", "fuellern", "klarlack"]);
});

test("Nur Tücher und Abdeckband öffnen keine Lackierschritte", () => {
  const set = {
    title: "Leeres Zubehör",
    productType: "Sets",
    tags: ["Smart Repair", "Lackierbedarf"],
  };
  assert.equal(einsatzFuer(set, [
    { title: "Abdeckband", productType: "Abdecken", tags: lack() },
    { title: "Staubbindetücher", productType: "Verbrauchsmaterial", tags: lack() },
  ]), null);
});

test("Set-Zeile trifft den Klarlack, nicht die Verdünnung", () => {
  const kandidaten = [
    { title: "FRIZ 2K-Acrylverdünnung N – 5 Liter", productType: "Verdünnung & Zusätze", tags: kat("Lackierbedarf") },
    { title: "FRIZ 1K Klarlack glänzend", productType: "Klarlack", tags: kat("Lackierbedarf") },
    { title: "FRIZ 2K-Klarlack – Glänzender Schutz für perfekten Finish", productType: "Klarlack", tags: kat("Lackierbedarf") },
    { title: "Smart-Repair-Set mit Lackierpistole", productType: "Sets", tags: [] },
  ];
  const treffer = besterTreffer("FRIZ 2K-Klarlack 1 L", kandidaten);
  assert.match(treffer.title, /2K-Klarlack/);
  assert.equal(treffer.productType, "Klarlack");
});

test("Winter-Set nimmt nur Winterschritte aus den Inhalten", () => {
  const set = {
    title: "Winter-Set für Fahranfänger",
    productType: "Sets",
    tags: ["Bundle", "Kategorie: Sets & Sonstiges", "Set", "Winter"],
  };
  const erg = einsatzFuer(set, [
    { title: "Eisschaber im Handschuh", productType: "Eiskratzer & Schneebesen", tags: kat("Winter") },
    { title: "SONAX ScheibenEnteiser", productType: "Enteiser & Frostschutz", tags: kat("Winter") },
    { title: "SONAX GummiPfleger", productType: "Felgen & Reifen", tags: kat("Autopflege & Detailing") },
    { title: "SONAX ScheibenSchwamm Antibeschlag", productType: "Waschzubehör", tags: kat("Autopflege & Detailing") },
  ]);
  assert.equal(erg.label, "Wintereinsatz");
  assert.deepEqual(erg.markiert, ["kratzen", "enteisen"]);
});

test("Mengenzahl und Klammer erklären den Katalogtitel nicht zur Pflicht", () => {
  const enteiser = besterTreffer("SONAX ScheibenEnteiser 500 ml", [
    { title: "SONAX ScheibenEnteiser – Winter & Scheibe", productType: "Enteiser & Frostschutz" },
    { title: "SONAX ScheibenEnteiser Sweet Home Special Edition 1 l", productType: "Enteiser & Frostschutz" },
  ]);
  assert.match(enteiser.title, /Winter/);

  const filler = besterTreffer("Troton Acryl Filler 4:1 Grau (Füller + Härter)", [
    { title: "Inter Troton Acryl Filler 4:1 – Acryl Grundierfüller (Grau)", productType: "Grundierung & Füller" },
    { title: "FRIZ Härter 10 – 500ml", productType: "Härter" },
  ]);
  assert.equal(filler.productType, "Grundierung & Füller");
});

test("Setzeilen ohne Preis und der Nachsatz bleiben draußen", () => {
  const text = "Im Set enthalten 1× Silikonentferner mild 1 L 1× Schleifschwamm P120–P180 1× 2K-Klarlack 400 ml Grundierung und Füller sind nicht enthalten. Bitte separat wählen.";
  assert.deepEqual(setInhaltTitel(text), [
    "Silikonentferner mild 1 L",
    "Schleifschwamm P120–P180",
    "2K-Klarlack 400 ml",
  ]);
});

test("Parser ignoriert Artikel außerhalb des Sets", () => {
  const text = "Im Set enthalten 1× FRIZ Silikonentferner mild 1 L – 8,95 € Nicht im Set (separat wählen): Individuelle Spraydose 400 ml – z. B. Mipa 1K Basislack ab 18,50 €";
  assert.deepEqual(setInhaltTitel(text), ["FRIZ Silikonentferner mild 1 L"]);
});

test("Suchanfrage bleibt im Katalogfilter", () => {
  const q = suchanfrage("SONAX ScheibenStar Glasreiniger 750 ml");
  assert.match(q, /scheibenstar/i);
  assert.match(q, /glasreiniger/i);
  assert.ok(q.length <= 170);
  assert.match(q, /^[\p{L}\p{N} *:"'_.&/+()-]+$/u);
});

test("Produktliste bleibt schlank, die Produktseite liest das Metafeld", () => {
  assert.equal(KARTEN_FELDER.includes("prozess_schritte"), false);
  assert.equal(PRODUKT_FELDER.includes("prozess_schritte"), true);
});
