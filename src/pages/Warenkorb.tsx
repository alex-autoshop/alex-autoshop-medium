import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { AboKasse, useAboListe, WarenkorbAboZeile } from "@/components/WarenkorbAbo";
import { aboAktivMerken } from "@/lib/aboListe";
import { useCartStore } from "@/stores/cartStore";
import { formatPrice } from "@/lib/shopify";
import { mitgliedZeile } from "../../shared/produktabo.js";
import { PRODUCT_IMAGES } from "@/lib/productImages";

/** Dieselbe Abo-Kasse wie im seitlichen Warenkorb, auf der ganzen Seite. */
export default function Warenkorb() {
  const items = useCartStore((s) => s.items);
  const openCart = useCartStore((s) => s.openCart);
  const liste = useAboListe();
  const [params] = useSearchParams();
  useEffect(() => {
    if (params.get("status") === "success") aboAktivMerken();
  }, [params]);
  useEffect(() => { useCartStore.getState().preiseAuffrischen(); }, []);
  const [wahl, setWahl] = useState<Record<string, number>>({});
  const ersparnis = Math.round(items.reduce((summe, item) => {
    const zeile = liste.produkte.find((p) => p.id === item.product.node.id && p.art !== "menge");
    if (!zeile) return summe;
    return summe + (mitgliedZeile(parseFloat(item.price.amount), item.quantity, zeile.rabatt)?.ersparnis ?? 0);
  }, 0) * 100) / 100;

  return (
    <div className="container py-8 sm:py-12 max-w-3xl">
      <Seo title="Warenkorb" description="Warenkorb und Produkt-Abo bei Alex Autoshop." />
      <h1 className="text-3xl sm:text-4xl mb-6">Warenkorb</h1>
      {items.length === 0 ? (
        <p className="text-muted-foreground mb-6">
          Der Warenkorb ist leer. <Link to="/shop" className="text-primary underline">Zum Shop</Link>
        </p>
      ) : (
        <ul className="space-y-4 mb-6">
          {items.map((item) => {
            const node = item.product.node;
            const drin = liste.produkte.some((p) => p.id === node.id && p.art !== "menge");
            const gespeichert = liste.produkte.find((p) => p.id === node.id && p.art !== "menge");
            const stufe = gespeichert?.rabatt ?? wahl[node.id] ?? liste.standard;
            const bild = node.images?.edges?.[0]?.node?.url || PRODUCT_IMAGES[node.handle];
            return (
              <li key={item.uid} className="rounded-xl border border-border p-3">
                <div className="flex gap-3">
                  {bild && <img src={bild} alt="" className="w-16 h-16 object-contain bg-white rounded-lg" />}
                  <div className="min-w-0">
                    <p lang="de" className="produkt-titel">{node.title}</p>
                    <p className="text-sm text-muted-foreground">{item.quantity} × {formatPrice(item.price.amount, item.price.currencyCode)}</p>
                    {item.attributes?.length ? (
                      <ul className="mt-1 space-y-0.5">
                        {item.attributes.map((angabe) => (
                          <li key={angabe.key} className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
                            <span className="font-medium text-foreground">{angabe.key}:</span> {angabe.value}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
                <WarenkorbAboZeile
                  produkt={{
                    id: node.id,
                    handle: node.handle,
                    titel: node.title,
                    preis: parseFloat(item.price.amount),
                    waehrung: item.price.currencyCode,
                    bild,
                  }}
                  menge={item.quantity}
                  stufe={stufe}
                  drin={drin}
                  onStufe={(rabatt) => setWahl((alt) => ({ ...alt, [node.id]: rabatt }))}
                />
              </li>
            );
          })}
        </ul>
      )}
      <AboKasse ersparnis={ersparnis} />
      <button type="button" onClick={openCart} className="btn-outline w-full mt-4 text-sm">
        Zur Kasse im Warenkorb
      </button>
    </div>
  );
}
