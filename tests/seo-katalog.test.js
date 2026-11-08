import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  HAUPT,
  UNTER,
  alleKategorieHandles,
  brotkrumenProdukt,
  gtinAus,
  hatWerbeaussage,
  kaufTitel,
  kategorieDokument,
  metaBeschreibung,
  produktDokument,
  produktLd,
  pruefeKategorieLd,
  pruefeProduktLd,
  pruefeStartLd,
  startseitenLd,
  versandZeiten,
} from "../shared/seo-katalog.js";
import { kopfErsetzen, geruest } from "../shared/seo-html.js";
import { istLieferant } from "../shared/kundenmarke.js";

const SCHALE = `<!doctype html><html lang="de"><head>
<title>Alt</title>
<meta name="description" content="alt" />
<link rel="canonical" href="https://www.alex-autoshop.de/" />
<link rel="alternate" hreflang="de-DE" href="https://www.alex-autoshop.de/" />
<link rel="alternate" hreflang="x-default" href="https://www.alex-autoshop.de/" />
<meta name="robots" content="index, follow" />
<meta property="og:type" content="website" />
<meta property="og:title" content="alt" />
<meta property="og:description" content="alt" />
<meta property="og:url" content="https://www.alex-autoshop.de/" />
<meta property="og:image" content="https://www.alex-autoshop.de/images/og-image.png" />
<meta name="twitter:title" content="alt" />
<meta name="twitter:description" content="alt" />
<meta name="twitter:image" content="https://www.alex-autoshop.de/images/og-image.png" />
<!--AA_PRELOAD-->
</head><body>
<div id="aa-hero" class="aa-hero"><!--AA_HERO_START--><h1>Start</h1><!--AA_HERO_END--></div>
<div id="aa-liste"></div>
<script type="application/json" id="aa-daten">null</script>
</body></html>`;

function produkt(extra = {}) {
  return {
    title: "Mipa CC9 2K-HS-Klarlack 5L",
    handle: "mipa-cc9-2k-hs-klarlack-5l",
    description: "2K-HS-Klarlack für die Lackierwerkstatt. Inhalt 5 Liter.",
    vendor: "Mipa",
    tags: ["Klarlack"],
    seo: { title: null, description: "Bester Preis: Klarlack günstig in bester Qualität zum Top-Preis." },
    images: { edges: [{ node: { url: "https://cdn.shopify.com/s/files/1/klarlack.jpg", altText: "Mipa CC9", width: 2000, height: 2000 } }] },
    variants: {
      edges: [{
        node: {
          title: "Default Title",
          sku: "CC9-5",
          barcode: "4006381333931",
          availableForSale: true,
          price: { amount: "49.9", currencyCode: "EUR" },
          selectedOptions: [{ name: "Title", value: "Default Title" }],
        },
      }],
    },
    options: [{ name: "Title", values: ["Default Title"] }],
    collections: { edges: [{ node: { handle: "klarlack-produkte", title: "Klarlack" } }, { node: { handle: "lackierbedarf-alle", title: "Lackierbedarf" } }] },
    lieferzeit: [{ key: "lieferzeit_min", value: "1" }, { key: "lieferzeit_max", value: "3" }],
    ...extra,
  };
}

test("Titel bleibt bei 60 Zeichen und nennt den Shop", () => {
  const kurz = kaufTitel("Mipa CC9 Klarlack", "5L");
  assert.ok(kurz.length <= 60, kurz);
  assert.match(kurz, /kaufen \| Alex Autoshop$/);
  assert.match(kurz, /5L/);
  const lang = kaufTitel("Master Black Carbon Polyester Spachtelmasse mit Härter und Spachtelblatt im Eimer", "");
  assert.equal(lang.length <= 60, true);
  assert.match(lang, /kaufen \| Alex Autoshop$/);
  assert.equal(lang.includes("Shopify"), false);
});

test("Werbe-SEO wird verworfen, Preis und Lieferzeit bleiben", () => {
  const text = metaBeschreibung({
    name: "Mipa CC9 2K-HS-Klarlack 5L",
    seo: "Top-Preis: Klarlack günstig, beste Qualität.",
    beschreibung: "Hochglänzender 2K-Klarlack für die Kabine.",
    preisText: "49,90 €",
    lieferzeit: "1–3 Werktage",
  });
  assert.equal(text.length <= 155, true);
  assert.equal(hatWerbeaussage(text), false);
  assert.match(text, /49,90 €/);
  assert.match(text, /1–3 Werktage/);
  assert.equal(/shopify|ds color|inter cars|oil-?center/i.test(text), false);
});

