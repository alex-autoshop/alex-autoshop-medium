/**
 * Titel, Beschreibung und strukturierte Daten für Katalogseiten.
 * Bewertungen nur, wenn echte Rezensionen übergeben werden — hier gibt es keine.
 * Keine Werbeaussagen, die sich nicht belegen lassen.
 */
import { FARBKONFIGURATOR_HANDLES } from "./farbangabe.js";
import { euro } from "./katalog-regeln.js";
import { istLieferant } from "./kundenmarke.js";
import { lieferzeitText, lieferzeitWaehlen } from "./lieferzeit.js";
import { DHL_EUR } from "./versand.js";

export const SITE = "https://www.alex-autoshop.de";
const SUFFIX = " kaufen | Alex Autoshop";
const TITEL_MAX = 60;
const BESCHREIBUNG_MAX = 155;
const WIDERRUF = `${SITE}/widerruf`;

/** Werbeformeln, die wir weder aus dem SEO-Feld übernehmen noch selbst erzeugen. */
const ANSPRUCH = /g[üu]nstig|billig|bester\s+preis|besten\s+preis|beste[rn]?\s+preis|top-?preis|beste\s+qualit|nr\.?\s*1|testsieger|marktf[üu]hrer|unschlagbar|preis-?hit|superpreis|spitzenpreis|tiefpreis/i;

const GROESSE = /gr[öo]e|inhalt|volumen|menge|gebinde|f[üu]llmenge|size|gewicht|fassungsverm/i;

/** Hauptkategorien. Handles müssen zu src/lib/shopCategories.ts passen. */
export const HAUPT = {
  "lackierbedarf-alle": "Lackierbedarf",
  "karosserie-reparatur": "Karosserie & Reparatur",
  "autopflege-detailing": "Autopflege & Detailing",
  "oele-fluessigkeiten-filter": "Öle, Flüssigkeiten & Filter",
  winter: "Winter",
  werkstattchemie: "Werkstattchemie",
  "sets-sonstiges": "Sets & Sonstiges",
};

