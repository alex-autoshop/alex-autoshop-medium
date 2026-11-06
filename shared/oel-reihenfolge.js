/** Nur diese Shop-Kategorie mischt Öle und Filter. Andere Kategorien bleiben unsortiert. */
export const OEL_KATEGORIE = "oele-fluessigkeiten-filter";

/**
 * Filterpatrone in der Öl-Kategorie: productType, Tags oder Titel enthalten
 * „Filter“ (Ölfilter, Luftfilter, MANN-FILTER, Typ „Filter“).
 * „Filterpapier“ ist Schleifmaterial und zählt nicht.
 */
export function istOelFilter(produkt) {
  const node = produkt && (produkt.node || produkt);
  const teile = [
    node && node.productType,
    node && node.title,
    ...(Array.isArray(node && node.tags) ? node.tags : []),
  ];
  const text = teile.filter(Boolean).join("\n").toLowerCase();
  const ohnePapier = text.replace(/filter[\s-]*papiere?/g, " ");
  return ohnePapier.includes("filter");
}

/** Öle und Flüssigkeiten zuerst, Filter danach. Innerhalb der Gruppe gilt `vergleich`. */
export function oeleVorFiltern(liste, vergleich) {
  const arr = Array.isArray(liste) ? liste.slice() : [];
  const cmp = typeof vergleich === "function" ? vergleich : () => 0;
  arr.sort((a, b) => {
    const gruppe = (istOelFilter(a) ? 1 : 0) - (istOelFilter(b) ? 1 : 0);
    if (gruppe !== 0) return gruppe;
    const rest = cmp(a, b);
    return rest || 0;
  });
  return arr;
}
