import { useEffect, useState } from "react";
import { Loader2, ShoppingBag, X, Tag, PackageSearch } from "lucide-react";
import { apArticlesByNumber, type ApArticle } from "@/lib/autoparts";
import { icPriceLookup } from "@/lib/intercarsGateway";
import { DeliveryBadge, PriceBlock, useMembership, eur } from "@/components/TeileportalPricing";
import { cn } from "@/lib/utils";

/**
 * Die Brücke vom Original-Katalog in den Verkauf.
 *
 * Der OEM-Katalog sagt WELCHES Teil verbaut ist — er kennt aber weder Preise
 * noch Marken aus dem Zubehör. Diese Leiste nimmt die Originalnummer, sucht
 * über die OE-Referenz die kaufbaren Artikel und holt dazu Live-Preis und
 * Verfügbarkeit.
 *
 * Bewusst NICHT sichtbar: unser Einkaufspreis und die Namen der Lieferanten.
 * Der Kunde sieht Marke, Preis und Lieferzeit — mehr geht ihn nichts an, und
 * mehr braucht er auch nicht.
 */

type Offer = ApArticle & {
  price?: number;
  deliveryDays?: number;
  availability?: string;
  /** Gesetzt, wenn ein baugleiches Teil einer anderen Marke geliefert wird. */
  viaAnalog?: string;
};

const MAX_LOOKUPS = 8;

export function OemOffers({
  oemNumber,
  partName,
  onAddToCart,
  onClose,
}: {
  oemNumber: string;
  partName?: string;
  onAddToCart?: (a: { name: string; brand: string; articleNumber: string; price?: number }) => void;
  onClose?: () => void;
}) {
  const [level] = useMembership();
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const no = (oemNumber || "").trim();
    if (!no) {
      setOffers(null);
      return;
    }
    let alive = true;
    setBusy(true);
    setError(null);
    setOffers(null);

    (async () => {
      try {
        const found = await apArticlesByNumber(no);
        // Doppelte (gleiche Marke + Nummer) fliegen raus, sonst steht dasselbe
        // Teil dreimal untereinander.
        const seen = new Set<string>();
        const list: Offer[] = [];
        for (const a of found) {
          const key = `${a.brand}|${a.articleNumber}`.toUpperCase();
          if (seen.has(key)) continue;
          seen.add(key);
          list.push(a);
        }
        if (!alive) return;
        if (list.length === 0) {
          setOffers([]);
          return;
        }
        setOffers(list);

        // Preise nachladen — die Liste steht schon, die Preise tropfen nach.
        const withPrices = await Promise.all(
          list.slice(0, MAX_LOOKUPS).map(async (a) => {
            try {
              const live = await icPriceLookup(a.articleNumber, partName || a.name);
              return live
                ? {
                    ...a,
                    price: live.price,
                    deliveryDays: live.deliveryDays,
                    availability: live.availability,
                    viaAnalog: live.viaAnalog,
                  }
                : a;
            } catch {
              return a;
            }
          })
        );
        if (!alive) return;
        const rest = list.slice(MAX_LOOKUPS);
        const all = [...withPrices, ...rest].sort((x, y) => {
          if (x.price != null && y.price != null) return x.price - y.price;
          if (x.price != null) return -1;
          if (y.price != null) return 1;
          return 0;
        });
        setOffers(all);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setBusy(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [oemNumber, partName]);

  const priced = (offers ?? []).filter((o) => o.price != null);
  const spread =
    priced.length > 1
      ? Math.max(...priced.map((o) => o.price!)) - Math.min(...priced.map((o) => o.price!))
      : 0;

  return (
    <div className="border-t border-border bg-secondary/25 flex flex-col min-h-0">
      {/* Kopf */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card/70 shrink-0">
        <Tag className="w-3.5 h-3.5 text-primary shrink-0" />
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
          Kaufbar zu <span className="font-mono text-foreground">{oemNumber}</span>
        </p>
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />}
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto w-6 h-6 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground shrink-0"
            aria-label="Angebote schließen"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {spread > 0.5 && (
        <p className="px-3 py-1.5 text-[11px] text-primary font-semibold border-b border-border/60 shrink-0">
          Bis zu {eur(spread)} Unterschied zwischen den Angeboten — günstigstes steht oben.
        </p>
      )}

      {/* Liste */}
      <div className="overflow-y-auto min-h-0">
        {error && <p className="px-3 py-4 text-xs text-muted-foreground">{error}</p>}

        {!error && offers === null && busy && (
          <p className="px-3 py-5 text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Suche kaufbare Teile zu dieser
            Originalnummer …
          </p>
        )}

        {!error && offers?.length === 0 && (
          <div className="px-3 py-5 text-xs text-muted-foreground flex items-start gap-2">
            <PackageSearch className="w-4 h-4 shrink-0 mt-0.5 opacity-50" />
            <span>
              Zu dieser Originalnummer haben wir noch kein Zubehörteil im Katalog. Ruf uns an —
              wir besorgen das Originalteil.
            </span>
          </div>
        )}

        {offers?.map((o, i) => (
          <div
            key={`${o.brand}-${o.articleNumber}-${i}`}
            className={cn(
              "flex items-start gap-3 px-3 py-2.5 border-b border-border/50 last:border-0",
              i === 0 && o.price != null && "bg-primary/5"
            )}
          >
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold leading-tight truncate">{o.name}</p>
              <p className="text-[11px] text-muted-foreground font-mono truncate">
                {o.brand} · {o.articleNumber}
              </p>
              {o.viaAnalog && (
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                  baugleich geliefert als {o.viaAnalog}
                </p>
              )}
              <div className="mt-1.5">
                <DeliveryBadge deliveryDays={o.deliveryDays} availability={o.availability} />
              </div>
            </div>

            <div className="shrink-0 text-right">
              {o.price != null ? (
                <PriceBlock price={o.price} level={level} />
              ) : (
                <p className="text-[11px] text-muted-foreground">Preis auf Anfrage</p>
              )}
              {onAddToCart && (
                <button
                  onClick={() =>
                    onAddToCart({
                      name: o.name,
                      brand: o.brand,
                      articleNumber: o.articleNumber,
                      price: o.price,
                    })
                  }
                  className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground text-[11px] font-bold hover:bg-gold-deep transition-colors"
                >
                  <ShoppingBag className="w-3 h-3" /> In den Warenkorb
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
