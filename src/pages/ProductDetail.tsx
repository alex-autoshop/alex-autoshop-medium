import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { shopZurueckZiel } from "../../shared/shop-zustand.js";
import { ShoppingCart, Minus, Plus, ChevronLeft, Store } from "lucide-react";
import { toast } from "sonner";
import { Seo } from "@/components/Seo";
import {
  type ShopifyProduct,
  formatPrice,
} from "@/lib/shopify";
import { leseEinbettung, nimmFrisch, produktHolen } from "@/lib/katalog";
import { ShopBild } from "@/components/ShopBild";
import { PRODUCT_IMAGES } from "@/lib/productImages";
import { MEMBERSHIP_LEVELS } from "@/data/memberships";
import { useCartStore } from "@/stores/cartStore";
import { PaintConfigurator } from "@/components/PaintConfigurator";
import { DeliveryBadge } from "@/components/DeliveryBadge";
import { Grundpreis } from "@/components/Grundpreis";
import { GpsrHinweis } from "@/components/GpsrHinweis";
import { gpsrLesen } from "../../shared/gpsr.js";
import { AboKnopf } from "@/components/AboKnopf";
import { BaldVerfuegbar, GefahrstoffBlock, GefahrstoffKompakt } from "@/components/GefahrstoffHinweis";
import { TechnischeDokumentation } from "@/components/TechnischeDokumentation";
import { gefahrstoffVonKnoten, kaufGesperrt } from "../../shared/gefahrstoff.js";
import { cn } from "@/lib/utils";
import { EmpfohleneProdukte } from "@/components/EmpfohleneProdukte";
import { AnwendungProzess } from "@/components/AnwendungProzess";

function ZurueckZumShop({ className, mitPfeil = false }: { className?: string; mitPfeil?: boolean }) {
  const ziel = useMemo(() => shopZurueckZiel(), []);
  return (
    <Link
      to={{ pathname: ziel.pathname, search: ziel.search }}
      state={{ shopZurueck: true }}
      className={className}
    >
      {mitPfeil && <ChevronLeft className="w-4 h-4" />} Zurück zum Shop
    </Link>
  );
}

// Produkte mit Farb-Konfigurator (Marke → System → Menge → Fahrzeug → Farbcode)
const CONFIGURATOR_HANDLES = new Set([
  "farben-mix",
  "individuelle-spraydose-erstellen",
  "individuellen-lackstift-bestellen-20ml",
]);

type ProductNode = ShopifyProduct["node"] & { vendor?: string };

