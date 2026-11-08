/**
 * Einsatz im Arbeitsablauf.
 * Die Leiste zeigt die Kette der Kategorie. Gold markiert nur Schritte,
 * die sich aus Produktart, Kategorie-Tag, Titel oder dem optionalen
 * Metafeld custom.prozess_schritte sicher ergeben.
 * Sets übernehmen die Schritte der enthaltenen Artikel, nicht eine feste Liste.
 */

const GENERISCH = new Set(["reiniger", "wasch", "foam", "shampoo", "oel", "oil", "glas", "glass"]);

const STOP = new Set([
  "ml", "mm", "cm", "liter", "stk", "stueck", "karton", "blau", "grau", "schwarz",
  "weiss", "rot", "gelb", "pro", "und", "fuer", "mit", "von", "der", "die", "das",
  "ein", "eine", "im", "in", "aus", "zum", "zur", "standard", "autopflege", "original",
  "neu", "set", "shop",
]);

export const PROZESSE = {
  lackieren: {
    label: "Lackierprozess",
    kategorieTags: ["Kategorie: Lackierbedarf"],
    schritte: [
      { id: "schleifen", wort: "Schleifen", tip: "Untergrund und Zwischenschliff." },
      { id: "reinigen", wort: "Reinigen", tip: "Entfetten / Silikonentferner vor dem Lackaufbau." },
      { id: "spachteln", wort: "Spachteln", tip: "Unebenheiten ausgleichen." },
      { id: "fuellern", wort: "Füllern", tip: "Grundierung und Füller auftragen." },
      { id: "basislack", wort: "Basislack", tip: "Farbton auftragen." },
      { id: "klarlack", wort: "Klarlack", tip: "Schutz- und Glanzschicht." },
      { id: "polieren", wort: "Polieren", tip: "Finish nach dem Lackieren." },
    ],
    regeln: [
      { wenn: { productTypes: ["Schleifmittel"] }, markiere: ["schleifen"] },
      { wenn: { tagsAny: ["Silikonentferner"], titleRegex: "silikonentferner" }, markiere: ["reinigen"] },
      { wenn: { productTypes: ["Abdecken"] }, markiere: ["reinigen"] },
      { wenn: { productTypes: ["Spachtel"] }, markiere: ["spachteln"] },
      { wenn: { productTypes: ["Grundierung & Füller"] }, markiere: ["fuellern"] },
      { wenn: { productTypes: ["Wunschfarbe & Lackstift"] }, markiere: ["basislack"] },
      { wenn: { productTypes: ["Klarlack"] }, markiere: ["klarlack"] },
      { wenn: { productTypes: ["Politur & Schleifpaste"], kategorie: "Lackierbedarf" }, markiere: ["polieren"] },
      { wenn: { productTypes: ["Härter"] }, markiere: ["fuellern", "klarlack"] },
      { wenn: { productTypes: ["Verdünnung & Zusätze"], titleNotRegex: "silikonentferner" }, markiere: ["fuellern", "klarlack", "basislack"] },
      { wenn: { productTypes: ["Lackierpistolen & Zubehör"] }, markiere: ["fuellern", "basislack", "klarlack"] },
      { wenn: { productTypes: ["Verbrauchsmaterial"] }, markiere: ["fuellern", "basislack", "klarlack"] },
    ],
  },
  oelwechsel: {
    label: "Ölwechsel",
    kategorieTags: ["Kategorie: Öle"],
    schritte: [
      { id: "ablassen", wort: "Ablassen", tip: "Altöl ablassen." },
      { id: "filter", wort: "Filter", tip: "Ölfilter wechseln." },
      { id: "einfuellen", wort: "Einfüllen", tip: "Frischöl einfüllen." },
      { id: "kontrollieren", wort: "Kontrollieren", tip: "Stand und Dichtheit prüfen." },
    ],
    regeln: [
      { wenn: { productTypes: ["Motoröl"] }, markiere: ["einfuellen"] },
      { wenn: { productTypes: ["Filter"], titleRegex: "öl|oel|oil" }, markiere: ["filter"] },
      { wenn: { productTypes: ["Filter"] }, markiere: ["filter"] },
    ],
  },
  getriebe: {
    label: "Getriebeöl",
    kategorieTags: ["Kategorie: Öle"],
    productTypes: ["Getriebeöl"],
    schritte: [
      { id: "ablassen", wort: "Ablassen", tip: "Altöl ablassen (je Getriebe)." },
      { id: "einfuellen", wort: "Einfüllen", tip: "Freigegebenes Getriebeöl einfüllen." },
      { id: "kontrollieren", wort: "Kontrollieren", tip: "Niveau und Dichtheit prüfen." },
    ],
    regeln: [
      { wenn: { productTypes: ["Getriebeöl"] }, markiere: ["einfuellen"] },
    ],
  },
  autopflege: {
    label: "Fahrzeugwäsche & Pflege",
    kategorieTags: ["Kategorie: Autopflege & Detailing"],
    schritte: [
      { id: "vorwaesche", wort: "Vorwäsche", tip: "Groben Schmutz lösen." },
      { id: "felgen", wort: "Felgen", tip: "Felgen reinigen." },
      { id: "waesche", wort: "Wäsche", tip: "Shampoo und Waschen." },
      { id: "trocknen", wort: "Trocknen", tip: "Abtrocknen ohne Wasserflecken." },
      { id: "versiegeln", wort: "Versiegeln", tip: "Schutz / Detailer / Wachs." },
      { id: "innenraum", wort: "Innenraum", tip: "Innen reinigen und pflegen." },
      { id: "scheiben", wort: "Scheiben", tip: "Glas reinigen / versiegeln." },
    ],
    regeln: [
      { wenn: { productTypes: ["Felgen & Reifen"] }, markiere: ["felgen"] },
      { wenn: { productTypes: ["Waschzubehör", "Schwämme", "Bürsten & Pinsel"] }, markiere: ["waesche"] },
      { wenn: { productTypes: ["Trocknen & Leder", "Mikrofasertücher"] }, markiere: ["trocknen"] },
      { wenn: { productTypes: ["Politur & Schleifpaste", "Poliermaschinen & Pads"] }, markiere: ["versiegeln"] },
      { wenn: { productTypes: ["Pflegemittel & Versiegelung"], titleRegex: "shampoo|wasch|foam|reiniger" }, markiere: ["waesche"] },
      { wenn: { productTypes: ["Pflegemittel & Versiegelung"], titleRegex: "felge" }, markiere: ["felgen"] },
      { wenn: { productTypes: ["Pflegemittel & Versiegelung"], titleRegex: "scheibe|glas|glass" }, markiere: ["scheiben"] },
      { wenn: { productTypes: ["Pflegemittel & Versiegelung"], titleRegex: "innen|cockpit|leder|plastic" }, markiere: ["innenraum"] },
      { wenn: { productTypes: ["Pflegemittel & Versiegelung"] }, markiere: ["versiegeln"] },
    ],
  },
  winter: {
    label: "Wintereinsatz",
    kategorieTags: ["Kategorie: Winter"],
    schritte: [
      { id: "kratzen", wort: "Kratzen", tip: "Eis mechanisch entfernen." },
      { id: "enteisen", wort: "Enteisen", tip: "Enteiser / Frostschutz." },
      { id: "sicht", wort: "Sicht", tip: "Scheiben und Spiegel freimachen." },
    ],
    regeln: [
      { wenn: { productTypes: ["Eiskratzer & Schneebesen"] }, markiere: ["kratzen"] },
      { wenn: { productTypes: ["Enteiser & Frostschutz"] }, markiere: ["enteisen"] },
    ],
  },
  werkstattchemie: {
    label: "Werkstattarbeit",
    kategorieTags: ["Kategorie: Werkstattchemie"],
    schritte: [
      { id: "loesen", wort: "Lösen", tip: "Rostlöser / Multifunktion." },
      { id: "reinigen", wort: "Reinigen", tip: "Bremsen- / Teile reinigen." },
      { id: "schmieren", wort: "Schmieren", tip: "Schmier- und Gleitsprays." },
      { id: "sichern", wort: "Sichern", tip: "Dichten und Sichern." },
      { id: "schuetzen", wort: "Schützen", tip: "Unterboden / Hohlraum." },
    ],
    regeln: [
      { wenn: { productTypes: ["Rostlöser & Multifunktion"] }, markiere: ["loesen"] },
      { wenn: { productTypes: ["Bremsenreiniger", "Reiniger"] }, markiere: ["reinigen"] },
      { wenn: { productTypes: ["Schmier- & Gleitsprays", "Montagepasten"] }, markiere: ["schmieren"] },
      { wenn: { productTypes: ["Dichten & Sichern", "Kontakt & Elektrik"] }, markiere: ["sichern"] },
      { wenn: { productTypes: ["Unterboden & Hohlraum"] }, markiere: ["schuetzen"] },
    ],
  },
};

