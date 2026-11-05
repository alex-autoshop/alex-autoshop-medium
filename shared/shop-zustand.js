// Shop-Kontext in der Adresse und in der Sitzung.
// Lackierbedarf kann /shop/lackierbedarf-alle oder /kategorie/lackierbedarf-alle
// sein. Marke und Sortierung stecken in der Query. „Zurück zum Shop“ und der
// Browser-Zurück öffnen dieselbe Ansicht — nicht die Wunschfarben-Startseite.

export const SHOP_KEY = "aa:shop";

export const SORTIERUNGEN = ["empfohlen", "preis-auf", "preis-ab", "name", "marke"];

function leseListe(params, name) {
  const aus = [];
  for (const roh of params.getAll(name)) {
    for (const teil of String(roh).split("|")) {
      const wert = teil.trim();
      if (wert && !aus.includes(wert)) aus.push(wert);
    }
  }
  return aus;
}

/** Filter, Suche und Sortierung aus einer Query (mit oder ohne „?“). */
export function zustandAusSuche(search) {
  const roh = typeof search === "string" ? search : "";
  const params = new URLSearchParams(roh.startsWith("?") ? roh.slice(1) : roh);
  const bis = Number(params.get("bis"));
  const sort = params.get("sort") || "empfohlen";
  return {
    brands: leseListe(params, "marke"),
    tags: leseListe(params, "art"),
    priceMax: Number.isFinite(bis) && bis > 0 ? bis : null,
    onlyAvailable: params.get("lager") === "1",
    q: (params.get("q") || "").trim(),
    sort: SORTIERUNGEN.includes(sort) ? sort : "empfohlen",
  };
}

/** Kanonische Query. Leere Auswahl ergibt "". */
export function sucheAusZustand(z) {
  const params = new URLSearchParams();
  for (const marke of z?.brands || []) params.append("marke", marke);
  for (const art of z?.tags || []) params.append("art", art);
  if (z?.priceMax) params.set("bis", String(z.priceMax));
  if (z?.onlyAvailable) params.set("lager", "1");
  const q = (z?.q || "").trim();
  if (q) params.set("q", q);
  if (z?.sort && z.sort !== "empfohlen" && SORTIERUNGEN.includes(z.sort)) params.set("sort", z.sort);
  const s = params.toString();
  return s ? `?${s}` : "";
}

/** Shop-Raster oder Kategorieleiste (Lackierbedarf & Co.). */
export function istShopPfad(pathname) {
  if (typeof pathname !== "string" || !pathname.startsWith("/") || pathname.startsWith("//")) return false;
  if (pathname.includes("\\") || pathname.includes("://") || pathname.includes("..")) return false;
  return pathname === "/shop"
    || pathname.startsWith("/shop/")
    || pathname.startsWith("/kategorie/");
}

function suchtext(roh) {
  if (typeof roh !== "string" || !roh.startsWith("?") || roh.length > 2000) return "";
  if (/[\r\n]/.test(roh) || roh.includes("://")) return "";
  return roh;
}

export function zustandNormalisieren(roh) {
  if (!roh || typeof roh !== "object") return null;
  const pathname = istShopPfad(roh.pathname) ? roh.pathname : null;
  if (!pathname) return null;
  // Query roh lassen. Die Kategorieseite nutzt marke=Glasurit,Mipa und sort=neu —
  // ein Umbau auf die Shop-Facetten würde die Marke zerschneiden.
  const search = suchtext(typeof roh.search === "string" ? roh.search : "");
  const scroll = Math.max(0, Math.round(Number(roh.scroll) || 0));
  return { pathname, search, scroll };
}

function speicher(storage) {
  if (storage) return storage;
  try {
    if (typeof sessionStorage !== "undefined") return sessionStorage;
  } catch { /* privat */ }
  return null;
}

export function shopZustandLesen(storage) {
  const s = speicher(storage);
  if (!s) return null;
  try {
    const roh = s.getItem(SHOP_KEY);
    if (!roh) return null;
    return zustandNormalisieren(JSON.parse(roh));
  } catch {
    return null;
  }
}

export function shopZustandSchreiben(daten, storage) {
  const s = speicher(storage);
  const normal = zustandNormalisieren(daten);
  if (!s || !normal) return null;
  try {
    s.setItem(SHOP_KEY, JSON.stringify(normal));
  } catch { /* voll oder privat */ }
  return normal;
}

/** Ziel für „Zurück zum Shop“. Ohne gemerkten Shop: /shop. */
export function shopZurueckZiel(storage) {
  const z = shopZustandLesen(storage);
  if (!z) return { pathname: "/shop", search: "" };
  return { pathname: z.pathname, search: z.search, scroll: z.scroll };
}
