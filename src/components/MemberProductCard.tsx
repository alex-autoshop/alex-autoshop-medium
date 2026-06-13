import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { type ShopifyProduct, formatPrice } from "@/lib/shopify";
import { PRODUCT_IMAGES } from "@/lib/productImages";
import { useCartStore } from "@/stores/cartStore";
import { MEMBERSHIP_LEVELS } from "@/data/memberships";
import { cn } from "@/lib/utils";

// Produktkarte fürs Mitglieder-Dashboard: zeigt pro Mitgliedschaftsstufe,
// wie viel man spart. Die eigene Stufe wird hervorgehoben.
export function MemberProductCard({
  product,
  memberLevel = 0,
}: {
  product: ShopifyProduct;
  memberLevel?: number;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const node = product.node;
  const img = node.images?.edges?.[0]?.node?.url || PRODUCT_IMAGES[node.handle] || "";
  const base = node.priceRange.minVariantPrice;
  const basePrice = parseFloat(base.amount);
  const cur = base.currencyCode;
  const variant = node.variants?.edges?.[0]?.node;
  const multiple = (node.variants?.edges?.length ?? 0) > 1;

  const yourDiscount = MEMBERSHIP_LEVELS.find((m) => m.level === memberLevel)?.discountPercent ?? 0;
  const yourPrice = basePrice * (1 - yourDiscount / 100);

  const add = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!variant) return;
    await addItem({
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions ?? [],
    });
    toast.success("In den Warenkorb", { description: node.title });
  };

  return (
    <div className="card-tilt overflow-hidden flex flex-col">
      <div className="aspect-square bg-secondary overflow-hidden">
        {img ? (
          <img src={img} alt={node.title} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">Kein Bild</div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1 gap-3">
        <h3 className="font-semibold text-sm leading-snug line-clamp-2 min-h-[2.5rem]">{node.title}</h3>

        {/* Dein Preis */}
        <div>
          <p className="text-xs text-muted-foreground">{memberLevel > 0 ? "Dein Mitgliederpreis" : "Preis ohne Mitgliedschaft"}</p>
          <p className="text-2xl font-display font-bold text-foreground">
            {multiple && <span className="text-sm font-medium text-muted-foreground">ab </span>}
            {formatPrice(String(yourPrice), cur)}
          </p>
          {memberLevel > 0 && (
            <p className="text-xs text-muted-foreground line-through">{formatPrice(String(basePrice), cur)}</p>
          )}
        </div>

        {/* Ersparnis je Stufe */}
        <div className="rounded-xl bg-secondary/70 p-3 space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            So viel sparst du je Stufe
          </p>
          {MEMBERSHIP_LEVELS.map((m) => {
            const saved = basePrice * (m.discountPercent / 100);
            const isYours = m.level === memberLevel;
            return (
              <div
                key={m.level}
                className={cn(
                  "flex items-center justify-between text-xs rounded-md px-2 py-1",
                  isYours ? "bg-primary/15 font-bold text-primary" : "text-foreground/70"
                )}
              >
                <span>{m.name} · {m.discountPercent}%</span>
                <span>− {formatPrice(String(saved), cur)}{isYours && " ✓"}</span>
              </div>
            );
          })}
        </div>

        {variant?.availableForSale && !multiple && (
          <button onClick={add} className="btn-dark w-full mt-auto text-sm">
            <ShoppingCart className="w-4 h-4" /> In den Warenkorb
          </button>
        )}
      </div>
    </div>
  );
}
