/**
 * Meta-Angaben und sichtbare Kurzfassung in die gebaute HTML-Schale setzen.
 * Das Programm ersetzt die Schale, sobald es geladen ist. Ohne Programm
 * bleiben Titel, Beschreibung und strukturierte Daten lesbar.
 */
import { htmlText, jsonFuerScript } from "./katalog-regeln.js";

function tausch(html, muster, ersatz) {
  return muster.test(html) ? html.replace(muster, ersatz) : html;
}

export function kopfErsetzen(html, kopf) {
  if (!kopf) return html;
  const title = htmlText(kopf.title || "");
  const description = htmlText(kopf.description || "");
  const canonical = htmlText(kopf.canonical || "");
  let aus = html;
  aus = tausch(aus, /<title>[^<]*<\/title>/, `<title>${title}</title>`);
  aus = tausch(aus, /(<meta name="description" content=")[^"]*(")/, `$1${description}$2`);
  aus = tausch(aus, /(<link rel="canonical" href=")[^"]*(")/, `$1${canonical}$2`);
  aus = tausch(aus, /(<meta property="og:title" content=")[^"]*(")/, `$1${title}$2`);
  aus = tausch(aus, /(<meta property="og:description" content=")[^"]*(")/, `$1${description}$2`);
  aus = tausch(aus, /(<meta property="og:url" content=")[^"]*(")/, `$1${canonical}$2`);
  aus = tausch(aus, /(<meta name="twitter:title" content=")[^"]*(")/, `$1${title}$2`);
  aus = tausch(aus, /(<meta name="twitter:description" content=")[^"]*(")/, `$1${description}$2`);
  if (kopf.ogType) {
    aus = tausch(aus, /(<meta property="og:type" content=")[^"]*(")/, `$1${htmlText(kopf.ogType)}$2`);
  }
  if (kopf.image) {
    const bild = htmlText(kopf.image);
    aus = tausch(aus, /(<meta property="og:image" content=")[^"]*(")/, `$1${bild}$2`);
    aus = tausch(aus, /(<meta name="twitter:image" content=")[^"]*(")/, `$1${bild}$2`);
  }
  if (kopf.imageAlt) {
    const alt = htmlText(kopf.imageAlt);
    if (/property="og:image:alt"/.test(aus)) {
      aus = aus.replace(/(<meta property="og:image:alt" content=")[^"]*(")/, `$1${alt}$2`);
    } else {
      aus = aus.replace("</head>", `<meta property="og:image:alt" content="${alt}" /></head>`);
    }
  }
  const robots = kopf.robots || "index, follow";
  if (/name="robots"/.test(aus)) {
    aus = aus.replace(/(<meta name="robots" content=")[^"]*(")/, `$1${htmlText(robots)}$2`);
  } else {
    aus = aus.replace("</head>", `<meta name="robots" content="${htmlText(robots)}" /></head>`);
  }
  const hreflang = `<link rel="alternate" hreflang="de-DE" href="${canonical}" /><link rel="alternate" hreflang="x-default" href="${canonical}" />`;
  if (/hreflang="de-DE"/.test(aus)) {
    aus = aus.replace(/(<link rel="alternate" hreflang="de-DE" href=")[^"]*(")/, `$1${canonical}$2`);
    aus = aus.replace(/(<link rel="alternate" hreflang="x-default" href=")[^"]*(")/, `$1${canonical}$2`);
  } else if (canonical) {
    aus = aus.replace("</head>", `${hreflang}</head>`);
  }
  if (kopf.jsonLd) {
    const block = `<script type="application/ld+json" id="aa-ld">${jsonFuerScript(kopf.jsonLd)}</script>`;
    if (aus.includes('id="aa-ld"')) {
      aus = aus.replace(/<script type="application\/ld\+json" id="aa-ld">[\s\S]*?<\/script>/, block);
    } else {
      aus = aus.replace("</head>", `${block}</head>`);
    }
  }
  return aus;
}

function preloadTag(preload) {
  if (!preload) return "";
  const liste = Array.isArray(preload) ? preload : [preload];
  return liste.map((eintrag) => {
    if (!eintrag) return "";
    if (typeof eintrag === "string") {
      return `<link rel="preload" as="image" href="${htmlText(eintrag)}" fetchpriority="high">`;
    }
    const set = eintrag.srcSet ? ` imagesrcset="${htmlText(eintrag.srcSet)}"` : "";
    const sizes = eintrag.sizes ? ` imagesizes="${htmlText(eintrag.sizes)}"` : "";
    const media = eintrag.media ? ` media="${htmlText(eintrag.media)}"` : "";
    return `<link rel="preload" as="image" href="${htmlText(eintrag.href)}"${set}${sizes}${media} fetchpriority="high">`;
  }).join("");
}

/** Hero, Karten, eingebettete Daten und Kopf in einem Durchgang. */
export function geruest(html, { klasse, hero, karten, daten, preload, kopf } = {}) {
  let h = html;
  if (klasse != null) {
    h = h.replace(/<div id="aa-hero" class="aa-hero[^"]*">/, `<div id="aa-hero" class="aa-hero${klasse}">`);
  }
  if (hero != null) {
    h = h.replace(/<!--AA_HERO_START-->[\s\S]*?<!--AA_HERO_END-->/, `<!--AA_HERO_START-->${hero}<!--AA_HERO_END-->`);
  }
  if (karten != null) {
    h = h.replace(/<div id="aa-liste">[\s\S]*?<\/div>/, `<div id="aa-liste">${karten}</div>`);
  }
  if (daten) {
    h = h.replace(
      /<script type="application\/json" id="aa-daten">[\s\S]*?<\/script>/,
      `<script type="application/json" id="aa-daten">${jsonFuerScript(daten)}</script>`,
    );
  }
  const bild = preloadTag(preload);
  if (bild && h.includes("<!--AA_EARLY-->")) h = h.replace("<!--AA_EARLY-->", `${bild}<!--AA_EARLY-->`);
  else if (h.includes("<!--AA_PRELOAD-->")) h = h.replace("<!--AA_PRELOAD-->", bild);
  else if (bild) h = h.replace("</head>", `${bild}</head>`);
  if (kopf) h = kopfErsetzen(h, kopf);
  return h;
}
