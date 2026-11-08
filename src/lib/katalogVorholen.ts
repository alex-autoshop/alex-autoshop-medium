import { wiederholen } from "../../shared/abruf.js";

export interface KatalogRoh {
  error?: string;
  meta?: {
    art?: string;
    handle?: string;
    sort?: string;
    suche?: string;
    category?: string;
    schluessel?: string;
  };
  data?: unknown;
}

const TTL_MS = 60_000;
const speicher = new Map<string, { bis: number; wert: KatalogRoh }>();
const flug = new Map<string, Promise<KatalogRoh | null>>();

function parameter(such: Record<string, string | number | boolean | null | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(such)) {
    if (v === undefined || v === null || v === "") continue;
    p.set(k, String(v));
  }
  return p;
}

/** Ein Flug pro Adresse: Hover und der folgende Seitenwechsel teilen sich die Antwort. */
export function katalogJson(
  such: Record<string, string | number | boolean | null | undefined>,
  opts?: { frisch?: boolean },
): Promise<KatalogRoh | null> {
  const p = parameter(such);
  if (opts?.frisch) p.set("frisch", "1");
  const key = p.toString();
  if (!opts?.frisch) {
    const hit = speicher.get(key);
    if (hit && hit.bis > Date.now()) return Promise.resolve(hit.wert);
    const laufend = flug.get(key);
    if (laufend) return laufend;
  }

  const lauf = (async () => {
    try {
      const wert = await wiederholen(async (signal) => {
        const res = await fetch(`/api/katalog?${key}`, {
          headers: { Accept: "application/json" },
          cache: opts?.frisch ? "no-store" : "default",
          signal,
        });
        if (!res.ok) {
          const fehler = new Error("Katalog") as Error & { status?: number };
          fehler.status = res.status;
          throw fehler;
        }
        const json = await res.json();
        if (!json || json.error || !json.data) return null;
        return json as KatalogRoh;
      }, { versuche: opts?.frisch ? 2 : 3, timeoutMs: 8000, pauseMs: 200 });
      if (!opts?.frisch && wert) speicher.set(key, { bis: Date.now() + TTL_MS, wert });
      return wert;
    } catch {
      return null;
    }
  })();

  if (!opts?.frisch) {
    flug.set(key, lauf);
    lauf.finally(() => {
      if (flug.get(key) === lauf) flug.delete(key);
    });
  }
  return lauf;
}

export function katalogVorholen(such: Record<string, string>) {
  const key = parameter(such).toString();
  if (!key) return;
  void katalogJson(such);
}

const seiten = new Set<string>();

function seiteVorholen(pfad: string) {
  if (seiten.has(pfad)) return;
  seiten.add(pfad);
  if (pfad.startsWith("/produkt/")) void import("@/pages/ProductDetail");
  else if (pfad.startsWith("/kategorie/")) void import("@/pages/Kategorie");
  else if (pfad === "/shop" || pfad.startsWith("/shop/")) void import("@/pages/Shop");
  else if (pfad === "/mitgliedschaft") void import("@/pages/Mitgliedschaft");
  else if (pfad === "/laden") void import("@/pages/Laden");
  else if (pfad === "/konto") void import("@/pages/Konto");
  else if (pfad === "/warenkorb") void import("@/pages/Warenkorb");
  else if (pfad === "/") void import("@/pages/Home");
  else seiten.delete(pfad);
}

export function produktVorholen(handle: string) {
  if (!handle) return;
  katalogVorholen({ was: "produkt", handle });
  seiteVorholen(`/produkt/${handle}`);
}

/** Daten und Seitenstück, sobald der Zeiger oder der Finger den Link berührt. */
export function linkVorholen(href: string) {
  const roh = href.split(/[?#]/)[0] || "";
  if (!roh.startsWith("/") || roh.startsWith("//")) return;
  if (roh.startsWith("/produkt/")) {
    produktVorholen(decodeURIComponent(roh.slice("/produkt/".length)));
  } else if (roh.startsWith("/kategorie/")) {
    const handle = decodeURIComponent(roh.slice("/kategorie/".length));
    katalogVorholen({ was: "kollektion", handle, first: "100", sort: "empfohlen" });
    seiteVorholen(roh);
  } else if (roh === "/shop" || roh.startsWith("/shop/")) {
    katalogVorholen({ was: "produkte", first: "100" });
    seiteVorholen(roh);
  } else {
    seiteVorholen(roh);
  }
}