test("Gesetztes SEO-Feld ohne Werbeaussage wird gekürzt übernommen", () => {
  const text = metaBeschreibung({
    name: "Filter",
    seo: "Ölfilter für den Werkstattalltag, passend zur angegebenen Fahrzeugliste. Abholung in Wuppertal möglich, Versand innerhalb Deutschlands.",
    beschreibung: "anderer Text",
    preisText: "9,90 €",
    lieferzeit: "2 Werktage",
  });
  assert.match(text, /Ölfilter/);
  assert.equal(text.length <= 155, true);
});

test("Lieferfenster summiert sich auf die angegebene Zeit", () => {
  const z = versandZeiten(1, 3);
  assert.equal(z.handlingMin + z.transitMin, 1);
  assert.equal(z.handlingMax + z.transitMax, 3);
});

test("Produkt-JSON-LD ohne erfundene Bewertungen", () => {
  const dok = produktDokument(produkt(), { jetzt: new Date("2026-11-08T00:00:00Z") });
  assert.equal(dok.title.length <= 60, true);
  assert.equal(pruefeProduktLd(dok.jsonLd).join(", "), "");
  const roh = JSON.stringify(dok.jsonLd);
  assert.equal(roh.includes("aggregateRating"), false);
  assert.equal(roh.includes("Review"), false);
  assert.match(roh, /49\.90/);
  assert.match(roh, /7\.49/);
  assert.match(roh, /addressCountry":"DE/);
  assert.match(roh, /merchantReturnDays":14/);
  assert.match(roh, /klarlack-produkte/);
  assert.match(dok.canonical, /\/produkt\/mipa-cc9-2k-hs-klarlack-5l$/);
  const ld = produktLd(produkt());
  assert.equal(ld.gtin13, "4006381333931");
  assert.equal(ld.sku, "CC9-5");
  assert.equal(ld.brand.name, "Mipa");
});

test("Wunschfarbe ohne Widerruf, Lieferant ist keine Marke", () => {
  const ld = produktLd(produkt({
    handle: "farben-mix",
    title: "Wunschfarbe",
    vendor: "DS Color",
  }));
  assert.equal(ld.brand, undefined);
  assert.equal(ld.offers.hasMerchantReturnPolicy.returnPolicyCategory, "https://schema.org/MerchantReturnNotPermitted");
  assert.equal(ld.offers.hasMerchantReturnPolicy.merchantReturnDays, undefined);
  assert.equal(istLieferant("Oil-Center"), true);
  assert.equal(istLieferant("Oil Center"), true);
});

test("GTIN nur mit gültiger Prüfziffer", () => {
  assert.equal(gtinAus("4006381333931"), "4006381333931");
  assert.equal(gtinAus("4006381333932"), "");
  assert.equal(gtinAus("abc"), "");
  assert.equal(gtinAus(""), "");
});

test("Bewertungen nur wenn welche übergeben werden", () => {
  const ohne = produktLd(produkt(), { bewertungen: [] });
  assert.equal(ohne.aggregateRating, undefined);
  const mit = produktLd(produkt(), {
    bewertungen: [{ author: "Samira", reviewBody: "Deckt gut.", reviewRating: 5 }],
  });
  assert.equal(mit.aggregateRating.reviewCount, 1);
  assert.equal(mit.review[0].reviewBody, "Deckt gut.");
});

test("Kategorie hat Brotkrumen und ItemList", () => {
  const dok = kategorieDokument({
    handle: "klarlack-produkte",
    label: "Klarlack",
    produkte: [{ handle: "mipa-cc9-2k-hs-klarlack-5l", title: "Mipa CC9 2K-HS-Klarlack 5L" }],
  });
  assert.equal(dok.title.length <= 60, true);
  assert.equal(pruefeKategorieLd(dok.jsonLd).join(", "), "");
  assert.match(dok.canonical, /\/kategorie\/klarlack-produkte$/);
  const krumen = brotkrumenProdukt(produkt());
  assert.equal(krumen[1].name, "Lackierbedarf");
  assert.match(krumen[2].url, /klarlack-produkte/);
});

test("Startseite Organization und Suche", () => {
  assert.equal(pruefeStartLd(startseitenLd()).join(", "), "");
});

test("HTML-Kopf trägt Titel, hreflang und JSON-LD", () => {
  const dok = produktDokument(produkt(), { jetzt: new Date("2026-11-08T00:00:00Z") });
  const html = geruest(SCHALE, {
    klasse: " aa-hell",
    hero: "<h1>Mipa CC9</h1>",
    karten: "<a href=\"/produkt/mipa-cc9-2k-hs-klarlack-5l\">Mipa</a>",
    preload: "https://cdn.shopify.com/s/files/1/klarlack.jpg",
    daten: { meta: { schluessel: "produkt:mipa-cc9-2k-hs-klarlack-5l" }, data: { productByHandle: { handle: "mipa-cc9-2k-hs-klarlack-5l" } } },
    kopf: dok,
  });
  assert.equal(html.includes(`<title>${dok.title}</title>`), true);
  assert.match(html, /hreflang="de-DE" href="https:\/\/www\.alex-autoshop\.de\/produkt\/mipa-cc9/);
  assert.match(html, /id="aa-ld"/);
  assert.match(html, /rel="preload"/);
  assert.match(html, /aa-hell/);
  assert.match(html, /<h1>Mipa CC9<\/h1>/);
  assert.equal(html.includes("Bester Preis"), false);
  const nochmal = kopfErsetzen(html, { ...dok, robots: "noindex, follow" });
  assert.match(nochmal, /noindex, follow/);
  assert.equal((nochmal.match(/id="aa-ld"/g) || []).length, 1);
});

test("Kategorien im Code und in der Sitemap, ohne Börse und Konto", () => {
  const quelle = readFileSync(new URL("../src/lib/shopCategories.ts", import.meta.url), "utf8");
  const handles = [...quelle.matchAll(/handle:\s*"([^"]+)"/g)].map((m) => m[1]);
  const nurWeiterleitung = new Set(["wunschfarbe-spraydose-lackstift"]);
  for (const handle of handles) {
    if (nurWeiterleitung.has(handle)) {
      assert.equal(UNTER[handle], undefined);
      continue;
    }
    assert.equal(alleKategorieHandles().includes(handle), true, handle);
  }
  for (const handle of alleKategorieHandles()) {
    assert.match(quelle, new RegExp(`handle:\\s*"${handle}"`));
  }
  assert.equal(HAUPT["werkstattchemie"], "Werkstattchemie");
  const sitemap = readFileSync(new URL("../public/sitemap-seiten.xml", import.meta.url), "utf8");
  const index = readFileSync(new URL("../public/sitemap.xml", import.meta.url), "utf8");
  const robots = readFileSync(new URL("../public/robots.txt", import.meta.url), "utf8");
  const vercel = readFileSync(new URL("../vercel.json", import.meta.url), "utf8");
  for (const handle of alleKategorieHandles()) {
    assert.match(sitemap, new RegExp(`/kategorie/${handle}<`));
  }
  assert.equal(sitemap.includes("teileboerse"), false);
  assert.equal(sitemap.includes("/warenkorb"), false);
  assert.equal(sitemap.includes("/konto"), false);
  assert.equal(sitemap.includes("/marken/sata"), false);
  assert.match(sitemap, /<lastmod>/);
  assert.match(index, /sitemap-produkte\.xml/);
  assert.equal(index.includes("sitemap-teile"), false);
  assert.match(robots, /Sitemap: https:\/\/www\.alex-autoshop\.de\/sitemap\.xml/);
  assert.match(robots, /Disallow: \/warenkorb/);
  assert.match(robots, /Disallow: \/konto/);
  assert.match(robots, /Disallow: \/teileboerse/);
  assert.match(robots, /Disallow: \/shop\?/);
  assert.match(vercel, /"source": "\/product\/:slug\*"/);
  assert.match(vercel, /"destination": "\/produkt\/:slug\*"/);
  assert.match(vercel, /"destination": "\/kategorie\/:slug\*"/);
});
