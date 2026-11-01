/**
 * Shop-Navigation = das Shopify-Menü „Menü“ (6 Hauptkategorien + Unterkategorien).
 *
 * Die Storefront-API kann dieses Menü heute nicht lesen
 * (`unauthenticated_read_content` fehlt am Token) und die neuen Smart-Collections
 * sind nicht im Headless-Kanal veröffentlicht (`collection(handle:)` = null).
 * Deshalb steht der Baum hier. Jede `query` ist exakt die Regel der Collection
 * (Tag „Kategorie: …“ bzw. Produkttyp) und liefert dieselben Artikel.
 *
 * `useProducts` fragt zusätzlich `collection(handle:)` an. Sobald die Collections
 * im Headless-Kanal liegen, gewinnt die Collection — Regeländerungen in Shopify
 * kommen dann ohne Code-Änderung an.
 */

export interface ShopLink {
  label: string;
  /** Kollektions-Handle, zugleich Pfad /shop/:slug */
  slug?: string;
  /** Storefront-Suche, Abbild der Smart-Collection-Regel. */
  query?: string;
  /** Direkter Pfad, wenn es keine Kollektion ist (Produktseite). */
  to?: string;
  image?: string;
  /** Produktfoto auf hellem Grund: in der Kachel vollständig zeigen. */
  contain?: boolean;
  children?: ShopLink[];
}

export const navCategories: ShopLink[] = [
  {
    label: "Farbe bestellen",
    children: [
      { label: "Wunschfarbe bestellen", to: "/produkt/farben-mix" },
      { label: "Spraydose bestellen", to: "/produkt/individuelle-spraydose-erstellen" },
    ],
  },
  {
    label: "Lackierbedarf",
    slug: "lackierbedarf-alle",
    query: 'tag:"Kategorie: Lackierbedarf"',
    image: "/images/collection-lackierprodukte.webp",
    children: [
      { label: "Grundierung & Füller", slug: "grundierung-fueller", query: 'product_type:"Grundierung & Füller"' },
      { label: "Spachtel", slug: "spachtel", query: 'product_type:"Spachtel"' },
      { label: "Schleifmittel", slug: "schleifmittel-produkte", query: 'product_type:"Schleifmittel"' },
      { label: "Abdecken", slug: "abdecken-produkte", query: 'product_type:"Abdecken"' },
      { label: "Klarlack", slug: "klarlack-produkte", query: 'product_type:"Klarlack"' },
      { label: "Härter", slug: "haerter", query: 'product_type:"Härter"' },
      { label: "Verdünnung & Zusätze", slug: "verduennung-zusaetze", query: 'product_type:"Verdünnung & Zusätze"' },
      { label: "Wunschfarbe & Lackstift", slug: "wunschfarbe-lackstift", query: 'product_type:"Wunschfarbe & Lackstift"' },
    ],
  },
  {
    label: "Karosserie & Reparatur",
    slug: "karosserie-reparatur",
    query: 'tag:"Kategorie: Karosserie & Reparatur"',
    image: "/images/collection-karosserie.webp",
    children: [
      { label: "Dichten & Kleben", slug: "dichten-kleben-produkte", query: 'product_type:"Dichten & Kleben"' },
      { label: "Steinschlag- & Rostschutz", slug: "steinschlag-rostschutz", query: 'product_type:"Steinschlag- & Rostschutz"' },
      { label: "Spezial- & Effektlacke", slug: "spezial-effektlacke", query: 'product_type:"Spezial- & Effektlacke"' },
    ],
  },
  {
    label: "Autopflege & Detailing",
    slug: "autopflege-detailing",
    query: 'tag:"Kategorie: Autopflege & Detailing"',
    image: "/images/collection-autopflege.webp",
    contain: true,
    children: [
      { label: "Mikrofasertücher", slug: "mikrofasertuecher", query: 'product_type:"Mikrofasertücher"' },
      { label: "Schwämme", slug: "schwaemme", query: 'product_type:"Schwämme"' },
      { label: "Bürsten & Pinsel", slug: "buersten-pinsel", query: 'product_type:"Bürsten & Pinsel"' },
      { label: "Waschzubehör", slug: "waschzubehoer", query: 'product_type:"Waschzubehör"' },
      { label: "Trocknen & Leder", slug: "trocknen-leder", query: 'product_type:"Trocknen & Leder"' },
      { label: "Poliermaschinen & Pads", slug: "poliermaschinen-pads", query: 'product_type:"Poliermaschinen & Pads"' },
      { label: "Politur & Schleifpaste", slug: "politur-schleifpaste", query: 'product_type:"Politur & Schleifpaste"' },
      { label: "Pflegemittel & Versiegelung", slug: "pflegemittel-versiegelung", query: 'product_type:"Pflegemittel & Versiegelung"' },
    ],
  },
  {
    label: "Öle, Flüssigkeiten & Filter",
    slug: "oele-fluessigkeiten-filter",
    query: 'tag:"Kategorie: Öle"',
    image: "/images/collection-oele.webp",
    children: [
      { label: "Motoröl", slug: "motoroel", query: 'product_type:"Motoröl"' },
      { label: "Filter", slug: "filter", query: 'product_type:"Filter"' },
      { label: "Kühlmittel & Scheibenreiniger", slug: "kuehlmittel-scheibenreiniger", query: 'product_type:"Kühlmittel & Scheibenreiniger"' },
      { label: "Reiniger & Fette", slug: "reiniger-fette", query: 'product_type:"Reiniger & Fette"' },
    ],
  },
  {
    label: "Winter",
    slug: "winter",
    query: 'tag:"Kategorie: Winter"',
    image: "/images/collection-winter.webp",
    contain: true,
    children: [
      { label: "Eiskratzer & Schneebesen", slug: "eiskratzer-schneebesen", query: 'product_type:"Eiskratzer & Schneebesen"' },
      { label: "Enteiser & Frostschutz", slug: "enteiser-frostschutz", query: 'product_type:"Enteiser & Frostschutz"' },
    ],
  },
  {
    label: "Sets & Sonstiges",
    slug: "sets-sonstiges",
    query: 'tag:"Kategorie: Sets & Sonstiges"',
    image: "/images/collection-sets.webp",
    contain: true,
  },
];

