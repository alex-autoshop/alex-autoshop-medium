import { useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingCart, Minus, Plus, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { type ShopifyProduct, formatPrice } from "@/lib/shopify";
import { PRODUCT_IMAGES } from "@/lib/productImages";
import { useCartStore } from "@/stores/cartStore";
import { MEMBERSHIP_LEVELS } from "@/data/memberships";
import { cn } from "@/lib/utils";

export function ProductCard({ product }: { product: ShopifyProduct }) {
  const addItem = useCartStore((s) => s.addItem);
  const [qty, setQty] = useState(1);
  const [showPrices, setShowPrices] = useState(false);

  const node = product.node;
  const img = node.images?.edges?.[0]?.node?.url || PRODUCT_IMAGES[node.handle] || "";
  const base = node.priceRange.minVariantPrice;
  const basePrice = parseFloat(base.amount);
  const cur = base.currencyCode;
  const firstVariant = node.variants?.edges?.[0]?.node;
  const multiple = (node.variants?.edges?.length ?? 0) > 1;

  const topLevel = MEMBERSHIP_LEVELS[MEMBERSHIP_LEVELS.length - 1];
  const maxSavePerPiece = basePrice * (topLevel.discountPercent / 100);

  const add = async () => {
    if (!firstVariant) return;
    await addItem({
      product,
      variantId: firstVariant.id,
      variantTitle: firstVariant.title,
      price: firstVariant.price,
      quantity: qty,
      selectedOptions: firstVariant.selectedOptions ?? [],
    });
    toast.success("Zum Warenkorb hinzugefügt", { description: `${qty}× ${node.title}` });
    setQty(1);
  };

  return (
    <div className="card-tilt overflow-hidden flex flex-col">
      <Link to={`/produkt/${node.handle}`} className="block group">
        <div className="aspect-square bg-secondary overflow-hidden">
          {img ? (
            <img src={img} alt={node.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">Kein Bild</div>
          )}
        </div>
      </Link>

      <div className="p-4 flex flex-col flex-1 gap-2">
        <Link to={`/produkt/${node.handle}`}>
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 min-h-[2.5rem] hover:text-primary transition-colors">
            {node.title}
          </h3>
        </Link>

        {/* Grundpreis */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Grundpreis</p>
          <p className="text-xl font-display font-bold text-foreground">
            {multiple && <span className="text-sm font-medium text-muted-foreground">Ab </span>}
            {formatPrice(String(basePrice), cur)}
            <span className="text-[11px] font-normal text-muted-foreground ml-1">inkl. MwSt. · zzgl. <Link to="/versand" onClick={(e) => e.stopPropagation()} className="underline">Versand</Link></span>
          </p>
        </div>

        {/* Mitgliedspreise ausklappbar */}
        <button
          type="button"
          onClick={() => setShowPrices((v) => !v)}
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline w-fit"
        >
          Mitgliedspreise ansehen
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showPrices && "rotate-180")} />
        </button>

        {showPrices && (
          <div className="rounded-lg bg-secondary/70 p-2.5 animate-fade-up">
            <div className="space-y-1">
              {MEMBERSHIP_LEVELS.map((m) => (
                <div key={m.level} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{m.name} <span className="text-primary font-semibold">−{m.discountPercent}%</span></span>
                  <span className="font-semibold text-foreground">
                    {formatPrice(String(basePrice * (1 - m.discountPercent / 100)), cur)}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-primary font-semibold mt-2">
              Mit {topLevel.name} sparst du {formatPrice(String(maxSavePerPiece), cur)} pro Stück
            </p>
            <Link to="/mitgliedschaft" className="text-[11px] text-muted-foreground hover:text-primary underline mt-1 inline-block">
              Mitgliedschaft ansehen →
            </Link>
          </div>
        )}

        {/* Menge + Hinzufügen */}
        <div className="mt-auto pt-1">
          {firstVariant?.availableForSale && !multiple ? (
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <div className="flex items-center justify-between border border-border rounded-lg shrink-0 lg:w-fit">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-9 h-9 flex items-center justify-center hover:bg-secondary rounded-l-lg" aria-label="weniger">
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center text-sm font-semibold">{qty}</span>
                <button onClick={() => setQty((q) => q + 1)} className="w-9 h-9 flex items-center justify-center hover:bg-secondary rounded-r-lg" aria-label="mehr">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <button onClick={add} className="btn-primary w-full lg:flex-1 text-sm min-h-[40px] whitespace-nowrap">
                <ShoppingCart className="w-4 h-4 shrink-0" /> Hinzufügen
              </button>
            </div>
          ) : (
            <Link to={`/produkt/${node.handle}`} className="btn-outline w-full text-sm min-h-[40px]">
              Varianten wählen
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