function norm(wert) {
  return String(wert || "")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

function ohneKlammer(wert) {
  return String(wert || "").replace(/\([^)]*\)/g, " ");
}

function wortliste(wert) {
  return ohneKlammer(wert)
    .toLowerCase()
    .split(/[^a-z0-9äöüß]+/i)
    .filter((teil) => {
      if (!teil || /^\d$/.test(teil)) return false;
      const n = norm(teil);
      if (STOP.has(n)) return false;
      return teil.length >= 3 || (teil.length >= 2 && /\d/.test(teil));
    });
}

function altTrifft(text, alt) {
  const n = norm(text);
  const a = norm(alt);
  if (!a) return false;
  let i = 0;
  while ((i = n.indexOf(a, i)) >= 0) {
    const nach = n.slice(i + a.length);
    if (a === "glas" && nach.startsWith("urit")) {
      i += a.length;
      continue;
    }
    return true;
  }
  return false;
}

function regexTreffer(titel, regex) {
  return String(regex || "")
    .split("|")
    .map((alt) => alt.trim())
    .filter((alt) => alt && altTrifft(titel, alt));
}

function tokenDrin(titel, token) {
  const t = norm(token);
  if (!t) return false;
  if (/^\d+$/.test(t)) return new RegExp(`(?:^|\\D)${t}(?:\\D|$)`).test(norm(titel));
  return altTrifft(titel, token);
}

