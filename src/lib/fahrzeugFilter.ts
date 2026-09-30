import { FAHRZEUGE, preisSpanne, tuevAbgelaufen, tuevDatum, type Fahrzeug } from "@/data/fahrzeuge";

/* ── Formate ─────────────────────────────────────────────────────── */

export const euro = (n: number) => n.toLocaleString("de-DE") + " €";
export const km = (n: number) => (n > 0 ? n.toLocaleString("de-DE") + " km" : "km auf Anfrage");

/** Nach außen zeigen wir eine Spanne statt des genauen Preises. */
export function preisText(f: Fahrzeug): string {
  const s = preisSpanne(f);
  return s ? `${s.von.toLocaleString("de-DE")} – ${euro(s.bis)}` : euro(f.preis);
}

/* ── Karosserie-Kategorien ───────────────────────────────────────── */

export type Kategorie =
  | "Kleinwagen" | "Kompakt" | "Limousine" | "Kombi" | "SUV" | "Cabrio" | "Coupé" | "Van & Transporter";

const BAUART_ZU_KATEGORIE: Record<string, Kategorie> = {
  "Kleinwagen": "Kleinwagen",
  "Kompaktwagen": "Kompakt",
  "Sportlicher Kompaktwagen": "Kompakt",
  "Limousine": "Limousine",
  "Kombi": "Kombi",
  "SUV": "SUV",
  "Cabrio": "Cabrio",
  "Coupé / Sportback": "Coupé",
  "Van": "Van & Transporter",
  "Hochdachkombi": "Van & Transporter",
};

export function kategorieVon(f: Fahrzeug): Kategorie {
  return BAUART_ZU_KATEGORIE[f.bauart] ?? "Kompakt";
}

/* ── Ausstattungs-Merkmale aus den Freitexten ableiten ───────────── */

export type Merkmal = "allrad" | "automatik" | "navi" | "ahk" | "klimaautomatik" | "sitzheizung" | "pdc" | "tuevLang";

const MUSTER: Record<Exclude<Merkmal, "automatik" | "tuevLang">, RegExp> = {
  allrad: /allrad|quattro|4matic|4motion|xdrive|awd/i,
  navi: /navigation/i,
  ahk: /anhängerkupplung/i,
  klimaautomatik: /klimaautomatik/i,
  sitzheizung: /sitzheizung|lenkradheizung/i,
  pdc: /einparkhilfe|pdc|rückfahrkamera|parksensor/i,
};

/** TÜV mindestens ein Jahr gültig — das Argument, das Käufer wirklich interessiert. */
export function tuevLang(f: Fahrzeug, jetzt = new Date()): boolean {
  if (/neu/i.test(f.tuev)) return true;
  const d = tuevDatum(f.tuev);
  if (!d) return false;
  const grenze = new Date(jetzt);
  grenze.setFullYear(grenze.getFullYear() + 1);
  return d >= grenze;
}

export function hatMerkmal(f: Fahrzeug, m: Merkmal): boolean {
  if (m === "automatik") return f.getriebe === "Automatik";
  if (m === "tuevLang") return tuevLang(f);
  const text = [f.variante, f.titel, ...f.ausstattung].join(" · ");
  return MUSTER[m].test(text);
}

export const MERKMAL_LABEL: Record<Merkmal, string> = {
  allrad: "Allradantrieb",
  automatik: "Automatik",
  navi: "Navigationssystem",
  ahk: "Anhängerkupplung",
  klimaautomatik: "Klimaautomatik",
  sitzheizung: "Sitzheizung",
  pdc: "Einparkhilfe / Kamera",
  tuevLang: "TÜV über 1 Jahr",
};

/* ── Filterzustand ───────────────────────────────────────────────── */

export interface Filter {
  kategorien: Kategorie[];
  marken: string[];
  kraftstoffe: string[];
  getriebe: string[];
  merkmale: Merkmal[];
  /** 0 = keine Grenze */
  maxPreis: number;
  /** 0 = egal, sonst Mindestzahl der Sitzplätze */
  minSitze: number;
  /** 0 = egal, sonst höchster Kilometerstand */
  maxKm: number;
  nurGemerkt: boolean;
  nurMietbar: boolean;
}

export const LEERER_FILTER: Filter = {
  kategorien: [], marken: [], kraftstoffe: [], getriebe: [], merkmale: [],
  maxPreis: 0, minSitze: 0, maxKm: 0, nurGemerkt: false, nurMietbar: false,
};

