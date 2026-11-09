// Listen-Ansicht (Kategorie, Shop, Suche, Startseite, Mitgliedschaft, Marke).
// Filter und die geladene Seite stehen in der Adresse. Scroll, angeklicktes
// Produkt und Zusatz der Mitgliedschaft liegen pro Listen-URL in der Sitzung.
// „Zurück“ geht einen History-Schritt, wenn die vorige Seite diese Liste war.

import { kategorieInfo } from "./seo-katalog.js";
import { istShopPfad, shopZustandSchreiben } from "./shop-zustand.js";

export const LISTEN_KEY = "aa:listen";
export const VON_KEY = "aa:von-liste";
export const LISTEN_SCHRITT = 24;
const MAX_EINTRAEGE = 12;
const MAX_SEITE = 40;

function speicher(storage) {
  if (storage) return storage;
  try {
    if (typeof sessionStorage !== "undefined") return sessionStorage;
  } catch { /* privat */ }
  return null;
}

export function istListenPfad(pathname) {
  if (pathname === "/" || pathname === "/mitgliedschaft") return true;
  if (typeof pathname !== "string") return false;
  if (pathname.startsWith("/marken/") && !pathname.slice("/marken/".length).includes("/")) return true;
  return istShopPfad(pathname);
}

function suchtext(roh) {
  if (typeof roh !== "string") return "";
  const text = roh.startsWith("?") || roh === "" ? roh : "";
  if (text.length > 2000 || /[\r\n]/.test(text) || text.includes("://")) return "";
  return text;
}

export function seiteAusSuche(search) {
  const roh = typeof search === "string" ? search : "";
  const params = new URLSearchParams(roh.startsWith("?") ? roh.slice(1) : roh);
  const wert = params.get("seite");
  if (!wert || !/^[1-9]\d*$/.test(wert)) return 1;
  const n = Number(wert);
  if (n < 2) return 1;
  return Math.min(MAX_SEITE, n);
}

export function queryMitSeite(search, seite) {
  const roh = typeof search === "string" ? search : "";
  const params = new URLSearchParams(roh.startsWith("?") ? roh.slice(1) : roh);
  const n = Math.round(Number(seite) || 1);
  if (n > 1) params.set("seite", String(Math.min(MAX_SEITE, n)));
  else params.delete("seite");
  const s = params.toString().replace(
    /(^|&)marke=([^&]*)/g,
    (_, trenner, wert) => `${trenner}marke=${wert.replace(/%2C/gi, ",")}`,
  );
  return s ? `?${s}` : "";
}

function handleSicher(roh) {
  if (typeof roh !== "string" || roh.length < 1 || roh.length > 180) return "";
  return /^[a-z0-9][a-z0-9-]*$/i.test(roh) ? roh : "";
}

function pfadUndSuche(url) {
  if (typeof url !== "string" || !url.startsWith("/") || url.startsWith("//")) return null;
  if (url.includes("\\") || url.includes("://") || url.includes("..")) return null;
  const frage = url.indexOf("?");
  const pathname = frage === -1 ? url : url.slice(0, frage);
  const search = frage === -1 ? "" : suchtext(url.slice(frage));
  if (!istListenPfad(pathname)) return null;
  return { pathname, search };
}

export function labelFuer(pathname, search) {
  if (pathname === "/") return "Zurück zur Startseite";
  if (pathname === "/mitgliedschaft") return "Zurück zur Mitgliedschaft";
  if (typeof pathname === "string" && pathname.startsWith("/marken/")) return "Zurück zur Marke";
  const q = (() => {
    try {
      return new URLSearchParams((search || "").replace(/^\?/, "")).get("q") || "";
    } catch {
      return "";
    }
  })();
  if (pathname === "/shop" && q.trim()) return "Zurück zur Suche";
  if (pathname === "/shop") return "Zurück zum Shop";
  const handle = typeof pathname === "string" ? pathname.split("/").filter(Boolean).pop() : "";
  const info = handle ? kategorieInfo(handle) : null;
  if (info?.label) return `Zurück zu ${info.label}`;
  return "Zurück zum Shop";
}

