import { useEffect } from "react";

interface SeoProps {
  title: string;
  description?: string;
  jsonLd?: object;
}

const SITE_URL = "https://alex-autoshop.de";

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function Seo({ title, description, jsonLd }: SeoProps) {
  useEffect(() => {
    document.title = `${title} | Alex Autoshop Wuppertal`;
    setMeta("property", "og:title", `${title} | Alex Autoshop Wuppertal`);
    if (description) {
      setMeta("name", "description", description);
      setMeta("property", "og:description", description);
    }

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", `${SITE_URL}${window.location.pathname}`);

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
  }, [title, description, jsonLd]);

  return null;
}
