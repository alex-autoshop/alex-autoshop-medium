// Mehrere Marken in einer Liste: nicht als Markenblöcke, sondern nach der
// echten Produktart. Der Typ kommt aus productType, ersatzweise aus einem
// gleichlautenden Schlagwort. Die grobe Obergruppe „Lackierbedarf“ ist keine
// Art. Unklares bleibt Sonstige. Die Größe ordnet nur innerhalb der Art.

import { markenSlug } from "./kundenmarke.js";

/** Obergruppen. Stehen sie als Typ am Produkt, ist die Art noch nicht bekannt. */
const GROB = new Set([
  "Lackierbedarf",
  "Karosserie & Reparatur",
  "Autopflege & Detailing",
  "Öle, Flüssigkeiten & Filter",
  "Winter",
  "Werkstattchemie",
  "Sets & Sonstiges",
]);

/** Bekannte Arten in Werkstatt-Reihenfolge. Alles andere alphabetisch davor, Sonstige zuletzt. */
export const ART_REIHENFOLGE = [
  "Grundierung & Füller",
  "Spachtel",
  "Schleifmittel",
  "Abdecken",
  "Klarlack",
  "Härter",
  "Additiv",
  "Verdünnung",
  "Verdünnung & Zusätze",
  "Reiniger",
  "Lackierpistolen & Zubehör",
  "Maschinen & Werkzeug",
  "Verbrauchsmaterial",
  "Wunschfarbe & Lackstift",
  "Dichten & Kleben",
  "Steinschlag- & Rostschutz",
  "Spezial- & Effektlacke",
  "Motoröl",
  "Getriebeöl",
  "Filter",
];

const BEKANNT = new Set(ART_REIHENFOLGE);

function text(wert) {
  return String(wert || "").replace(/\s+/g, " ").trim();
}

function knoten(produkt) {
  return produkt?.node || produkt || {};
}

/** Produktart. Kein Raten über Wörter im Titel. */
export function produktArt(produkt) {
  const node = knoten(produkt);
  const typ = text(node.productType);
  if (typ && !GROB.has(typ)) return typ;
  const tags = Array.isArray(node.tags) ? node.tags : [];
  for (const tag of tags) {
    const name = text(tag);
    if (BEKANNT.has(name)) return name;
  }
  return "Sonstige";
}

function titel(produkt) {
  return text(knoten(produkt).title);
}

function identitaet(produkt) {
  const node = knoten(produkt);
  return text(node.id) || text(node.handle);
}

/** Erste Mengenangabe, nur zum Sortieren innerhalb einer Art. */
function groesse(roh) {
  const m = String(roh || "").replace(/\u00a0/g, " ").match(/(\d+(?:[.,]\d+)?)\s*(ml|l|g|kg)\b/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  if (!Number.isFinite(n)) return null;
  const einheit = m[2].toLowerCase();
  if (einheit === "l" || einheit === "kg") return n * 1000;
  return n;
}

function markenKey(name) {
  return markenSlug(name) || text(name);
}

function artMischen(liste, markeVon, folge) {
  const eimer = new Map();
  for (const produkt of liste) {
    const key = markenKey(markeVon ? markeVon(produkt) : "");
    if (!eimer.has(key)) eimer.set(key, []);
    eimer.get(key).push(produkt);
  }
  for (const arr of eimer.values()) {
    arr.sort((a, b) => {
      const ga = groesse(titel(a));
      const gb = groesse(titel(b));
      if ((ga == null) !== (gb == null)) return ga == null ? 1 : -1;
      if (ga != null && gb != null && ga !== gb) return ga - gb;
      return titel(a).localeCompare(titel(b), "de");
    });
  }
  const reihe = [];
  for (const name of folge || []) {
    const key = markenKey(name);
    if (eimer.has(key) && !reihe.includes(key)) reihe.push(key);
  }
  for (const key of eimer.keys()) {
    if (!reihe.includes(key)) reihe.push(key);
  }
  const aus = [];
  let offen = true;
  while (offen) {
    offen = false;
    for (const key of reihe) {
      const arr = eimer.get(key);
      if (arr && arr.length) {
        aus.push(arr.shift());
        offen = true;
      }
    }
  }
  return aus;
}

function artRang(art) {
  const i = ART_REIHENFOLGE.indexOf(art);
  return i === -1 ? 1000 : i;
}

/**
 * Volle, schon gefilterte Liste. Mehrere Marken einer Art stehen nebeneinander,
 * kleinere Gebinde vor größeren. Duplikate fallen weg.
 */
export function nachArtMischen(produkte, opts) {
  const markeVon = opts?.markeVon;
  const folge = opts?.markenFolge || [];
  const gesehen = new Set();
  const liste = [];
  for (const produkt of produkte || []) {
    const id = identitaet(produkt);
    if (!id || gesehen.has(id)) continue;
    gesehen.add(id);
    liste.push(produkt);
  }
  const gruppen = new Map();
  for (const produkt of liste) {
    const art = produktArt(produkt);
    if (!gruppen.has(art)) gruppen.set(art, []);
    gruppen.get(art).push(produkt);
  }
  const arten = [...gruppen.keys()].sort((a, b) => {
    if (a === "Sonstige") return 1;
    if (b === "Sonstige") return -1;
    const ra = artRang(a);
    const rb = artRang(b);
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b, "de");
  });
  const aus = [];
  const kopf = [];
  for (const art of arten) {
    const gemischt = artMischen(gruppen.get(art), markeVon, folge);
    if (!gemischt.length) continue;
    const erster = knoten(gemischt[0]);
    kopf.push({ vorId: text(erster.id), titel: art });
    aus.push(...gemischt);
  }
  return { produkte: aus, gruppen: kopf };
}