export default function ProductDetail() {
  const { handle = "" } = useParams();
  const key = `produkt:${handle}`;
  const start = leseEinbettung((m) => m.schluessel === key);
  const startProdukt = (start?.data?.productByHandle ?? null) as ProductNode | null;
  const [fuer, setFuer] = useState(key);
  const [product, setProduct] = useState<ProductNode | null>(startProdukt);
  const [isLoading, setIsLoading] = useState(!startProdukt);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(startProdukt?.variants?.edges?.[0]?.node?.id ?? null);
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((s) => s.addItem);
  const cartLoading = useCartStore((s) => s.isLoading);

  if (fuer !== key) {
    const neu = leseEinbettung((m) => m.schluessel === key)?.data?.productByHandle as ProductNode | null;
    setFuer(key);
    setProduct(neu ?? null);
    setIsLoading(!neu);
    setSelectedVariantId(neu?.variants?.edges?.[0]?.node?.id ?? null);
    setQuantity(1);
  }

  useEffect(() => {
    if (!handle) return;
    let aktiv = true;
    (async () => {
      const data = await nimmFrisch((m) => m?.schluessel === key)
        ?? await produktHolen(handle);
      if (!aktiv) return;
      const p = (data?.data?.productByHandle ?? null) as ProductNode | null;
      if (p) {
        setProduct(p);
        setSelectedVariantId((bisher) =>
          bisher && p.variants?.edges?.some((e) => e.node.id === bisher) ? bisher : p.variants?.edges?.[0]?.node?.id ?? null,
        );
      } else {
        setProduct((bisher) => bisher);
      }
      setIsLoading(false);
    })();
    return () => { aktiv = false; };
  }, [handle, key]);

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
        <ZurueckZumShop className="btn-primary" />
      </div>
    );
  }

  const gefahr = gefahrstoffVonKnoten(product);
  const hersteller = gpsrLesen(product.gpsr);
  const gesperrt = kaufGesperrt(gefahr);

  const addToCart = async () => {
    console.log('[addToCart] called, selectedVariant:', selectedVariant?.id, 'cartLoading:', cartLoading);
    if (!selectedVariant || !handle) { console.log('[addToCart] no selectedVariant, return'); return; }
    const live = await produktHolen(handle, true);
    const aktuell = (live?.data?.productByHandle ?? product) as ProductNode;
    const variante = aktuell.variants?.edges?.find((e) => e.node.id === selectedVariant.id)?.node ?? selectedVariant;
    console.log('[addToCart] calling addItem...');
    await addItem({
      product: { node: aktuell },
      variantId: variante.id,
      variantTitle: variante.title,
      price: variante.price,
      quantity,
      selectedOptions: variante.selectedOptions ?? [],
    });
    console.log('[addToCart] addItem done');
    toast.success("In den Warenkorb gelegt", { description: `${quantity}× ${product.title}` });
  };

  return (
    <div className="container py-8 sm:py-12">
      <Seo title={product.title} description={product.description?.slice(0, 155)} jsonLd={jsonLd} />

      <ZurueckZumShop
        mitPfeil
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6 min-h-[44px]"
      />

      <div className="grid md:grid-cols-2 gap-8 lg:gap-14">
        <div className="card-tilt overflow-hidden hover:translate-y-0">
          <div className="aspect-square bg-white">
            {img ? (
              <ShopBild
                src={img}
                alt={product.title}
                priority
                sizes="(min-width: 768px) 45vw, 92vw"
                className="w-full h-full object-contain p-4"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">Kein Bild</div>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl leading-tight mb-4">{product.title}</h1>
          {gefahr.ist && !gesperrt && <div className="mb-4"><GefahrstoffKompakt g={gefahr} /></div>}

          {CONFIGURATOR_HANDLES.has(handle ?? "") ? (
            <>
              <PaintConfigurator product={product} />
              <AboKnopf
                className="mt-3"
                produkt={{
                  id: product.id,
                  handle: product.handle,
                  titel: product.title,
                  preis: priceNum,
                  waehrung: price?.currencyCode ?? "EUR",
                  bild: img || undefined,
                }}
              />
            </>
          ) : (
          <>
          <p className="text-3xl font-bold">
            {price && formatPrice(String(priceNum * quantity), price.currencyCode)}
          </p>
          <Grundpreis variant={selectedVariant} className="mt-1 text-sm" />

          <DeliveryBadge node={product} variant={selectedVariant} available={selectedVariant?.availableForSale !== false} size="md" className="mt-5" />

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

          {gesperrt ? <div className="mt-6"><BaldVerfuegbar /></div> : <div className="flex items-center gap-3 mt-6">
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
          </div>}
          {!gesperrt && <AboKnopf
            className="mt-3"
            produkt={{
              id: product.id,
              handle: product.handle,
              titel: product.title,
              preis: priceNum,
              waehrung: price?.currencyCode ?? "EUR",
              bild: img || undefined,
            }}
          />}

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
          </>
          )}

          {product.description && (
            <div className="mt-8">
              <h2 className="text-lg mb-2">Beschreibung</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}
          <AnwendungProzess key={product.handle} produkt={product} />
          {(gefahr.ist || hersteller.hat) && (
            <div className="mt-8 space-y-4">
              <GefahrstoffBlock g={gefahr} />
              <GpsrHinweis felder={product.gpsr} />
            </div>
          )}
          <TechnischeDokumentation g={gefahr} titel={product.title} handle={product.handle} />

          <div className="mt-8 flex items-start gap-3 text-sm text-muted-foreground">
            <Store className="w-5 h-5 mt-0.5 shrink-0 text-primary" />
            <p>
              Abholung im Laden: Handelstraße 64, 42277 Wuppertal — Mo–Fr 9–17:30, Sa 9–14.
              Viele Produkte heute abholbereit.
            </p>
          </div>
        </div>
      </div>

      <EmpfohleneProdukte produkt={product} />
    </div>
  );
}
