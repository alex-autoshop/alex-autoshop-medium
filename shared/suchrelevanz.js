/**
 * Freitextsuche in der Teilebörse: nur die gesuchte Artikelart nach vorn,
 * und bei einem Diesel kein Zündkerzen-Wirrwarr.
 *
 * "Zündkerzen" darf Glühkerze, Impulsgeber und Nockenwellensensor nicht
 * als Treffer behandeln. "Zünd-/Glühanlage" teilt sich nur die Silbe "Zünd"
 * und ist deshalb keine Kategorie für diese Suche.
 */

export function falten(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function stamm(wort) {
  const w = String(wort || "").replace(/ /g, "");
  if (w.length < 5) return w;
  for (const end of ["ern", "en", "er", "es", "e", "n", "s"]) {
    if (w.endsWith(end) && w.length - end.length >= 4) return w.slice(0, -end.length);
  }
  return w;
}

export function suchStamm(query) {
  return stamm(falten(query).replace(/ /g, ""));
}

function woerter(text) {
  return falten(text).split(" ").filter((w) => w.length >= 3);
}

/** Gleicher Gattungsbegriff, oder ein Satz/Set davon. Nicht die Nachbarsorte. */
function wortTrifft(wort, q) {
  const s = stamm(wort);
  if (s === q) return true;
  if (!s.startsWith(q)) return false;
  const rest = s.slice(q.length);
  return rest === "" || /^(satz|set|kit)$/.test(rest);
}

/**
 * true, wenn Name oder Kategorie die gesuchte Artikelart ist.
 * Kurze Begriffe ("Bremse", "Filter") sortieren nichts aus — dafür ist der
 * Begriff zu breit. Ab sieben Zeichen im Stamm gilt die exakte Art.
 */
export function istGleicheArtikelart(name, category, query) {
  const q = suchStamm(query);
  if (q.length < 7) return true;
  for (const feld of [name, category]) {
    if (!feld) continue;
    if (woerter(feld).some((w) => wortTrifft(w, q))) return true;
  }
  return false;
}

/** Konkrete Kategorie aus dem Fahrzeugbaum — nicht die Obergruppe "Zünd-". */
export function kategorieIstTreffer(name, query) {
  const q = suchStamm(query);
  if (q.length < 4 || !name) return false;
  const tokens = [];
  for (const wort of woerter(name)) {
    for (const teil of wort.split(" ")) tokens.push(stamm(teil));
  }
  // "Umlenk-/Führungsrolle" → umlenk, fuhrungsrolle
  for (const teil of falten(name).split(" ")) {
    if (teil.length >= 3) tokens.push(stamm(teil));
  }
  if (tokens.some((t) => wortTrifft(t, q))) return true;
  // "umlenkrolle" trifft "Umlenk-/Führungsrolle", "zündkerzen" nicht "Zünd-".
  return tokens.some((t) => t.length >= 6 && q.startsWith(t) && q.length > t.length);
}

export function ordneSuchtreffer(liste, query) {
  const q = suchStamm(query);
  if (!Array.isArray(liste) || q.length < 7) return Array.isArray(liste) ? liste : [];
  return liste.filter((a) => istGleicheArtikelart(a?.name, a?.category, query));
}

export function istDiesel(fuel) {
  return /diesel/i.test(String(fuel || ""));
}

/**
 * Diesel + Zündkerzen: nicht die Nachbarteile der Glühanlage zeigen,
 * sondern auf die passende Art hinweisen.
 */
export function kraftstoffHinweis(fuel, query) {
  if (!istDiesel(fuel)) return null;
  const q = suchStamm(query);
  if (q !== "zuendkerz") return null;
  return {
    text: "Dein Fahrzeug ist ein Diesel – meintest du Glühkerzen?",
    suche: "Glühkerzen",
  };
}
