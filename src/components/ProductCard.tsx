import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { type ShopifyProduct, formatPrice } from "@/lib/shopify";
import { PRODUCT_IMAGES } from "@/lib/productImages";
import { useCartStore } from "@/stores/cartStore";

export function ProductCard({ product }: { product: ShopifyProduct }) {
  const addItem = useCartStore((s) => s.addItem);
  const node = product.node;
  const img = node.images?.edges?.[0]?.node?.url || PRODUCT_IMAGES[node.handle] || "";
  const price = node.priceRange.minVariantPrice;
  const firstVariant = node.variants?.edges?.[0]?.node;
  const hasMultipleVariants = (node.variants?.edges?.length ?? 0) > 1;

  const quickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!firstVariant) return;
    await addItem({
      product,
      variantId: firstVariant.id,
      variantTitle: firstVariant.title,
      price: firstVariant.price,
      quantity: 1,
      selectedOptions: firstVariant.selectedOptions ?? [],
    });
    toast.success("In den Warenkorb gelegt", { description: node.title });
  };

  return (
    <Link to={`/produkt/${node.handle}`} className="card-tilt overflow-hidden flex flex-col group">
      <div className="aspect-square bg-secondary overflow-hidden">
        {img ? (
          <img
            src={img}
            alt={node.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
            Kein Bild
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1 gap-2">
        <h3 className="font-semibold text-sm leading-snug line-clamp-2 min-h-[2.5rem]">
          {node.title}
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2">
          <div>
            <p className="text-lg font-bold text-foreground">
              {hasMultipleVariants && <span className="text-xs font-medium text-muted-foreground">ab </span>}
              {formatPrice(price.amount, price.currencyCode)}
            </p>
            <p className="text-xs text-primary font-semibold">Mitglieder sparen bis 38%</p>
          </div>
          {firstVariant?.availableForSale && !hasMultipleVariants && (
            <button
              onClick={quickAdd}
              className="w-12 h-12 rounded-xl bg-night text-white flex items-center justify-center hover:bg-primary transition-colors shrink-0"
              aria-label={`${node.title} in den Warenkorb`}
            >
              <ShoppingCart className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
