import { useEffect } from "react";

interface SeoProps {
  title: string;
  description?: string;
  image?: string;
  jsonLd?: object;
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
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
  if (extra) Object.entries(extra).forEach(([k, v]) => el!.setAttribute(k, v));
}

export function Seo({ title, description, image, jsonLd }: SeoProps) {
  useEffect(() => {
    const fullTitle = `${title} | ${SITE_NAME}`;
    const img = image || DEFAULT_IMAGE;
    const url = `${SITE_URL}${window.location.pathname}`;

    // Title
    document.title = fullTitle;

    // Canonical (immer www)
    setLink("canonical", url);

    // Meta Description
    if (description) {
      setMeta("name", "description", description);
    }

    // Open Graph
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:url", url);
    setMeta("property", "og:locale", "de_DE");
    setMeta("property", "og:image", img);
    setMeta("property", "og:image:width", "1200");
    setMeta("property", "og:image:height", "630");
    if (description) setMeta("property", "og:description", description);

    // Twitter / X
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:image", img);
    if (description) setMeta("name", "twitter:description", description);

    // Google Analytics: Seitenaufruf tracken (falls GA4 aktiv)
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("config", "G-BSRV5EWBJG", { page_path: window.location.pathname });
    }

    // Structured Data
    let script: HTMLScriptElement | null = null;
    if (jsonLd) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.text = JSON.stringify(jsonLd);
      script.dataset.seo = "page";
      document.head.appendChild(script);
    }
    return () => {
      script?.remove();
    };
  }, [title, description, image, jsonLd]);

  return null;
}
