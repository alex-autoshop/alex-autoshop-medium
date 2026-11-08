import test from "node:test";
import assert from "node:assert/strict";
import {
  bildAdresse,
  cacheNie,
  cacheOeffentlich,
  cursor,
  erste,
  htmlText,
  jsonFuerScript,
  kartenHtml,
  sichererHandle,
  sortAus,
  suchFilter,
  suchFilterRoh,
  suchText,
  variantenIds,
} from "../shared/katalog-regeln.js";

test("Seitengröße bleibt im Rahmen", () => {
  assert.equal(erste("24", 8, 100), 24);
  assert.equal(erste("0", 8, 100), 1);
  assert.equal(erste("999", 8, 100), 100);
  assert.equal(erste("x", 8, 100), 8);
});

test("nur echte Handles und Varianten", () => {
  assert.equal(sichererHandle("mipa-cc9"), "mipa-cc9");
  assert.equal(sichererHandle("../admin"), "");
  assert.equal(sichererHandle("Mipa"), "");
  assert.deepEqual(variantenIds("gid://shopify/ProductVariant/5,nope,gid://shopify/Product/9"), [
    "gid://shopify/ProductVariant/5",
  ]);
});

test("Suche ohne Steuerzeichen", () => {
  assert.equal(suchText('  klar"lack* '), "klarlack");
  assert.equal(suchFilter("klarlack", "titel"), 'title:*klarlack* OR sku:"klarlack"');
  assert.equal(suchFilter("", "tag"), null);
  assert.equal(suchFilterRoh("vendor:Mipa product_type:Klarlack"), "vendor:Mipa product_type:Klarlack");
  assert.equal(suchFilterRoh("{ products }"), null);
  assert.equal(sortAus("preis-ab").reverse, true);
  assert.equal(sortAus("kaputt").sortKey, "COLLECTION_DEFAULT");
});

test("Cursor und Cache", () => {
  assert.equal(cursor("abc+/=_-"), "abc+/=_-");
  assert.equal(cursor("a b"), null);
  assert.match(cacheOeffentlich(), /s-maxage=120/);
  assert.match(cacheOeffentlich(), /stale-while-revalidate=600/);
  assert.match(cacheNie(), /no-store/);
});

test("Bilder und Karten ohne Roh-HTML", () => {
  const src = bildAdresse("https://cdn.shopify.com/s/files/1/a.jpg?v=1", 480, "webp");
  assert.match(src, /width=480/);
  assert.match(src, /format=webp/);
  const html = kartenHtml([{
    node: {
      handle: "test-lack",
      title: "Lack <rot> & \"fein\"",
      priceRange: { minVariantPrice: { amount: "12.5", currencyCode: "EUR" } },
      images: { edges: [{ node: { url: "https://cdn.shopify.com/s/files/1/a.jpg" } }] },
      variants: { edges: [{ node: { id: "1" } }, { node: { id: "2" } }] },
    },
  }]);
  assert.match(html, /Ab /);
  assert.match(html, /Lack &lt;rot&gt;/);
  assert.doesNotMatch(html, /<rot>/);
  assert.equal(htmlText(`a<b`), "a&lt;b");
  assert.doesNotMatch(jsonFuerScript({ a: "</script>" }), /<\/script>/);
});
