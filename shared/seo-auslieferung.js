/**
 * Katalogseiten als HTML, bevor das Programm lädt.
 * /produkt/:handle und /kategorie/:handle, plus die Produkt-Sitemap.
 */
import { storefront } from "../api/_storefront.js";
import {
  QUERY_KOLLEKTION,
  QUERY_PRODUKT,
  bildAdresse,
  euro,
  htmlText,
  kartenHtml,
  sichererHandle,
} from "./katalog-regeln.js";
import { lieferzeitText, lieferzeitWaehlen } from "./lieferzeit.js";
import {
  istBekannteKategorie,
  kategorieDokument,
  kategorieInfo,
  produktDokument,
  standardVariante,
} from "./seo-katalog.js";
import { geruest } from "./seo-html.js";

const SITE = "https://www.alex-autoshop.de";

let schale = "";

async function indexHtml(origin) {
  if (schale) return schale;
  const antwort = await fetch(new URL("/index.html", origin));
  if (!antwort.ok) throw new Error("Schale fehlt");
  schale = await antwort.text();
  return schale;
}

function htmlAntwort(html, status, extra = {}) {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": extra.typ || "text/html; charset=utf-8",
      "Cache-Control": extra.cache || (status === 200 ? "public, max-age=0, s-maxage=300, stale-while-revalidate=86400" : "no-store"),
      ...(extra.robots ? { "X-Robots-Tag": extra.robots } : {}),
    },
  });
}

function nichtGefunden(basis, name) {
  const html = geruest(basis, {
    klasse: " aa-hell",
    hero: `<h1>${htmlText(name)} nicht gefunden</h1>`,
    kopf: {
      title: `${name} nicht gefunden | Alex Autoshop`,
      description: `Diese Seite gibt es bei Alex Autoshop nicht.`,
      canonical: `${SITE}/`,
      robots: "noindex, follow",
    },
  });
  return htmlAntwort(html, 404, { robots: "noindex, follow" });
}

function produktHero(produkt) {
  const variante = standardVariante(produkt);
  const preis = variante?.price || produkt?.priceRange?.minVariantPrice;
  const fenster = lieferzeitWaehlen(produkt?.lieferzeit, variante?.lieferzeit);
  const betrag = euro(preis?.amount, preis?.currencyCode);
  return `<h1>${htmlText(produkt.title)}</h1><p>${htmlText(betrag)}${betrag ? " · " : ""}Lieferzeit ${htmlText(lieferzeitText(fenster))}</p>`;
}

async function produktSeite(url, handle) {
  const sicher = sichererHandle(decodeURIComponent(handle));
  const basis = await indexHtml(url.origin);
  if (!sicher) return nichtGefunden(basis, "Produkt");
  let data;
  try {
    data = await storefront(QUERY_PRODUKT, { handle: sicher });
  } catch {
    return htmlAntwort("<!doctype html><title>Seite gerade nicht erreichbar</title><p>Bitte gleich noch einmal laden.</p>", 503, {
      robots: "noindex, nofollow",
      cache: "no-store",
    });
  }
  const produkt = data?.data?.productByHandle;
  if (!produkt) return nichtGefunden(basis, "Produkt");
  const dok = produktDokument(produkt);
  const bild = produkt.images?.edges?.[0]?.node?.url;
  const html = geruest(basis, {
    klasse: " aa-hell",
    hero: produktHero(produkt),
    karten: kartenHtml([{ node: produkt }]),
    preload: bild ? bildAdresse(bild, 960, "webp") : "",
    daten: {
      meta: { art: "produkt", handle: sicher, schluessel: `produkt:${sicher}` },
      data: { productByHandle: produkt },
    },
    kopf: { ...dok, imageAlt: produkt.title },
  });
  return htmlAntwort(html, 200);
}

async function kategorieSeite(url, handle) {
  const sicher = sichererHandle(decodeURIComponent(handle));
  const basis = await indexHtml(url.origin);
  if (!sicher) return nichtGefunden(basis, "Kategorie");
  let data;
  try {
    data = await storefront(QUERY_KOLLEKTION, {
      handle: sicher,
      first: 24,
      after: null,
      sortKey: "COLLECTION_DEFAULT",
      reverse: false,
    });
  } catch {
    return htmlAntwort("<!doctype html><title>Seite gerade nicht erreichbar</title><p>Bitte gleich noch einmal laden.</p>", 503, {
      robots: "noindex, nofollow",
      cache: "no-store",
    });
  }
  const collection = data?.data?.collection;
  if (!collection && !istBekannteKategorie(sicher)) return nichtGefunden(basis, "Kategorie");
  const info = kategorieInfo(sicher);
  const label = collection?.title || info?.label || sicher;
  const edges = collection?.products?.edges || [];
  const dok = kategorieDokument({
    handle: sicher,
    label,
    seo: collection?.seo?.description || collection?.description,
    produkte: edges.map((e) => e.node).filter(Boolean),
  });
  const html = geruest(basis, {
    klasse: " aa-hell",
    hero: `<h1>${htmlText(label)}</h1>`,
    karten: kartenHtml(edges),
    preload: edges[0]?.node?.images?.edges?.[0]?.node?.url
      ? bildAdresse(edges[0].node.images.edges[0].node.url, 640, "webp")
      : "",
    daten: collection
      ? {
          meta: { art: "kollektion", handle: sicher, sort: "empfohlen", schluessel: `kollektion:${sicher}:empfohlen` },
          data: { collection },
        }
      : undefined,
    kopf: { ...dok, imageAlt: label },
  });
  return htmlAntwort(html, 200);
}

let sitemapCache = { bis: 0, xml: "" };

async function produktSitemap() {
  const jetzt = Date.now();
  if (sitemapCache.xml && sitemapCache.bis > jetzt) {
    return new Response(sitemapCache.xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=3600",
      },
    });
  }
  const urls = [];
  let after = null;
  for (let seite = 0; seite < 20; seite += 1) {
    const data = await storefront(
      `query Sitemap($first: Int!, $after: String) {
        products(first: $first, after: $after) {
          edges { node { handle updatedAt } }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      { first: 250, after },
    );
    const kante = data?.data?.products;
    for (const eintrag of kante?.edges || []) {
      const handle = sichererHandle(eintrag?.node?.handle);
      if (!handle) continue;
      const tag = String(eintrag.node.updatedAt || "").slice(0, 10);
      const lastmod = /^\d{4}-\d{2}-\d{2}$/.test(tag) ? `<lastmod>${tag}</lastmod>` : "";
      urls.push(`  <url><loc>${SITE}/produkt/${handle}</loc>${lastmod}</url>`);
    }
    after = kante?.pageInfo?.endCursor || null;
    if (!kante?.pageInfo?.hasNextPage) break;
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
  sitemapCache = { bis: jetzt + 60 * 60 * 1000, xml };
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}

/** null, wenn die Anfrage nicht zum Katalog gehört. */
export async function katalogAnfrage(request) {
  const url = new URL(request.url);
  const pfad = url.pathname.replace(/\/$/, "") || "/";
  try {
    if (pfad === "/sitemap-produkte.xml") return await produktSitemap();
    const produkt = pfad.match(/^\/produkt\/([^/]+)$/);
    if (produkt) return await produktSeite(url, produkt[1]);
    const kategorie = pfad.match(/^\/kategorie\/([^/]+)$/);
    if (kategorie) return await kategorieSeite(url, kategorie[1]);
  } catch {
    return htmlAntwort("<!doctype html><title>Seite gerade nicht erreichbar</title>", 503, {
      robots: "noindex, nofollow",
      cache: "no-store",
    });
  }
  return null;
}