/** Unterkategorie → Elternteil. Einträge mit nur einem Weiterleitungspfad fehlen. */
export const UNTER = {
  "grundierung-fueller": { parent: "lackierbedarf-alle", label: "Grundierung & Füller" },
  spachtel: { parent: "lackierbedarf-alle", label: "Spachtel" },
  "schleifmittel-produkte": { parent: "lackierbedarf-alle", label: "Schleifmittel" },
  "abdecken-produkte": { parent: "lackierbedarf-alle", label: "Abdecken" },
  "klarlack-produkte": { parent: "lackierbedarf-alle", label: "Klarlack" },
  haerter: { parent: "lackierbedarf-alle", label: "Härter" },
  "verduennung-zusaetze": { parent: "lackierbedarf-alle", label: "Verdünnung & Zusätze" },
  "wunschfarbe-lackstift": { parent: "lackierbedarf-alle", label: "Wunschfarbe & Lackstift" },
  "lackierpistolen-zubehor": { parent: "lackierbedarf-alle", label: "Lackierpistolen & Zubehör" },
  "maschinen-werkzeug": { parent: "lackierbedarf-alle", label: "Maschinen & Werkzeug" },
  verbrauchsmaterial: { parent: "lackierbedarf-alle", label: "Verbrauchsmaterial" },
  "dichten-kleben-produkte": { parent: "karosserie-reparatur", label: "Dichten & Kleben" },
  "steinschlag-rostschutz": { parent: "karosserie-reparatur", label: "Steinschlag- & Rostschutz" },
  "spezial-effektlacke": { parent: "karosserie-reparatur", label: "Spezial- & Effektlacke" },
  mikrofasertuecher: { parent: "autopflege-detailing", label: "Mikrofasertücher" },
  schwaemme: { parent: "autopflege-detailing", label: "Schwämme" },
  "buersten-pinsel": { parent: "autopflege-detailing", label: "Bürsten & Pinsel" },
  waschzubehoer: { parent: "autopflege-detailing", label: "Waschzubehör" },
  "trocknen-leder": { parent: "autopflege-detailing", label: "Trocknen & Leder" },
  "poliermaschinen-pads": { parent: "autopflege-detailing", label: "Poliermaschinen & Pads" },
  "politur-schleifpaste": { parent: "autopflege-detailing", label: "Politur & Schleifpaste" },
  "pflegemittel-versiegelung": { parent: "autopflege-detailing", label: "Pflegemittel & Versiegelung" },
  "felgen-reifen": { parent: "autopflege-detailing", label: "Felgen & Reifen" },
  motoroel: { parent: "oele-fluessigkeiten-filter", label: "Motoröl" },
  getriebeoel: { parent: "oele-fluessigkeiten-filter", label: "Getriebeöl" },
  "kuehlmittel-scheibenreiniger": { parent: "oele-fluessigkeiten-filter", label: "Kühlmittel & Scheibenreiniger" },
  "reiniger-fette": { parent: "oele-fluessigkeiten-filter", label: "Reiniger & Fette" },
  filter: { parent: "oele-fluessigkeiten-filter", label: "Filter" },
  "eiskratzer-schneebesen": { parent: "winter", label: "Eiskratzer & Schneebesen" },
  "enteiser-frostschutz": { parent: "winter", label: "Enteiser & Frostschutz" },
  bremsenreiniger: { parent: "werkstattchemie", label: "Bremsenreiniger" },
  "rostloeser-multifunktion": { parent: "werkstattchemie", label: "Rostlöser & Multifunktion" },
  "kontakt-elektrik": { parent: "werkstattchemie", label: "Kontakt & Elektrik" },
  "schmier-gleitsprays": { parent: "werkstattchemie", label: "Schmier- & Gleitsprays" },
  "unterboden-hohlraum": { parent: "werkstattchemie", label: "Unterboden & Hohlraum" },
  klimaanlage: { parent: "werkstattchemie", label: "Klimaanlage" },
  montagepasten: { parent: "werkstattchemie", label: "Montagepasten" },
  "dichten-sichern": { parent: "werkstattchemie", label: "Dichten & Sichern" },
  handreinigung: { parent: "werkstattchemie", label: "Handreinigung" },
  "werkstatt-reiniger": { parent: "werkstattchemie", label: "Reiniger" },
};

export function alleKategorieHandles() {
  return [...Object.keys(HAUPT), ...Object.keys(UNTER)];
}

export function istBekannteKategorie(handle) {
  return Boolean(HAUPT[handle] || UNTER[handle]);
}

export function kategorieInfo(handle) {
  if (UNTER[handle]) {
    const eintrag = UNTER[handle];
    return {
      handle,
      label: eintrag.label,
      parentHandle: eintrag.parent,
      parentLabel: HAUPT[eintrag.parent] || "",
    };
  }
  if (HAUPT[handle]) {
    return { handle, label: HAUPT[handle], parentHandle: "", parentLabel: "" };
  }
  return null;
}

export function klartext(wert) {
  return String(wert || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function ohneBezugsquelle(text) {
  return String(text || "")
    .replace(/ds[\s-]?color/gi, "")
    .replace(/oil[-\s]?center/gi, "")
    .replace(/inter\s*cars/gi, "")
    .replace(/\bshopify\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.:;])/g, "$1")
    .trim();
}

export function hatWerbeaussage(text) {
  return ANSPRUCH.test(String(text || ""));
}

/** Gesetztes SEO-Feld nur, wenn es eine belegbare Beschreibung ist. */
export function seoBeschreibungBrauchbar(text) {
  const s = ohneBezugsquelle(klartext(text));
  if (s.length < 20) return "";
  if (hatWerbeaussage(s)) return "";
  return s;
}

export function kuerzen(text, max) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  if (s.length <= max) return s;
  const grenze = Math.max(1, max - 1);
  let kurz = s.slice(0, grenze);
  const sp = kurz.lastIndexOf(" ");
  if (sp >= Math.min(40, Math.max(8, grenze - 12))) kurz = kurz.slice(0, sp);
  kurz = kurz.replace(/[\s,;:–\-/|]+$/u, "").replace(/[.!?]+$/, "");
  if (!kurz) kurz = s.slice(0, grenze).trim();
  const aus = `${kurz}.`;
  return aus.length <= max ? aus : aus.slice(0, max);
}

