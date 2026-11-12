/**
 * Vercel Web Analytics — nur Messwerte, keine personenbezogenen Daten.
 * Keine Cookies: das Skript kommt aus @vercel/analytics und setzt selbst keine.
 * Abfrage-Parameter (Suche, E-Mail, Tokens) gehen nicht mit.
 */
import { track } from "@vercel/analytics";

type Wert = string | number | boolean | null | undefined;

const DYNAMISCH: ReadonlyArray<readonly [RegExp, string]> = [
  [/^\/shop\/[^/]+$/, "/shop/[category]"],
  [/^\/kategorie\/[^/]+$/, "/kategorie/[handle]"],
  [/^\/produkt\/[^/]+$/, "/produkt/[handle]"],
  [/^\/teile\/[^/]+$/, "/teile/[slug]"],
  [/^\/fahrzeugboerse\/[^/]+$/, "/fahrzeugboerse/[slug]"],
  [/^\/fahrzeugmarkt\/[^/]+$/, "/fahrzeugmarkt/[slug]"],
  [/^\/marken\/[^/]+$/, "/marken/[slug]"],
];

function segment(teil: string): string {
  try {
    return decodeURIComponent(teil).includes("@") ? "redacted" : teil;
  } catch {
    return teil.includes("@") ? "redacted" : teil;
  }
}

/** Pfad ohne Query, Hash und ohne Stücke, die wie eine E-Mail aussehen. */
export function urlOhneAbfrage(url: string): string {
  const basis = typeof location !== "undefined" && location.origin
    ? location.origin
    : "https://www.alex-autoshop.de";
  try {
    const u = new URL(url, basis);
    u.search = "";
    u.hash = "";
    u.pathname = u.pathname.split("/").map(segment).join("/") || "/";
    return u.toString();
  } catch {
    return (url.split(/[?#]/)[0] || "/").split("/").map(segment).join("/");
  }
}

export function pfadOhnePersonen(pathname: string): string {
  const pfad = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return pfad.split("/").map(segment).join("/") || "/";
}

/** Gruppen für die Übersicht, z. B. /produkt/[handle] statt jeder Artikeladresse. */
export function routeMuster(pathname: string): string {
  const pfad = pfadOhnePersonen(pathname.split(/[?#]/)[0] || "/");
  for (const [muster, name] of DYNAMISCH) {
    if (muster.test(pfad)) return name;
  }
  return pfad;
}

function text(wert: string | undefined | null, max = 80): string | undefined {
  if (!wert) return undefined;
  const v = wert.trim().slice(0, max);
  if (!v || v.includes("@") || /https?:/i.test(v)) return undefined;
  return v;
}

function zahl(wert: number, min: number, max: number): number | undefined {
  if (!Number.isFinite(wert)) return undefined;
  const n = Math.round(wert);
  if (n < min || n > max) return undefined;
  return n;
}

function senden(name: string, daten?: Record<string, Wert>) {
  if (!import.meta.env.PROD || typeof window === "undefined") return;
  const props: Record<string, string | number | boolean | null> = {};
  if (daten) {
    for (const [key, value] of Object.entries(daten)) {
      if (value == null || value === "") continue;
      if (typeof value === "number" && !Number.isFinite(value)) continue;
      props[key] = value;
    }
  }
  try {
    if (Object.keys(props).length) track(name, props);
    else track(name);
  } catch {
    /* Messung darf den Einkauf nicht unterbrechen. */
  }
}

export function produktAngesehen(handle: string, kategorie?: string) {
  const h = text(handle);
  if (!h) return;
  senden("Produkt angesehen", { handle: h, kategorie: text(kategorie) });
}

export function inDenWarenkorb(handle: string, kategorie: string | undefined, menge: number) {
  const h = text(handle);
  if (!h) return;
  senden("In den Warenkorb", {
    handle: h,
    kategorie: text(kategorie),
    menge: zahl(menge, 1, 999) ?? 1,
  });
}

export function warenkorbGeoeffnet() {
  senden("Warenkorb geöffnet");
}

export function zurKasse(positionen: number, bereich: "shop" | "teile") {
  senden("Zur Kasse", {
    positionen: zahl(positionen, 0, 999) ?? 0,
    bereich,
  });
}

export function aboStufeGewaehlt(stufe: number) {
  const n = zahl(stufe, 1, 100);
  if (n == null) return;
  senden("Abo-Stufe gewählt", { stufe: n });
}

export function aboGestartet(positionen: number, zahlweg: "gocardless" | "stripe") {
  senden("Abo gestartet", {
    positionen: zahl(positionen, 0, 999) ?? 0,
    zahlweg: zahlweg === "stripe" ? "karte" : "lastschrift",
  });
}

export function zumAboGelegt(handle: string) {
  const h = text(handle);
  if (!h) return;
  senden("Zum Abo gelegt", { handle: h });
}

export function sucheAusgefuehrt(
  laenge: number,
  ort: "shop" | "kategorie" | "abo" | "teile",
  kategorie?: string,
) {
  const n = zahl(laenge, 1, 200);
  if (n == null) return;
  senden("Suche", { laenge: n, ort, kategorie: text(kategorie) });
}

export function anmeldungBegonnen(art: "anmelden" | "registrieren") {
  senden("Anmeldung begonnen", { art });
}

export function anfrageGesendet(
  formular: "finanzierung" | "datenblatt" | "widerruf" | "kuendigung",
  handle?: string,
) {
  senden("Anfrage gesendet", { formular, handle: text(handle) });
}
