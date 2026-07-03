import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Minus, Plus, Trash2, Zap, ShieldCheck, CheckCircle2, FileText } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cartStore";
import { formatPrice, fetchFreshCheckoutUrl } from "@/lib/shopify";
import { PRODUCT_IMAGES } from "@/lib/productImages";
import { useAuth } from "@/context/AuthContext";
import { discountForLevel } from "@/data/memberships";
import { recordOrder, type OrderItem } from "@/lib/orders";
import { sendMessage } from "@/lib/inbox";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, isLoading, updateQuantity, removeItem, cartId, clearCart } = useCartStore();
  const { user, profile } = useAuth();

  const [placing, setPlacing] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  // Bestätigte Rechnungs-/Abholbestellung — zeigt die Erfolgsansicht im Drawer.
  const [confirmed, setConfirmed] = useState<{ total: number; currency: string; count: number } | null>(null);

  const total = items.reduce((sum, i) => sum + parseFloat(i.price.amount) * i.quantity, 0);
  const currency = items[0]?.price.currencyCode ?? "EUR";
  const discount = user ? discountForLevel(profile.membership_level) : 0;
  const memberSaving = total * (discount / 100);

  const toOrderItems = (): OrderItem[] =>
    items.map((i) => ({
      variantId: i.variantId,
      variantTitle: i.variantTitle,
      title: i.product.node.title,
      handle: i.product.node.handle,
      image: i.product.node.images?.edges?.[0]?.node?.url ?? "",
      price: i.price,
      quantity: i.quantity,
    }));

  // Bestellung erfassen (nur eingeloggt) bevor Shopify-Checkout öffnet
  const handleCheckout = () => {
    if (!user) return;
    recordOrder({ userId: user.id, items: toOrderItems(), total, currency });
  };

  // Mitglieder-Direktbestellung auf Rechnung — ein Klick, sofortige Bestätigung,
  // Zahlung bei Abholung/an der Theke. Kein Online-Abbuchen.
  const handleInvoiceOrder = async () => {
    if (!user || items.length === 0 || placing) return;
    setPlacing(true);
    const count = items.reduce((n, i) => n + i.quantity, 0);
    const snapshot = { total, currency, count };
    const { error } = await recordOrder({
      userId: user.id,
      items: toOrderItems(),
      total,
      currency,
      status: "bestaetigt",
    });
    if (error) {
      toast.error("Bestellung konnte nicht gespeichert werden", { description: error });
      setPlacing(false);
      return;
    }
    await sendMessage({
      recipient: user.id,
      type: "system",
      title: "Bestellung bestätigt ✓",
      body: `Deine Bestellung über ${formatPrice(String(total), currency)} (${count} Position${count === 1 ? "" : "en"}) ist bei uns eingegangen. Wir legen sie für dich bereit — bezahlt wird bei Abholung an der Theke. Den Status siehst du hier im Dashboard.`,
    });
    clearCart();
    setConfirmed(snapshot);
    setPlacing(false);
    toast.success("Bestellung bestätigt", { description: "Zahlung bei Abholung an der Theke." });
  };

  const handleClose = () => {
    setConfirmed(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
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
              <h2 className="text-xl">{confirmed ? "Bestellung bestätigt" : "Warenkorb"}</h2>
              <button
                onClick={handleClose}
                className="w-12 h-12 flex items-center justify-center rounded-lg hover:bg-secondary"
                aria-label="Schließen"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {confirmed ? (
              <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mb-5">
                  <CheckCircle2 className="w-9 h-9 text-primary" />
                </div>
                <h3 className="text-2xl font-display font-bold mb-2">Danke für deine Bestellung!</h3>
                <p className="text-muted-foreground max-w-xs">
                  {confirmed.count} Position{confirmed.count === 1 ? "" : "en"} über{" "}
                  <strong className="text-foreground">{formatPrice(String(confirmed.total), confirmed.currency)}</strong>{" "}
                  sind bei uns eingegangen. Wir legen alles für dich bereit.
                </p>
                <div className="mt-5 rounded-xl bg-secondary/60 border border-border p-4 text-sm text-left w-full max-w-xs space-y-1.5">
                  <p className="flex items-center gap-2 font-semibold"><FileText className="w-4 h-4 text-primary" /> Zahlung bei Abholung</p>
                  <p className="text-muted-foreground">Bezahlt wird an der Theke — bar oder per Karte. Den Status findest du in deinem Dashboard.</p>
                </div>
                <a href="/dashboard" className="btn-gold-bright w-full max-w-xs mt-6">Zu meinen Bestellungen</a>
                <button onClick={handleClose} className="btn-outline w-full max-w-xs mt-2">Weiter einkaufen</button>
              </div>
            ) : (
            <>
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
                    <div key={item.uid} className="flex gap-3 border border-border rounded-xl p-3">
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
                        {item.attributes && item.attributes.length > 0 && (
                          <ul className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
                            {item.attributes.map((a) => (
                              <li key={a.key}><span className="font-medium">{a.key}:</span> {a.value}</li>
                            ))}
                          </ul>
                        )}
                        <p className="text-primary font-bold mt-1">
                          {formatPrice(item.price.amount, item.price.currencyCode)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQuantity(item.uid, item.quantity - 1)}
                            disabled={isLoading}
                            className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-secondary"
                            aria-label="Menge verringern"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.uid, item.quantity + 1)}
                            disabled={isLoading}
                            className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-secondary"
                            aria-label="Menge erhöhen"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeItem(item.uid)}
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
                  <span>Gesamt</span>
                  <span>{formatPrice(String(total), currency)}</span>
                </div>

                {discount > 0 && (
                  <div className="rounded-lg bg-primary/10 border border-primary/20 p-2.5 text-sm text-center">
                    <span className="text-primary font-semibold">
                      Als Mitglied ({discount}%) sparst du {formatPrice(String(memberSaving), currency)}
                    </span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      wird an der Kasse / Theke verrechnet
                    </span>
                  </div>
                )}

                {/* Mitglieder: 1-Klick auf Rechnung bestellen, zahlen bei Abholung */}
                {user && (
                  <button
                    onClick={handleInvoiceOrder}
                    disabled={placing}
                    className="btn-gold-bright w-full text-base font-bold disabled:opacity-60"
                  >
                    <FileText className="w-5 h-5" />
                    {placing ? "Wird bestätigt …" : "Als Mitglied bestellen — zahlen bei Abholung"}
                  </button>
                )}

                {/* Online sofort bezahlen über Shopify — immer frische URL holen */}
                <button
                  disabled={checkoutLoading}
                  onClick={async () => {
                    if (!cartId) {
                      toast.error("Warenkorb nicht gefunden", { description: "Füge ein Produkt hinzu und versuch es nochmal." });
                      return;
                    }
                    setCheckoutLoading(true);
                    try {
                      const freshUrl = await fetchFreshCheckoutUrl(cartId);
                      if (!freshUrl) {
                        toast.error("Online-Kasse gerade nicht verfügbar", { description: "Bestell als Mitglied auf Rechnung oder versuch es gleich nochmal." });
                        return;
                      }
                      handleCheckout();
                      window.open(freshUrl, '_blank', 'noopener,noreferrer');
                    } finally {
                      setCheckoutLoading(false);
                    }
                  }}
                  className={user ? "btn-outline w-full" : "btn-gold-bright w-full text-base font-bold"}
                >
                  <Zap className="w-5 h-5" />
                  {checkoutLoading ? "Wird geladen …" : "Express-Kauf (online zahlen)"}
                </button>

                {discount === 0 && (
                  <p className="text-xs text-center text-muted-foreground">
                    {user ? (
                      <>Als Mitglied sparst du bis zu 38%. <a h