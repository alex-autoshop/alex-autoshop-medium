/**
 * Nach dem Vite-Build: je Route eine HTML-Datei mit dem passenden Kopf,
 * damit der dunkle Hero ohne JavaScript sichtbar ist.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { PRODUKT_ABO_PREISE } from "../shared/produktabo.js";
import { jsonFuerScript } from "../shared/katalog-regeln.js";
import { startseitenLd } from "../shared/seo-katalog.js";
import { einbetten } from "./einbetten.mjs";

const dist = "dist";
const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(PRODUKT_ABO_PREISE[15]);

let html = readFileSync(join(dist, "index.html"), "utf8");

const assets = readdirSync(join(dist, "assets"));
const fonts = ["syne-latin-700-normal", "dm-sans-latin-400-normal", "dm-sans-latin-600-normal"]
  .map((name) => assets.find((f) => f.startsWith(name) && f.endsWith(".woff2")))
  .filter(Boolean);
const preload = fonts
  .map((f) => `<link rel="preload" href="/assets/${f}" as="font" type="font/woff2" crossorigin>`)
  .join("");
if (html.includes("<!--AA_EARLY-->")) html = html.replace("<!--AA_EARLY-->", `<!--AA_EARLY-->${preload}`);
else html = html.replace("</head>", `${preload}</head>`);
html = html.replace(
  /<script type="module" crossorigin src="(\/assets\/[^"]+\.js)"><\/script>/,
  `<link rel="modulepreload" fetchpriority="low" crossorigin href="$1"><script>(function(){var src="$1";var start=function(){var s=document.createElement("script");s.type="module";s.src=src;document.body.appendChild(s);};requestAnimationFrame(function(){requestAnimationFrame(start);});})();</script>`,
);
html = html.replace(/<link rel="stylesheet"([^>]*href="\/assets\/[^"]+\.css"[^>]*)>/g, (voll, attrs) => (
  `<link rel="preload" as="style" data-aa-css${attrs} onload="this.onload=null;this.rel='stylesheet';window.__aaCss=1">` +
  `<noscript><link rel="stylesheet"${attrs}></noscript>`
));
html = html.replace(
  /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
  `<script type="application/ld+json">${jsonFuerScript(startseitenLd())}</script>`,
);

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
    h = h.replace(/(<link rel="alternate" hreflang="de-DE" href=")[^"]*(")/, `$1${kopf.canonical}$2`);
    h = h.replace(/(<link rel="alternate" hreflang="x-default" href=")[^"]*(")/, `$1${kopf.canonical}$2`);
    h = h.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, "");
  }
  return h;
}

const routen = [
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
];

for (const route of routen) {
  const ziel = join(dist, route.pfad);
  mkdirSync(dirname(ziel), { recursive: true });
  writeFileSync(ziel, mitHero(html, route.hero, route.klasse, route.kopf));
}
const seiten = await einbetten(html, dist);
writeFileSync(join(dist, "index.html"), seiten.html);
const vorladen = seitenVorladen(dist);
for (const pfad of [join(dist, ".vite/manifest.json"), join(dist, "manifest.json")]) {
  if (existsSync(pfad)) unlinkSync(pfad);
}
console.log("Schalen:", routen.map((r) => r.pfad).join(", "), "+", seiten.anzahl, "Katalogseiten", vorladen ? `+ ${vorladen} Vorladen` : "");

function manifestLesen() {
  for (const pfad of [join(dist, ".vite/manifest.json"), join(dist, "manifest.json")]) {
    if (existsSync(pfad)) return JSON.parse(readFileSync(pfad, "utf8"));
  }
  return null;
}

function seitenQuelle(rel) {
  if (rel === "index.html") return "src/pages/Home.tsx";
  if (rel.startsWith("kategorie/")) return "src/pages/Kategorie.tsx";
  if (rel.startsWith("produkt/")) return "src/pages/ProductDetail.tsx";
  if (rel.startsWith("mitgliedschaft/")) return "src/pages/Mitgliedschaft.tsx";
  if (rel.startsWith("shop/")) return "src/pages/Shop.tsx";
  return "";
}

function linksFuer(manifest, quelle) {
  const eintrag = manifest[quelle];
  if (!eintrag?.file) return "";
  const dateien = new Set([eintrag.file, ...(eintrag.css || [])]);
  return [...dateien].map((datei) => (
    datei.endsWith(".css")
      ? `<link rel="preload" href="/${datei}" as="style">`
      : `<link rel="modulepreload" fetchpriority="low" crossorigin href="/${datei}">`
  )).join("");
}

function dynamischeDateien(manifest) {
  const dateien = new Set();
  for (const eintrag of Object.values(manifest)) {
    if (eintrag?.isDynamicEntry && eintrag.file) dateien.add(eintrag.file);
  }
  return dateien;
}

function htmlDateien(ordner, basis = ordner) {
  const aus = [];
  for (const name of readdirSync(ordner)) {
    const abs = join(ordner, name);
    if (statSync(abs).isDirectory()) aus.push(...htmlDateien(abs, basis));
    else if (name.endsWith(".html")) aus.push(relative(basis, abs));
  }
  return aus;
}

function seitenVorladen(wurzel) {
  const manifest = manifestLesen();
  if (!manifest) return 0;
  const dynamisch = dynamischeDateien(manifest);
  let n = 0;
  for (const rel of htmlDateien(wurzel)) {
    const abs = join(wurzel, rel);
    let inhalt = readFileSync(abs, "utf8");
    inhalt = inhalt.replace(/<link rel="modulepreload"[^>]*href="(\/assets\/[^"]+)"[^>]*>/g, (voll, href) => (
      dynamisch.has(href.slice(1)) ? "" : voll
    ));
    inhalt = inhalt.replaceAll(
      'rel="modulepreload" crossorigin',
      'rel="modulepreload" fetchpriority="low" crossorigin',
    );
    const links = linksFuer(manifest, seitenQuelle(rel.replaceAll("\\", "/")));
    if (links && !inhalt.includes(links)) inhalt = inhalt.replace("</head>", `${links}</head>`);
    if (inhalt !== readFileSync(abs, "utf8")) {
      writeFileSync(abs, inhalt);
      n += 1;
    }
  }
  return n;
}
