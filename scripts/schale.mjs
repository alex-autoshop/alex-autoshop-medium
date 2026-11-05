/**
 * Nach dem Vite-Build: je Route eine HTML-Datei mit dem passenden Kopf,
 * damit der dunkle Hero ohne JavaScript sichtbar ist.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PRODUKT_ABO_PREISE } from "../shared/produktabo.js";

const dist = "dist";
const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(PRODUKT_ABO_PREISE[15]);

let html = readFileSync(join(dist, "index.html"), "utf8");

const assets = readdirSync(join(dist, "assets"));
const fonts = ["syne-latin-700-normal", "dm-sans-latin-400-normal"]
  .map((name) => assets.find((f) => f.startsWith(name) && f.endsWith(".woff2")))
  .filter(Boolean);
const preload = fonts
  .map((f) => `<link rel="preload" href="/assets/${f}" as="font" type="font/woff2" crossorigin>`)
  .join("");
html = html.replace("</head>", `${preload}</head>`);

function mitHero(basis, hero, klasse, kopf) {
  let h = basis.replace(
    /<div id="aa-hero" class="aa-hero">/,
    `<div id="aa-hero" class="aa-hero${klasse}">`,
  );
  h = h.replace(/<!--AA_HERO_START-->[\s\S]*?<!--AA_HERO_END-->/, `<!--AA_HERO_START-->${hero}<!--AA_HERO_END-->`);
  if (kopf) {
    h = h.replace(/<title>[^<]*<\/title>/, `<title>${kopf.title}</title>`);
    h = h.replace(/(<meta name="description" content=")[^"]*(")/, `$1${kopf.description}$2`);
    h = h.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${kopf.canonical}$2`);
    h = h.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${kopf.canonical}$2`);
    h = h.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${kopf.title}$2`);
    h = h.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, "");
  }
  return h;
}

const beschreibung = "Lackierprodukte, Autoteile und Werkstattbedarf mit bis zu 40 % Rabatt. Heute bestellt, schnell abholbereit.";

const routen = [
  {
    pfad: "shop/index.html",
    klasse: " aa-hell",
    hero: `<h1>Shop</h1>`,
    kopf: {
      title: "Shop | Alex Autoshop Wuppertal",
      description: `Shop bei Alex Autoshop Wuppertal – ${beschreibung}`,
      canonical: "https://www.alex-autoshop.de/shop",
    },
  },
  {
    pfad: "mitgliedschaft/index.html",
    klasse: " aa-mitte",
    hero: `<p class="aa-kicker">Brandneu · Mitgliedschaft</p><h1>Dein Rabatt. <span class="aa-gold">Auf genau das, was du brauchst.</span></h1><p class="aa-lead">Du wählst für jedes Produkt selbst, wie viel Rabatt du willst. Ab ${euro} pro Produkt im Monat, bis zu 40 % auf genau diese Produkte. Plus kostenloser Versand im Shop.</p>`,
    kopf: {
      title: "Mitgliedschaft – bis 40% Rabatt, deutschlandweit | Alex Autoshop Wuppertal",
      description: "Mitgliedschaft im Shop: Rabatt auf Lack und Werkstattbedarf, kostenloser Versand für Mitglieder. Monatlich kündbar.",
      canonical: "https://www.alex-autoshop.de/mitgliedschaft",
    },
  },
  {
    pfad: "kategorie/lackierbedarf-alle/index.html",
    klasse: " aa-hell",
    hero: `<h1>Lackierbedarf</h1>`,
    kopf: {
      title: "Lackierbedarf kaufen | Alex Autoshop Wuppertal",
      description: "Lackierbedarf bei Alex Autoshop Wuppertal: Profi-Qualität für Werkstatt und Lackiererei, schnell abholbereit.",
      canonical: "https://www.alex-autoshop.de/kategorie/lackierbedarf-alle",
    },
  },
];

writeFileSync(join(dist, "index.html"), html);
for (const route of routen) {
  const ziel = join(dist, route.pfad);
  mkdirSync(dirname(ziel), { recursive: true });
  writeFileSync(ziel, mitHero(html, route.hero, route.klasse, route.kopf));
}
console.log("Schalen:", routen.map((r) => r.pfad).join(", "));
