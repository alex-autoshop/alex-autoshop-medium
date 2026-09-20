/**
 * Fahrzeugakte — was an DIESEM Auto schon verbaut wurde.
 *
 * Der stärkste Bindungseffekt im Teilefinder Pro: Wer zwei Jahre Historie
 * drin hat, sucht nicht woanders. Jede Position, die aus dem Teilefinder in
 * den Warenkorb wandert, landet automatisch in der Akte des Fahrzeugs.
 *
 * Bewusst zuerst LOKAL im Browser: kein Konto nötig, keine Tabelle, kein
 * Datenschutz-Thema. Die Akte gehört dem Betrieb, der sie anlegt. Sobald wir
 * Team-Konten bauen, wandert dieselbe Struktur auf den Server — die
 * Funktionen hier bleiben gleich, nur der Speicher wechselt.
 */

const KEY = "tf:akte";
const MAX_FAHRZEUGE = 50;
const MAX_JE_FAHRZEUG = 200;

export interface AktenEintrag {
  id: string;
  /** ISO-Zeitpunkt des Eintrags. */
  datum: string;
  name: string;
  brand: string;
  articleNumber: string;
  menge: number;
  preis?: number;
  /** Originalnummer, über die das Teil gefunden wurde. */
  ueberOe?: string;
  notiz?: string;
}

export interface Fahrzeugakte {
  vin: string;
  label: string;
  eintraege: AktenEintrag[];
}

type Speicher = Record<string, Fahrzeugakte>;

const schluessel = (vin: string) => (vin || "").trim().toUpperCase();

function lade(): Speicher {
  try {
    const roh = localStorage.getItem(KEY);
    const d = roh ? JSON.parse(roh) : {};
    return d && typeof d === "object" ? (d as Speicher) : {};
  } catch {
    return {};
  }
}

function sichere(s: Speicher) {
  try {
    // Nicht unbegrenzt wachsen lassen — der localStorage ist klein.
    const vins = Object.keys(s);
    if (vins.length > MAX_FAHRZEUGE) {
      const juengste = vins
        .sort((a, b) => (letzterZeitpunkt(s[b]) || "").localeCompare(letzterZeitpunkt(s[a]) || ""))
        .slice(0, MAX_FAHRZEUGE);
      s = Object.fromEntries(juengste.map((v) => [v, s[v]]));
    }
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* voller oder gesperrter Speicher — dann eben keine Akte */
  }
}

const letzterZeitpunkt = (a?: Fahrzeugakte) => a?.eintraege?.[0]?.datum || "";

export function akteLesen(vin: string): Fahrzeugakte | null {
  const k = schluessel(vin);
  if (!k) return null;
  return lade()[k] ?? null;
}

export function akteListe(): Fahrzeugakte[] {
  return Object.values(lade()).sort((a, b) =>
    (letzterZeitpunkt(b) || "").localeCompare(letzterZeitpunkt(a) || ""));
}

export function akteEintragen(
  vin: string,
  label: string,
  teil: Omit<AktenEintrag, "id" | "datum">,
): Fahrzeugakte | null {
  const k = schluessel(vin);
  if (!k || !teil.articleNumber) return null;
  const s = lade();
  const akte: Fahrzeugakte = s[k] ?? { vin: k, label, eintraege: [] };
  akte.label = label || akte.label;

  // Dasselbe Teil am selben Tag nicht doppelt — nur die Menge hochzählen.
  const heute = new Date().toISOString().slice(0, 10);
  const gleich = akte.eintraege.find(
    (e) =>
      e.articleNumber === teil.articleNumber &&
      e.brand === teil.brand &&
      e.datum.slice(0, 10) === heute,
  );
  if (gleich) {
    gleich.menge += teil.menge;
  } else {
    akte.eintraege.unshift({
      ...teil,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      datum: new Date().toISOString(),
    });
  }
  akte.eintraege = akte.eintraege.slice(0, MAX_JE_FAHRZEUG);
  s[k] = akte;
  sichere(s);
  return akte;
}

export function akteEintragLoeschen(vin: string, id: string): Fahrzeugakte | null {
  const k = schluessel(vin);
  const s = lade();
  const akte = s[k];
  if (!akte) return null;
  akte.eintraege = akte.eintraege.filter((e) => e.id !== id);
  s[k] = akte;
  sichere(s);
  return akte;
}

export function akteNotiz(vin: string, id: string, notiz: string): Fahrzeugakte | null {
  const k = schluessel(vin);
  const s = lade();
  const akte = s[k];
  if (!akte) return null;
  const e = akte.eintraege.find((x) => x.id === id);
  if (e) e.notiz = notiz;
  s[k] = akte;
  sichere(s);
  return akte;
}