function norm(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, "");
}

/** „{Name} {Größe} kaufen | Alex Autoshop“, höchstens 60 Zeichen. */
export function kaufTitel(name, groesse) {
  let basis = String(name || "").replace(/\s+/g, " ").trim() || "Produkt";
  const g = String(groesse || "").replace(/\s+/g, " ").trim();
  if (g && g !== "Default Title" && !norm(basis).includes(norm(g))) basis = `${basis} ${g}`;
  if ((basis + SUFFIX).length <= TITEL_MAX) return basis + SUFFIX;
  const budget = TITEL_MAX - SUFFIX.length;
  let kurz = basis.slice(0, budget);
  const sp = kurz.lastIndexOf(" ");
  if (sp >= 12) kurz = kurz.slice(0, sp);
  kurz = kurz.replace(/[\s,;:–\-/|]+$/u, "");
  if (!kurz) kurz = basis.slice(0, budget).trim();
  return kurz + SUFFIX;
}

export function variantenVon(produkt) {
  const kanten = produkt?.variants?.edges;
  if (!Array.isArray(kanten)) return [];
  return kanten.map((kante) => kante?.node).filter(Boolean);
}

export function standardVariante(produkt) {
  const liste = variantenVon(produkt);
  return liste.find((v) => v.availableForSale) || liste[0] || null;
}

/** Größe nur, wenn genau eine Variante sie nennt und der Titel sie nicht schon trägt. */
export function groesseAus(produkt) {
  const optionen = Array.isArray(produkt?.options) ? produkt.options : [];
  const opt = optionen.find((o) => GROESSE.test(o?.name || ""));
  const liste = variantenVon(produkt);
  if (opt && liste.length === 1) {
    const wert = (liste[0].selectedOptions || []).find((s) => s?.name === opt.name)?.value;
    if (wert && wert !== "Default Title") return String(wert).trim();
  }
  if (liste.length === 1 && liste[0].title && liste[0].title !== "Default Title") {
    const titel = String(liste[0].title).trim();
    if (titel.length <= 24 && /\d/.test(titel)) return titel;
  }
  return "";
}

export function metaBeschreibung({ name, seo, beschreibung, preisText, lieferzeit }) {
  const fertig = seoBeschreibungBrauchbar(seo);
  if (fertig) return kuerzen(fertig, BESCHREIBUNG_MAX);
  const kern = ohneBezugsquelle(klartext(beschreibung)) || String(name || "").replace(/\s+/g, " ").trim();
  const extra = [];
  if (preisText) extra.push(preisText);
  if (lieferzeit) extra.push(`Lieferzeit ${lieferzeit}`);
  extra.push("Alex Autoshop, Wuppertal");
  const satz = kern ? `${kern}. ${extra.join(", ")}` : extra.join(", ");
  return kuerzen(satz, BESCHREIBUNG_MAX);
}

export function kategorieBeschreibung(label) {
  const name = String(label || "Kategorie").replace(/\s+/g, " ").trim();
  return kuerzen(
    `${name} bei Alex Autoshop in Wuppertal. Preis und Lieferzeit stehen am jeweiligen Artikel. Abholung in der Handelstraße 64.`,
    BESCHREIBUNG_MAX,
  );
}

/** GTIN-8/12/13/14 mit Prüfziffer. Alles andere lassen wir weg. */
export function gtinAus(wert) {
  const s = String(wert || "").replace(/\s/g, "");
  if (!/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(s)) return "";
  const ziffern = s.split("").map(Number);
  const pruef = ziffern.pop();
  let summe = 0;
  for (let i = 0; i < ziffern.length; i += 1) {
    const vonRechts = ziffern.length - 1 - i;
    summe += ziffern[vonRechts] * (i % 2 === 0 ? 3 : 1);
  }
  const erwartet = (10 - (summe % 10)) % 10;
  return erwartet === pruef ? s : "";
}

export function markeFuerSeo(vendor) {
  const name = String(vendor || "").trim();
  if (!name || istLieferant(name)) return "";
  if (/\bsata\b/i.test(name)) return "";
  return name;
}

