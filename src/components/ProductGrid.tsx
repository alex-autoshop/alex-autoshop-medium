import { Fragment, useEffect, useState } from "react";
import { type ShopifyProduct } from "@/lib/shopify";
import { ProductCard } from "@/components/ProductCard";
import { LISTEN_SCHRITT } from "../../shared/listen-zustand.js";

interface ProductGridProps {
  products: ShopifyProduct[];
  isLoading: boolean;
  error?: string | null;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
  /** Produkte pro Zeile auf grossen Bildschirmen (4, 5 oder 6). */
  columns?: 4 | 5 | 6;
  /** Nur so viele Karten zeichnen, der Rest kommt auf Knopfdruck. */
  fenster?: number;
  /** 1-basierte Seite. Mit onMehr kommt der Stand aus der Adresse. */
  seite?: number;
  onMehr?: () => void;
  /** Überschrift direkt vor dieser Karte, über die ganze Zeile. */
  trennung?: { vorId: string; titel: string };
}

// Feste Klassen, damit Tailwind sie beim Build findet (kein String-Zusammenbau!).
const COLS: Record<4 | 5 | 6, string> = {
  4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
};

function SkeletonCard() {
  return (
    <div className="card-tilt overflow-hidden">
      <div className="aspect-square bg-secondary" />
      <div className="p-4 space-y-2">
        <div className="h-10 bg-secondary rounded" />
        <div className="h-7 bg-secondary rounded w-1/2" />
        <div className="h-10 bg-secondary rounded" />
      </div>
    </div>
  );
}

export function ProductGrid({ products, isLoading, error, hasNextPage, onLoadMore, columns = 5, fenster, seite = 1, onMehr, trennung }: ProductGridProps) {
  const schritt = fenster || LISTEN_SCHRITT;
  const anfang = products[0]?.node.id ?? "";
  const [lokal, setLokal] = useState(seite);
  useEffect(() => { setLokal(seite); }, [seite, anfang]);
  const aktiv = Math.max(1, onMehr ? seite : lokal);
  const gezeigt = fenster ? products.slice(0, aktiv * schritt) : products;
  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Produkte konnten nicht geladen werden. Bitte versuche es später erneut.
      </div>
    );
  }

  return (
    <div>
      <div className={`grid ${COLS[columns]} gap-3 sm:gap-4 items-stretch`}>
        {gezeigt.map((p, i) => (
          <Fragment key={p.node.id}>
            {trennung && p.node.id === trennung.vorId && (
              <h2 className="col-span-full mt-2 border-t border-border pt-4 text-sm font-semibold text-muted-foreground">
                {trennung.titel}
              </h2>
            )}
            <ProductCard product={p} priority={i < 2} />
          </Fragment>
        ))}
        {isLoading && Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={`s-${i}`} />)}
      </div>
      {!isLoading && products.length === 0 && (
        <p className="text-center py-12 text-muted-foreground">Keine Produkte gefunden.</p>
      )}
      {fenster && gezeigt.length < products.length && (
        <div className="flex justify-center mt-8">
          <button
            type="button"
            onClick={() => (onMehr ? onMehr() : setLokal((n) => n + 1))}
            className="btn-outline"
          >
            Weitere Produkte zeigen
          </button>
        </div>
      )}
      {hasNextPage && !isLoading && onLoadMore && (
        <div className="flex justify-center mt-8">
          <button onClick={onLoadMore} className="btn-outline">
            Mehr Produkte laden
          </button>
        </div>
      )}
    </div>
  );
}
