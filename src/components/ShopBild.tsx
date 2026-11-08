/**
 * Bilder in der passenden Breite. Adressen vom Bilderdienst bekommen
 * width/format, lokale Sammlungskarten die vorbereiteten Größen.
 * Andere Adressen bleiben unverändert.
 */
import { bildAdresse, bildSrcset, KARTEN_GROESSEN } from "../../shared/katalog-regeln.js";

function istShopify(url: string) {
  return url.includes("cdn.shopify.com");
}

function sammlung(src: string) {
  const treffer = src.match(/^\/images\/(collection-[a-z0-9-]+)\.webp$/);
  if (!treffer) return null;
  const name = treffer[1];
  const klein = `/images/opt/${name}-480.webp`;
  const gross = `/images/opt/${name}-720.webp`;
  return { src: klein, srcSet: `${klein} 480w, ${gross} 720w` };
}

export function shopBildVorspann(src: string, sizes = KARTEN_GROESSEN) {
  const lokal = sammlung(src);
  if (lokal) return { href: lokal.src, srcSet: lokal.srcSet, sizes };
  if (!src || !istShopify(src)) return { href: src, srcSet: "", sizes };
  const gross = /92vw|45vw|80vw/.test(sizes);
  return {
    href: bildAdresse(src, gross ? 960 : 480, "webp"),
    srcSet: bildSrcset(src, "webp"),
    sizes,
  };
}

export function ShopBild({
  src,
  alt,
  className,
  sizes = KARTEN_GROESSEN,
  priority = false,
  width = 800,
  height = 800,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  /** Erstes Bild im Sichtbereich: sofort laden, hohe Priorität. */
  priority?: boolean;
  width?: number;
  height?: number;
}) {
  if (!src) return null;
  const laden = priority ? "eager" : "lazy";
  const prio = priority ? "high" : "auto";
  const vorspann = shopBildVorspann(src, sizes);
  return (
    <img
      src={vorspann.href}
      srcSet={vorspann.srcSet || undefined}
      sizes={vorspann.srcSet ? vorspann.sizes : undefined}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={laden}
      decoding="async"
      fetchPriority={prio}
    />
  );
}
