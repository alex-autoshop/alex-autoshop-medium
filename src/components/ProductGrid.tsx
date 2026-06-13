import { type ShopifyProduct } from "@/lib/shopify";
import { ProductCard } from "@/components/ProductCard";

interface ProductGridProps {
  products: ShopifyProduct[];
  isLoading: boolean;
  error?: string | null;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
}

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

export function ProductGrid({ products, isLoading, error, hasNextPage, onLoadMore }: ProductGridProps) {
  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Produkte konnten nicht geladen werden. Bitte versuche es später erneut.
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
        {products.map((p) => (
          <ProductCard key={p.node.id} product={p} />
        ))}
        {isLoading && Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={`s-${i}`} />)}
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