export function preisGueltigBis(jetzt = new Date()) {
  const tag = new Date(jetzt.getTime());
  tag.setUTCDate(tag.getUTCDate() + 30);
  return tag.toISOString().slice(0, 10);
}

/**
 * Die Seite speichert eine Lieferzeit in Werktagen, kein getrenntes
 * Handling und keinen Transit. Handling ist der Anfang dieses Fensters,
 * Transit der Rest, damit die Summe der angegebenen Lieferzeit entspricht.
 */
export function versandZeiten(min, max) {
  const von = Number.isFinite(min) ? min : 1;
  const bis = Number.isFinite(max) ? max : von;
  const handlingMin = Math.max(0, Math.min(von, bis));
  const handlingMax = handlingMin;
  const transitMin = 0;
  const transitMax = Math.max(0, Math.max(von, bis) - handlingMin);
  return { handlingMin, handlingMax, transitMin, transitMax };
}

function zustand(tags) {
  const text = (Array.isArray(tags) ? tags : []).join(" ").toLowerCase();
  if (/gebraucht|used|second[\s-]?hand/.test(text)) return "https://schema.org/UsedCondition";
  if (/erneuert|refurbished/.test(text)) return "https://schema.org/RefurbishedCondition";
  return "https://schema.org/NewCondition";
}

export function rueckgabe(handle) {
  const basis = {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "DE",
    merchantReturnLink: WIDERRUF,
  };
  if (FARBKONFIGURATOR_HANDLES.includes(handle)) {
    return {
      ...basis,
      returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
    };
  }
  return {
    ...basis,
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: 14,
    returnMethod: "https://schema.org/ReturnByMail",
    returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
  };
}

function sammlungenVon(produkt) {
  const kanten = produkt?.collections?.edges;
  if (!Array.isArray(kanten)) return [];
  return kanten.map((kante) => kante?.node).filter((n) => n && n.handle);
}

export function brotkrumenProdukt(produkt) {
  const url = `${SITE}/produkt/${produkt.handle}`;
  const sammlungen = sammlungenVon(produkt);
  const unter = sammlungen.find((s) => UNTER[s.handle]);
  const haupt = sammlungen.find((s) => HAUPT[s.handle]);
  const items = [{ name: "Start", url: `${SITE}/` }];
  if (unter) {
    const info = kategorieInfo(unter.handle);
    items.push({
      name: info.parentLabel,
      url: `${SITE}/kategorie/${info.parentHandle}`,
    });
    items.push({
      name: unter.title || info.label,
      url: `${SITE}/kategorie/${unter.handle}`,
    });
  } else if (haupt) {
    items.push({
      name: haupt.title || HAUPT[haupt.handle],
      url: `${SITE}/kategorie/${haupt.handle}`,
    });
  }
  items.push({ name: produkt.title, url });
  return items;
}

export function brotkrumenKategorie(handle, label) {
  const info = kategorieInfo(handle);
  const name = label || info?.label || handle;
  const items = [{ name: "Start", url: `${SITE}/` }];
  if (info?.parentHandle) {
    items.push({
      name: info.parentLabel,
      url: `${SITE}/kategorie/${info.parentHandle}`,
    });
  }
  items.push({ name, url: `${SITE}/kategorie/${handle}` });
  return items;
}

export function brotkrumenLd(items) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: (items || []).map((eintrag, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: eintrag.name,
      item: eintrag.url,
    })),
  };
}

