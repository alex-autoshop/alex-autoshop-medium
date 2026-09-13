/**
 * Ein Bild für JEDES Teil.
 *
 * Der Katalog hat zu praktisch jedem Artikel ein Produktfoto, aber es liegt je
 * nach Weg an unterschiedlichen Stellen — und manchmal steht im Bildfeld gar
 * kein Bild, sondern ein Datenblatt als PDF (bei MANN "W 712/93" zum Beispiel).
 * Ein <img> mit einer PDF-Adresse ist genau das graue Kästchen, das in der
 * Liste nichts verloren hat.
 *
 * Deshalb hier drei Stufen, in dieser Reihenfolge:
 *   1. das mitgelieferte Bild — sofern es wirklich ein Bild ist
 *   2. die Medienliste des Artikels (über die Artikel-ID) — die zuverlässigste
 *   3. die Nummernsuche — greift nur bei exakter Schreibweise, aber besser als
 *      ein leeres Kästchen
 *
 * Ergebnisse gelten für die Sitzung, auch die Fehlschläge: sonst fragt jedes
 * Neusortieren der Liste erneut nach.
 */

const BILDENDUNG = /\.(webp|jpe?g|png|gif|bmp|avif|svg)(\?|#|$)/i;
const DOKUMENT = /\.(pdf|docx?|xlsx?|zip|mp4|webm)(\?|#|$)/i;

/** Ist das eine Adresse, hinter der ein Bild steckt — und kein Datenblatt? */
export function istBildAdresse(url: unknown): url is string {
  if (typeof url !== "string" || !/^https?:\/\//.test(url)) return false;
  if (DOKUMENT.test(url)) return false;
  // Ohne Endung kann es trotzdem ein Bild sein (manche Speicher liefern sie
  // nicht mit) — nur bekannte Nicht-Bilder fliegen raus.
  return BILDENDUNG.test(url) || !/\.[a-z0-9]{2,5}(\?|#|$)/i.test(url);
}

const speicher = new Map<string, Promise<string | undefined>>();

/* Der Katalog verträgt keine zwanzig gleichzeitigen Anfragen, wenn eine
   Trefferliste auf einmal erscheint. Vier auf einmal, der Rest wartet. */
const MAX_GLEICHZEITIG = 4;
let laufend = 0;
const schlange: Array<() => void> = [];

function anstellen(): Promise<void> {
  if (laufend < MAX_GLEICHZEITIG) {
    laufend++;
    return Promise.resolve();
  }
  return new Promise((frei) => schlange.push(frei));
}

function fertig() {
  const naechster = schlange.shift();
  if (naechster) naechster();
  else laufend--;
}

async function hole(pfad: string, params?: Record<string, string>): Promise<unknown> {
  const qs = new URLSearchParams({ p: pfad });
  if (params) for (const [k, v] of Object.entries(params)) qs.set(k, v);
  const r = await fetch(`/api/autoparts?${qs}`);
  if (!r.ok) return null;
  return r.json().catch(() => null);
}

const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Stufe 2: Medienliste des Artikels — liefert Fotos getrennt von Datenblättern. */
async function ausMedienliste(articleId: string | number): Promise<string | undefined> {
  const j = await hole(`/articles/article-all-media-info/article-id/${articleId}/lang-id/1`);
  const liste: Array<Record<string, unknown>> = Array.isArray(j) ? j : [];
  // "Picture" zuerst — dann alles andere, was wie ein Bild aussieht.
  const fotos = liste.filter((m) => /picture|photo|bild/i.test(String(m.mediaInformation ?? "")));
  for (const m of [...fotos, ...liste]) {
    if (istBildAdresse(m.s3image)) return m.s3image;
  }
  return undefined;
}

/** Stufe 3: Nummernsuche — nur bei exakter Schreibweise, Marke entscheidet. */
async function ausNummernsuche(nummer: string, marke?: string): Promise<string | undefined> {
  const j = await hole("/articles/search-by-article-no", { articleNo: nummer, langId: "1" });
  const liste: Array<Record<string, unknown>> = Array.isArray((j as never)?.["articles"])
    ? ((j as { articles: Array<Record<string, unknown>> }).articles)
    : [];
  if (!liste.length) return undefined;
  const m = marke ? norm(marke) : "";
  const treffer =
    (m && liste.find((a) => norm(String(a.supplierName ?? "")) === m)) ||
    (m && liste.find((a) => norm(String(a.supplierName ?? "")).includes(m))) ||
    liste[0];
  if (istBildAdresse(treffer?.s3image)) return treffer.s3image as string;
  // Das Bildfeld hielt ein Datenblatt — über die Artikel-ID gibt es oft doch eins.
  const id = treffer?.articleId;
  if (id != null) return ausMedienliste(String(id));
  return undefined;
}

async function suchen(
  nummer: string,
  marke: string | undefined,
  articleId: string | number | undefined
): Promise<string | undefined> {
  await anstellen();
  try {
    if (articleId != null && /^\d+$/.test(String(articleId))) {
      const treffer = await ausMedienliste(articleId);
      if (treffer) return treffer;
    }
    if (nummer) return await ausNummernsuche(nummer, marke);
    return undefined;
  } catch {
    return undefined;
  } finally {
    fertig();
  }
}

/** Produktbild zu einem Artikel — aus dem Speicher oder frisch geholt. */
export function partImage(
  articleNumber: string,
  brand?: string,
  articleId?: string | number
): Promise<string | undefined> {
  const nummer = (articleNumber || "").trim();
  if (!nummer && articleId == null) return Promise.resolve(undefined);
  const schluessel = `${articleId ?? ""}|${nummer}|${brand ?? ""}`.toLowerCase();
  let p = speicher.get(schluessel);
  if (!p) {
    p = suchen(nummer, brand, articleId);
    speicher.set(schluessel, p);
  }
  return p;
}