function zusatzNormalisieren(roh) {
  if (!roh || typeof roh !== "object" || Array.isArray(roh)) return null;
  const kat = typeof roh.kat === "string" && roh.kat.length <= 80 ? roh.kat : "";
  const q = typeof roh.q === "string" && roh.q.length <= 120 ? roh.q : "";
  const marke = typeof roh.marke === "string" && roh.marke.length <= 80 ? roh.marke : "";
  const reihen = {};
  if (roh.reihen && typeof roh.reihen === "object" && !Array.isArray(roh.reihen)) {
    for (const [id, wert] of Object.entries(roh.reihen)) {
      if (typeof id !== "string" || id.length < 1 || id.length > 80 || /[\r\n]/.test(id)) continue;
      const bis = Math.max(0, Math.min(80, Math.round(Number(wert?.bis) || 0)));
      const x = Math.max(0, Math.min(20000, Math.round(Number(wert?.x) || 0)));
      if (bis || x) reihen[id] = { bis, x };
      if (Object.keys(reihen).length >= 24) break;
    }
  }
  const reihenMarke = {};
  if (roh.reihenMarke && typeof roh.reihenMarke === "object" && !Array.isArray(roh.reihenMarke)) {
    for (const [id, wert] of Object.entries(roh.reihenMarke)) {
      if (typeof id !== "string" || id.length < 1 || id.length > 80 || /[\r\n]/.test(id)) continue;
      if (typeof wert !== "string" || !wert.trim() || wert.length > 80) continue;
      reihenMarke[id] = wert.trim();
      if (Object.keys(reihenMarke).length >= 24) break;
    }
  }
  if (!kat && !q && !marke && Object.keys(reihen).length === 0 && Object.keys(reihenMarke).length === 0) return null;
  return { kat, q, marke, reihen, reihenMarke };
}

export function eintragNormalisieren(roh) {
  const teil = pfadUndSuche(`${roh?.pathname || ""}${typeof roh?.search === "string" ? roh.search : ""}`);
  if (!teil && roh?.pathname) {
    if (!istListenPfad(roh.pathname)) return null;
  }
  const pathname = istListenPfad(roh?.pathname) ? roh.pathname : null;
  if (!pathname) return null;
  const search = suchtext(typeof roh.search === "string" ? roh.search : "");
  const scroll = Math.max(0, Math.min(2_000_000, Math.round(Number(roh.scroll) || 0)));
  const seite = Math.min(MAX_SEITE, Math.max(1, Math.round(Number(roh.seite) || seiteAusSuche(search))));
  const historyLength = Number.isFinite(Number(roh.historyLength)) ? Math.max(0, Math.round(Number(roh.historyLength))) : null;
  const label = typeof roh.label === "string" && roh.label.startsWith("Zurück") && roh.label.length <= 80
    ? roh.label
    : labelFuer(pathname, search);
  return {
    pathname,
    search,
    scroll,
    seite,
    handle: handleSicher(roh.handle),
    label,
    historyLength,
    zusatz: zusatzNormalisieren(roh.zusatz),
  };
}

function schluessel(pathname, search) {
  return `${pathname}${search || ""}`;
}

function lesenAlle(storage) {
  const s = speicher(storage);
  if (!s) return [];
  try {
    const roh = JSON.parse(s.getItem(LISTEN_KEY) || "[]");
    if (!Array.isArray(roh)) return [];
    return roh.map(eintragNormalisieren).filter(Boolean);
  } catch {
    return [];
  }
}

function schreibenAlle(liste, storage) {
  const s = speicher(storage);
  if (!s) return;
  const gekuerzt = liste.slice(-MAX_EINTRAEGE);
  try {
    s.setItem(LISTEN_KEY, JSON.stringify(gekuerzt));
  } catch { /* voll oder privat */ }
}

export function leseListen(pathname, search, storage) {
  const key = schluessel(pathname, search || "");
  const alle = lesenAlle(storage);
  for (let i = alle.length - 1; i >= 0; i -= 1) {
    if (schluessel(alle[i].pathname, alle[i].search) === key) return alle[i];
  }
  return null;
}

export function leseLetzteListe(storage) {
  const alle = lesenAlle(storage);
  return alle.length ? alle[alle.length - 1] : null;
}

function merkeShop(eintrag) {
  shopZustandSchreiben({ pathname: eintrag.pathname, search: eintrag.search, scroll: eintrag.scroll });
}

