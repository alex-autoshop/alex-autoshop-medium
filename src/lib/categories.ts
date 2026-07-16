export interface Category {
  slug: string;
  label: string;
  query: string;
  description: string;
  image?: string;
  children?: Category[];
}

// Main nav categories matching original shop
export const navCategories: Array<{
  label: string;
  slug?: string;
  query?: string;
  children?: Array<{ label: string; slug: string; query: string }>;
}> = [
  {
    label: "Farbe bestellen",
    children: [
      { label: "Wunschfarbe erstellen", slug: "wunschfarben", query: "product_type:Autolack" },
      { label: "Individuelle Spraydose", slug: "spraydosen", query: "title:Spraydose" },
      { label: "Individueller Lackstift", slug: "lackstifte", query: "title:Lackstift" },
    ],
  },
  {
    label: "Lackierprodukte",
    children: [
      { label: "Klarlacke", slug: "klarlacke", query: "tag:Klarlack" },
      { label: "Grundierungen & Füller", slug: "grundierungen", query: "tag:Grundierung OR tag:Grundierfüller OR tag:'2K Grundierfüller' OR tag:Acrylfiller OR tag:Haftprimer" },
      { label: "Härter", slug: "haerter", query: "tag:Härter" },
      { label: "Verdünnungen", slug: "verduennungen", query: "tag:Verdünnung" },
      { label: "Spachtel", slug: "spachtel", query: "tag:Spachtel OR tag:Spritzspachtel OR tag:Spritzfüller" },
      { label: "Schleifmaterial", slug: "schleifmaterial", query: "tag:Schleifpads OR tag:schleifscheibe OR tag:schleifscheiben OR title:Schleifschwamm OR title:Schleifvlies" },
      { label: "Abdeckmaterial", slug: "abdeckmaterial", query: "title:Abdeckband OR title:'Green Tape' OR title:Foam-Tape" },
    ],
  },
  {
    label: "Öle & Flüssigkeiten",
    children: [
      { label: "Motoröl", slug: "motoroel", query: "tag:Motoröl" },
      { label: "Bremsenreiniger", slug: "bremsenreiniger", query: "title:Bremsenreiniger" },
      { label: "Silikonentferner", slug: "silikonentferner", query: "title:Silikonentferner" },
    ],
  },
  {
    label: "Karosserie & Reparaturmaterial",
    children: [
      { label: "Steinschlagschutz", slug: "steinschlagschutz", query: "tag:Steinschlagschutz OR tag:Strukturlack OR title:'Bumper Paint'" },
      { label: "Dichtmasse & Kleber", slug: "dichtmasse", query: "tag:Dichtmasse OR tag:Karosseriekleber" },
      { label: "Hohlraumversiegelung", slug: "versiegelung", query: "tag:Versieglung OR title:Hohlraumversiegelung" },
      { label: "Auspuff-Reparatur", slug: "auspuff", query: "tag:Auspuff OR tag:Auspufflack" },
    ],
  },
  {
    label: "Pflege & Aufbereitung",
    children: [
      { label: "Alle Pflegeprodukte", slug: "pflegeprodukte", query: "tag:Autopflege OR tag:Politur OR title:Polish OR title:Wax OR title:Shampoo OR title:Scheibenreiniger OR title:Polierpads" },
      { label: "Waschen & Schwämme", slug: "waschen-schwaemme", query: "title:Schwamm OR title:Eimer OR title:Waschhandschuh OR title:Shampoo OR title:Insektennetz OR title:Chenille" },
      { label: "Bürsten & Felgenreinigung", slug: "buersten", query: "title:Bürste OR title:Burste OR title:Pinsel OR title:Felgen" },
      { label: "Mikrofaser & Tücher", slug: "mikrofaser-tuecher", query: "title:Mikrofaser OR title:Microfein OR title:Micro OR title:Poliertuch OR title:Tuch OR title:Wischtücher" },
      { label: "Polieren & Politur", slug: "polieren-politur", query: "tag:Politur OR title:Polish OR title:Wax OR title:Polier OR title:Pad OR title:Polierteller OR title:Schleifpaste OR title:Politur" },
      { label: "Scheiben, Trocknen & Antibeschlag", slug: "scheiben-trocknen", query: "title:Wasserabzieher OR title:Scheibenreiniger OR title:Antibeschlag OR title:Fensterleder OR title:Ledertuch OR title:PVA OR title:Scheibe OR title:Trocken" },
      { label: "Innenraum, Duft & Winter", slug: "innenraum-winter", query: "title:Duft OR title:Lufterfrischer OR title:Cockpit OR title:Interieur OR title:Teppich OR title:Staubwedel OR title:Staubpinsel OR title:Eiskratzer OR title:Eisschaber OR title:Schneebesen OR title:Isolierdecke" },
    ],
  },
  {
    label: "Sets & Bundles",
    slug: "bundles",
    query: "tag:Bundle",
  },
];

// Flat list for routing
export const allCategories: Array<{ slug: string; label: string; query: string }> = [];

navCategories.forEach((cat) => {
  if (cat.children) {
    cat.children.forEach((child) => allCategories.push(child));
  } else if (cat.slug && cat.query) {
    allCategories.push({ slug: cat.slug, label: cat.label, query: cat.query });
  }
});

export function getCategoryBySlug(slug: string) {
  return allCategories.find((c) => c.slug === slug);
}

// Homepage collections
export const collections = [
  { label: "Günstige Autoteile bestellen", slug: "autoteile", image: "/images/collection-autoteile.png", query: "title:Autoteile" },
  { label: "Alle Produkte", slug: "alle", image: "/images/collection-filter.png", query: "" },
  { label: "Günstige Lackierprodukte", slug: "lackierprodukte", image: "/images/collection-lackierprodukte.webp", query: "tag:Klarlack OR tag:Grundierung OR tag:Härter OR tag:Verdünnung OR tag:Spachtel" },
  { label: "Öle & Flüssigkeiten", slug: "oele", image: "/images/collection-oele.webp", query: "tag:Motoröl OR title:Bremsenreiniger" },
  { label: "Karosserie & Reparaturmaterial", slug: "karosserie", image: "/images/collection-karosserie.webp", query: "tag:Steinschlagschutz OR tag:Dichtmasse OR tag:Spachtel OR tag:Strukturlack" },
  { label: "Wunschfarben erstellen", slug: "wunschfarben", image: "/images/collection-wunschfarben.png", query: "product_type:Autolack" },
];
