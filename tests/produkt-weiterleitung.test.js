import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { produktWeiterleitung, PRODUKT_WEITERLEITUNG } from "../shared/produkt-weiterleitung.js";

test("gelöschter Wax-Schwamm leitet auf Speed Polish, andere Handles bleiben", () => {
  assert.equal(produktWeiterleitung("a1-der-wax-schwamm"), "/produkt/a1-speed-polish-dr-wack");
  assert.equal(produktWeiterleitung("a1-speed-polish-dr-wack"), "");
  assert.equal(produktWeiterleitung(""), "");
});

test("308 in vercel.json entspricht der Weiterleitung", () => {
  const vercel = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  for (const [handle, ziel] of Object.entries(PRODUKT_WEITERLEITUNG)) {
    const regel = vercel.redirects.find((r) => r.source === `/produkt/${handle}`);
    assert.ok(regel, handle);
    assert.equal(regel.destination, ziel);
    assert.equal(regel.permanent, true);
  }
});

test("Sitemap und statische Produktseiten lassen weitergeleitete Handles aus", () => {
  const sitemap = readFileSync(new URL("../shared/seo-auslieferung.js", import.meta.url), "utf8");
  const einbetten = readFileSync(new URL("../scripts/einbetten.mjs", import.meta.url), "utf8");
  assert.match(sitemap, /produktWeiterleitung\(handle\)\) continue/);
  assert.match(sitemap, /Response\.redirect\([\s\S]*308\)/);
  assert.match(einbetten, /produktWeiterleitung\(handle\)\) continue/);
});

test("alter Wunschfarbe-Eintrag bleibt die Seite, steht aber nicht in den Listen", () => {
  const shop = readFileSync(new URL("../src/lib/shopCategories.ts", import.meta.url), "utf8");
  const nav = readFileSync(new URL("../src/lib/categories.ts", import.meta.url), "utf8");
  assert.match(shop, /label: "Wunschfarbe: Spraydose & Lackstift"/);
  assert.match(shop, /handle: "wunschfarbe-lackstift", label: "Wunschfarbe & Lackstift", nurSeite: true/);
  assert.match(nav, /label: "Wunschfarbe & Lackstift", slug: "wunschfarbe-lackstift".*nurSeite: true/);
  assert.equal(shop.includes('{ handle: "wunschfarbe-lackstift", label: "Wunschfarbe & Lackstift" }'), false);
  for (const datei of ["src/components/Header.tsx", "src/pages/Kategorie.tsx"]) {
    const text = readFileSync(new URL(`../${datei}`, import.meta.url), "utf8");
    assert.match(text, /menueKinder\(/, datei);
  }
  for (const datei of ["src/components/ShopFilters.tsx", "src/components/ProduktSuchleiste.tsx"]) {
    const text = readFileSync(new URL(`../${datei}`, import.meta.url), "utf8");
    assert.match(text, /menueLinks\(/, datei);
  }
});