/** Schreibt oder ergänzt den Stand dieser Listen-URL. Handle bleibt, wenn keins mitkommt. */
export function listenSchreiben(teil, storage) {
  const bisher = leseListen(teil?.pathname, teil?.search, storage);
  const normal = eintragNormalisieren({
    ...bisher,
    ...teil,
    handle: teil?.handle || bisher?.handle || "",
    historyLength: teil?.historyLength ?? bisher?.historyLength ?? null,
    zusatz: teil?.zusatz ?? bisher?.zusatz ?? null,
    label: teil?.label || bisher?.label,
  });
  if (!normal) return null;
  const key = schluessel(normal.pathname, normal.search);
  const rest = lesenAlle(storage).filter((e) => schluessel(e.pathname, e.search) !== key);
  rest.push(normal);
  schreibenAlle(rest, storage);
  merkeShop(normal);
  return normal;
}

export function vonMerken(eintrag, storage) {
  const s = speicher(storage);
  if (!s || !eintrag) return null;
  const handle = handleSicher(eintrag.handle);
  if (eintrag.historyLength == null) return null;
  const historyLength = Number(eintrag.historyLength);
  const url = `${eintrag.pathname || ""}${eintrag.search || ""}`;
  if (!handle || !pfadUndSuche(url) || !Number.isFinite(historyLength)) return null;
  const von = { handle, url, historyLength };
  try {
    s.setItem(VON_KEY, JSON.stringify(von));
  } catch { /* voll oder privat */ }
  return von;
}

export function leseVon(storage) {
  const s = speicher(storage);
  if (!s) return null;
  try {
    const roh = JSON.parse(s.getItem(VON_KEY) || "null");
    if (!roh || !handleSicher(roh.handle) || !pfadUndSuche(roh.url)) return null;
    const historyLength = Number(roh.historyLength);
    if (!Number.isFinite(historyLength)) return null;
    return { handle: roh.handle, url: roh.url, historyLength };
  } catch {
    return null;
  }
}

/** Beim Klick auf eine Produktkarte: Stand sichern und merken, dass die nächste Seite daher kommt. */
export function listeBeimProdukt(teil, storage) {
  const normal = listenSchreiben(teil, storage);
  if (!normal) return null;
  vonMerken(normal, storage);
  return normal;
}

function eintragZuUrl(url, storage) {
  const teil = pfadUndSuche(url);
  if (!teil) return null;
  return leseListen(teil.pathname, teil.search, storage) || {
    pathname: teil.pathname,
    search: teil.search,
    scroll: 0,
    seite: seiteAusSuche(teil.search),
    handle: "",
    label: labelFuer(teil.pathname, teil.search),
    historyLength: null,
    zusatz: null,
  };
}

function kategorieAusSammlungen(sammlungen) {
  const liste = Array.isArray(sammlungen) ? sammlungen : [];
  const unter = liste.find((s) => s && kategorieInfo(s.handle)?.parentHandle);
  const haupt = liste.find((s) => s && kategorieInfo(s.handle) && !kategorieInfo(s.handle).parentHandle);
  const gewählt = unter || haupt;
  const info = gewählt ? kategorieInfo(gewählt.handle) : null;
  if (!info) return { pathname: "/shop", search: "", label: "Zurück zum Shop" };
  return { pathname: `/kategorie/${info.handle}`, search: "", label: `Zurück zu ${info.label}` };
}

/**
 * Wohin „Zurück …“ führt.
 * history: die vorige History-Seite ist die Liste (navigate(-1)).
 * sonst zuletzt gemerkte Liste, sonst die Kategorie des Produkts.
 */
export function zurueckZiel({ historyLength, produktHandle, sammlungen } = {}, storage) {
  const von = leseVon(storage);
  const laenge = Number(historyLength);
  const handle = handleSicher(produktHandle);
  if (von && handle && von.handle === handle && Number.isFinite(laenge) && von.historyLength + 1 === laenge) {
    const eintrag = eintragZuUrl(von.url, storage);
    if (eintrag) {
      return {
        history: true,
        shopZurueck: true,
        pathname: eintrag.pathname,
        search: eintrag.search,
        label: eintrag.label || labelFuer(eintrag.pathname, eintrag.search),
      };
    }
  }
  const letzte = leseLetzteListe(storage);
  if (letzte) {
    return {
      history: false,
      shopZurueck: true,
      pathname: letzte.pathname,
      search: letzte.search,
      label: letzte.label || labelFuer(letzte.pathname, letzte.search),
    };
  }
  return { history: false, shopZurueck: false, ...kategorieAusSammlungen(sammlungen) };
}
