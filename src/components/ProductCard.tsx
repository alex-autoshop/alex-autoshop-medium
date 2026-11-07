import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingCart, Minus, Plus, ChevronDown } from "lucide-react";
import { ShopBild } from "@/components/ShopBild";

const AboKnopf = lazy(() => import("@/components/AboKnopf").then((m) => ({ default: m.AboKnopf })));
import { toast } from "sonner";
import { type ShopifyProduct, formatPrice } from "@/lib/shopify";
import { PRODUCT_IMAGES } from "@/lib/productImages";
import { useCartStore } from "@/stores/cartStore";
import { MEMBERSHIP_LEVELS } from "@/data/memberships";
import { cn } from "@/lib/utils";
import { DeliveryBadge } from "@/components/DeliveryBadge";
import { Grundpreis } from "@/components/Grundpreis";
import { BaldVerfuegbar, GefahrstoffKompakt } from "@/components/GefahrstoffHinweis";
import { gefahrstoffVonKnoten, kaufGesperrt } from "../../shared/gefahrstoff.js";

export function ProductCard({ product, priority = false }: { product: ShopifyProduct; priority?: boolean }) {
  const addItem = useCartStore((s) => s.addItem);
  const [qty, setQty] = useState(1);
  const [showPrices, setShowPrices] = useState(false);

  /**
   * Mengenwähler und "Hinzufügen" nebeneinander brauchen zusammen rund 270 px.
   * Wie breit die Karte wirklich ist, hängt von der Seite ab (Shop: 5 Spalten,
   * Startseite enger). Fester Breakpoint reicht deshalb nicht — bei schmalen
   * Karten wurde der Knopf am Kartenrand abgeschnitten. Jetzt misst die Karte
   * sich selbst: zu eng → Knopf kommt unter den Mengenwähler.
   */
  const spalte = useRef<HTMLDivElement | null>(null);
  const [breite, setBreite] = useState(999);
  useEffect(() => {
    const el = spalte.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const beobachter = new ResizeObserver(([e]) => setBreite(e.contentRect.width));
    beobachter.observe(el);
    return () => beobachter.disconnect();
  }, []);
  /** Ab hier passt nebeneinander nur noch ohne Symbol und mit schmalem Zähler. */
  const knapp = breite < 272;
  /** Und ab hier gar nicht mehr — dann steht der Knopf unter dem Zähler. */
  const eng = breite < 200;

  const node = product.node;
  const img = node.images?.edges?.[0]?.node?.url || PRODUCT_IMAGES[node.handle] || "";
  const base = node.priceRange.minVariantPrice;
  const basePrice = parseFloat(base.amount);
  const cur = base.currencyCode;
  const firstVariant = node.variants?.edges?.[0]?.node;
  const multiple = (node.variants?.edges?.length ?? 0) > 1;
  const gefahr = gefahrstoffVonKnoten(node);
  const gesperrt = kaufGesperrt(gefahr);

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

  const aboProdukt = {
    id: node.id,
    handle: node.handle,
    titel: node.title,
    preis: basePrice,
    waehrung: cur,
    bild: img || undefined,
  };

  return (
    <div className="card-tilt overflow-hidden flex flex-col h-full">
      <Link to={`/produkt/${node.handle}`} className="block group">
        <div className="aspect-square bg-white overflow-hidden">
          {img ? (
            <ShopBild src={img} alt={node.title} priority={priority} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">Kein Bild</div>
          )}
        </div>
      </Link>

      <div ref={spalte} className="p-3 sm:p-4 flex flex-col flex-1 gap-2">
        <Link to={`/produkt/${node.handle}`}>
          <p lang="de" className="produkt-titel hover:text-primary transition-colors">
            {node.title}
          </p>
        </Link>
        {gefahr.ist && !gesperrt && <GefahrstoffKompakt g={gefahr} />}

        <div className="mt-auto flex flex-col gap-2">
        <div>
          <p className="text-xl font-display font-bold text-foreground">
            {multiple && <span className="text-sm font-medium text-muted-foreground">Ab </span>}
            {formatPrice(String(basePrice), cur)}
            <span className="text-[11px] font-normal text-muted-foreground ml-1">inkl. MwSt. · zzgl. <Link to="/versand" onClick={(e) => e.stopPropagation()} className="underline">Versand</Link></span>
          </p>
          <Grundpreis variant={firstVariant} className="mt-0.5" />
        </div>

        <DeliveryBadge node={node} variant={firstVariant} available={firstVariant?.availableForSale !== false} />

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
        <div className="mt-auto pt-1 flex flex-col gap-2">
          {gesperrt ? (
            <BaldVerfuegbar />
          ) : firstVariant?.availableForSale && !multiple ? (
            <div className={cn("flex gap-2", eng ? "flex-col" : "flex-row items-center")}>
              <div className={cn("flex items-center border border-border rounded-lg shrink-0", eng ? "justify-between" : "w-fit")}>
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className={cn("h-9 flex items-center justify-center hover:bg-secondary rounded-l-lg", knapp && !eng ? "w-8" : "w-9")} aria-label="weniger">
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className={cn("text-center text-sm font-semibold", knapp && !eng ? "w-6" : "w-8")}>{qty}</span>
                <button onClick={() => setQty((q) => q + 1)} className={cn("h-9 flex items-center justify-center hover:bg-secondary rounded-r-lg", knapp && !eng ? "w-8" : "w-9")} aria-label="mehr">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              {/* Schmaler Innenabstand und min-w-0: der Knopf darf schrumpfen,
                  statt aus der Karte zu laufen. Auf engen Karten fällt das
                  Einkaufswagen-Symbol weg — die Beschriftung zählt mehr. */}
              <button onClick={add} className={cn("btn-primary text-sm min-h-[40px] gap-1.5 min-w-0", knapp && !eng ? "px-2.5" : "px-3", eng ? "w-full" : "flex-1")}>
                {(!knapp || eng) && <ShoppingCart className="w-4 h-4 shrink-0" />}
                <span className="truncate">Hinzufügen</span>
              </button>
            </div>
          ) : (
            <Link to={`/produkt/${node.handle}`} className="btn-outline w-full text-sm min-h-[40px]">
              Varianten wählen
            </Link>
          )}
          {!gesperrt && (
            <Suspense fallback={<div className="min-h-12" />}>
              <AboKnopf produkt={aboProdukt} kurz={breite < 220} />
            </Suspense>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
