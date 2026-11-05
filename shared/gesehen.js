// Zuletzt angesehene Produkte — nur auf diesem Gerät.
// localStorage plus ein eigenes First-Party-Cookie, kein Drittanbieter.

export const GESEHEN_KEY = "aa:gesehen";
export const GESEHEN_COOKIE = "aa_gesehen";
const MAX = 36;
const TAGE = 90;
const FRIST_MS = TAGE * 24 * 60 * 60 * 1000;

function sauber(liste, jetzt) {
  const aus = [];
  const gesehen = new Set();
  for (const e of Array.isArray(liste) ? liste : []) {
    if (!e || typeof e.h !== "string" || !e.h) continue;
    if (gesehen.has(e.h)) continue;
    const z = Number(e.z) || 0;
    if (!z || jetzt - z > FRIST_MS) continue;
    gesehen.add(e.h);
    aus.push({
      h: e.h,
      m: typeof e.m === "string" ? e.m : "",
      k: typeof e.k === "string" ? e.k : "",
      a: typeof e.a === "string" ? e.a : "",
      f: Array.isArray(e.f) ? e.f.filter((x) => typeof x === "string") : [],
      z,
    });
    if (aus.length >= MAX) break;
  }
  return aus;
}

/** Neuesten Blick vorne, Doppelte raus, älter als 90 Tage weg. */
export function verlaufMerken(alt, eintrag, jetzt = Date.now()) {
  const neu = {
    h: eintrag?.h || eintrag?.handle || "",
    m: eintrag?.m || eintrag?.marke || "",
    k: eintrag?.k || eintrag?.kategorie || "",
    a: eintrag?.a || eintrag?.art || "",
    f: eintrag?.f || eintrag?.familien || [],
    z: jetzt,
  };
  if (!neu.h) return sauber(alt, jetzt);
  return sauber([neu, ...(Array.isArray(alt) ? alt : [])], jetzt);
}

/** Gewichte für Marke, Kategorie und Produktfamilie. */
export function profilAusVerlauf(liste, jetzt = Date.now()) {
  const marken = {};
  const kategorien = {};
  const arten = {};
  for (const e of sauber(liste, jetzt)) {
    const w = jetzt - e.z > 30 * 24 * 60 * 60 * 1000 ? 0.5 : 1;
    if (e.m && e.m !== "Sonstige") marken[e.m] = (marken[e.m] || 0) + w;
    if (e.k) kategorien[e.k] = (kategorien[e.k] || 0) + w;
    for (const f of e.f) arten[f] = (arten[f] || 0) + w;
  }
  return { marken, kategorien, arten };
}

export function profilLeer(profil) {
  if (!profil) return true;
  return Object.keys(profil.marken || {}).length === 0
    && Object.keys(profil.kategorien || {}).length === 0
    && Object.keys(profil.arten || {}).length === 0;
}

function cookieLesen() {
  try {
    if (typeof document === "undefined") return null;
    const treffer = document.cookie.match(/(?:^|; )aa_gesehen=([^;]*)/);
    if (!treffer) return null;
    return JSON.parse(decodeURIComponent(treffer[1]));
  } catch {
    return null;
  }
}

function cookieSchreiben(liste) {
  try {
    if (typeof document === "undefined") return;
    const wert = encodeURIComponent(JSON.stringify(liste));
    if (wert.length > 3800) return;
    document.cookie = `${GESEHEN_COOKIE}=${wert}; Path=/; Max-Age=${TAGE * 24 * 60 * 60}; SameSite=Lax`;
  } catch { /* privat */ }
}

export function verlaufLesen() {
  try {
    if (typeof localStorage !== "undefined") {
      const roh = localStorage.getItem(GESEHEN_KEY);
      if (roh) return sauber(JSON.parse(roh), Date.now());
    }
  } catch { /* privat */ }
  const ausCookie = cookieLesen();
  return ausCookie ? sauber(ausCookie, Date.now()) : [];
}

export function verlaufSpeichern(liste) {
  const sauberListe = sauber(liste, Date.now());
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(GESEHEN_KEY, JSON.stringify(sauberListe));
  } catch { /* privat */ }
  cookieSchreiben(sauberListe);
  return sauberListe;
}

export function ansichtMerken(eintrag) {
  return verlaufSpeichern(verlaufMerken(verlaufLesen(), eintrag));
}