export type Sortierung = "empfohlen" | "preis-auf" | "preis-ab" | "km-auf" | "ez-ab";

export const SORTIERUNGEN: { id: Sortierung; label: string }[] = [
  { id: "empfohlen", label: "Empfohlen" },
  { id: "preis-auf", label: "Preis aufsteigend" },
  { id: "preis-ab", label: "Preis absteigend" },
  { id: "km-auf", label: "Kilometer aufsteigend" },
  { id: "ez-ab", label: "Erstzulassung, neueste zuerst" },
];

/** "06/2011" oder "2013" → vergleichbare Zahl; Unbekanntes ganz nach hinten. */
function ezWert(f: Fahrzeug): number {
  const m = /^(?:(\d{2})\/)?(\d{4})$/.exec(f.erstzulassung.trim());
  if (!m) return 0;
  return Number(m[2]) * 12 + (m[1] ? Number(m[1]) : 6);
}

export function filtern(alle: Fahrzeug[], f: Filter, gemerkt: string[]): Fahrzeug[] {
  return alle.filter((v) => {
    if (f.nurGemerkt && !gemerkt.includes(v.slug)) return false;
    if (f.nurMietbar && !v.mietbar) return false;
    if (f.kategorien.length && !f.kategorien.includes(kategorieVon(v))) return false;
    if (f.marken.length && !f.marken.includes(v.marke)) return false;
    if (f.kraftstoffe.length && !f.kraftstoffe.includes(v.kraftstoff)) return false;
    if (f.getriebe.length && !f.getriebe.includes(v.getriebe)) return false;
    if (f.maxPreis && v.preis > f.maxPreis) return false;
    if (f.minSitze && v.sitze < f.minSitze) return false;
    if (f.maxKm && v.km > 0 && v.km > f.maxKm) return false;
    if (f.merkmale.some((m) => !hatMerkmal(v, m))) return false;
    return true;
  });
}

export function sortieren(liste: Fahrzeug[], s: Sortierung): Fahrzeug[] {
  const a = [...liste];
  if (s === "empfohlen" || s === "preis-ab") a.sort((x, y) => y.preis - x.preis);
  if (s === "preis-auf") a.sort((x, y) => x.preis - y.preis);
  if (s === "km-auf") a.sort((x, y) => (x.km || Infinity) - (y.km || Infinity));
  if (s === "ez-ab") a.sort((x, y) => ezWert(y) - ezWert(x));
  return a;
}

/** Wie viele Fahrzeuge blieben übrig, wenn man genau diesen Wert dazunimmt? */
export function anzahlMit(alle: Fahrzeug[], f: Filter, gemerkt: string[], aenderung: Partial<Filter>): number {
  return filtern(alle, { ...f, ...aenderung }, gemerkt).length;
}

export function filterAktiv(f: Filter): boolean {
  return (
    f.kategorien.length > 0 || f.marken.length > 0 || f.kraftstoffe.length > 0 ||
    f.getriebe.length > 0 || f.merkmale.length > 0 ||
    f.maxPreis > 0 || f.minSitze > 0 || f.maxKm > 0 || f.nurGemerkt || f.nurMietbar
  );
}

/* ── Werte, die es im Bestand tatsächlich gibt ───────────────────── */

export const KATEGORIEN = [...new Set(FAHRZEUGE.map(kategorieVon))]
  .sort((a, b) => a.localeCompare(b, "de")) as Kategorie[];

/** Gibt es überhaupt Mietfahrzeuge? Sonst blenden wir den Filter aus. */
export const GIBT_MIETFAHRZEUGE = FAHRZEUGE.some((f) => f.mietbar);

export const HOECHSTER_PREIS = Math.ceil(Math.max(...FAHRZEUGE.map((f) => f.preis)) * 1.06 / 500) * 500;

/** Repräsentatives Foto je Karosserie — das teuerste Fahrzeug der Klasse. */
export const KATEGORIE_BILD: Record<string, string> = Object.fromEntries(
  KATEGORIEN.map((k) => {
    const beste = FAHRZEUGE.filter((f) => kategorieVon(f) === k).sort((a, b) => b.preis - a.preis)[0];
    return [k, beste?.bild ?? ""];
  })
);

export function anzahlJeKategorie(alle: Fahrzeug[]): Record<string, number> {
  const z: Record<string, number> = {};
  for (const f of alle) z[kategorieVon(f)] = (z[kategorieVon(f)] ?? 0) + 1;
  return z;
}

export { tuevAbgelaufen };
export type { Fahrzeug };
