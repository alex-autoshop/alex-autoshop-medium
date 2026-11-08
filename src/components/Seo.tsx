import { useEffect } from "react";

interface SeoProps {
  title: string;
  description?: string;
  image?: string;
  /** Bild fürs Vorladen des größten sichtbaren Motivs. */
  preloadImage?: string;
  jsonLd?: object | object[] | null;
  /** Seite aus dem Suchmaschinen-Index halten */
  noindex?: boolean;
  /** Titel ist schon vollständig, kein Zusatz am Ende. */
  titelFertig?: boolean;
  /** Kanonische Adresse ohne Query. Standard ist der Pfad. */
  canonical?: string;
  ogType?: string;
}

const SITE_URL = "https://www.alex-autoshop.de";
const DEFAULT_IMAGE = `${SITE_URL}/images/og-image.png`;
const SITE_NAME = "Alex Autoshop Wuppertal";

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel: string, href: string, extra?: Record<string, string>) {
  const sel = extra?.hreflang
    ? `link[rel="${rel}"][hreflang="${extra.hreflang}"]`
    : `link[rel="${rel}"]`;
  let el = document.head.querySelector<HTMLLinkElement>(sel);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
  if (extra) Object.entries(extra).forEach(([k, v]) => el!.setAttribute(k, v));
}

export function Seo({ title, description, image, preloadImage, jsonLd, noindex, titelFertig, canonical, ogType }: SeoProps) {
  useEffect(() => {
    const fullTitle = titelFertig ? title : `${title} | ${SITE_NAME}`;
    const img = image || DEFAULT_IMAGE;
    const url = canonical || `${SITE_URL}${window.location.pathname}`;

    document.title = fullTitle;
    setMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow");
    setLink("canonical", url);
    setLink("alternate", url, { hreflang: "de-DE" });
    setLink("alternate", url, { hreflang: "x-default" });

    if (description) setMeta("name", "description", description);

    setMeta("property", "og:type", ogType || "website");
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:url", url);
    setMeta("property", "og:locale", "de_DE");
    setMeta("property", "og:image", img);
    setMeta("property", "og:image:width", "1200");
    setMeta("property", "og:image:height", "630");
    setMeta("property", "og:image:alt", title);
    if (description) setMeta("property", "og:description", description);

    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:image", img);
    if (description) setMeta("name", "twitter:description", description);

    let preload = document.head.querySelector<HTMLLinkElement>('link[data-seo="lcp"]');
    if (preloadImage) {
      if (!preload) {
        preload = document.createElement("link");
        preload.rel = "preload";
        preload.as = "image";
        preload.dataset.seo = "lcp";
        document.head.appendChild(preload);
      }
      preload.href = preloadImage;
      preload.setAttribute("fetchpriority", "high");
    } else {
      preload?.remove();
    }

    document.getElementById("aa-ld")?.remove();
    const bloecke = (Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : []).filter(Boolean);
    const scripte = bloecke.map((block) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.text = JSON.stringify(block);
      script.dataset.seo = "page";
      document.head.appendChild(script);
      return script;
    });

    if (typeof window !== "undefined" && (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
      (window as unknown as { gtag: (...args: unknown[]) => void }).gtag("config", "G-BSRV5EWBJG", { page_path: window.location.pathname });
    }

    return () => {
      scripte.forEach((script) => script.remove());
      document.head.querySelector('link[data-seo="lcp"]')?.remove();
    };
  }, [title, description, image, preloadImage, jsonLd, noindex, titelFertig, canonical, ogType]);

  return null;
}
