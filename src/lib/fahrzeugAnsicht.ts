/**
 * Gesamtansicht des Fahrzeugs — die Zeichnung des KOMPLETTEN Autos, die im
 * Teilefinder erscheint, bevor eine Baugruppe gewählt ist.
 *
 * Woher sie kommt (nachgemessen am 21.09.2026 an 21 Marken im YQ-Katalog):
 *
 *  1. "Karosserie › Gesamtgrafik Karosserieteile" im Gruppenbaum — liefert bei
 *     BMW, Mini, Mercedes, Renault und Volvo die Herstellerzeichnung der
 *     kompletten Karosserie genau dieses Modells (Karosserie-Gerippe, Rohbau …).
 *     Kostet einen Aufruf und nur, wenn es den Knoten gibt.
 *  2. Im Herstellerbaum (Kategorien) die Baugruppe "Karosserie"/"Rohbau" — so
 *     bei VW, Seat, Porsche, Dacia. Nur für diese Marken abgefragt, weil es
 *     anderswo zwei Aufrufe für nichts wären (der Katalog zählt jede Anfrage).
 *  3. Sonst: eigene Zeichnung in der passenden Karosserieform (siehe
 *     FahrzeugZeichnung.tsx) — damit bei JEDER FIN ein Auto erscheint.
 *
 * Angenommen wird nur, was sicher das ganze Auto zeigt. "Rohbau" allein reicht
 * nicht: "VORDERTÜR - ROHBAU" (Opel) ist eine Tür, "INTER COOLER" stand bei
 * Mazda unter "Gesamtgrafik". Lieber die eigene Zeichnung als ein falsches Bild.
 */
import {
  linkTo, yqGroupParts, yqNavigationTree, yqUnits,
  type YqNode, type YqUnitShort, type YqVehicle,
} from "@/lib/yqcat";

export interface Gesamtansicht {
  /** Bild-URL mit %size%-Platzhalter (wie alle YQ-Bilder). */
  bild: string;
  name: string;
  /** Die Baugruppe selbst — damit man die Zeichnung auch öffnen kann. */
  baugruppe: YqUnitShort;
}

/** Zeigt dieser Baugruppen-Name sicher die komplette Karosserie? */
export function istGanzesAuto(name: string): boolean {
  const s = (name || "").toLowerCase().replace(/[=]+/g, " ").replace(/\s+/g, " ").trim();
  // "Karosserie grundiert, ohne Klappen, Türen …" (Seat) ist das ganze Auto —
  // was nach "ohne"/"mit" kommt, zählt deshalb nicht als Einzelteil.
  const kern = s.replace(/\b(ohne|mit|with|without)\b.*$/, "").replace(/[\s,;:.-]+$/, "");
  if (!kern) return false;
  // Einzelteile, auch wenn "Rohbau"/"Karosserie" drinsteht ("VORDERTÜR - ROHBAU")
  if (/t(ü|ue|u)r|door|klappe|haube|hood|\bdach\b|roof|boden|floor|kotfl|fender|stopfen|befestig|kleb|dicht|schraub|niet|klammer|clip|halter|kabel|harness|innen|interior|vorderteil|hinterteil|seitenteil|abschnitt|l(ä|a)ngstr|quertr|blech/.test(kern)) return false;
  return /^\d*\s*(allgemeines\s+)?karosserie( komplett| kpl\.?| grundiert)?( \(.*\))?$|^karosserie-?gerippe$|^rohbau(-?karosserie)?$|^body( shell| in white)?$/.test(kern);
}

/** Marken, deren Herstellerbaum eine Gesamt-Karosserie führt (siehe oben). */
const MIT_KAROSSERIE_IM_HERSTELLERBAUM = /volkswagen|^vw$|seat|cupra|porsche|dacia|renault|skoda|audi/i;

const kinder = (n: YqNode) => n.childs ?? n.children ?? [];

function* alleKnoten(n: YqNode): Generator<YqNode> {
  for (const k of kinder(n)) { yield k; yield* alleKnoten(k); }
}

