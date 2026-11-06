/** Zielposition für den Anfang der Produktliste. null = schon darüber, nicht nach unten springen. */
export function produktanfangZiel(scrollY, oben, abstand) {
  const y = Number(scrollY) || 0;
  const ziel = Math.max(0, (Number(oben) || 0) - (Number(abstand) || 0));
  if (y <= ziel + 2) return null;
  return ziel;
}
