import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { beschreibungHtml } from "../shared/html-sicher.js";
import { KARTEN_FELDER, PRODUKT_FELDER } from "../shared/katalog-regeln.js";
import { produktDokument, produktLd } from "../shared/seo-katalog.js";

const FRIZ = `<p data-start="688" data-end="833">Die FRIZ 1K Dickschicht-Grundierung bietet eine starke Haftung.</p><p>🔹 <strong data-start="838">Eigenschaften:</strong><br>✔️ Hohe Deckkraft &amp; schnelle Trocknung</p>`;

test("Whitelist bleibt, Datenattribute und Handler fallen weg", () => {
  const html = beschreibungHtml(FRIZ + `<p onclick="alert(1)" style="color:red">Text</p>`);
  assert.match(html, /<p>Die FRIZ/);
  assert.match(html, /<strong>Eigenschaften:<\/strong><br>/);
  assert.match(html, /&amp; schnelle/);
  assert.equal(html.includes("data-"), false);
  assert.equal(html.includes("onclick"), false);
  assert.equal(html.includes("style"), false);
  assert.equal(html.includes("script"), false);
});

test("Skript, Stil und Kommentare verschwinden samt Inhalt", () => {
  const html = beschreibungHtml(`<p>Vor</p><script>alert(1)</script><style>p{color:red}</style><!--<img onerror=alert(1)>--><p>Nach</p>`);
  assert.equal(html.includes("alert"), false);
  assert.equal(html.includes("color"), false);
  assert.equal(html.includes("onerror"), false);
  assert.match(html, /<p>Vor<\/p>/);
  assert.match(html, /<p>Nach<\/p>/);
});

test("Listen, Überschriften und Tabellen bleiben", () => {
  const html = beschreibungHtml(`<h2>Titel</h2><h3>Schritt</h3><ul><li>Eins</li><li>Zwei</li></ul><table><thead><tr><th>A</th></tr></thead><tbody><tr><td>B</td></tr></tbody></table>`);
  assert.match(html, /<h2>Titel<\/h2><h3>Schritt<\/h3><ul><li>Eins<\/li><li>Zwei<\/li><\/ul>/);
  assert.match(html, /<table><thead><tr><th>A<\/th><\/tr><\/thead><tbody><tr><td>B<\/td><\/tr><\/tbody><\/table>/);
});

test("Links: extern neu, intern hier, javascript fällt weg", () => {
  const html = beschreibungHtml([
    `<a href="https://example.com/pfad">Extern</a>`,
    `<a href="https://www.alex-autoshop.de/shop">Laden</a>`,
    `<a href="/shop">Shop</a>`,
    `<a href="javascript:alert(1)">Weg</a>`,
    `<a href="&#106;avascript:alert(1)">Auch</a>`,
    `<a href="java\nscript:alert(1)">Noch</a>`,
  ].join(" "));
  assert.match(html, /<a href="https:\/\/example\.com\/pfad" target="_blank" rel="noopener noreferrer">Extern<\/a>/);
  assert.match(html, /<a href="https:\/\/www\.alex-autoshop\.de\/shop" rel="noopener">Laden<\/a>/);
  assert.equal(html.includes('href="https://www.alex-autoshop.de/shop" target'), false);
  assert.match(html, /<a href="\/shop" rel="noopener">Shop<\/a>/);
  assert.equal(html.includes("javascript"), false);
  assert.equal(html.includes("alert"), false);
  assert.match(html, /Shop<\/a> Weg Auch Noch$/);
});

test("Leeres HTML ist leer, damit der Klartext greift", () => {
  assert.equal(beschreibungHtml(""), "");
  assert.equal(beschreibungHtml("<p><br></p>"), "");
  assert.equal(beschreibungHtml(null), "");
  assert.equal(beschreibungHtml("<p></p><script>x</script>"), "");
});

test("Produktseite lädt descriptionHtml, die Liste nicht", () => {
  assert.equal(PRODUKT_FELDER.includes("descriptionHtml"), true);
  assert.equal(KARTEN_FELDER.includes("descriptionHtml"), false);
  const shop = readFileSync(new URL("../src/lib/shopify.ts", import.meta.url), "utf8");
  const von = shop.indexOf("STOREFRONT_PRODUCT_BY_HANDLE_QUERY");
  const bis = shop.indexOf("STOREFRONT_RELATED_PRODUCTS_QUERY");
  assert.match(shop.slice(von, bis), /descriptionHtml/);
  const shell = readFileSync(new URL("../scripts/einbetten.mjs", import.meta.url), "utf8");
  assert.match(shell, /descriptionHtml/);
  const ssr = readFileSync(new URL("../shared/seo-auslieferung.js", import.meta.url), "utf8");
  assert.match(ssr, /QUERY_PRODUKT/);
});

function produkt(extra = {}) {
  return {
    title: "Indasa Rhynowet Nassschleifblatt 230×280 P800",
    handle: "indasa-rhynowet-nassschleifblatt-230280-p800",
    description: "230×280 P800Professionelles Produkt",
    vendor: "Indasa",
    images: { edges: [{ node: { url: "https://cdn.shopify.com/s/files/1/blatt.jpg" } }] },
    variants: {
      edges: [{
        node: {
          title: "Default Title",
          availableForSale: true,
          price: { amount: "1.5", currencyCode: "EUR" },
          selectedOptions: [{ name: "Title", value: "Default Title" }],
        },
      }],
    },
    options: [{ name: "Title", values: ["Default Title"] }],
    ...extra,
  };
}

test("JSON-LD und Meta nehmen Leerzeichen aus dem HTML", () => {
  const p = produkt({
    descriptionHtml: "<h2>230×280 P800</h2><p>Professionelles Produkt</p><ul><li>Marke: SONAX</li></ul><p>Bitte beachten</p>",
    seo: { description: "" },
  });
  const ld = produktLd(p);
  assert.match(ld.description, /P800 Professionelles/);
  assert.match(ld.description, /SONAX Bitte/);
  assert.equal(ld.description.includes("<"), false);
  const dok = produktDokument(p);
  assert.match(dok.description, /P800 Professionelles/);
  assert.equal(dok.description.includes("<h2>"), false);
});

test("Ohne HTML bleibt der verklebte Klartext stehen", () => {
  const ld = produktLd(produkt());
  assert.match(ld.description, /P800Professionelles/);
});
