import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Minus, Plus, Trash2, Zap, ShieldCheck, CheckCircle2, FileText, Printer, CreditCard, Lock } from "lucide-react";
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

interface ConfirmedOrder {
  total: number;
  currency: string;
  count: number;
  orderId?: string;
  items: OrderItem[];
  date: string;
  companyName?: string;
  email?: string;
}

function generateInvoiceHtml(order: ConfirmedOrder): string {
  const orderNum = order.orderId
    ? `AA-${order.orderId.slice(0, 8).toUpperCase()}`
    : `AA-${Date.now().toString(36).toUpperCase()}`;

  const rows = order.items.map(item => `
    <tr>
      <td style="padding:8px 4px;border-bottom:1px solid #eee;">${item.title}${item.variantTitle && item.variantTitle !== "Default Title" ? ` (${item.variantTitle})` : ""}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #eee;text-align:right;">${new Intl.NumberFormat('de-DE', { style: 'currency', currency: item.price.currencyCode }).format(parseFloat(item.price.amount))}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #eee;text-align:right;">${new Intl.NumberFormat('de-DE', { style: 'currency', currency: item.price.currencyCode }).format(parseFloat(item.price.amount) * item.quantity)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Bestellbestätigung ${orderNum}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #111; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .logo { font-size: 24px; font-weight: bold; color: #B8860B; }
    .logo span { color: #111; }
    .meta { text-align: right; font-size: 13px; color: #555; }
    h2 { color: #B8860B; margin-top: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #f5f5f5; padding: 10px 4px; text-align: left; font-size: 13px; border-bottom: 2px solid #ddd; }
    th:nth-child(2) { text-align: center; }
    th:nth-child(3), th:nth-child(4) { text-align: right; }
    .total-row td { padding: 12px 4px; font-weight: bold; font-size: 16px; border-top: 2px solid #111; }
    .footer { margin-top: 60px; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 20px; }
    .info-box { background: #fffbea; border: 1px solid #e6c84a; padding: 16px; border-radius: 8px; margin-top: 24px; font-size: 13px; }
    @media print { body { margin: 20px; } button { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">alex <span>autoshop</span></div>
      <div style="font-size:13px;color:#555;margin-top:4px;">
        Handelstraße 64 · 42277 Wuppertal<br>
        Tel: 0202 82690 · info@alex-autoshop.de
      </div>
    </div>
    <div class="meta">
      <strong>Bestellbestätigung</strong><br>
      Nr: ${orderNum}<br>
      Datum: ${order.date}
    </div>
  </div>

  ${order.companyName ? `<p><strong>Auftraggeber:</strong> ${order.companyName}${order.email ? ` &lt;${order.email}&gt;` : ''}</p>` : ''}

  <h2>Ihre Bestellung</h2>
  <table>
    <thead>
      <tr>
        <th>Produkt</th>
        <th style="text-align:center;">Menge</th>
        <th style="text-align:right;">Einzelpreis</th>
        <th style="text-align:right;">Gesamt</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="3">Gesamtbetrag</td>
        <td style="text-align:right;">${new Intl.NumberFormat('de-DE', { style: 'currency', currency: order.currency }).format(order.total)}</td>
      </tr>
    </tbody>
  </table>

  <div class="info-box">
    <strong>Zahlung bei Abholung</strong><br>
    Bitte bringen Sie diese Bestätigung mit. Bezahlt wird an der Theke — bar oder Karte.<br>
    Öffnungszeiten: Mo–Fr 9–17:30 Uhr · Sa 9–14 Uhr
  </div>

  <div class="footer">
    Alex Autoshop · Handelstraße 64 · 42277 Wuppertal · USt-IdNr: auf Anfrage<br>
    Diese Bestätigung ist kein steuerlicher Beleg. Eine Quittung erhalten Sie bei Abholung.
  </div>

  <br>
  <button onclick="window.print()" style="margin-top:20px;padding:12px 24px;background:#B8860B;color:#fff;border:none;border-radius:6px;font-size:15px;cursor:pointer;">
    🖨️ Drucken / Als PDF speichern
  </button>
</body>
</html>`;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, isLoading, updateQuantity, removeItem, cartId, clearCart } = useCartStore();
  const { user, profile } = useAuth();

  const [placing, setPlacing] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [confirmed, setConfirmed] = useState<ConfirmedOrder | null>(null);

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

  // Express-Kauf: sofortige Bestätigung, Zahlung bei Abholung
  const handleExpressOrder = async () => {
    if (!user || items.length === 0 || placing) return;
    setPlacing(true);
    const count = items.reduce((n, i) => n + i.quantity, 0);
    const orderItems = toOrderItems();

    const { error, orderId } = await recordOrder({
      userId: user.id,
      items: orderItems,
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
      body: `Deine Bestellung über ${formatPrice(String(total), currency)} (${count} Position${count === 1 ? "" : "en"}) ist bei uns eingegangen. Wir legen sie für dich bereit — bezahlt wird bei Abholung an der Theke.`,
    });

    const snapshot: ConfirmedOrder = {
      total,
      currency,
      count,
      orderId,
      items: orderItems,
      date: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      companyName: profile?.company_name || profile?.full_name,
      email: user.email,
    };

    clearCart();
    setConfirmed(snapshot);
    setPlacing(false);
    toast.success("Bestellung bestätigt", { description: "Zahlung bei Abholung an der Theke." });
  };

  // Normaler Shopify Checkout — direkte Cart-URL ohne API-Call, 100% zuverlässig
  const handleOnlineCheckout = () => {
    if (items.length === 0) return;
    // Variant-IDs aus GID extrahieren: "gid://shopify/ProductVariant/12345" → "12345"
    const cartItems = items
      .map(i => {
        const numericId = i.variantId.split('/').pop();
        return `${numericId}:${i.quantity}`;
      })
      .join(',');
    const shopifyCartUrl = `https://j1a6sr-q2.myshopify.com/cart/${cartItems}`;
    if (user) {
      recordOrder({ userId: user.id, items: toOrderItems(), total, currency });
    }
    window.location.href = shopifyCartUrl;
  };

  const openInvoicePdf = () => {
    if (!confirmed) return;
    const html = generateInvoiceHtml(confirmed);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
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

            {/* ── Bestätigungs-Screen ── */}
            {confirmed ? (
              <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mb-5">
                  <CheckCircle2 className="w-9 h-9 text-primary" />
                </div>
                <h3 className="text-2xl font-display font-bold mb-1">Kauf bestätigt!</h3>
                {confirmed.orderId && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Bestellnr: <span className="font-mono font-semibold text-foreground">AA-{confirmed.orderId.slice(0, 8).toUpperCase()}</span>
                  </p>
                )}
                <p className="text-muted-foreground max-w-xs">
                  {confirmed.count} Position{confirmed.count === 1 ? "" : "en"} ·{" "}
                  <strong className="text-foreground">{formatPrice(String(confirmed.total), confirmed.currency)}</strong>
                </p>

                {/* Bestellte Artikel kurz auflisten */}
                <div className="mt-4 w-full max-w-xs text-left space-y-1.5">
                  {confirmed.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-muted-foreground line-clamp-1">{item.title} × {item.quantity}</span>
                      <span className="font-semibold ml-2 shrink-0">
                        {formatPrice(String(parseFloat(item.price.amount) * item.quantity), item.price.currencyCode)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-xl bg-secondary/60 border border-border p-4 text-sm text-left w-full max-w-xs">
                  <p className="flex items-center gap-2 font-semibold"><FileText className="w-4 h-4 text-primary" /> Zahlung bei Abholung</p>
                  <p className="text-muted-foreground mt-1">Wir legen deine Bestellung bereit. Bezahlt wird an der Theke — bar oder Karte.</p>
                </div>

                {/* PDF / Drucken */}
                <button
                  onClick={openInvoicePdf}
                  className="btn-gold-bright w-full max-w-xs mt-5 gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Bestellbestätigung drucken / PDF
                </button>
                <a href="/dashboard" className="btn-outline w-full max-w-xs mt-2">
                  Zu meinen Bestellungen
                </a>
                <button onClick={handleClose} className="text-sm text-muted-foreground mt-3 hover:underline">
                  Weiter einkaufen
                </button>
              </div>

            ) : (
            <>
            {/* ── Artikel-Liste ── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {items.length === 0 ? (
                <p className="text-muted-foreground text-center py-1