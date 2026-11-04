/**
 * Google Analytics und Meta Pixel — nur nach „Alle akzeptieren“.
 *
 * Meta lädt nur, wenn VITE_META_PIXEL_ID eine echte Pixel-ID ist (15–16 Ziffern).
 * Die alte Zahl 545273900 im HTML war ein Platzhalter und wird nicht mehr benutzt.
 *
 * GA4: VITE_GA_MEASUREMENT_ID, sonst die im Code hinterlegte Mess-ID
 * G-BSRV5EWBJG. Ohne gültige ID wird nichts geladen.
 */
const GA_IM_CODE = "G-BSRV5EWBJG";
export const CONSENT_KEY = "cookie-consent";

function env(name: "VITE_GA_MEASUREMENT_ID" | "VITE_META_PIXEL_ID"): string {
  const v = import.meta.env[name];
  return typeof v === "string" ? v.trim() : "";
}

export function gaMessId(): string {
  const ausEnv = env("VITE_GA_MEASUREMENT_ID");
  if (/^G-[A-Z0-9]{6,}$/.test(ausEnv)) return ausEnv;
  return /^G-[A-Z0-9]{6,}$/.test(GA_IM_CODE) ? GA_IM_CODE : "";
}

/** Echte Meta-Pixel-ID. Der Platzhalter 545273900 ist zu kurz und gilt nicht. */
export function metaPixelId(): string {
  const id = env("VITE_META_PIXEL_ID");
  return /^\d{15,16}$/.test(id) ? id : "";
}

export function einwilligungLesen(): "all" | "necessary" | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "all" || v === "necessary" ? v : null;
  } catch {
    return null;
  }
}

let geladen = false;

export function trackingLaden() {
  if (geladen || typeof window === "undefined" || einwilligungLesen() !== "all") return;
  const ga = gaMessId();
  const pixel = metaPixelId();
  if (!ga && !pixel) return;
  geladen = true;
  const w = window as Window & { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void; fbq?: (...a: unknown[]) => void; _fbq?: unknown };

  if (ga) {
    w.dataLayer = w.dataLayer || [];
    w.gtag = function gtag(...args: unknown[]) { w.dataLayer!.push(args); };
    w.gtag("js", new Date());
    w.gtag("config", ga, { anonymize_ip: true });
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga)}`;
    document.head.appendChild(s);
  }

  if (pixel) {
    const n = function (this: unknown, ...args: unknown[]) {
      const fn = n as unknown as { callMethod?: (...a: unknown[]) => void; queue: unknown[][] };
      if (fn.callMethod) fn.callMethod.apply(n, args);
      else fn.queue.push(args);
    } as unknown as { (...a: unknown[]): void; callMethod?: (...a: unknown[]) => void; queue: unknown[][]; loaded: boolean; version: string; push: unknown };
    n.queue = [];
    n.loaded = true;
    n.version = "2.0";
    n.push = n;
    w.fbq = n;
    if (!w._fbq) w._fbq = n;
    const t = document.createElement("script");
    t.async = true;
    t.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(t);
    w.fbq("init", pixel);
    w.fbq("track", "PageView");
  }
}
