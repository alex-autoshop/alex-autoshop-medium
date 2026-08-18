import { type ShopifyProduct } from "@/lib/shopify";
import { ProductCard } from "@/components/ProductCard";

interface ProductGridProps {
  products: ShopifyProduct[];
  isLoading: boolean;
  error?: string | null;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
  /** Produkte pro Zeile auf grossen Bildschirmen (4, 5 oder 6). */
  columns?: 4 | 5 | 6;
}

// Feste Klassen, damit Tailwind sie beim Build findet (kein String-Zusammenbau!).
const COLS: Record<4 | 5 | 6, string> = {
  4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
};

function SkeletonCard() {
  return (
    <div className="card-tilt overflow-hidden animate-pulse">
      <div className="aspect-square bg-secondary" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-secondary rounded w-3/4" />
        <div className="h-4 bg-secondary rounded w-1/2" />
      </div>
    </div>
  );
}

export function ProductGrid({ products, isLoading, error, hasNextPage, onLoadMore, columns = 5 }: ProductGridProps) {
  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Produkte konnten nicht geladen werden. Bitte versuche es später erneut.
      </div>
    );
  }

  return (
    <div>
      <div className={`grid ${COLS[columns]} gap-3 sm:gap-4 items-start`}>
        {products.map((p) => (
          <ProductCard key={p.node.id} product={p} />
        ))}
        {isLoading && Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={`s-${i}`} />)}
      </div>
      {!isLoading && products.length === 0 && (
        <p className="text-center py-12 text-muted-foreground">Keine Produkte gefunden.</p>
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