function tagsVon(produkt) {
  return Array.isArray(produkt?.tags) ? produkt.tags : [];
}

function metafeldWert(produkt) {
  const roh = produkt?.prozessSchritte;
  if (roh == null || roh === "") return null;
  if (typeof roh === "string") return roh;
  if (typeof roh === "object" && roh.value) return String(roh.value);
  return null;
}

export function schritteAusMetafeld(wert) {
  const text = String(wert || "").trim();
  if (!text) return [];
  let teile = [];
  if (text.startsWith("[")) {
    try {
      const json = JSON.parse(text);
      if (Array.isArray(json)) teile = json.map((x) => String(x));
    } catch {
      teile = [];
    }
  }
  if (!teile.length) teile = text.split(/[,;\n|]+/);
  const bekannt = new Set(Object.values(PROZESSE).flatMap((p) => p.schritte.map((s) => s.id)));
  const aus = [];
  for (const teil of teile) {
    const id = norm(teil).replace(/[^a-z0-9]/g, "");
    if (bekannt.has(id) && !aus.includes(id)) aus.push(id);
  }
  return aus;
}

function typOk(regel, produkt) {
  const typen = regel.wenn.productTypes;
  if (!typen?.length) return true;
  return typen.includes(produkt.productType || "");
}

function katOk(regel, produkt) {
  if (!regel.wenn.kategorie) return true;
  return tagsVon(produkt).includes(`Kategorie: ${regel.wenn.kategorie}`);
}

function tagsOk(regel, produkt) {
  const any = regel.wenn.tagsAny;
  if (!any?.length) return true;
  const tags = tagsVon(produkt).map((t) => t.toLowerCase());
  return any.some((t) => tags.includes(String(t).toLowerCase()));
}

