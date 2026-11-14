/**
 * Nach dem Vite-Build: je Route eine HTML-Datei mit dem passenden Kopf,
 * damit der dunkle Hero ohne JavaScript sichtbar ist.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { PRODUKT_ABO_PREISE } from "../shared/produktabo.js";
import { htmlText, jsonFuerScript } from "../shared/katalog-regeln.js";
import { startseitenLd } from "../shared/seo-katalog.js";
import {
  TEILE_AGENT_BESCHREIBUNG,
  TEILE_AGENT_CLAIMS,
  TEILE_AGENT_FAQ_LD,
  TEILE_AGENT_H1,
  TEILE_AGENT_LEAD,
  TEILE_AGENT_TITEL,
  TEILE_AGENT_URL,
} from "../shared/teile-agent.js";
import { WHATSAPP_ANZEIGE, whatsappChatUrl } from "../shared/whatsapp-anfrage.js";
import { einbetten } from "./einbetten.mjs";

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
    h = h.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${kopf.description}$2`);
    h = h.replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${kopf.title}$2`);
    h = h.replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${kopf.description}$2`);
    h = h.replace(/(<link rel="alternate" hreflang="de-DE" href=")[^"]*(")/, `$1${kopf.canonical}$2`);
    h = h.replace(/(<link rel="alternate" hreflang="x-default" href=")[^"]*(")/, `$1${kopf.canonical}$2`);
    h = h.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, "");
    if (kopf.jsonLd) {
      h = h.replace(
        "</head>",
        `<script type="application/ld+json" id="aa-ld">${jsonFuerScript(kopf.jsonLd)}</script></head>`,
      );
    }
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
  {
    pfad: "teile-agent/index.html",
    klasse: " aa-mitte",
    hero: `<p class="aa-kicker">WhatsApp · Autoteile</p><h1>${htmlText(TEILE_AGENT_H1)}</h1><p class="aa-lead">${htmlText(TEILE_AGENT_LEAD)} ${htmlText(TEILE_AGENT_CLAIMS[0])}.</p><p class="aa-lead">${htmlText(WHATSAPP_ANZEIGE)}</p><div class="aa-actions"><a class="aa-goldbtn" href="${htmlText(whatsappChatUrl())}">WhatsApp-Chat öffnen</a></div>`,
    kopf: {
      title: TEILE_AGENT_TITEL,
      description: TEILE_AGENT_BESCHREIBUNG,
      canonical: TEILE_AGENT_URL,
      jsonLd: TEILE_AGENT_FAQ_LD,
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
  if (rel.startsWith("teile-agent/")) return "src/pages/TeileAgent.tsx";
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
      : `<link rel="modulepreload" crossorigin href="/${datei}">`
  )).join("");
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
  let n = 0;
  for (const rel of htmlDateien(wurzel)) {
    const links = linksFuer(manifest, seitenQuelle(rel.replaceAll("\\", "/")));
    if (!links) continue;
    const abs = join(wurzel, rel);
    const inhalt = readFileSync(abs, "utf8");
    if (inhalt.includes(links)) continue;
    writeFileSync(abs, inhalt.replace("</head>", `${links}</head>`));
    n += 1;
  }
  return n;
}
