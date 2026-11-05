/**
 * Server-HTML für die Teilebörse und einzelne Teile.
 * Edge-Middleware, kein zusätzlicher Serverless-Endpunkt.
 *
 * /teile/<marke>--<nummer>  → vollständiges HTML, 404 wenn unbekannt
 * /teileboerse/artikel?nr=  → 301 auf die kanonische Adresse
 * /sitemap-teile.xml        → Produkte mit Preis
 */

import { ausTeileSlug, teilePfad, TEILE_BELIEBT } from "./shared/teile-pfad.js";
import { markeFuerKunde } from "./shared/grosshaendler.js";

const SITE = "https://www.alex-autoshop.de";

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function intercars(origin, nummer) {
  const r = await fetch(`${origin}/api/intercars`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "searchByIndex", index: nummer }),
  });
  if (!r.ok) throw new Error(`intercars ${r.status}`);
  const data = await r.json();
  const liste = Array.isArray(data) ? data : [];
  return liste.find((x) => x && (x.price || x.name)) || null;
}

async function katalog(origin, nummer) {
  const p = `/articles/search-by-article-no`;
  const q = new URLSearchParams({ p, articleNo: nummer, langId: "de" });
  const r = await fetch(`${origin}/api/autoparts?${q}`);
  if (!r.ok) throw new Error(`katalog ${r.status}`);
  const data = await r.json();
  const liste = Array.isArray(data) ? data : data?.articles || [];
  return liste[0] || null;
}

async function teilFinden(origin, nummer) {
  let ic = null;
  let td = null;
  let fehler = 0;
  try { ic = await intercars(origin, nummer); } catch { fehler += 1; }
  if (!ic) {
    try { td = await katalog(origin, nummer); } catch { fehler += 1; }
  }
  if (!ic && !td) return fehler === 2 ? { fehler: true } : null;
  const name = ic?.name || td?.description || td?.articleName || td?.genericArticleDescription || nummer;
  const brand = markeFuerKunde(ic?.brand || td?.brandName || td?.mfrName || "");
  const artNr = ic?.index || td?.articleNumber || td?.articleNo || nummer;
  const preis = Number(ic?.price) > 0 ? Number(ic.price) : null;
  const bestand = String(ic?.availability || "");
  return { name, brand, artNr, preis, bestand, bild: ic?.imageUrl || td?.s3image || "" };
}

function seiteListe() {
  return {
    title: "Teilebörse – Autoteile per HSN/TSN oder FIN | Alex Autoshop Wuppertal",
    description:
      "Fahrzeug per HSN/TSN, FIN oder Marke wählen. Passende Teile aus dem TecDoc-Katalog, Preise und Bestand live. Abholung in Wuppertal.",
    canonical: `${SITE}/teileboerse`,
    jsonLd: null,
    inhalt: "",
  };
}

function produktHtml(teil, pfad) {
  const name = `${teil.brand ? teil.brand + " " : ""}${teil.name}`.trim();
  const url = `${SITE}${pfad}`;
  const vorrat = teil.preis
    ? ( /anfrage/i.test(teil.bestand) ? "https://schema.org/PreOrder" : "https://schema.org/InStock" )
    : "";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    sku: teil.artNr,
    brand: teil.brand ? { "@type": "Brand", name: teil.brand } : undefined,
    image: teil.bild || undefined,
    url,
    ...(teil.preis
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: "EUR",
            price: teil.preis.toFixed(2),
            availability: vorrat,
            url,
          },
        }
      : {}),
  };
  const preisText = teil.preis
    ? `${teil.preis.toFixed(2).replace(".", ",")} € inkl. MwSt`
    : "Preis auf Anfrage";
  const inhalt = `<main><p><a href="/teileboerse">Teilebörse</a></p><h1>${esc(name)}</h1><p>Artikelnummer ${esc(teil.artNr)}</p><p>${esc(preisText)}</p>${teil.bestand ? `<p>${esc(teil.bestand)}</p>` : ""}<p>Abholung in Wuppertal, Handelstraße 64.</p></main>`;
  return {
    title: `${name} | Alex Autoshop Wuppertal`,
    description: `${name}, Artikelnummer ${teil.artNr}. ${preisText}. TecDoc-Katalog, Bestand live, Abholung in Wuppertal.`,
    canonical: url,
    jsonLd,
    inhalt,
  };
}