function titleNotOk(regel, produkt) {
  if (!regel.wenn.titleNotRegex) return true;
  return regexTreffer(produkt.title || "", regel.wenn.titleNotRegex).length === 0;
}

function regelnVon(ketteId) {
  return (PROZESSE[ketteId]?.regeln || []).filter((r) => !(r.wenn.productTypes || []).includes("Sets"));
}

function spezifischste(treffer) {
  const speziell = treffer.filter((t) => t.alts.some((a) => !GENERISCH.has(norm(a))));
  const pool = (speziell.length ? speziell : treffer).slice();
  pool.sort((a, b) => {
    const na = String(a.r.wenn.titleRegex).split("|").length;
    const nb = String(b.r.wenn.titleRegex).split("|").length;
    if (na !== nb) return na - nb;
    const la = Math.max(...a.alts.map((x) => norm(x).length));
    const lb = Math.max(...b.alts.map((x) => norm(x).length));
    return lb - la;
  });
  return pool[0] || null;
}

function schritteIn(ketteId, produkt) {
  const regeln = regelnVon(ketteId);
  const titleTreffer = [];
  for (const regel of regeln) {
    if (!regel.wenn.titleRegex) continue;
    if (!typOk(regel, produkt) || !katOk(regel, produkt) || !titleNotOk(regel, produkt)) continue;
    const alts = regexTreffer(produkt.title || "", regel.wenn.titleRegex);
    if (alts.length) titleTreffer.push({ r: regel, alts });
  }
  const beste = spezifischste(titleTreffer);
  if (beste) return beste.r.markiere.slice();

  for (const regel of regeln) {
    if (!regel.wenn.tagsAny?.length) continue;
    if (!tagsOk(regel, produkt) || !typOk(regel, produkt) || !katOk(regel, produkt) || !titleNotOk(regel, produkt)) continue;
    return regel.markiere.slice();
  }

  const typTreffer = regeln.filter((regel) => {
    if (!regel.wenn.productTypes?.length || regel.wenn.titleRegex || regel.wenn.tagsAny) return false;
    return typOk(regel, produkt) && katOk(regel, produkt) && titleNotOk(regel, produkt);
  });
  if (!typTreffer.length) return null;
  const erste = typTreffer[0].markiere.join("\0");
  if (typTreffer.every((r) => r.markiere.join("\0") === erste)) return typTreffer[0].markiere.slice();
  return null;
}

function ketteWaehlen(produkt) {
  const tags = tagsVon(produkt);
  const typ = produkt.productType || "";
  let ketten = Object.entries(PROZESSE).filter(([, p]) => (p.kategorieTags || []).some((k) => tags.includes(k)));
  if (ketten.length > 1) {
    const explizit = ketten.filter(([, p]) => (p.productTypes || []).includes(typ));
    if (explizit.length === 1) ketten = explizit;
    else {
      const offen = ketten.filter(([, p]) => !(p.productTypes || []).length || p.productTypes.includes(typ));
      if (offen.length) ketten = offen;
    }
  }
  if (ketten.length > 1) {
    const mit = ketten.filter(([id]) => schritteIn(id, produkt)?.length);
    if (mit.length === 1) ketten = mit;
    else return null;
  }
  if (ketten.length === 1) return ketten[0][0];
  const mit = Object.keys(PROZESSE).filter((id) => schritteIn(id, produkt)?.length);
  return mit.length === 1 ? mit[0] : null;
}

function kettenMitSchritten(ids, produkt) {
  let liste = Object.keys(PROZESSE).filter((id) => ids.every((schritt) => PROZESSE[id].schritte.some((s) => s.id === schritt)));
  if (liste.length <= 1) return liste;
  const tags = tagsVon(produkt);
  const typ = produkt.productType || "";
  const nachKat = liste.filter((id) => PROZESSE[id].kategorieTags.some((k) => tags.includes(k)));
  if (nachKat.length) liste = nachKat;
  if (liste.length <= 1) return liste;
  const explizit = liste.filter((id) => (PROZESSE[id].productTypes || []).includes(typ));
  if (explizit.length === 1) return explizit;
  const offen = liste.filter((id) => !(PROZESSE[id].productTypes || []).length || PROZESSE[id].productTypes.includes(typ));
  return offen.length ? offen : liste;
}

