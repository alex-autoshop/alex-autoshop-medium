/**
 * Shop-Struktur = Shopify-Kollektionen.
 * Die Handles muessen exakt den Kollektions-Handles in Shopify entsprechen.
 * Produkte werden immer per Storefront API ueber collection(handle:) geladen.
 */
export interface SubCategory {
  handle: string;
  label: string;
}

export interface MainCategory {
  handle: string;
  label: string;
  children: SubCategory[];
}

export const SHOP_CATEGORIES: MainCategory[] = [
  {
    handle: "lackierbedarf-alle",
    label: "Lackierbedarf",
    children: [
      { handle: "grundierung-fueller", label: "Grundierung & Füller" },
      { handle: "spachtel", label: "Spachtel" },
      { handle: "schleifmittel-produkte", label: "Schleifmittel" },
      { handle: "abdecken-produkte", label: "Abdecken" },
      { handle: "klarlack-produkte", label: "Klarlack" },
      { handle: "haerter", label: "Härter" },
      { handle: "verduennung-zusaetze", label: "Verdünnung & Zusätze" },
      { handle: "wunschfarbe-lackstift", label: "Wunschfarbe & Lackstift" },
      { handle: "lackierpistolen-zubehor", label: "Lackierpistolen & Zubehör" },
      { handle: "maschinen-werkzeug", label: "Maschinen & Werkzeug" },
      { handle: "verbrauchsmaterial", label: "Verbrauchsmaterial" },
    ],
  },
  {
    handle: "karosserie-reparatur",
    label: "Karosserie & Reparatur",
    children: [
      { handle: "dichten-kleben-produkte", label: "Dichten & Kleben" },
      { handle: "steinschlag-rostschutz", label: "Steinschlag- & Rostschutz" },
      { handle: "spezial-effektlacke", label: "Spezial- & Effektlacke" },
    ],
  },
  {
    handle: "autopflege-detailing",
    label: "Autopflege & Detailing",
    children: [
      { handle: "mikrofasertuecher", label: "Mikrofasertücher" },
      { handle: "schwaemme", label: "Schwämme" },
      { handle: "buersten-pinsel", label: "Bürsten & Pinsel" },
      { handle: "waschzubehoer", label: "Waschzubehör" },
      { handle: "trocknen-leder", label: "Trocknen & Leder" },
      { handle: "poliermaschinen-pads", label: "Poliermaschinen & Pads" },
      { handle: "politur-schleifpaste", label: "Politur & Schleifpaste" },
      { handle: "pflegemittel-versiegelung", label: "Pflegemittel & Versiegelung" },
      { handle: "felgen-reifen", label: "Felgen & Reifen" },
    ],
  },
  {
    handle: "oele-fluessigkeiten-filter",
    label: "Öle, Flüssigkeiten & Filter",
    children: [
      { handle: "motoroel", label: "Motoröl" },
      { handle: "getriebeoel", label: "Getriebeöl" },
      { handle: "kuehlmittel-scheibenreiniger", label: "Kühlmittel & Scheibenreiniger" },
      { handle: "reiniger-fette", label: "Reiniger & Fette" },
      { handle: "filter", label: "Filter" },
    ],
  },
  {
    handle: "winter",
    label: "Winter",
    children: [
      { handle: "eiskratzer-schneebesen", label: "Eiskratzer & Schneebesen" },
      { handle: "enteiser-frostschutz", label: "Enteiser & Frostschutz" },
    ],
  },
  {
    handle: "werkstattchemie",
    label: "Werkstattchemie",
    children: [
      { handle: "bremsenreiniger", label: "Bremsenreiniger" },
      { handle: "rostloeser-multifunktion", label: "Rostlöser & Multifunktion" },
      { handle: "kontakt-elektrik", label: "Kontakt & Elektrik" },
      { handle: "schmier-gleitsprays", label: "Schmier- & Gleitsprays" },
      { handle: "unterboden-hohlraum", label: "Unterboden & Hohlraum" },
      { handle: "klimaanlage", label: "Klimaanlage" },
      { handle: "montagepasten", label: "Montagepasten" },
      { handle: "dichten-sichern", label: "Dichten & Sichern" },
      { handle: "handreinigung", label: "Handreinigung" },
      { handle: "werkstatt-reiniger", label: "Reiniger" },
    ],
  },
  {
    handle: "sets-sonstiges",
    label: "Sets & Sonstiges",
    children: [],
  },
];

export const kategoriePfad = (handle: string) => `/kategorie/${handle}`;

/** Findet eine Haupt- oder Unterkategorie samt Elternteil. */
export function findCategory(handle: string):
  | { type: "main"; main: MainCategory }
  | { type: "sub"; main: MainCategory; sub: SubCategory }
  | null {
  for (const main of SHOP_CATEGORIES) {
    if (main.handle === handle) return { type: "main", main };
    const sub = main.children.find((c) => c.handle === handle);
    if (sub) return { type: "sub", main, sub };
  }
  return null;
}

export type CollectionSort = "empfohlen" | "preis-auf" | "preis-ab" | "name" | "neu";

export const COLLECTION_SORTS: Array<{
  value: CollectionSort;
  label: string;
  sortKey: "COLLECTION_DEFAULT" | "PRICE" | "TITLE" | "CREATED";
  reverse: boolean;
}> = [
  { value: "empfohlen", label: "Empfohlen", sortKey: "COLLECTION_DEFAULT", reverse: false },
  { value: "preis-auf", label: "Preis aufsteigend", sortKey: "PRICE", reverse: false },
  { value: "preis-ab", label: "Preis absteigend", sortKey: "PRICE", reverse: true },
  { value: "name", label: "Name A–Z", sortKey: "TITLE", reverse: false },
  { value: "neu", label: "Neueste", sortKey: "CREATED", reverse: true },
];
