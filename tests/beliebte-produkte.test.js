import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BELIEBTE_ANFRAGE,
  BELIEBTE_HANDLES,
  BELIEBTE_MAX,
  beliebteHandles,
  beliebteHolen,
  beliebteKarte,
} from "../shared/beliebte-produkte.js";

function karte(ueber) {
  return {
    images: { edges: [{ node: { url: "https://cdn.shopify.com/s/files/1/a.jpg" } }] },
    priceRange: { minVariantPrice: { amount: "12.5", currencyCode: "EUR" } },
    variants: { edges: [{ node: { availableForSale: true } }] },
    ...ueber,
  };
}

test("die Startseitenliste ist eine gepflegte Handle-Reihe", () => {
  assert.equal(BELIEBTE_MAX, 10);
  assert.equal(BELIEBTE_ANFRAGE, 10);
  assert.equal(BELIEBTE_HANDLES.length, 10);
  assert.equal(new Set(BELIEBTE_HANDLES).size, 10);
  assert.equal(BELIEBTE_HANDLES[0], "farben-mix");
  assert.match(BELIEBTE_HANDLES[1], /troton-remover/);
  assert.deepEqual(beliebteHandles(BELIEBTE_HANDLES), BELIEBTE_HANDLES);
});

test("Handles bleiben eindeutig, gültig und bei zehn", () => {
  const lang = "a".repeat(161);
  assert.deepEqual(
    beliebteHandles(["farben-mix", "farben-mix", "Mipa", "../x", "", "mipa-cc9", lang, "napa-premium-kuhlerschutz-np48"]),
    ["farben-mix", "mipa-cc9", "napa-premium-kuhlerschutz-np48"],
  );
  const viele = Array.from({ length: 12 }, (_, i) => `artikel-${i}`);
  assert.equal(beliebteHandles(viele).length, 10);
  assert.equal(beliebteHandles(viele)[9], "artikel-9");
});

test("nur veröffentlichte Karten mit Bild, Preis und Lieferbarkeit", () => {
  assert.equal(beliebteKarte(karte()), true);
  assert.equal(beliebteKarte(null), false);
  assert.equal(beliebteKarte(karte({
    images: { edges: [{ node: { url: "https://cdn.shopify.com/s/files/1/placeholder.jpg" } }] },
  })), false);
  assert.equal(beliebteKarte(karte({ images: { edges: [] } })), false);
  assert.equal(beliebteKarte(karte({
    priceRange: { minVariantPrice: { amount: "0", currencyCode: "EUR" } },
  })), false);
  assert.equal(beliebteKarte(karte({
    variants: { edges: [{ node: { availableForSale: false } }, { node: { availableForSale: true } }] },
  })), true);
  assert.equal(beliebteKarte(karte({
    variants: { edges: [{ node: { availableForSale: false } }] },
  })), false);
});

test("Abfrage hält die Reihenfolge und verwirft Lücken", async () => {
  const gut = karte({ handle: "farben-mix", title: "Wunschfarbe" });
  const spaeter = karte({ handle: "mipa-cc9", title: "Klarlack" });
  const erg = await beliebteHolen(async (query) => {
    assert.match(query, /productByHandle\(handle: "farben-mix"\)/);
    assert.match(query, /p1: productByHandle/);
    assert.doesNotMatch(query, /kaputt/);
    return {
      data: {
        p0: gut,
        p1: null,
        p2: karte({ images: { edges: [{ node: { url: "https://example.com/no-image.png" } }] } }),
        p3: spaeter,
      },
    };
  }, ["farben-mix", "fehlt-im-kanal", "platzhalter-bild", "mipa-cc9", "farben-mix", "KAPUTT"]);
  assert.equal(erg.pageInfo.hasNextPage, false);
  assert.deepEqual(erg.edges.map((e) => e.node.title), ["Wunschfarbe", "Klarlack"]);
});

test("Startseite und Vorab-Abruf bleiben bei derselben Katalog-Adresse", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const seite = readFileSync(new URL("../src/pages/Home.tsx", import.meta.url), "utf8");
  assert.match(html, new RegExp(`first=${BELIEBTE_ANFRAGE}&einbettung=home`));
  assert.match(seite, /BELIEBTE_ANFRAGE/);
  assert.doesNotMatch(seite, /pageSize:\s*8/);
});