function baue(ketteId, markiert) {
  const prozess = PROZESSE[ketteId];
  if (!prozess) return null;
  const erlaubt = new Set(prozess.schritte.map((s) => s.id));
  const hier = prozess.schritte.map((s) => s.id).filter((id) => markiert.includes(id) && erlaubt.has(id));
  if (!hier.length) return null;
  return {
    id: ketteId,
    label: prozess.label,
    schritte: prozess.schritte.map((s) => ({ id: s.id, wort: s.wort, tip: s.tip })),
    markiert: hier,
  };
}

export function istSet(produkt) {
  return (produkt?.productType || "") === "Sets";
}

function ketteHinweis(tags) {
  const namen = new Set(tags.map((t) => t.toLowerCase()));
  if (namen.has("smart repair") || namen.has("lackierbedarf")) return "lackieren";
  if (namen.has("winter")) return "winter";
  if (namen.has("waschen") || namen.has("autopflege")) return "autopflege";
  if (namen.has("werkstattchemie")) return "werkstattchemie";
  return null;
}

/** Tücher und Abdeckband begleiten einen Schritt, sie eröffnen ihn nicht. */
const ZUBEHOER = new Set(["Abdecken", "Verbrauchsmaterial"]);

function schritteDerInhalte(cur) {
  return [...cur.haupt];
}

function einsatzAusInhalten(produkt, inhalte) {
  const je = new Map();
  for (const teil of inhalte || []) {
    if (!teil || istSet(teil)) continue;
    const erg = einsatzFuer(teil);
    if (!erg) continue;
    const cur = je.get(erg.id) || { n: 0, haupt: new Set() };
    cur.n += 1;
    const haupt = !ZUBEHOER.has(teil.productType || "") && erg.markiert.length === 1;
    if (haupt) {
      for (const id of erg.markiert) cur.haupt.add(id);
    }
    je.set(erg.id, cur);
  }
  const belegt = [...je].filter(([, cur]) => cur.haupt.size);
  if (!belegt.length) return null;
  const hint = ketteHinweis(tagsVon(produkt));
  if (hint && je.get(hint)?.haupt.size) return baue(hint, schritteDerInhalte(je.get(hint)));
  if (belegt.length === 1) return baue(belegt[0][0], schritteDerInhalte(belegt[0][1]));
  let bestId = null;
  let bestN = -1;
  let gleich = false;
  for (const [id, cur] of belegt) {
    if (cur.n > bestN) {
      bestId = id;
      bestN = cur.n;
      gleich = false;
    } else if (cur.n === bestN) gleich = true;
  }
  if (gleich || !bestId) return null;
  return baue(bestId, schritteDerInhalte(je.get(bestId)));
}

/**
 * Set-Zeile ohne Katalogtreffer, wenn der Text den Schritt selbst nennt
 * (zum Beispiel „Wunschfarbe-Spraydose … Basislack“).
 */
export function produktAusZeile(titel) {
  const n = norm(titel);
  const lack = ["Kategorie: Lackierbedarf"];
  if (!n) return null;
  if (n.includes("klarlack")) return { title: titel, productType: "Klarlack", tags: lack };
  if (n.includes("wunschfarbe") || n.includes("basislack")) {
    return { title: titel, productType: "Wunschfarbe & Lackstift", tags: lack };
  }
  if (n.includes("silikonentferner")) {
    return { title: titel, productType: "Verdünnung & Zusätze", tags: [...lack, "Silikonentferner"] };
  }
  if (n.includes("schleifschwamm") || n.includes("schleifpapier")) {
    return { title: titel, productType: "Schleifmittel", tags: lack };
  }
  if (n.includes("abdeckband") || n.includes("abdeckpapier")) {
    return { title: titel, productType: "Abdecken", tags: lack };
  }
  if (n.includes("staubbind")) return { title: titel, productType: "Verbrauchsmaterial", tags: lack };
  if (n.includes("grundierfueller") || /\bfueller\b/.test(n) || /\bfiller\b/.test(n)) {
    return { title: titel, productType: "Grundierung & Füller", tags: lack };
  }
  return null;
}