/* ── Zwischenspeicher: pro Fahrzeug nur einmal fragen ─────────────────── */

const CACHE_KEY = "tf:gesamtansicht:v1";
const CACHE_TAGE = 1; // Bild-Links sind signiert — lieber täglich frisch
const speicher = new Map<string, Gesamtansicht | null>();

function cacheLesen(schluessel: string): Gesamtansicht | null | undefined {
  if (speicher.has(schluessel)) return speicher.get(schluessel);
  try {
    const alles = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") as Record<string, { t: number; a: Gesamtansicht | null }>;
    const e = alles[schluessel];
    if (e && Date.now() - e.t < CACHE_TAGE * 864e5) { speicher.set(schluessel, e.a); return e.a; }
  } catch { /* ohne Speicher eben neu fragen */ }
  return undefined;
}

function cacheSchreiben(schluessel: string, a: Gesamtansicht | null) {
  speicher.set(schluessel, a);
  try {
    const alles = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") as Record<string, { t: number; a: Gesamtansicht | null }>;
    alles[schluessel] = { t: Date.now(), a };
    // nicht endlos wachsen lassen
    const eintraege = Object.entries(alles).sort((x, y) => y[1].t - x[1].t).slice(0, 40);
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(eintraege)));
  } catch { /* egal */ }
}

export function fahrzeugSchluessel(v: YqVehicle | null | undefined, vin?: string): string {
  const attr = (v?.attributes ?? []).map((a) => (a.values ?? [a.value]).join(",")).join("|");
  return [v?.brand, v?.name, v?.model, v?.description, attr.slice(0, 200)].filter(Boolean).join("¦") || String(vin || "");
}

const bildVon = (u: YqUnitShort) => u.imageNames?.find(Boolean) || "";

/**
 * Sucht die Gesamtzeichnung. Höchstens zwei Katalog-Aufrufe, Ergebnis wird
 * gemerkt (auch "gibt es nicht"). Fehler (z. B. "Too many requests") zählen
 * als "gibt es nicht" — dann eben die eigene Zeichnung.
 */
export async function gesamtansichtSuchen(
  vehicle: YqVehicle,
  baum: YqNode | null,
  filterState?: string,
): Promise<Gesamtansicht | null> {
  const schluessel = fahrzeugSchluessel(vehicle);
  const gemerkt = cacheLesen(schluessel);
  if (gemerkt !== undefined) return gemerkt;

  let fund: Gesamtansicht | null = null;
  let sicher = true; // nur ein sicheres "gibt es nicht" wird gemerkt
  const waehle = (units: YqUnitShort[]) => {
    const u = units.find((x) => istGanzesAuto(x.name || "") && bildVon(x));
    return u ? { bild: bildVon(u), name: u.name || "Karosserie", baugruppe: u } : null;
  };

  // 1) Gesamtgrafik im Gruppenbaum
  if (baum) {
    for (const n of alleKnoten(baum)) {
      if (!/gesamtgrafik/i.test(n.name || "")) continue;
      const l = linkTo(n, "getGroupParts") || linkTo(n, "getGroupPartsAll");
      const ul = linkTo(n, "getUnits");
      try {
        if (l) fund = waehle((await yqGroupParts(l.token, l.action === "getGroupPartsAll", filterState)).units);
        else if (ul) fund = waehle((await yqUnits(ul.token, filterState)).units);
      } catch { sicher = false; }
      break;
    }
  }

  // 2) Herstellerbaum — nur bei Marken, wo es sie gibt
  if (!fund && MIT_KAROSSERIE_IM_HERSTELLERBAUM.test(vehicle.brand || "")) {
    const nl = linkTo(vehicle, "getNavigationTree");
    if (nl) {
      try {
        const kat = (await yqNavigationTree(nl.token)).data as YqNode | undefined;
        const karosserie = kinder(kat ?? {}).find(
          (c) => /karosserie|rohbau|aufbau|body/i.test(c.name || "") && !/elektr|innen|interior|seiten|kotfl|t(ü|u)r/i.test(c.name || ""),
        );
        const ul = karosserie && (linkTo(karosserie, "getUnits") ? karosserie : [...alleKnoten(karosserie)].find((k) => linkTo(k, "getUnits")));
        const link = ul ? linkTo(ul, "getUnits") : undefined;
        if (link) fund = waehle((await yqUnits(link.token)).units);
      } catch { sicher = false; }
    }
  }

  if (fund || sicher) cacheSchreiben(schluessel, fund);
  return fund;
}

