import test from "node:test";
import assert from "node:assert/strict";
import { produktArt, nachArtMischen } from "../shared/marken-vergleich.js";

function p({ id, title, productType, tags, handle }) {
  return { node: { id, title, productType, tags, handle: handle || id } };
}

const folge = ["PPG", "Sikkens", "Spies Hecker"];
const markeVon = (produkt) => {
  const t = produkt.node.title;
  if (t.startsWith("PPG")) return "PPG";
  if (t.startsWith("Sikkens")) return "Sikkens";
  return "Spies Hecker";
};

test("Produktart kommt vom Typ, nicht von einem Wort im Titel", () => {
  assert.equal(produktArt(p({ id: "1", title: "PPG Füller im Namen", productType: "Spachtel" })), "Spachtel");
  assert.equal(produktArt(p({ id: "2", title: "PPG D814 Elastizierend", productType: "Lackierbedarf", tags: ["Lackierbedarf", "PPG"] })), "Sonstige");
  assert.equal(produktArt(p({
    id: "3",
    title: "PPG Verdünner ohne Typ",
    productType: "Lackierbedarf",
    tags: ["Verdünnung", "PPG"],
  })), "Verdünnung");
});

test("PPG, Sikkens und Spies Hecker mischen Füller, Klarlack und Härter", () => {
  const roh = [
    p({ id: "sh-v", title: "Spies Hecker 3380 Verdünner 5 L", productType: "Verdünnung" }),
    p({ id: "sh-a", title: "Spies Hecker Additiv 9005 1 L", productType: "Additiv" }),
    p({ id: "sh-k", title: "Spies Hecker Klarlack 1 L", productType: "Klarlack" }),
    p({ id: "sh-f", title: "Spies Hecker Füller 1 L", productType: "Grundierung & Füller" }),
    p({ id: "sh-h", title: "Spies Hecker Härter 1 L", productType: "Härter" }),
    p({ id: "sk-f", title: "Sikkens Füller 1 L", productType: "Grundierung & Füller" }),
    p({ id: "sk-k", title: "Sikkens Klarlack 1 L", productType: "Klarlack" }),
    p({ id: "sk-h", title: "Sikkens Härter 1 L", productType: "Härter" }),
    p({ id: "ppg-f", title: "PPG Füller 1 L", productType: "Grundierung & Füller" }),
    p({ id: "ppg-k", title: "PPG Klarlack 5 L", productType: "Klarlack" }),
    p({ id: "ppg-h", title: "PPG Härter 1 L", productType: "Härter" }),
  ];
  const { produkte, gruppen } = nachArtMischen(roh, { markeVon, markenFolge: folge });
  const ids = produkte.map((x) => x.node.id);
  assert.deepEqual(gruppen.map((g) => g.titel), [
    "Grundierung & Füller",
    "Klarlack",
    "Härter",
    "Additiv",
    "Verdünnung",
  ]);
  const fueller = ids.slice(0, 3);
  assert.deepEqual(fueller, ["ppg-f", "sk-f", "sh-f"]);
  assert.ok(ids.indexOf("ppg-k") < ids.indexOf("sh-a"));
  assert.ok(ids.indexOf("ppg-h") < ids.indexOf("sh-v"));
  assert.equal(new Set(ids).size, ids.length);
});

test("Viele kleine Gebinde einer Marke stehen nicht als Block vor den anderen", () => {
  const roh = [];
  for (let i = 0; i < 6; i += 1) {
    roh.push(p({ id: `sk${i}`, title: `Sikkens Spray ${i} 400 ml`, productType: "Grundierung & Füller" }));
  }
  roh.push(p({ id: "ppg", title: "PPG Füller 1 L", productType: "Grundierung & Füller" }));
  roh.push(p({ id: "sh", title: "Spies Hecker Füller 1 L", productType: "Grundierung & Füller" }));
  const { produkte } = nachArtMischen(roh, { markeVon, markenFolge: folge });
  assert.deepEqual(produkte.slice(0, 3).map((x) => x.node.id), ["ppg", "sk0", "sh"]);
});

test("Doppelte Karten und leere Art landen einmal bei Sonstige", () => {
  const a = p({ id: "x", title: "PPG Unklar", productType: "" });
  const { produkte, gruppen } = nachArtMischen([a, a, p({ id: "y", title: "Sikkens Füller", productType: "Grundierung & Füller" })], {
    markeVon,
    markenFolge: folge,
  });
  assert.deepEqual(produkte.map((x) => x.node.id), ["y", "x"]);
  assert.equal(gruppen.at(-1).titel, "Sonstige");
});