/** Zuordnung für eine Produktseite. Ohne sicheren Schritt: null. */
export function einsatzFuer(produkt, inhalte) {
  if (!produkt) return null;
  const roh = metafeldWert(produkt);
  if (roh != null && String(roh).trim()) {
    const ids = schritteAusMetafeld(roh);
    if (ids.length) {
      const ketten = kettenMitSchritten(ids, produkt);
      if (ketten.length !== 1) return null;
      return baue(ketten[0], ids);
    }
  }
  if (istSet(produkt)) {
    if (!Array.isArray(inhalte)) return null;
    return einsatzAusInhalten(produkt, inhalte);
  }
  const kette = ketteWaehlen(produkt);
  if (!kette) return null;
  const markiert = schritteIn(kette, produkt);
  if (!markiert?.length) return null;
  return baue(kette, markiert);
}

function inhaltsteil(titel) {
  return titel
    .replace(/\s+/g, " ")
    .replace(/\s+(grundierung und füller|nicht enthalten|falls die|bitte ).*/i, "")
    .replace(/[.,;:]+$/g, "")
    .trim();
}

/** Artikelzeilen aus „Im Set enthalten“, ohne Preise, Einleitung und Nachsatz. */
export function setInhaltTitel(text) {
  const roh = String(text || "");
  const start = roh.search(/im set enthalten/i);
  if (start < 0) return [];
  let rest = roh.slice(start);
  const ende = rest.search(/\b(nicht im set|nicht enthalten|falls die|einzelpreis|kurze anleitung|grundierung und füller)\b/i);
  if (ende > 0) rest = rest.slice(0, ende);
  const aus = [];
  const re = /\d+\s*[×x]\s*(.+?)\s*[–—-]\s*\d+[.,]\d{2}\s*€/gi;
  let treffer;
  while ((treffer = re.exec(rest))) {
    const titel = inhaltsteil(treffer[1]);
    if (titel) aus.push(titel);
  }
  if (aus.length) return aus;
  for (const teil of rest.split(/\d+\s*[×x]\s*/i)) {
    const titel = inhaltsteil(teil);
    if (!titel || /^im set enthalten$/i.test(titel)) continue;
    aus.push(titel);
  }
  return aus;
}

/** Storefront-Suche für eine Inhaltszeile. Kurz, damit der Katalogfilter passt. */
export function suchanfrage(titel) {
  const toks = wortliste(titel);
  const sortiert = [...toks].sort((a, b) => b.length - a.length || a.localeCompare(b, "de"));
  const a = sortiert[0];
  const b = sortiert.find((t) => t !== a);
  if (!a) return "";
  const eng = b ? `title:*${a}* AND title:*${b}*` : `title:*${a}*`;
  return eng.length <= 170 ? eng : `title:*${a}*`;
}

/** Passenden Katalogartikel zur Inhaltszeile. Lieber keiner als ein falscher. */
export function besterTreffer(titel, kandidaten) {
  const braucht = wortliste(titel);
  const pflicht = braucht.filter((t) => t.length >= 4 && !/^\d+$/.test(t));
  const muss = pflicht.length ? pflicht : braucht.filter((t) => !/^\d+$/.test(t));
  if (!muss.length) return null;
  let best = null;
  let bestScore = -1;
  let bestLen = Infinity;
  for (const kandidat of kandidaten || []) {
    if (!kandidat?.title || kandidat.productType === "Sets") continue;
    if (muss.some((t) => !tokenDrin(kandidat.title, t))) continue;
    const score = braucht.filter((t) => tokenDrin(kandidat.title, t)).length;
    if (score > bestScore || (score === bestScore && kandidat.title.length < bestLen)) {
      best = kandidat;
      bestScore = score;
      bestLen = kandidat.title.length;
    }
  }
  return best;
}
