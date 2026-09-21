/**
 * Einbauposition eines Teils — vorne/hinten, links/rechts.
 *
 * Steht im Zubehörkatalog als Merkmal "Einbauposition" (z. B. "Vorderachse",
 * "Hinterachse links"), aber NUR in den Artikel-Details, nicht in der
 * Trefferliste. Und dort meist als letztes von 15–20 Merkmalen — deshalb
 * wurde es bisher abgeschnitten und stand nirgends.
 *
 * Geladen wird nur, was man sieht (Zeile im Bild), höchstens vier Abfragen
 * gleichzeitig, jede nur einmal. Das Angebots-Panel nutzt denselben Speicher.
 */
import { useEffect, useState } from "react";
import { apArticleSpecs } from "@/lib/autoparts";

export type Merkmal = { name: string; value: string };

const IST_POSITION = /einbauposition|einbauseite|einbauort|einbaulage/i;

/** "Vorderachse links" → "Vorne links", "Hinterachse" → "Hinten", beides → "Vorne + hinten". */
export function positionKurz(wert: string): string {
  const w = ` ${wert.toLowerCase()} `;
  const vorne = /vorder|vorne|vorn\b|front/.test(w);
  const hinten = /hinter|hinten|\brear\b|heck/.test(w);
  const beide = /beidseitig|beiderseitig/.test(w);
  const links = beide || /links|left/.test(w);
  const rechts = beide || /rechts|right/.test(w);
  const achse = vorne && hinten ? "Vorne + hinten" : vorne ? "Vorne" : hinten ? "Hinten" : "";
  const seite = links && rechts ? "links + rechts" : links ? "links" : rechts ? "rechts" : "";
  if (!achse && !seite) {
    const t = wert.trim();
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  if (!achse) return seite.charAt(0).toUpperCase() + seite.slice(1);
  return seite ? `${achse} ${seite}` : achse;
}

export interface Einbauposition {
  /** Kurz fürs Etikett: "Vorne", "Hinten links" … */
  kurz: string;
  /** Wortlaut aus dem Katalog: "Vorderachse", "Hinterachse links" … */
  lang: string;
}

export function positionAus(merkmale?: Merkmal[]): Einbauposition | null {
  const werte = [...new Set((merkmale ?? []).filter((m) => IST_POSITION.test(m.name) && m.value?.trim()).map((m) => m.value.trim()))];
  if (werte.length === 0) return null;
  const lang = werte.join("; ");
  return { kurz: positionKurz(lang), lang };
}

/** Position nach vorn — damit sie beim Kürzen der Liste nie wegfällt. */
export function positionZuerst(merkmale: Merkmal[]): Merkmal[] {
  return [...merkmale.filter((m) => IST_POSITION.test(m.name)), ...merkmale.filter((m) => !IST_POSITION.test(m.name))];
}

/* ── Laden: gemerkt, höchstens vier gleichzeitig ──────────────────────── */

const speicher = new Map<string, Promise<Merkmal[]>>();
const MAX_GLEICHZEITIG = 4;
let laufend = 0;
const warteschlange: Array<() => void> = [];

async function mitPlatz<T>(fn: () => Promise<T>): Promise<T> {
  if (laufend >= MAX_GLEICHZEITIG) await new Promise<void>((weiter) => warteschlange.push(weiter));
  laufend++;
  try {
    return await fn();
  } finally {
    laufend--;
    warteschlange.shift()?.();
  }
}

/** Alle Merkmale eines Katalogartikels (nur echte Katalog-IDs, keine Lager-SKUs). */
export function merkmaleLaden(artikelId: string | number): Promise<Merkmal[]> {
  const k = String(artikelId ?? "");
  if (!/^\d+$/.test(k)) return Promise.resolve([]);
  let p = speicher.get(k);
  if (!p) {
    p = mitPlatz(() => apArticleSpecs(k)).then((m) => {
      if (m.length === 0) speicher.delete(k); // Störung oder leer: später nochmal
      return m;
    });
    speicher.set(k, p);
  }
  return p;
}

/**
 * Einbauposition zu einem Artikel. Mitgelieferte Merkmale reichen oft nicht
 * (Trefferliste hat keine) — dann wird nachgeladen, sobald `laden` true ist.
 */
export function useEinbauposition(artikelId: string | number, merkmale: Merkmal[] | undefined, laden: boolean): Einbauposition | null {
  const vorab = positionAus(merkmale);
  const [geladen, setGeladen] = useState<Einbauposition | null>(null);
  useEffect(() => {
    setGeladen(null);
    if (vorab || !laden) return;
    let lebt = true;
    merkmaleLaden(artikelId).then((m) => { if (lebt) setGeladen(positionAus(m)); }).catch(() => {});
    return () => { lebt = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artikelId, laden, !!vorab]);
  return vorab ?? geladen;
}
