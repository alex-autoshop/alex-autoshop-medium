// Empfehlungen auf der Produktseite.
// Zuerst gleiche Marke, gleiche Kategorie und Ergänzungen (Härter, Verdünnung,
// Klarlack …). Verlauf und Warenkorb heben Vertrautes an, ersetzen die
// Passung aber nicht. Alles läuft im Browser, nichts wird an Dritte geschickt.

const FAMILIEN = [
  { id: "additiv", muster: /effektadditiv|additiv|zusatz|zusätze|zusaetze|beistoff|mattierung/i },
  { id: "härter", muster: /härter|haerter|hardener/i },
  { id: "verdünnung", muster: /verdünn|verduenn|verdünner|verduenner|thinner/i },
  { id: "klarlack", muster: /klarlack|clearcoat|clear[\s-]?coat/i },
  { id: "grundierung", muster: /grundier|füller|fueller|primer|sealer|haftvermitt/i },
  { id: "spachtel", muster: /spachtel/i },
  { id: "schleif", muster: /schleif/i },
  { id: "basislack", muster: /basislack|wunschfarbe|autolack|mischlack|decklack/i },
  { id: "abdecken", muster: /abdeck|klebeband|maskier/i },
  { id: "politur", muster: /politur|polish|wachs/i },
];

/** Ergänzungen, die ein Lackierer zum Artikel dazu legt. Reihenfolge = Vorrang. */
const ERGAENZT = {
  additiv: ["härter", "verdünnung", "klarlack"],
  härter: ["klarlack", "verdünnung", "additiv", "grundierung"],
  verdünnung: ["härter", "klarlack", "additiv"],
  klarlack: ["härter", "verdünnung", "additiv"],
  grundierung: ["härter", "schleif", "spachtel"],
  spachtel: ["härter", "schleif", "grundierung"],
  schleif: ["grundierung", "spachtel", "politur"],
  basislack: ["klarlack", "härter", "verdünnung", "additiv"],
  abdecken: ["klarlack", "basislack"],
  politur: ["schleif"],
};

/** Shopify-Produkttypen, mit denen wir die Ergänzungen suchen. */
const SHOP_TYP = {
  additiv: ["Additiv"],
  härter: ["Härter"],
  verdünnung: ["Verdünnung", "Verdünnung & Zusätze"],
  klarlack: ["Klarlack"],
  grundierung: ["Füller", "Grundierung & Füller"],
  spachtel: ["Spachtel"],
  schleif: ["Schleifmittel"],
  basislack: ["Basislack", "Wunschfarbe & Lackstift"],
  politur: ["Politur & Schleifpaste"],
  abdecken: ["Abdecken"],
};

const ANZAHL = 12;
const QUOTA_GLEICH = 4;
const QUOTA_ERGAENZUNG = 3;
const QUOTA_SONST = 2;

export function familienVon(text) {
  const roh = String(text || "");
  return FAMILIEN.filter((f) => f.muster.test(roh)).map((f) => f.id);
}

export function kategorieVon(tags) {
  const treffer = (tags || []).find((t) => typeof t === "string" && /^kategorie:/i.test(t));
  return treffer ? treffer.replace(/^kategorie:\s*/i, "").trim() : "";
}

export function kandidatBauen({ handle, title, marke, art, tags, verfuegbar }) {
  const text = `${title || ""} ${art || ""} ${(tags || []).join(" ")}`;
  return {
    handle: handle || "",
    title: title || "",
    marke: marke || "",
    art: art || "",
    kategorie: kategorieVon(tags),
    familien: familienVon(text),
    verfuegbar: verfuegbar !== false,
  };
}

