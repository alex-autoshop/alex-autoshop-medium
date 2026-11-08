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
  kartenHtml,
  sichererHandle,
  bildAdresse,
} from "../shared/katalog-regeln.js";
import { kategorieDokument, produktDokument } from "../shared/seo-katalog.js";
import { geruest } from "../shared/seo-html.js";

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

function seite(basis, opts) {
  return geruest(basis, opts);
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
      ...kategorieDokument({
        handle: kat.handle,
        label: kat.label,
        produkte: edges.map((e) => e.node).filter(Boolean),
      }),
      imageAlt: kat.label,
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
      const dok = produktDokument(node);
      schreiben(dist, `produkt/${handle}/index.html`, seite(basis, {
        klasse: " aa-hell",
        hero: `<h1>${htmlText(node.title)}</h1>`,
        kopf: { ...dok, imageAlt: node.title },
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
