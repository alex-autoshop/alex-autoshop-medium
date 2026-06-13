import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ShoppingCart, Minus, Plus, ChevronLeft, Store } from "lucide-react";
import { toast } from "sonner";
import { Seo } from "@/components/Seo";
import {
  type ShopifyProduct,
  storefrontApiRequest,
  STOREFRONT_PRODUCT_BY_HANDLE_QUERY,
  formatPrice,
} from "@/lib/shopify";
import { PRODUCT_IMAGES } from "@/lib/productImages";
import { MEMBERSHIP_LEVELS } from "@/data/memberships";
import { useCartStore } from "@/stores/cartStore";
import { cn } from "@/lib/utils";

type ProductNode = ShopifyProduct["node"] & { vendor?: string };

export default function ProductDetail() {
  const { handle } = useParams();
  const [product, setProduct] = useState<ProductNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((s) => s.addItem);
  const cartLoading = useCartStore((s) => s.isLoading);

  useEffect(() => {
    if (!handle) return;
    setIsLoading(true);
    setProduct(null);
    storefrontApiRequest(STOREFRONT_PRODUCT_BY_HANDLE_QUERY, { handle })
      .then((data) => {
        const p = data?.data?.productByHandle ?? null;
        setProduct(p);
        setSelectedVariantId(p?.variants?.edges?.[0]?.node?.id ?? null);
      })
      .catch(() => setProduct(null))
      .finally(() => setIsLoading(false));
  }, [handle]);

  const variants = product?.variants?.edges?.map((e) => e.node) ?? [];
  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? variants[0];
  const img =
    product?.images?.edges?.[0]?.node?.url || (handle ? PRODUCT_IMAGES[handle] : "") || "";

  const price = selectedVariant?.price;
  const priceNum = price ? parseFloat(price.amount) : 0;

  const jsonLd = useMemo(
    () =>
      product
        ? {
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.title,
            image: img || undefined,
            description: product.description,
            offers: {
              "@type": "Offer",
              priceCurrency: price?.currencyCode ?? "EUR",
              price: price?.amount,
              availability: selectedVariant?.availableForSale
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            },
          }
        : undefined,
    [product, img, price, selectedVariant]
  );

  if (isLoading) {
    return (
      <div className="container py-12">
        <div className="grid md:grid-cols-2 gap-8 animate-pulse">
          <div className="aspect-square bg-secondary rounded-2xl" />
          <div className="space-y-4">
            <div className="h-8 bg-secondary rounded w-3/4" />
            <div className="h-6 bg-secondary rounded w-1/3" />
            <div className="h-32 bg-secondary rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container py-24 text-center">
        <h1 className="text-2xl mb-4">Produkt nicht gefunden</h1>
        <Link to="/shop" className="btn-primary">Zurück zum Shop</Link>
      </div>
    );
  }

  const addToCart = async () => {
    if (!selectedVariant) return;
    await addItem({
      product: { node: product },
      variantId: selectedVariant.id,
      variantTitle: selectedVariant.title,
      price: selectedVariant.price,
      quantity,
      selectedOptions: selectedVariant.selectedOptions ?? [],
    });
    toast.success("In den Warenkorb gelegt", { description: `${quantity}× ${product.title}` });
  };

  return (
    <div className="container py-8 sm:py-12">
      <Seo title={product.title} description={product.description?.slice(0, 155)} jsonLd={jsonLd} />

      <Link to="/shop" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6 min-h-[44px]">
        <ChevronLeft className="w-4 h-4" /> Zurück zum Shop
      </Link>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-14">
        <div className="card-tilt overflow-hidden hover:translate-y-0">
          <div className="aspect-square bg-secondary">
            {img ? (
              <img src={img} alt={product.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">Kein Bild</div>
            )}
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl leading-tight">{product.title}</h1>
          <p className="text-3xl font-bold mt-4">
            {price && formatPrice(String(priceNum * quantity), price.currencyCode)}
          </p>

          {variants.length > 1 && (
            <div className="mt-6">
              <p className="font-semibold mb-2 text-sm">Variante wählen</p>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariantId(v.id)}
                    disabled={!v.availableForSale}
                    className={cn(
                      "px-4 py-3 rounded-lg border font-medium text-sm min-h-[48px] transition-colors",
                      v.id === selectedVariant?.id
                        ? "bg-night text-white border-night"
                        : "bg-card border-border hover:border-primary",
                      !v.availableForSale && "opacity-40 line-through"
                    )}
                  >
                    {v.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 mt-6">
            <div className="flex items-center border border-border rounded-lg">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-12 h-12 flex items-center justify-center hover:bg-secondary rounded-l-lg"
                aria-label="Menge verringern"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-10 text-center font-bold">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="w-12 h-12 flex items-center justify-center hover:bg-secondary rounded-r-lg"
                aria-label="Menge erhöhen"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={addToCart}
              disabled={cartLoading || !selectedVariant?.availableForSale}
              className="btn-primary flex-1"
            >
              <ShoppingCart className="w-5 h-5" />
              {selectedVariant?.availableForSale ? "In den Warenkorb" : "Nicht verfügbar"}
            </button>
          </div>

          <div className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-5">
            <p className="font-display font-bold mb-3">Mitgliederpreise</p>
            <table className="w-full text-sm">
              <tbody>
                {MEMBERSHIP_LEVELS.map((m) => {
                  const memberPrice = priceNum * (1 - m.discountPercent / 100);
                  return (
                    <tr key={m.level} className="border-b border-primary/10 last:border-0">
                      <td className="py-2 font-medium">{m.name} ({m.discountPercent}%)</td>
                      <td className="py-2 text-right font-bold text-primary">
                        {price && formatPrice(String(memberPrice), price.currencyCode)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Link to="/mitgliedschaft" className="text-sm text-primary font-semibold underline mt-3 inline-block min-h-[44px] pt-2">
              Mitglied werden →
            </Link>
          </div>

          {product.description && (
            <div className="mt-8">
              <h2 className="text-lg mb-2">Beschreibung</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}

          <div className="mt-8 flex items-start gap-3 text-sm text-muted-foreground">
            <Store className="w-5 h-5 mt-0.5 shrink-0 text-primary" />
            <p>
              Abholung im Laden: Handelstraße 64, 42277 Wuppertal — Mo–Fr 9–17:30, Sa 9–14.
              Viele Produkte heute abholbereit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