export interface ShopCategory {
  slug: string;
  label: string;
  query: string;
}

/** Hauptkategorien und Unterkategorien, die eine Kollektion sind. */
export const allCategories: ShopCategory[] = [];

navCategories.forEach((cat) => {
  if (cat.slug && cat.query) allCategories.push({ slug: cat.slug, label: cat.label, query: cat.query });
  cat.children?.forEach((child) => {
    if (child.slug && child.query) allCategories.push({ slug: child.slug, label: child.label, query: child.query });
  });
});

export function getCategoryBySlug(slug: string): ShopCategory | undefined {
  return allCategories.find((c) => c.slug === slug);
}

export function getParentCategory(slug: string): ShopCategory | undefined {
  for (const group of navCategories) {
    if (!group.children?.some((child) => child.slug === slug)) continue;
    if (group.slug && group.query) return { slug: group.slug, label: group.label, query: group.query };
  }
  return undefined;
}

export function categoryPath(item: Pick<ShopLink, "slug" | "to">): string | null {
  if (item.to) return item.to;
  if (item.slug) return `/shop/${item.slug}`;
  return null;
}

/** Startseiten-Kacheln: die sechs Hauptkategorien, in Menü-Reihenfolge. */
export const collections: Array<ShopCategory & { image: string; contain?: boolean }> = navCategories
  .filter((cat): cat is ShopLink & { slug: string; query: string; image: string } =>
    Boolean(cat.slug && cat.query && cat.image)
  )
  .map((cat) => ({
    slug: cat.slug,
    label: cat.label,
    query: cat.query,
    image: cat.image,
    contain: cat.contain,
  }));

/**
 * Alte Shop-Slugs (frühere hart codierte Kategorien) → neue Adresse.
 * Leerer String = /shop. Neue Handles stehen hier bewusst nicht.
 */
const LEGACY_SLUGS: Record<string, string> = {
  wunschfarben: "wunschfarbe-lackstift",
  spraydosen: "wunschfarbe-lackstift",
  lackstifte: "wunschfarbe-lackstift",
  klarlacke: "klarlack-produkte",
  grundierungen: "grundierung-fueller",
  verduennungen: "verduennung-zusaetze",
  schleifmaterial: "schleifmittel-produkte",
  abdeckmaterial: "abdecken-produkte",
  oelfilter: "filter",
  "oelfilter-einsatz": "filter",
  "oelfilter-anschraub": "filter",
  hydraulikfilter: "filter",
  bremsenreiniger: "reiniger-fette",
  silikonentferner: "reiniger-fette",
  steinschlagschutz: "steinschlag-rostschutz",
  dichtmasse: "dichten-kleben-produkte",
  versiegelung: "steinschlag-rostschutz",
  auspuff: "karosserie-reparatur",
  pflegeprodukte: "autopflege-detailing",
  "waschen-schwaemme": "waschzubehoer",
  buersten: "buersten-pinsel",
  "mikrofaser-tuecher": "mikrofasertuecher",
  "polieren-politur": "politur-schleifpaste",
  "scheiben-trocknen": "trocknen-leder",
  "innenraum-winter": "winter",
  bundles: "sets-sonstiges",
  autoteile: "",
  alle: "",
  lackierprodukte: "lackierbedarf-alle",
  oele: "oele-fluessigkeiten-filter",
  karosserie: "karosserie-reparatur",
};

/** Neue Adresse für einen veralteten Slug, sonst undefined. */
export function legacyCategoryRedirect(slug: string): string | undefined {
  if (!Object.prototype.hasOwnProperty.call(LEGACY_SLUGS, slug)) return undefined;
  const next = LEGACY_SLUGS[slug];
  return next ? `/shop/${next}` : "/shop";
}
