import test from "node:test";
import assert from "node:assert/strict";
import {
  kandidatBauen,
  suchanfragen,
  empfehle,
  punkteFuer,
} from "../shared/produktempfehlung.js";
import { verlaufMerken, profilAusVerlauf } from "../shared/gesehen.js";

function artikel({ handle, title, marke, art, kategorie = "Lackierbedarf", verfuegbar = true }) {
  return kandidatBauen({
    handle,
    title,
    marke,
    art,
    tags: [`Kategorie: ${kategorie}`, marke, art],
    verfuegbar,
  });
}

const additiv = artikel({
  handle: "glasurit-90-e-1-effektadditiv-1-l",
  title: "Glasurit 90-E 1 Effektadditiv 1 L",
  marke: "Glasurit",
  art: "Additiv",
});

function katalog() {
  const liste = [additiv];
  for (let i = 0; i < 6; i++) {
    liste.push(artikel({
      handle: `glasurit-additiv-${i}`,
      title: `Glasurit Additiv Variante ${i}`,
      marke: "Glasurit",
      art: "Additiv",
    }));
  }
  for (let i = 0; i < 6; i++) {
    liste.push(artikel({
      handle: `glasurit-haerter-${i}`,
      title: `Glasurit Härter ${i} L`,
      marke: "Glasurit",
      art: "Härter",
    }));
  }
  for (let i = 0; i < 4; i++) {
    liste.push(artikel({
      handle: `glasurit-verd-${i}`,
      title: `Glasurit Verdünnung ${i}`,
      marke: "Glasurit",
      art: "Verdünnung",
    }));
  }
  for (let i = 0; i < 3; i++) {
    liste.push(artikel({
      handle: `glasurit-klar-${i}`,
      title: `Glasurit Klarlack ${i}`,
      marke: "Glasurit",
      art: "Klarlack",
    }));
  }
  liste.push(artikel({
    handle: "mipa-oel",
    title: "Mipa Motoröl 5W-30",
    marke: "Mipa",
    art: "Motoröl",
    kategorie: "Öle",
  }));
  liste.push(artikel({
    handle: "mipa-haerter",
    title: "Mipa HS Härter",
    marke: "Mipa",
    art: "Härter",
  }));
  liste.push(artikel({
    handle: "friz-klarlack",
    title: "FRIZ Klarlack",
    marke: "FRIZ",
    art: "Klarlack",
  }));
  return liste;
}

test("Effektadditiv sucht Glasurit-Härter, Verdünnung und Klarlack", () => {
  const q = suchanfragen(additiv);
  assert.ok(q.some((s) => s.includes("vendor:Glasurit") && s.includes("Additiv")));
  assert.ok(q.some((s) => s.includes("Härter")));
  assert.ok(q.some((s) => s.includes("Verdünnung")));
  assert.ok(q.some((s) => s.includes("Klarlack")));
  assert.ok(q.some((s) => s.includes("Kategorie: Lackierbedarf")));
});

test("Empfehlungen mischen Marke, Art und Ergänzungen und lassen Öl weg", () => {
  const aus = empfehle(katalog(), {
    produkt: additiv,
    sperre: (h) => /friz/i.test(h),
  });
  assert.equal(aus.length, 12);
  assert.ok(!aus.some((a) => a.handle === additiv.handle));
  assert.ok(!aus.some((a) => a.handle === "mipa-oel"));
  assert.ok(!aus.some((a) => a.handle === "friz-klarlack"));
  assert.ok(aus.some((a) => a.art === "Additiv"));
  assert.ok(aus.some((a) => a.art === "Härter"));
  assert.ok(aus.some((a) => a.art === "Verdünnung"));
  assert.ok(aus.some((a) => a.art === "Klarlack"));
  assert.ok(aus.filter((a) => a.art === "Härter").length <= 3);
  assert.ok(aus.filter((a) => a.art === "Additiv").length <= 4);
  assert.ok(aus.every((a) => a.marke === "Glasurit"));
});

test("Verlauf hebt die gemerkte Marke, ersetzt die Passung aber nicht", () => {
  const standox = artikel({ handle: "standox-h", title: "Standox Härter", marke: "Standox", art: "Härter" });
  const mipa = artikel({ handle: "mipa-h", title: "Mipa Härter", marke: "Mipa", art: "Härter" });
  const glasurit = artikel({ handle: "g-h", title: "Glasurit Härter", marke: "Glasurit", art: "Härter" });
  const profil = profilAusVerlauf(verlaufMerken([], { h: "x", m: "Standox", k: "Lackierbedarf", a: "Härter", f: ["härter"] }, 1_000), 1_000);
  const ohneMarke = kandidatBauen({
    handle: "fremd",
    title: "Effektadditiv",
    marke: "Sonstige",
    art: "Additiv",
    tags: ["Kategorie: Lackierbedarf", "Additiv"],
  });
  const kontext = { produkt: ohneMarke, profil };
  assert.ok(punkteFuer(standox, kontext) > punkteFuer(mipa, kontext));
  const mitGlasurit = { produkt: additiv, profil };
  assert.ok(punkteFuer(glasurit, mitGlasurit) > punkteFuer(standox, mitGlasurit));
});

test("Artikel im Warenkorb rutscht hinter die anderen Ergänzungen", () => {
  const drin = artikel({ handle: "glasurit-haerter-0", title: "Glasurit Härter 0 L", marke: "Glasurit", art: "Härter" });
  const frei = artikel({ handle: "glasurit-haerter-1", title: "Glasurit Härter 1 L", marke: "Glasurit", art: "Härter" });
  const basis = { produkt: additiv, profil: null };
  const mitKorb = { ...basis, warenkorb: { handles: [drin.handle], marken: ["Glasurit"], familien: ["härter"] } };
  assert.ok(punkteFuer(frei, mitKorb) > punkteFuer(drin, mitKorb));
});