function ersetzen(html, s) {
  let aus = html;
  aus = aus.replace(/<title>[^<]*<\/title>/, `<title>${esc(s.title)}</title>`);
  aus = aus.replace(
    /<meta name="description" content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${esc(s.description)}" />`,
  );
  aus = aus.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${esc(s.canonical)}" />`);
  aus = aus.replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(s.title)}" />`);
  aus = aus.replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${esc(s.description)}" />`);
  aus = aus.replace(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${esc(s.canonical)}" />`);
  aus = aus.replace(/<meta name="twitter:title" content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${esc(s.title)}" />`);
  aus = aus.replace(/<meta name="twitter:description" content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${esc(s.description)}" />`);
  if (s.jsonLd) {
    aus = aus.replace("</head>", `<script type="application/ld+json">${JSON.stringify(s.jsonLd)}</script></head>`);
  }
  if (s.inhalt) {
    aus = aus.replace('<div id="root"></div>', `<div id="root">${s.inhalt}</div>`);
    aus = aus.replace('<div id="root"></div>\r', `<div id="root">${s.inhalt}</div>\r`);
  }
  return aus;
}

function htmlAntwort(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": status === 200 ? "public, max-age=0, s-maxage=3600" : "no-store",
    },
  });
}

let sitemapCache = { bis: 0, xml: "" };

async function sitemapTeile(origin) {
  const jetzt = Date.now();
  if (sitemapCache.xml && sitemapCache.bis > jetzt) return sitemapCache.xml;
  const urls = [];
  for (const eintrag of TEILE_BELIEBT) {
    try {
      const teil = await teilFinden(origin, eintrag.nummer);
      if (!teil || teil.fehler || !teil.preis) continue;
      const loc = `${SITE}${teilePfad(teil.brand || eintrag.marke, teil.artNr || eintrag.nummer)}`;
      urls.push(`  <url><loc>${esc(loc)}</loc><priority>0.6</priority></url>`);
    } catch { /* ein Teil fehlt, die übrigen bleiben */ }
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
  sitemapCache = { bis: jetzt + 60 * 60 * 1000, xml };
  return xml;
}

export default async function middleware(request) {
  const url = new URL(request.url);
  if (url.pathname === "/sitemap-teile.xml") {
    const xml = await sitemapTeile(url.origin);
    return new Response(xml, {
      status: 200,
      headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600" },
    });
  }

  if (url.pathname === "/teileboerse/artikel") {
    const nr = (url.searchParams.get("nr") || "").trim();
    if (!nr) return htmlAntwort("<!doctype html><title>Teil nicht gefunden</title><p>Keine Artikelnummer.</p>", 404);
    const teil = await teilFinden(url.origin, nr);
    if (teil?.fehler) return htmlAntwort("<!doctype html><title>Katalog gerade nicht erreichbar</title>", 503);
    if (!teil) return htmlAntwort(`<!doctype html><title>Teil nicht gefunden</title><p>Die Nummer ${esc(nr)} ist nicht im Katalog.</p>`, 404);
    const ziel = `${SITE}${teilePfad(teil.brand || "teil", teil.artNr || nr)}`;
    return Response.redirect(ziel, 301);
  }

  const teilPfad = url.pathname.match(/^\/teile\/([^/]+)$/);
  if (teilPfad) {
    const { nummer } = ausTeileSlug(teilPfad[1]);
    if (!nummer) return htmlAntwort("<!doctype html><title>Teil nicht gefunden</title>", 404);
    const teil = await teilFinden(url.origin, nummer);
    if (teil?.fehler) return htmlAntwort("<!doctype html><title>Katalog gerade nicht erreichbar</title>", 503);
    if (!teil) return htmlAntwort(`<!doctype html><title>Teil nicht gefunden</title><p>Die Nummer ${esc(nummer)} ist nicht im Katalog.</p>`, 404);
    const pfad = teilePfad(teil.brand || "teil", teil.artNr || nummer);
    const index = await fetch(new URL("/index.html", url.origin));
    const html = await index.text();
    return htmlAntwort(ersetzen(html, produktHtml(teil, pfad)));
  }

  const index = await fetch(new URL("/index.html", url.origin));
  const html = await index.text();
  return htmlAntwort(ersetzen(html, seiteListe()));
}

export const config = {
  matcher: ["/teileboerse", "/teileboerse/:path*", "/teile/:slug", "/sitemap-teile.xml"],
};
