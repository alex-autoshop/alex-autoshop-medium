export function produktDokument(
  produkt: unknown,
  opts?: { variante?: unknown; jetzt?: Date; bewertungen?: unknown[] },
): {
  title: string;
  description: string;
  canonical: string;
  image: string;
  ogType: string;
  jsonLd: object;
};

export function kategorieDokument(args: {
  handle: string;
  label?: string;
  seo?: string;
  produkte?: Array<{ handle?: string; title?: string }>;
}): {
  title: string;
  description: string;
  canonical: string;
  ogType: string;
  jsonLd: object;
};
