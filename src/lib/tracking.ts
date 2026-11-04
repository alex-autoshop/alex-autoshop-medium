/**
 * Analyse- und Werbe-Skripte (Google Analytics 4, Meta Pixel) — erst nach
 * Einwilligung „Alle akzeptieren“ im Cookie-Banner. Vorher wird nichts geladen
 * und nichts an Google oder Meta übertragen (§ 25 Abs. 1 TDDDG).
 */
const GA_ID = "G-BSRV5EWBJG";
// ACHTUNG: Diese Pixel-ID stand als Platzhalter in index.html („Ersetze … mit
// deiner echten Meta-Pixel-ID“). Bitte prüfen; leer lassen = kein Pixel.
const META_PIXEL_ID = "545273900";
export const CONSENT_KEY = "cookie-consent";

let geladen = false;

export function einwilligungLesen(): "all" | "necessary" | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "all" || v === "necessary" ? v : null;
  } catch { return null; }
}

export function trackingLaden() {
  if (geladen || typeof window === "undefined" || einwilligungLesen() !== "all") return;
  geladen = true;
  const w = window as any;
  // Google Analytics 4
  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag() { w.dataLayer.push(arguments); };
  w.gtag("js", new Date());
  w.gtag("config", GA_ID, { anonymize_ip: true });
  const ga = document.createElement("script");
  ga.async = true;
  ga.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(ga);
  // Meta Pixel
  if (META_PIXEL_ID) {
    /* eslint-disable */
    (function (f: any, b: Document, e: string, v: string) {
      if (f.fbq) return;
      const n: any = (f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); });
      if (!f._fbq) f._fbq = n;
      n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
      const t = b.createElement(e) as HTMLScriptElement; t.async = true; t.src = v;
      b.head.appendChild(t);
    })(w, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    /* eslint-enable */
    w.fbq("init", META_PIXEL_ID);
    w.fbq("track", "PageView");
  }
}

/** Einwilligung widerrufen: Auswahl löschen und Seite neu laden (Skripte sind dann weg). */
export function einwilligungZuruecksetzen() {
  try { localStorage.removeItem(CONSENT_KEY); } catch { /* egal */ }
  window.location.reload();
}
