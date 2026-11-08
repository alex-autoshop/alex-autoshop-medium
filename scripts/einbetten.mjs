/**
 * Nach dem Vite-Build: erste Produkte ins HTML, damit sie da sind,
 * bevor das Programm lädt. Der Cache aktualisiert Preise danach.
 * Schlägt der Abruf fehl, bleibt die Seite ohne Liste — der Browser holt sie selbst.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { storefront } from "../api/_storefront.js";
import { beliebteHolen } from "../shared/beliebte-produkte.js";
import {
  QUERY_KOLLEKTION,
  QUERY_PRODUKTE,
  htmlText,
  jsonFuerScript,
  kartenHtml,
  sichererHandle,
  bildAdresse,
} from "../shared/katalog-regeln.js";

function kategorien() {
  const src = readFileSync(new URL("../src/lib/shopCategories.ts", import.meta.url), "utf8");
  return [...src.matchAll(/handle:\s*"([^"]+)",\s*label:\s*"([^"]+)"/g)].map((m) => ({
    handle: m[1],
    label: m[2],
  }));
}

async function pool(aufgaben, gleichzeitig) {
  const aus = new Array(aufgaben.length);
  let i = 0;
  async function arbeiter() {
    while (i < aufgaben.length) {
      const n = i++;
      aus[n] = await aufgaben[n]();
    }
  }
  await Promise.all(Array.from({ length: gleichzeitig }, arbeiter));
  return aus;
}

function seite(basis, { klasse, hero, kopf, karten, daten, preload }) {
  let h = basis;
  if (klasse != null) {
    h = h.replace(/<div id="aa-hero" class="aa-hero[^"]*">/, `<div id="aa-hero" class="aa-hero${klasse}">`);
  }
  if (hero != null) {
    h = h.replace(/<!--AA_HERO_START-->[\s\S]*?<!--AA_HERO_END-->/, `<!--AA_HERO_START-->${hero}<!--AA_HERO_END-->`);
  }
  if (karten != null) {
    h = h.replace('<div id="aa-liste"></div>', `<div id="aa-liste">${karten}</div>`);
  }
  if (daten) {
    h = h.replace(
      '<script type="application/json" id="aa-daten">null</script>',
      `<script type="application/json" id="aa-daten">${jsonFuerScript(daten)}</script>`,
    );
  }
  const bild = preload
    ? `<link rel="preload" as="image" href="${htmlText(preload)}" fetchpriority="high">`
    : "";
  h = h.replace("<!--AA_PRELOAD-->", bild);
  if (kopf) {
    h = h.replace(/<title>[^<]*<\/title>/, `<title>${htmlText(kopf.title)}</title>`);
    h = h.replace(/(<meta name="description" content=")[^"]*(")/, `$1${htmlText(kopf.description)}$2`);
    h = h.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${htmlText(kopf.canonical)}$2`);
    h = h.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${htmlText(kopf.canonical)}$2`);
    h = h.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${htmlText(kopf.title)}$2`);
    h = h.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${htmlText(kopf.description)}$2`);
  }
  return h;
}

function schreiben(dist, pfad, inhalt) {
  const ziel = join(dist, pfad);
  mkdirSync(dirname(ziel), { recursive: true });
  writeFileSync(ziel, inhalt);
}

function erstesBild(edges) {
  const url = edges?.[0]?.node?.images?.edges?.[0]?.node?.url;
  return url ? bildAdresse(url, 640, "webp") : "";
}

export async function einbetten(basis, dist) {
  let anzahl = 0;
  let home = basis.replace("<!--AA_PRELOAD-->", "");
  try {
    const products = await beliebteHolen(storefront);
    home = seite(basis, {
      daten: {
        meta: { art: "home", schluessel: "home" },
        data: { products },
      },
    });
    anzahl += 1;
  } catch (e) {
    console.warn("Startseiten-Katalog fehlt:", e.message);
  }

  try {
    const data = await storefront(QUERY_PRODUKTE, { first: 24, after: null, query: null });
    schreiben(dist, "shop/index.html", seite(basis, {
      klasse: " aa-hell",
      hero: "<h1>Shop</h1>",
      kopf: {
        title: "Shop | Alex Autoshop Wuppertal",
        description: "Shop bei Alex Autoshop Wuppertal – Lackierprodukte, Autoteile und Werkstattbedarf mit bis zu 40 % Rabatt. Heute bestellt, schnell abholbereit.",
        canonical: "https://www.alex-autoshop.de/shop",
      },
      daten: {
        meta: { art: "shop", suche: "", schluessel: "shop::" },
        data: { products: data.data?.products ?? { edges: [], pageInfo: {} } },
      },
    }));
    anzahl += 1;
  } catch (e) {
    console.warn("Shop-Katalog fehlt:", e.message);
  }

  schreiben(dist, "warenkorb/index.html", seite(basis, {
    klasse: " aa-hell",
    hero: "<h1>Warenkorb</h1>",
    kopf: {
      title: "Warenkorb | Alex Autoshop Wuppertal",
      description: "Warenkorb bei Alex Autoshop.",
      canonical: "https://www.alex-autoshop.de/warenkorb",
    },
  }));
  anzahl += 1;

  const kats = kategorien();
  await pool(kats.map((kat) => async () => {
    let edges = [];
    let products = { edges: [], pageInfo: {} };
    try {
      const data = await storefront(QUERY_KOLLEKTION, {
        handle: kat.handle,
        first: 24,
        after: null,
        sortKey: "COLLECTION_DEFAULT",
        reverse: false,
      });
      products = data.data?.collection?.products ?? products;
      edges = products.edges ?? [];
    } catch (e) {
      console.warn("Kategorie ohne Liste:", kat.handle, e.message);
    }
    const daten = {
      meta: { art: "kollektion", handle: kat.handle, sort: "empfohlen", schluessel: `kollektion:${kat.handle}:empfohlen` },
      data: { collection: { handle: kat.handle, title: kat.label, products } },
    };
    const kopfKat = {
      title: `${kat.label} kaufen | Alex Autoshop Wuppertal`,
      description: `${kat.label} bei Alex Autoshop Wuppertal: Profi-Qualität für Werkstatt und Lackiererei, schnell abholbereit.`,
      canonical: `https://www.alex-autoshop.de/kategorie/${kat.handle}`,
    };
    schreiben(dist, `kategorie/${kat.handle}/index.html`, seite(basis, {
      klasse: " aa-hell",
      hero: `<h1>${htmlText(kat.label)}</h1>`,
      kopf: kopfKat,
      karten: kartenHtml(edges),
      daten,
      preload: erstesBild(edges),
    }));
    schreiben(dist, `shop/${kat.handle}/index.html`, seite(basis, {
      klasse: " aa-hell",
      hero: `<h1>${htmlText(kat.label)}</h1>`,
      kopf: {
        title: `${kat.label} | Alex Autoshop Wuppertal`,
        description: `${kat.label} bei Alex Autoshop Wuppertal – Lackierprodukte, Autoteile und Werkstattbedarf mit bis zu 40 % Rabatt.`,
        canonical: `https://www.alex-autoshop.de/shop/${kat.handle}`,
      },
      daten,
    }));
    anzahl += 2;
  }), 4);

  let after = null;
  let seiten = 0;
  const gesehen = new Set();
  try {
  while (seiten < 8) {
    const data = await storefront(QUERY_PRODUKTE, { first: 100, after, query: null });
    const kante = data.data?.products;
    const edges = kante?.edges ?? [];
    for (const p of edges) {
      const node = p.node;
      const handle = sichererHandle(node?.handle);
      if (!handle || gesehen.has(handle)) continue;
      gesehen.add(handle);
      const bild = node.images?.edges?.[0]?.node?.url;
      const beschreibung = String(node.title || "").slice(0, 155);
      schreiben(dist, `produkt/${handle}/index.html`, seite(basis, {
        klasse: " aa-hell",
        hero: `<h1>${htmlText(node.title)}</h1>`,
        kopf: {
          title: `${node.title} | Alex Autoshop Wuppertal`,
          description: beschreibung,
          canonical: `https://www.alex-autoshop.de/produkt/${handle}`,
        },
        karten: kartenHtml([p]),
        daten: {
          meta: { art: "produkt", handle, schluessel: `produkt:${handle}` },
          data: { productByHandle: node },
        },
        preload: bild ? bildAdresse(bild, 960, "webp") : "",
      }));
      anzahl += 1;
    }
    after = kante?.pageInfo?.endCursor ?? null;
    seiten += 1;
    if (!kante?.pageInfo?.hasNextPage || !edges.length) break;
  }
  } catch (e) {
    console.warn("Produktseiten unvollständig:", e.message);
  }

  return { html: home, anzahl };
}
