/**
 * Shopify-CDN-Bilder in der passenden Breite und als WebP/AVIF.
 * Andere Adressen bleiben unverändert.
 */

const BREITEN = [200, 400, 640, 960];

function istShopify(url: string) {
  return url.includes("cdn.shopify.com");
}

function mit(url: string, width: number, format?: "webp" | "avif") {
  try {
    const u = new URL(url);
    u.searchParams.set("width", String(width));
    if (format) u.searchParams.set("format", format);
    return u.toString();
  } catch {
    return url;
  }
}

function srcset(url: string, format?: "webp" | "avif") {
  return BREITEN.map((w) => `${mit(url, w, format)} ${w}w`).join(", ");
}

export function ShopBild({
  src,
  alt,
  className,
  sizes = "(min-width: 1280px) 18vw, (min-width: 640px) 30vw, 46vw",
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  /** Erstes Bild im Sichtbereich: sofort laden, hohe Priorität. */
  priority?: boolean;
}) {
  if (!src) return null;
  const laden = priority ? "eager" : "lazy";
  const prio = priority ? "high" : "auto";
  if (!istShopify(src)) {
    return (
      <img
        src={src}
        alt={alt}
        width={800}
        height={800}
        className={className}
        loading={laden}
        decoding="async"
        fetchPriority={prio}
      />
    );
  }
  return (
    <picture>
      <source type="image/avif" srcSet={srcset(src, "avif")} sizes={sizes} />
      <source type="image/webp" srcSet={srcset(src, "webp")} sizes={sizes} />
      <img
        src={mit(src, 640)}
        srcSet={srcset(src)}
        sizes={sizes}
        alt={alt}
        width={800}
        height={800}
        className={className}
        loading={laden}
        decoding="async"
        fetchPriority={prio}
      />
    </picture>
  );
}