export function itemListLd(handle, produkte) {
  const liste = (produkte || []).filter((p) => p && p.handle && p.title).slice(0, 30);
  if (!liste.length) return null;
  return {
    "@type": "ItemList",
    url: `${SITE}/kategorie/${handle}`,
    numberOfItems: liste.length,
    itemListElement: liste.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE}/produkt/${p.handle}`,
      name: p.title,
    })),
  };
}

function angebot({ preis, waehrung, verfuegbar, url, fenster, handle, bis, tags }) {
  const betrag = Number(preis);
  if (!Number.isFinite(betrag)) return null;
  const zeiten = versandZeiten(fenster?.min, fenster?.max);
  return {
    "@type": "Offer",
    url,
    priceCurrency: waehrung || "EUR",
    price: betrag.toFixed(2),
    priceValidUntil: bis,
    itemCondition: zustand(tags),
    availability: verfuegbar ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    seller: { "@type": "Organization", name: "Alex Autoshop", url: `${SITE}/` },
    shippingDetails: {
      "@type": "OfferShippingDetails",
      shippingRate: { "@type": "MonetaryAmount", value: DHL_EUR.toFixed(2), currency: "EUR" },
      shippingDestination: { "@type": "DefinedRegion", addressCountry: "DE" },
      deliveryTime: {
        "@type": "ShippingDeliveryTime",
        handlingTime: {
          "@type": "QuantitativeValue",
          minValue: zeiten.handlingMin,
          maxValue: zeiten.handlingMax,
          unitCode: "DAY",
        },
        transitTime: {
          "@type": "QuantitativeValue",
          minValue: zeiten.transitMin,
          maxValue: zeiten.transitMax,
          unitCode: "DAY",
        },
      },
    },
    hasMerchantReturnPolicy: rueckgabe(handle),
  };
}

function ohneLeer(obj) {
  const aus = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v == null || v === "") continue;
    aus[k] = v;
  }
  return aus;
}

/**
 * Produkt-JSON-LD. `bewertungen` bleibt leer, solange keine echten
 * Kundenrezensionen vorliegen — dann fehlen AggregateRating und Review.
 */
export function produktLd(produkt, opts = {}) {
  if (!produkt?.title || !produkt?.handle) return null;
  const variante = opts.variante || standardVariante(produkt);
  const fenster = opts.fenster || lieferzeitWaehlen(produkt.lieferzeit, variante?.lieferzeit);
  const url = `${SITE}/produkt/${produkt.handle}`;
  const bilder = (produkt.images?.edges || []).map((e) => e?.node?.url).filter(Boolean);
  const marke = markeFuerSeo(produkt.vendor);
  const gtin = gtinAus(variante?.barcode);
  const sku = String(variante?.sku || "").trim();
  const preis = variante?.price || produkt.priceRange?.minVariantPrice;
  const text = ohneBezugsquelle(klartext(produkt.description)).slice(0, 5000);
  const ld = ohneLeer({
    "@type": "Product",
    name: produkt.title,
    description: text,
    image: bilder.length ? bilder : undefined,
    sku: sku || undefined,
    brand: marke ? { "@type": "Brand", name: marke } : undefined,
    url,
  });
  if (gtin) {
    const feld = { 8: "gtin8", 12: "gtin12", 13: "gtin13", 14: "gtin14" }[gtin.length];
    if (feld) ld[feld] = gtin;
  }
  const mpn = String(opts.mpn || produkt.mpn || "").trim();
  if (mpn) ld.mpn = mpn;
  const offer = angebot({
    preis: preis?.amount,
    waehrung: preis?.currencyCode,
    verfuegbar: variante ? variante.availableForSale !== false : true,
    url,
    fenster,
    handle: produkt.handle,
    bis: opts.bis || preisGueltigBis(opts.jetzt),
    tags: produkt.tags,
  });
  if (offer) ld.offers = offer;
  const bewertungen = Array.isArray(opts.bewertungen) ? opts.bewertungen.filter((b) => b && b.reviewBody) : [];
  if (bewertungen.length) {
    const noten = bewertungen.map((b) => Number(b.reviewRating)).filter((n) => Number.isFinite(n));
    ld.review = bewertungen.map((b) => ({
      "@type": "Review",
      author: { "@type": "Person", name: b.author || "Kunde" },
      reviewBody: klartext(b.reviewBody).slice(0, 1000),
      ...(Number.isFinite(Number(b.reviewRating))
        ? { reviewRating: { "@type": "Rating", ratingValue: Number(b.reviewRating), bestRating: 5 } }
        : {}),
    }));
    if (noten.length) {
      const summe = noten.reduce((a, b) => a + b, 0);
      ld.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: Math.round((summe / noten.length) * 10) / 10,
        reviewCount: bewertungen.length,
        bestRating: 5,
      };
    }
  }
  return ld;
}

export function seitenGraph(knoten) {
  const liste = (knoten || []).filter(Boolean).map((k) => {
    const kopie = { ...k };
    delete kopie["@context"];
    return kopie;
  });
  return { "@context": "https://schema.org", "@graph": liste };
}

export function produktDokument(produkt, opts = {}) {
  const variante = opts.variante || standardVariante(produkt);
  const fenster = lieferzeitWaehlen(produkt?.lieferzeit, variante?.lieferzeit);
  const preis = variante?.price || produkt?.priceRange?.minVariantPrice;
  const title = kaufTitel(produkt?.title, groesseAus(produkt));
  const description = metaBeschreibung({
    name: produkt?.title,
    seo: produkt?.seo?.description,
    beschreibung: produkt?.description,
    preisText: euro(preis?.amount, preis?.currencyCode),
    lieferzeit: lieferzeitText(fenster),
  });
  const canonical = `${SITE}/produkt/${produkt.handle}`;
  const image = produkt?.images?.edges?.[0]?.node?.url || "";
  const jsonLd = seitenGraph([
    produktLd(produkt, { variante, fenster, bis: opts.bis, jetzt: opts.jetzt, bewertungen: opts.bewertungen }),
    brotkrumenLd(brotkrumenProdukt(produkt)),
  ]);
  return { title, description, canonical, image, ogType: "product", jsonLd };
}

export function kategorieDokument({ handle, label, seo, produkte }) {
  const info = kategorieInfo(handle);
  const name = String(label || info?.label || handle || "").trim();
  const title = kaufTitel(name);
  const description = seoBeschreibungBrauchbar(seo) || kategorieBeschreibung(name);
  const canonical = `${SITE}/kategorie/${handle}`;
  const jsonLd = seitenGraph([
    brotkrumenLd(brotkrumenKategorie(handle, name)),
    itemListLd(handle, produkte),
  ]);
  return { title, description, canonical, ogType: "website", jsonLd };
}

export function startseitenLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["AutoPartsStore", "Organization"],
        "@id": `${SITE}/#organization`,
        name: "Alex Autoshop",
        description: "Fachgroßhandel für Lackierprodukte, Autoteile und Werkstattmaterial in Wuppertal",
        url: `${SITE}/`,
        telephone: "+49 202 82690",
        email: "info@alex-autoshop.de",
        image: `${SITE}/images/og-image.png`,
        logo: `${SITE}/logo.png`,
        priceRange: "€€",
        currenciesAccepted: "EUR",
        paymentAccepted: "Cash, Credit Card, PayPal",
        address: {
          "@type": "PostalAddress",
          streetAddress: "Handelstraße 64",
          postalCode: "42277",
          addressLocality: "Wuppertal",
          addressRegion: "NRW",
          addressCountry: "DE",
        },
        geo: { "@type": "GeoCoordinates", latitude: 51.2789, longitude: 7.2173 },
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            opens: "09:00",
            closes: "17:30",
          },
          { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "09:00", closes: "14:00" },
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE}/#website`,
        url: `${SITE}/`,
        name: "Alex Autoshop",
        inLanguage: "de-DE",
        publisher: { "@id": `${SITE}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE}/shop?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

function typGleich(knoten, typ) {
  const art = knoten?.["@type"];
  if (art === typ) return true;
  return Array.isArray(art) && art.includes(typ);
}

export function findeKnoten(ld, typ) {
  if (!ld) return null;
  if (typGleich(ld, typ)) return ld;
  const liste = Array.isArray(ld["@graph"]) ? ld["@graph"] : [];
  return liste.find((k) => typGleich(k, typ)) || null;
}

/** Lokale Prüfung gegen die Pflichtfelder für Produkt- und Händlerangaben. */
export function pruefeProduktLd(ld) {
  const fehler = [];
  const produkt = findeKnoten(ld, "Product");
  if (!produkt) return ["Product fehlt"];
  if (!produkt.name) fehler.push("name fehlt");
  const bild = produkt.image;
  const bilder = Array.isArray(bild) ? bild : bild ? [bild] : [];
  if (!bilder.length) fehler.push("image fehlt");
  if (bilder.some((u) => typeof u !== "string" || !/^https:\/\//.test(u))) fehler.push("image ist keine absolute URL");
  const offer = produkt.offers;
  if (!offer || offer["@type"] !== "Offer") fehler.push("Offer fehlt");
  else {
    if (!/^\d+\.\d{2}$/.test(String(offer.price))) fehler.push("price");
    if (offer.priceCurrency !== "EUR") fehler.push("priceCurrency");
    if (!/^https:\/\/schema\.org\/(InStock|OutOfStock|PreOrder)$/.test(offer.availability || "")) fehler.push("availability");
    if (!/^https:\/\/schema\.org\/(New|Used|Refurbished)Condition$/.test(offer.itemCondition || "")) fehler.push("itemCondition");
    if (!offer.url || !offer.url.startsWith(`${SITE}/produkt/`)) fehler.push("offer url");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(offer.priceValidUntil || "")) fehler.push("priceValidUntil");
    const ship = offer.shippingDetails;
    if (!ship || ship.shippingDestination?.addressCountry !== "DE") fehler.push("shippingDestination DE");
    if (ship?.shippingRate?.currency !== "EUR" || !ship.shippingRate.value) fehler.push("shippingRate");
    const h = ship?.deliveryTime?.handlingTime;
    const t = ship?.deliveryTime?.transitTime;
    for (const zeit of [h, t]) {
      if (!zeit || zeit.unitCode !== "DAY" || zeit.minValue > zeit.maxValue) fehler.push("deliveryTime");
    }
    const ret = offer.hasMerchantReturnPolicy;
    if (!ret || ret.applicableCountry !== "DE") fehler.push("return policy");
    else if (ret.returnPolicyCategory === "https://schema.org/MerchantReturnFiniteReturnWindow") {
      if (ret.merchantReturnDays !== 14) fehler.push("merchantReturnDays");
      if (ret.returnMethod !== "https://schema.org/ReturnByMail") fehler.push("returnMethod");
      if (ret.returnFees !== "https://schema.org/ReturnFeesCustomerResponsibility") fehler.push("returnFees");
    } else if (ret.returnPolicyCategory !== "https://schema.org/MerchantReturnNotPermitted") {
      fehler.push("returnPolicyCategory");
    }
  }
  const brot = findeKnoten(ld, "BreadcrumbList");
  if (!brot) fehler.push("BreadcrumbList fehlt");
  const texte = [
    produkt.name,
    produkt.description,
    produkt.brand?.name,
    produkt.sku,
    ...(brot?.itemListElement || []).map((e) => e.name),
  ].join(" ");
  if (/\b(shopify|ds[\s-]?color|inter\s*cars|oil[-\s]?center)\b/i.test(texte)) fehler.push("interner Name im JSON-LD");
  return fehler;
}

export function pruefeKategorieLd(ld) {
  const fehler = [];
  const brot = findeKnoten(ld, "BreadcrumbList");
  if (!brot?.itemListElement?.length) fehler.push("BreadcrumbList fehlt");
  const liste = findeKnoten(ld, "ItemList");
  if (liste) {
    if (!Array.isArray(liste.itemListElement) || !liste.itemListElement.length) fehler.push("ItemList leer");
    if (liste.itemListElement?.some((e) => !e.url || !e.name || !e.position)) fehler.push("ListItem unvollständig");
  }
  return fehler;
}

export function pruefeStartLd(ld) {
  const fehler = [];
  const org = findeKnoten(ld, "Organization") || findeKnoten(ld, "AutoPartsStore");
  if (!org?.name) fehler.push("Organization fehlt");
  const site = findeKnoten(ld, "WebSite");
  if (!site) fehler.push("WebSite fehlt");
  const action = site?.potentialAction;
  if (action?.["@type"] !== "SearchAction") fehler.push("SearchAction fehlt");
  if (!String(action?.target?.urlTemplate || "").includes("{search_term_string}")) fehler.push("urlTemplate");
  if (action?.["query-input"] !== "required name=search_term_string") fehler.push("query-input");
  return fehler;
}
