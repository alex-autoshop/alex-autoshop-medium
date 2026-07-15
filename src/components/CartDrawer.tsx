import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Minus, Plus, Trash2, Zap, ShieldCheck, CheckCircle2, FileText, Printer, CreditCard, Lock, Truck, Info } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cartStore";
import { formatPrice } from "@/lib/shopify";
import { PRODUCT_IMAGES } from "@/lib/productImages";
import { useAuth } from "@/context/AuthContext";
import { discountForLevel } from "@/data/memberships";
import { recordOrder, type OrderItem } from "@/lib/orders";
import { sendMessage } from "@/lib/inbox";
import { AuthModal } from "@/components/AuthModal";

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
  mode?: "abholung" | "auf_rechnung" | "sepa";
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

  ${order.mode === "auf_rechnung" ? `
  <div class="info-box" style="background:#fff8e1;border-color:#f5c518;">
    <strong>Zahlung auf Rechnung (14 Tage)</strong><br>
    Bitte überweise den Betrag innerhalb von 14 Tagen nach Lieferung:<br><br>
    <strong>Empfänger:</strong> Alex Autoshop · Alexander Haritopoulos<br>
    <strong>IBAN:</strong> [wird nach Bestellbestätigung per E-Mail mitgeteilt]<br>
    <strong>Verwendungszweck:</strong> Bestellung AA-${order.orderId ? order.orderId.slice(0, 8).toUpperCase() : "XXXXXX"}<br><br>
    <em>Lieferung erfolgt nach Auftragsbestätigung durch Alex Autoshop.</em>
  </div>
  ` : order.mode === "sepa" ? `
  <div class="info-box" style="background:#e8f5e9;border-color:#4caf50;">
    <strong>Zahlung per SEPA-Lastschrift</strong><br>
    Der Betrag wird von deinem hinterlegten Bankkonto eingezogen.<br>
    Buchungsdatum: innerhalb von 2–3 Werktagen.
  </div>
  ` : `
  <div class="info-box">
    <strong>Zahlung bei Abholung</strong><br>
    Bitte bringen Sie diese Bestätigung mit. Bezahlt wird an der Theke — bar oder Karte.<br>
    Öffnungszeiten: Mo–Fr 9–17:30 Uhr · Sa 9–14 Uhr
  </div>
  `}

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
  const { items, isLoading, updateQuantity, removeItem, clearCart } = useCartStore();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [placing, setPlacing] = useState(false);
  const [confirmed, setConfirmed] = useState<ConfirmedOrder | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const total = items.reduce((sum, i) => sum + parseFloat(i.price.amount) * i.quantity, 0);
  const currency = items[0]?.price.currencyCode ?? "EUR";
  const discount = user ? discountForLevel(profile.membership_level) : 0;
  const memberSaving = total * (discount / 100);

  // Versandlogik
  const FREE_THRESHOLD = 150;
  const DHL_RATE = 5.9;
  const isMember = user && (profile.membership_level === "level1" || profile.membership_level === "level2" || profile.membership_level === "level3");
  const shippingCost = isMember ? 0 : total >= FREE_THRESHOLD ? 0 : DHL_RATE;
  const remainingForFree = Math.max(0, FREE_THRESHOLD - total);
  const freeProgress = Math.min(100, (total / FREE_THRESHOLD) * 100);

  // PLZ-Check NUR aus gespeichertem Profil — kein manuelles Eingabefeld im Warenkorb
  const profilePlz = (profile.delivery_plz || "").replace(/\D/g, "");
  const isWuppertal = profilePlz.length === 5 && profilePlz.startsWith("42");

  // Express-Kauf: IBAN vorhanden?
  const hasIban = !!profile.iban;

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

  // Express-Kauf: SEPA (wenn IBAN) oder Abholung
  const handleExpressOrder = async () => {
    if (!user || items.length === 0 || placing) return;
    if (!hasIban) {
      toast.info("Bankdaten für Express-Kauf hinterlegen", {
        description: "Trage deine IBAN einmalig in den Dashboard-Einstellungen ein.",
        action: { label: "Jetzt eintragen →", onClick: () => { onClose(); navigate("/dashboard?tab=settings"); } },
      });
      return;
    }
    setPlacing(true);
    const count = items.reduce((n, i) => n + i.quantity, 0);
    const orderItems = toOrderItems();

    const { error, orderId } = await recordOrder({
      userId: user.id,
      items: orderItems,
      total,
      currency,
      status: "sepa_pending",
    });

    if (error) {
      toast.error("Bestellung konnte nicht gespeichert werden", { description: error });
      setPlacing(false);
      return;
    }

    await sendMessage({
      recipient: user.id,
      type: "system",
      title: "Express-Kauf bestätigt ✓ — SEPA-Einzug",
      body: `Deine Express-Bestellung über ${formatPrice(String(total), currency)} (${count} Position${count === 1 ? "" : "en"}) ist bestätigt. Der Betrag wird per SEPA-Lastschrift von deinem hinterlegten Bankkonto (••••${profile.iban?.slice(-4)}) eingezogen. Buchungsdatum: 2–3 Werktage.`,
    });

    const snapshot: ConfirmedOrder = {
      total, currency, count, orderId, items: orderItems, mode: "sepa",
      date: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      companyName: profile?.company_name, email: user.email,
    };
    clearCart();
    setConfirmed(snapshot);
    setPlacing(false);
    toast.success("Express-Kauf bestätigt", { description: `SEPA-Einzug von ••••${profile.iban?.slice(-4)}` });
  };

  // Lieferung auf Rechnung — nur wenn Wuppertal-PLZ im gespeicherten Profil steht
  const handleInvoiceOrder = async () => {
    if (!user || items.length === 0 || placing) return;
    // Doppelte Absicherung: PLZ muss aus Profil kommen, nicht aus Userinput
    if (!isWuppertal) {
      toast.error("Lieferung auf Rechnung nicht verfügbar", {
        description: "Nur für Kunden mit gespeicherter Wuppertal-Adresse (PLZ 42xxx) in den Einstellungen.",
      });
      return;
    }
    setPlacing(true);
    const count = items.reduce((n, i) => n + i.quantity, 0);
    const orderItems = toOrderItems();

    const { error, orderId } = await recordOrder({
      userId: user.id,
      items: orderItems,
      total,
      currency,
      status: "auf_rechnung",
    });

    if (error) {
      toast.error("Bestellung fehlgeschlagen", { description: error });
      setPlacing(false);
      return;
    }

    await sendMessage({
      recipient: user.id,
      type: "system",
      title: "Lieferbestellung auf Rechnung ✓",
      body: `Deine Bestellung über ${formatPrice(String(total), currency)} (PLZ ${profilePlz}) wird geliefert. Zahlungsziel: 14 Tage nach Lieferung. Die Bankdaten für die Überweisung erhältst du per E-Mail. Bestellnr: AA-${orderId?.slice(0, 8).toUpperCase() ?? "XXXXXX"}`,
    });

    const snapshot: ConfirmedOrder = {
      total, currency, count, orderId, items: orderItems, mode: "auf_rechnung",
      date: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      companyName: profile?.company_name, email: user.email,
    };
    clearCart();
    setConfirmed(snapshot);
    setPlacing(false);
    toast.success("Lieferbestellung bestätigt", { description: "Zahlung auf Rechnung innerhalb 14 Tage." });
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
    const shopifyCartUrl = `https://shop.alex-autoshop.de/cart/${cartItems}`;
    if (user) {
      recordOrder({ userId: user.id, items: toOrderItems(), total, currency });
    }
    setRedirecting(true);
    setTimeout(() => {
      window.location.href = shopifyCartUrl;
    }, 1800);
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
                  {confirmed.mode === "auf_rechnung" ? (
                    <>
                      <p className="flex items-center gap-2 font-semibold"><Truck className="w-4 h-4 text-primary" /> Lieferung auf Rechnung</p>
                      <p className="text-muted-foreground mt-1">Wir liefern deine Bestellung. Bezahle innerhalb von <strong className="text-foreground">14 Tagen</strong> nach Erhalt per Überweisung.</p>
                      <p className="text-muted-foreground mt-1 text-xs">Bankdaten kommen per E-Mail. Verwendungszweck: AA-{confirmed.orderId?.slice(0, 8).toUpperCase()}</p>
                    </>
                  ) : confirmed.mode === "sepa" ? (
                    <>
                      <p className="flex items-center gap-2 font-semibold"><Zap className="w-4 h-4 text-primary" /> SEPA-Einzug</p>
                      <p className="text-muted-foreground mt-1">Zahlung wird per SEPA-Lastschrift von deinem Bankkonto eingezogen — innerhalb von 2–3 Werktagen.</p>
                    </>
                  ) : (
                    <>
                      <p className="flex items-center gap-2 font-semibold"><FileText className="w-4 h-4 text-primary" /> Zahlung bei Abholung</p>
                      <p className="text-muted-foreground mt-1">Wir legen deine Bestellung bereit. Bezahlt wird an der Theke — bar oder Karte.</p>
                    </>
                  )}
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

            {/* ── Kassen-Bereich ── */}
            {items.length > 0 && (
              <div className="border-t border-border p-4 space-y-3">
                {/* ── Versand-Fortschrittsbalken (nur für Nicht-Mitglieder unter Freigrenze) ── */}
                {!isMember && total < FREE_THRESHOLD && total > 0 && (
                  <div className="rounded-lg bg-secondary/60 border border-border p-3 space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Noch <strong className="text-foreground">{formatPrice(String(remainingForFree), currency)}</strong> bis kostenlosem Versand</span>
                      <span className="text-primary font-semibold">ab 150 €</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${freeProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* ── Zwischensumme + Versand ── */}
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Zwischensumme</span>
                    <span>{formatPrice(String(total), currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Versand</span>
                    {isMember ? (
                      <span className="text-primary font-semibold text-xs flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Kostenlos (Mitglied)
                      </span>
                    ) : shippingCost === 0 ? (
                      <span className="text-primary font-semibold text-xs flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Kostenlos
                      </span>
                    ) : (
                      <span>{formatPrice(String(shippingCost), currency)}</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between font-bold text-lg border-t border-border pt-2">
                  <span>Gesamt</span>
                  <span>{formatPrice(String(total + shippingCost), currency)}</span>
                </div>

                {discount > 0 && (
                  <div className="rounded-lg bg-primary/10 border border-primary/20 p-2.5 text-sm text-center">
                    <span className="text-primary font-semibold">
                      Mitglied ({discount}%) — du sparst {formatPrice(String(memberSaving), currency)}
                    </span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      wird an der Theke verrechnet
                    </span>
                  </div>
                )}

                {/* ── 1. NORMALER ONLINE-CHECKOUT ── */}
                <button
                  onClick={handleOnlineCheckout}
                  className="btn-gold-bright w-full text-base font-bold gap-2"
                >
                  <CreditCard className="w-5 h-5" />
                  Jetzt kaufen (Kreditkarte / PayPal)
                </button>

                {/* ── 2. EXPRESS-KAUF (SEPA / IBAN) ── */}
                {user ? (
                  hasIban ? (
                    <button
                      onClick={handleExpressOrder}
                      disabled={placing}
                      className="btn-outline w-full gap-2 disabled:opacity-60 border-primary/40 hover:border-primary"
                    >
                      <Zap className="w-4 h-4 text-primary" />
                      {placing ? "Wird bestätigt …" : `⚡ Express-Kauf · SEPA ••••${profile.iban?.slice(-4)}`}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        toast.info("IBAN für Express-Kauf hinterlegen", {
                          description: "Einmalig eintragen — dann blitzschnell bestellen ohne PayPal.",
                          action: { label: "Einstellungen →", onClick: () => { onClose(); navigate("/dashboard?tab=settings"); } },
                        });
                      }}
                      className="btn-outline w-full gap-2 opacity-70 hover:opacity-100"
                    >
                      <Zap className="w-4 h-4" />
                      ⚡ Express-Kauf
                      <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
                        <Info className="w-3 h-3" /> IBAN hinterlegen
                      </span>
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="btn-outline w-full gap-2 opacity-60 hover:opacity-100"
                  >
                    <Lock className="w-4 h-4" />
                    ⚡ Express-Kauf —{" "}
                    <span className="underline underline-offset-2">Anmelden</span>
                  </button>
                )}

                {/* ── 3. LIEFERN & AUF RECHNUNG (nur Wuppertal, PLZ aus Profil) ── */}
                {!user ? (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="btn-dark w-full gap-2 text-sm opacity-60 hover:opacity-100"
                  >
                    <Truck className="w-4 h-4" />
                    Liefern & auf Rechnung —{" "}
                    <span className="underline underline-offset-2">Anmelden</span>
                  </button>
                ) : isWuppertal ? (
                  <button
                    onClick={handleInvoiceOrder}
                    disabled={placing}
                    className="btn-dark w-full gap-2 text-sm"
                  >
                    <Truck className="w-4 h-4" />
                    {placing ? "Bestätigung …" : `Bitte Liefern & auf Rechnung! (PLZ ${profilePlz})`}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      toast.info("Wuppertal-Adresse im Profil hinterlegen", {
                        description: profilePlz
                          ? `Deine PLZ ${profilePlz} liegt außerhalb Wuppertal. Lieferung auf Rechnung nur für PLZ 42xxx.`
                          : "Trage deine Liefer-PLZ einmalig in den Einstellungen ein. Nur Wuppertal (PLZ 42xxx) berechtigt.",
                        action: { label: "Einstellungen →", onClick: () => { onClose(); navigate("/dashboard?tab=settings"); } },
                      });
                    }}
                    className="btn-dark w-full gap-2 text-sm opacity-60"
                  >
                    <Truck className="w-4 h-4" />
                    Bitte Liefern & auf Rechnung!
                    <span className="ml-auto text-xs flex items-center gap-1 opacity-80">
                      <Info className="w-3 h-3" /> Wuppertal-Adresse erforderlich
                    </span>
                  </button>
                )}

                <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Sichere Bezahlung · alex-autoshop.de
                </p>
              </div>
            )}
            </>
            )}
          </motion.aside>
        </>
      )}
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />
      {redirecting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-background border border-primary/30 rounded-2xl p-8 flex flex-col items-center gap-5 max-w-xs mx-4 text-center shadow-2xl"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Weiterleitung zum Checkout</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Sie werden zu unserem sicheren Shopify-Checkout weitergeleitet.
              </p>
              <p className="text-xs text-primary mt-3 font-mono font-semibold">
                shop.alex-autoshop.de
              </p>
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
