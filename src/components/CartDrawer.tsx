import { AnimatePresence, motion } from "framer-motion";
import { X, Minus, Plus, Trash2, ExternalLink } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { formatPrice } from "@/lib/shopify";
import { PRODUCT_IMAGES } from "@/lib/productImages";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, isLoading, updateQuantity, removeItem, checkoutUrl } = useCartStore();

  const total = items.reduce((sum, i) => sum + parseFloat(i.price.amount) * i.quantity, 0);
  const currency = items[0]?.price.currencyCode ?? "EUR";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card z-50 shadow-2xl flex flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.25 }}
            role="dialog"
            aria-label="Warenkorb"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-xl">Warenkorb</h2>
              <button
                onClick={onClose}
                className="w-12 h-12 flex items-center justify-center rounded-lg hover:bg-secondary"
                aria-label="Schließen"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {items.length === 0 ? (
                <p className="text-muted-foreground text-center py-12">
                  Dein Warenkorb ist leer.
                </p>
              ) : (
                items.map((item) => {
                  const node = item.product.node;
                  const img =
                    node.images?.edges?.[0]?.node?.url || PRODUCT_IMAGES[node.handle] || "";
                  return (
                    <div key={item.variantId} className="flex gap-3 border border-border rounded-xl p-3">
                      <div className="w-20 h-20 rounded-lg bg-secondary shrink-0 overflow-hidden">
                        {img && (
                          <img src={img} alt={node.title} className="w-full h-full object-cover" loading="lazy" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm leading-tight line-clamp-2">{node.title}</p>
                        {item.variantTitle !== "Default Title" && (
                          <p className="text-xs text-muted-foreground mt-0.5">{item.variantTitle}</p>
                        )}
                        <p className="text-primary font-bold mt-1">
                          {formatPrice(item.price.amount, item.price.currencyCode)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                            disabled={isLoading}
                            className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-secondary"
                            aria-label="Menge verringern"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                            disabled={isLoading}
                            className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-secondary"
                            aria-label="Menge erhöhen"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeItem(item.variantId)}
                            disabled={isLoading}
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/10 ml-auto"
                            aria-label="Entfernen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-border p-4 space-y-3">
                <div className="flex justify-between font-bold text-lg">
                  <span>Zwischensumme</span>
                  <span>{formatPrice(String(total), currency)}</span>
                </div>
                <a
                  href={checkoutUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary w-full"
                >
                  Zur Kasse <ExternalLink className="w-4 h-4" />
                </a>
                <p className="text-xs text-muted-foreground text-center">
                  Sichere Bezahlung über Shopify
                </p>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
