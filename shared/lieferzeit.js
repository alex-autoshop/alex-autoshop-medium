/** Voraussichtliche Lieferzeit in Werktagen. Fehlt eine Angabe, gelten 1–3. */

export const LIEFERZEIT_STANDARD = { min: 1, max: 3 };

export function lieferzahl(wert) {
  if (wert == null || wert === "") return null;
  const n = typeof wert === "number" ? wert : Number(String(wert).trim());
  if (!Number.isFinite(n)) return null;
  const ganz = Math.round(n);
  if (ganz < 0 || ganz > 365) return null;
  return ganz;
}

/** Metafelder custom.lieferzeit_min / custom.lieferzeit_max. Beide müssen da sein. */
export function lieferzeitAusFeldern(felder) {
  if (!felder) return null;
  let minRoh;
  let maxRoh;
  if (Array.isArray(felder)) {
    for (const feld of felder) {
      if (!feld || !feld.key) continue;
      if (feld.key === "lieferzeit_min") minRoh = feld.value;
      if (feld.key === "lieferzeit_max") maxRoh = feld.value;
    }
  } else if (typeof felder === "object") {
    minRoh = felder.lieferzeit_min ?? felder.min;
    maxRoh = felder.lieferzeit_max ?? felder.max;
  }
  const min = lieferzahl(minRoh);
  const max = lieferzahl(maxRoh);
  if (min == null || max == null) return null;
  return min <= max ? { min, max } : { min: max, max: min };
}

/** Variante schlägt das Produkt. Sonst die Standardspanne. */
export function lieferzeitWaehlen(produktFelder, variantenFelder) {
  return lieferzeitAusFeldern(variantenFelder)
    || lieferzeitAusFeldern(produktFelder)
    || { ...LIEFERZEIT_STANDARD };
}

export function lieferzeitText(spanne) {
  const min = spanne.min;
  const max = spanne.max;
  if (min === max) return `${min} Werktag${min === 1 ? "" : "e"}`;
  return `${min}–${max} Werktage`;
}

/** Längste Spanne im Warenkorb: höchstes Minimum und höchstes Maximum. */
export function laengsteLieferzeit(spannen) {
  const liste = (spannen || []).filter((s) => s && lieferzahl(s.min) != null && lieferzahl(s.max) != null);
  if (!liste.length) return { ...LIEFERZEIT_STANDARD };
  return {
    min: Math.max(...liste.map((s) => s.min)),
    max: Math.max(...liste.map((s) => s.max)),
  };
}

export function lieferzeitenVerschieden(spannen) {
  const liste = (spannen || []).filter(Boolean);
  if (liste.length < 2) return false;
  const erst = liste[0];
  return liste.some((s) => s.min !== erst.min || s.max !== erst.max);
}