/* ── Karosserieform für die eigene Zeichnung ─────────────────────────── */

export type Aufbau = "pkw" | "kombi" | "suv" | "transporter";

const TRANSPORTER = /transporter|crafter|sprinter|\bvito\b|v-klasse|citan|transit|tourneo|ducato|boxer|jumper|master|trafic|movano|vivaro|combo|proace|expert|dispatch|jumpy|berlingo|partner|rifter|kangoo|caddy|multivan|california|nv\d|primastar|interstar|talento|daily|\bvan\b|kastenwagen|bus\b/i;
const SUV = /suv|gel(ä|a)nde|\bx[1-7]\b|\bix\b|\bq[2-8]\b|gl[abcesk]\b|g-klasse|\bml\b|tiguan|touareg|t-roc|t-cross|taigo|taos|atlas|kodiaq|karoq|kamiq|ateca|arona|tarraco|formentor|cayenne|macan|kuga|puma|ecosport|edge|explorer|tucson|santa fe|kona|ioniq 5|sportage|sorento|niro|stonic|seltos|juke|qashqai|x-trail|ariya|cx-\d|rav4|land cruiser|c-hr|yaris cross|highlander|xc\d\d|countryman|duster|bigster|captur|kadjar|koleos|austral|arkana|mokka|grandland|crossland|frontera|3008|5008|2008|c5 aircross|c3 aircross|ds ?7|compass|renegade|wrangler|cherokee|range rover|discovery|defender|evoque|velar|forester|outback|xv|vitara|s-cross|jimny|asx|outlander|eclipse cross|tivoli|korando|rexton|500x|\bhr-v\b|\bcr-v\b|\bzr-v\b|nx\b|rx\b|ux\b|levante|stelvio|tonale|e-pace|f-pace|i-pace/i;
const KOMBI = /kombi|variant|avant|touring|estate|combi|\bsw\b|sportwagon|sports ?tourer|break|shooting brake|t-modell|allroad|alltrack|cross country|\bv60\b|\bv90\b|\bv70\b|\bv40\b/i;

/** Karosserieform aus Fahrzeugdaten raten — Aufbau-Angabe schlägt Modellname. */
export function aufbauErkennen(v: YqVehicle | null | undefined, label = ""): Aufbau {
  const attrs = (v?.attributes ?? []).map((a) => `${a.label || a.name || a.code || ""}: ${(a.values ?? [a.value]).join(" ")}`).join(" · ");
  const aufbauAttr = (v?.attributes ?? []).find((a) => /aufbau|karosserie|body|bauart/i.test(`${a.label || ""} ${a.name || ""} ${a.code || ""}`));
  const aufbauText = aufbauAttr ? (aufbauAttr.values ?? [aufbauAttr.value]).join(" ") : "";
  const alles = [v?.type === "COMMERCIAL" ? "transporter" : "", aufbauText, v?.name, v?.model, v?.description, label, attrs].filter(Boolean).join(" · ");
  if (TRANSPORTER.test(aufbauText) || v?.type === "COMMERCIAL") return "transporter";
  if (SUV.test(aufbauText)) return "suv";
  if (KOMBI.test(aufbauText)) return "kombi";
  if (TRANSPORTER.test(alles)) return "transporter";
  if (SUV.test(alles)) return "suv";
  if (KOMBI.test(alles)) return "kombi";
  return "pkw";
}