function suchwert(wert) {
  const s = String(wert || "").replace(/"/g, "").trim();
  if (!s) return "";
  return /[\s:&()]/.test(s) ? `"${s}"` : s;
}

function ergaenzungsFamilien(produkt) {
  const aus = [];
  for (const f of produkt.familien || []) {
    for (const ziel of ERGAENZT[f] || []) {
      if ((produkt.familien || []).includes(ziel) || aus.includes(ziel)) continue;
      aus.push(ziel);
    }
  }
  return aus;
}

/** Storefront-Suchanfragen: Marke + Art, dann Ergänzungen, dann Kategorie. */
export function suchanfragen(produkt) {
  const anfragen = [];
  const marke = produkt.marke && produkt.marke !== "Sonstige" ? produkt.marke : "";
  const typen = [];
  const merken = (typ) => {
    if (typ && !typen.includes(typ)) typen.push(typ);
  };
  merken(produkt.art);
  // Je Ergänzung nur der Haupttyp, sonst verdrängt „Verdünnung & Zusätze“ den Klarlack.
  for (const familie of ergaenzungsFamilien(produkt)) merken((SHOP_TYP[familie] || [])[0]);
  if (marke) {
    for (const typ of typen.slice(0, 4)) {
      anfragen.push(`vendor:${suchwert(marke)} product_type:${suchwert(typ)}`);
    }
    anfragen.push(`title:*${marke}*`);
  } else {
    for (const typ of typen.slice(0, 3)) anfragen.push(`product_type:${suchwert(typ)}`);
  }
  if (produkt.kategorie) anfragen.push(`tag:${suchwert(`Kategorie: ${produkt.kategorie}`)}`);
  const einzig = [];
  for (const q of anfragen) if (q && !einzig.includes(q)) einzig.push(q);
  return einzig.slice(0, 6);
}

function gewicht(map, key) {
  if (!map || !key) return 0;
  const w = Number(map[key]) || 0;
  return w > 0 ? w : 0;
}

function familieSchluessel(kandidat, produkt, ergaenzungen) {
  const familien = kandidat.familien || [];
  const gleich = familien.find((f) => (produkt.familien || []).includes(f));
  if (gleich) return gleich;
  const passend = familien.find((f) => ergaenzungen.includes(f));
  if (passend) return passend;
  return familien[0] || "sonst";
}

export function punkteFuer(kandidat, kontext) {
  if (!kandidat?.handle || kandidat.handle === kontext.handle) return 0;
  const produkt = kontext.produkt;
  const ergaenzungen = ergaenzungsFamilien(produkt);
  let s = 0;
  const gleicheMarke = Boolean(kandidat.marke && kandidat.marke === produkt.marke && kandidat.marke !== "Sonstige");
  if (gleicheMarke) s += 60;
  const gleicheFamilie = (kandidat.familien || []).some((f) => (produkt.familien || []).includes(f));
  if (gleicheFamilie) s += 35;
  const ergaenzt = (kandidat.familien || []).some((f) => ergaenzungen.includes(f));
  if (ergaenzt) s += 45;
  if (produkt.kategorie && kandidat.kategorie && produkt.kategorie === kandidat.kategorie) s += 25;
  if (produkt.art && kandidat.art && produkt.art === kandidat.art) s += 20;

  const profil = kontext.profil;
  if (profil && s > 0) {
    s += Math.min(18, gewicht(profil.marken, kandidat.marke) * 6);
    s += Math.min(12, gewicht(profil.kategorien, kandidat.kategorie) * 4);
    for (const f of kandidat.familien || []) s += Math.min(10, gewicht(profil.arten, f) * 3);
  }

  const korb = kontext.warenkorb;
  if (korb && s > 0) {
    if ((korb.marken || []).includes(kandidat.marke)) s += 14;
    if ((kandidat.familien || []).some((f) => (korb.familien || []).includes(f))) s += 8;
    const korbErgaenzt = new Set((korb.familien || []).flatMap((f) => ERGAENZT[f] || []));
    if ((kandidat.familien || []).some((f) => korbErgaenzt.has(f))) s += 16;
    if ((korb.handles || []).includes(kandidat.handle)) s -= 80;
  }

  if (kandidat.verfuegbar === false) s -= 12;
  return s;
}

/**
 * Bis zu 12 Artikel, gemischt: gleiche Art, Härter, Verdünnung, Klarlack …
 * nicht zwölf fast gleiche Gebinde.
 */
export function empfehle(katalog, kontext, limit = ANZAHL) {
  const produkt = kontext?.produkt;
  if (!produkt?.handle) return [];
  const ergaenzungen = ergaenzungsFamilien(produkt);
  const sperre = typeof kontext.sperre === "function" ? kontext.sperre : () => false;
  const bewertet = (katalog || [])
    .filter((k) => k && k.handle && k.handle !== produkt.handle && !sperre(k.handle))
    .map((k) => ({ k, score: punkteFuer(k, { ...kontext, produkt }) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.k.title.localeCompare(b.k.title, "de"));

  const gewaehlt = [];
  const zaehler = {};
  const schon = new Set();

  const dazu = (eintrag, quoteBeachten) => {
    if (schon.has(eintrag.k.handle) || gewaehlt.length >= limit) return;
    const schluessel = familieSchluessel(eintrag.k, produkt, ergaenzungen);
    const quote = (produkt.familien || []).includes(schluessel)
      ? QUOTA_GLEICH
      : ergaenzungen.includes(schluessel)
        ? QUOTA_ERGAENZUNG
        : QUOTA_SONST;
    if (quoteBeachten && (zaehler[schluessel] || 0) >= quote) return;
    zaehler[schluessel] = (zaehler[schluessel] || 0) + 1;
    schon.add(eintrag.k.handle);
    gewaehlt.push(eintrag.k);
  };

  for (const eintrag of bewertet) dazu(eintrag, true);
  for (const eintrag of bewertet) dazu(eintrag, false);
  return gewaehlt;
}

export const EMPFEHLUNGS_ANZAHL = ANZAHL;
