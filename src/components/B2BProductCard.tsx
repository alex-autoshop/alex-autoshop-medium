import { useState } from "react";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { type ShopifyProduct, formatPrice } from "@/lib/shopify";
import { PRODUCT_IMAGES } from "@/lib/productImages";
import { useCartStore } from "@/stores/cartStore";
import { MEMBERSHIP_LEVELS } from "@/data/memberships";
import { cn } from "@/lib/utils";

// Professionelle B2B-Karte: Netto-Mitgliederpreis prominent, Mengen-Eingabe,
// direkt bestellen — wie in einem Distributor-Portal.
export function B2BProductCard({
  product,
  memberLevel = 0,
  discount = 0,
}: {
  product: ShopifyProduct;
  memberLevel?: number;
  discount?: number;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const [qty, setQty] = useState(1);
  const node = product.node;
  const img = node.images?.edges?.[0]?.node?.url || PRODUCT_IMAGES[node.handle] || "";
  const base = node.priceRange.minVariantPrice;
  const basePrice = parseFloat(base.amount);
  const cur = base.currencyCode;
  const variant = node.variants?.edges?.[0]?.node;
  const multiple = (node.variants?.edges?.length ?? 0) > 1;

  const memberPrice = basePrice * (1 - discount / 100);
  const lineTotal = (discount > 0 ? memberPrice : basePrice) * qty;

  // Höchste Stufe (Level 3) als Vergleich/Upsell
  const topLevel = MEMBERSHIP_LEVELS[MEMBERSHIP_LEVELS.length - 1];
  const topPrice = basePrice * (1 - topLevel.discountPercent / 100);
  const showTopHint = memberLevel !== topLevel.level;

  const add = async () => {
    if (!variant) return;
    await addItem({
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: qty,
      selectedOptions: variant.selectedOptions ?? [],
    });
    toast.success("In den Warenkorb", { description: `${qty}× ${node.title}` });
    setQty(1);
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden flex flex-col hover:border-primary/50 transition-colors">
      <div className="aspect-square bg-secondary overflow-hidden">
        {img ? (
          <img src={img} alt={node.title} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Kein Bild</div>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1 gap-2">
        <h3 className="font-semibold text-sm leading-snug line-clamp-2 min-h-[2.5rem]">{node.title}</h3>

        <div className="mt-auto">
          {discount > 0 ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-display font-bold text-foreground">
                  {multiple && <span className="text-xs font-medium text-muted-foreground">ab </span>}
                  {formatPrice(String(memberPrice), cur)}
                </span>
                <span className="inline-flex items-center rounded bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5">
                  −{discount}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-through">{formatPrice(String(basePrice), cur)}</p>
              <p className="text-[11px] text-muted-foreground">Netto-Mitgliederpreis (Level {memberLevel})</p>
            </>
          ) : (
            <>
              <p className="text-xl font-display font-bold text-foreground">
                {multiple && <span className="text-xs font-medium text-muted-foreground">ab </span>}
                {formatPrice(String(basePrice), cur)}
              </p>
              <p className="text-[11px] text-primary font-semibold">Mitglieder ab −15%</p>
            </>
          )}

          {showTopHint && (
            <div className="mt-1.5 flex items-center justify-between rounded-md bg-night/90 text-white px-2 py-1">
              <span className="text-[11px]">Mit {topLevel.name} (−{topLevel.discountPercent}%)</span>
              <span className="text-xs font-bold text-gold-bright">{formatPrice(String(topPrice), cur)}</span>
            </div>
          )}
        </div>

        {variant?.availableForSale && !multiple ? (
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center border border-border rounded-lg shrink-0">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-8 h-9 flex items-center justify-center hover:bg-secondary rounded-l-lg" aria-label="weniger">
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-7 text-center text-sm font-semibold">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="w-8 h-9 flex items-center justify-center hover:bg-secondary rounded-r-lg" aria-label="mehr">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <button onClick={add} className="btn-dark flex-1 text-xs min-h-[36px] px-2">
              <ShoppingCart className="w-4 h-4" /> {formatPrice(String(lineTotal), cur)}
            </button>
          </div>
        ) : (
          <a href={`/produkt/${node.handle}`} className={cn("btn-outline w-full text-xs min-h-[36px] mt-1")}>
            Varianten wählen
          </a>
        )}
      </div>
    </div>
  );
}
