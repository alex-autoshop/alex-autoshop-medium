import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Minus, Plus, Trash2, Zap, ShieldCheck, CheckCircle2, FileText, Printer, CreditCard, Truck } from "lucide-react";
import { Toaster, toast } from "sonner";
import { useCartStore } from "@/stores/cartStore";
import { formatPrice } from "@/lib/shopify";
import { PRODUCT_IMAGES } from "@/lib/productImages";
import { useAuth } from "@/context/AuthContext";
import { discountForLevel } from "@/data/memberships";
import { versandkosten, VERSAND_FREI_AB } from "../../shared/versand.js";
import { gefahrstoffVonKnoten } from "../../shared/gefahrstoff.js";
import { aboListeGesamt, mitgliedZeile } from "../../shared/produktabo.js";
import { aboEinzelMerken } from "@/lib/aboListe";
import { aboAbschliessen } from "@/lib/aboAbschluss";
import { AboKasse, useAboAktiv, useAboListe, WarenkorbAboZeile } from "@/components/WarenkorbAbo";
import { deliveryFor, deliveryForCart } from "@/lib/delivery";
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
  const [alterBestaetigt, setAlterBestaetigt] = useState(false);
  const [confirmed, setConfirmed] = useState<ConfirmedOrder | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [kasseOffen, setKasseOffen] = useState(false);
  const [aboLaeuft, setAboLaeuft] = useState(false);

  const gefahren = items.map((i) => gefahrstoffVonKnoten(i.product.node)).filter((g) => g.ist);
  const mindestalter = gefahren.reduce((m, g) => Math.max(m, g.mindestalter || 0), 0);
  const gefahrgut = gefahren.filter((g) => g.unNr);
  const kasseZu = mindestalter > 0 && !alterBestaetigt;
  const currency = items[0]?.price.currencyCode ?? "EUR";
  const discount = user ? discountForLevel(profile.membership_level) : 0;
  const aboListe = useAboListe();
  const aboAktiv = useAboAktiv();
  const [aboWahl, setAboWahl] = useState<Record<string, number>>({});

  const aboDrin = (id: string) => aboListe.produkte.some((p) => p.id === id && p.art !== "menge");
  const aboStufe = (id: string) => {
    const zeile = aboListe.produkte.find((p) => p.id === id && p.art !== "menge");
    return zeile ? zeile.rabatt : (aboWahl[id] ?? aboListe.standard);
  };
  const aboProdukt = (item: (typeof items)[number]) => {
    const node = item.product.node;
    return {
      id: node.id,
      handle: node.handle,
      titel: node.title,
      preis: parseFloat(item.price.amount),
      waehrung: item.price.currencyCode,
      bild: node.images?.edges?.[0]?.node?.url || PRODUCT_IMAGES[node.handle] || undefined,
    };
  };
  const fehlendeInsAbo = () => {
    const gesehen = new Set<string>();
    let dazu = 0;
    let voll = false;
    for (const item of items) {
      const id = item.product.node.id;
      if (gesehen.has(id) || aboDrin(id)) continue;
      gesehen.add(id);
      const erg = aboEinzelMerken({ ...aboProdukt(item), rabatt: aboStufe(id) });
      if (erg === "voll") { voll = true; break; }
      if (erg === "neu") dazu += 1;
    }
    return { dazu, voll };
  };
  const zeilenBetrag = (item: (typeof items)[number]) => {
    const einzel = parseFloat(item.price.amount);
    const normal = einzel * item.quantity;
    if (!aboDrin(item.product.node.id)) return normal;
    return mitgliedZeile(einzel, item.quantity, aboStufe(item.product.node.id))?.mitglied ?? normal;
  };
  const summeLaden = Math.round(items.reduce((summe, item) => summe + parseFloat(item.price.amount) * item.quantity, 0) * 100) / 100;
  const total = Math.round(items.reduce((summe, item) => summe + zeilenBetrag(item), 0) * 100) / 100;
  const aboErsparnis = Math.round(items.reduce((summe, item) => {
    if (!aboDrin(item.product.node.id)) return summe;
    const zeile = mitgliedZeile(parseFloat(item.price.amount), item.quantity, aboStufe(item.product.node.id));
    return summe + (zeile?.ersparnis ?? 0);
  }, 0) * 100) / 100;
  const allesImAbo = items.length > 0 && items.every((item) => aboDrin(item.product.node.id));
  const memberSaving = total * (discount / 100);

  // Shopify-Shop: bezahlte Mitgliedschaft (Level 1–3) versendet kostenlos.
  // Die Teilebörse nutzt shared/versand.js ohne diesen Nachlass.
  const stufe = Number(profile.membership_level);
  const isMember = !!user && stufe >= 1 && stufe <= 3;
  const mitAbo = aboListe.produkte.length > 0;
  const shippingCost = mitAbo || !isMember ? versandkosten({ summe: total }) : 0;
  const liefer = deliveryForCart(items.map((item) => {
    const variante = item.product.node.variants?.edges?.find((kante) => kante.node.id === item.variantId)?.node;
    return deliveryFor(item.product.node, variante);
  }));
  const remainingForFree = Math.max(0, VERSAND_FREI_AB - total);
  const freeProgress = Math.min(100, (total / VERSAND_FREI_AB) * 100);

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
      total: summeLaden,
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
      body: `Deine Express-Bestellung über ${formatPrice(String(summeLaden), currency)} (${count} Position${count === 1 ? "" : "en"}) ist bestätigt. Der Betrag wird per SEPA-Lastschrift von deinem hinterlegten Bankkonto (••••${profile.iban?.slice(-4)}) eingezogen. Buchungsdatum: 2–3 Werktage.`,
    });

    const snapshot: ConfirmedOrder = {
      total: summeLaden, currency, count, orderId, items: orderItems, mode: "sepa",
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
      total: summeLaden,
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
      body: `Deine Bestellung über ${formatPrice(String(summeLaden), currency)} (PLZ ${profilePlz}) wird geliefert. Zahlungsziel: 14 Tage nach Lieferung. Die Bankdaten für die Überweisung erhältst du per E-Mail. Bestellnr: AA-${orderId?.slice(0, 8).toUpperCase() ?? "XXXXXX"}`,
    });

    const snapshot: ConfirmedOrder = {
      total: summeLaden, currency, count, orderId, items: orderItems, mode: "auf_rechnung",
      date: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      companyName: profile?.company_name, email: user.email,
    };
    clearCart();
    setConfirmed(snapshot);
    setPlacing(false);
    toast.success("Lieferbestellung bestätigt", { description: "Zahlung auf Rechnung innerhalb 14 Tage." });
  };

  // Normaler Shopify Checkout — direkte Cart-URL ohne API-Call, 100% zuverlässig
  const handleAboKasse = async () => {
    const mail = user?.email?.trim().toLowerCase() || "";
    if (!user || !mail) { setShowAuthModal(true); return; }
    if (kasseZu || aboLaeuft) return;
    setAboLaeuft(true);
    try {
      const waren = items.map((item) => ({
        titel: item.product.node.title,
        einzel: parseFloat(item.price.amount),
        menge: item.quantity,
        rabatt: aboDrin(item.product.node.id) ? aboStufe(item.product.node.id) : 0,
      }));
      const erg = await aboAbschliessen({
        email: mail,
        zahlweg: "stripe",
        produkte: aboListe.produkte,
        price: aboListeGesamt(aboListe.produkte)?.beitrag || 0,
        waren,
        einmalig: Math.round((total + shippingCost) * 100) / 100,
      });
      if (erg.art === "weiter") {
        setRedirecting(true);
        window.location.href = erg.url;
        return;
      }
      toast.error(erg.art === "anfrage" ? "Die Kartenzahlung ist noch nicht freigeschaltet. Bitte ruf uns an: 0202 82690." : erg.text, { toasterId: "warenkorb" });
    } finally {
      setAboLaeuft(false);
    }
  };

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
            <Toaster id="warenkorb" position="bottom-center" offset={{ bottom: "5.75rem" }} mobileOffset={{ bottom: "5.75rem" }} richColors duration={3200} />
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
                      <span lang="de" className="text-muted-foreground [overflow-wrap:anywhere] hyphens-auto">{item.title} × {item.quantity}</span>
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
            <div className="flex-1 overflow-y-auto">
              {items.length > 0 && !isMember && total < VERSAND_FREI_AB && total > 0 && (
                <p className="px-4 pt-3 text-xs text-muted-foreground">
                  Noch <strong className="text-foreground">{formatPrice(String(remainingForFree), currency)}</strong> bis Gratisversand
                  <span className="ml-2 inline-block align-middle h-1 w-16 rounded-full bg-border overflow-hidden">
                    <span className="block h-full bg-primary" style={{ width: `${freeProgress}%` }} />
                  </span>
                </p>
              )}
              {items.length === 0 ? (
                <p className="text-muted-foreground text-center py-12">Dein Warenkorb ist leer.</p>
              ) : (
                <div className="px-4 divide-y divide-border">
                  {items.map((item) => {
                    const node = item.product.node;
                    const img = node.images?.edges?.[0]?.node?.url || PRODUCT_IMAGES[node.handle] || "";
                    const stueck = aboDrin(node.id)
                      ? parseFloat(item.price.amount) * (1 - aboStufe(node.id) / 100)
                      : parseFloat(item.price.amount);
                    return (
                      <div key={item.uid} className="flex gap-2 py-3">
                        <div className="w-14 h-14 rounded-lg bg-white border border-border shrink-0 overflow-hidden">
                          {img && <img src={img} alt="" className="w-full h-full object-contain" loading="lazy" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <p lang="de" className="text-[13px] sm:text-sm font-semibold leading-[1.25] sm:leading-snug [overflow-wrap:anywhere] hyphens-auto flex-1 min-w-0">{node.title}</p>
                            <p className="text-sm font-bold shrink-0 tabular-nums">
                              {aboDrin(node.id) && (
                                <span className="text-muted-foreground line-through font-medium text-xs mr-1">{formatPrice(item.price.amount, item.price.currencyCode)}</span>
                              )}
                              {formatPrice(String(stueck), item.price.currencyCode)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <button onClick={() => updateQuantity(item.uid, item.quantity - 1)} disabled={isLoading} className="w-8 h-8 rounded-md border border-border flex items-center justify-center" aria-label="Menge verringern"><Minus className="w-3.5 h-3.5" /></button>
                            <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.uid, item.quantity + 1)} disabled={isLoading} className="w-8 h-8 rounded-md border border-border flex items-center justify-center" aria-label="Menge erhöhen"><Plus className="w-3.5 h-3.5" /></button>
                            <button onClick={() => removeItem(item.uid)} disabled={isLoading} className="w-8 h-8 rounded-md flex items-center justify-center text-destructive ml-auto" aria-label="Entfernen"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                          <WarenkorbAboZeile
                            produkt={aboProdukt(item)}
                            menge={item.quantity}
                            stufe={aboStufe(node.id)}
                            drin={aboDrin(node.id)}
                            onStufe={(rabatt) => setAboWahl((alt) => ({ ...alt, [node.id]: rabatt }))}
                            toasterId="warenkorb"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {items.length > 0 && (
                <div className="px-4 pb-4">
                  {discount > 0 && !mitAbo && (
                    <p className="text-xs text-primary mb-2">Mitglied {discount} % — {formatPrice(String(memberSaving), currency)} an der Theke</p>
                  )}
                  <AboKasse ersparnis={aboErsparnis} />
                  {!allesImAbo && (
                    <button
                      type="button"
                      onClick={() => {
                        const { dazu, voll } = fehlendeInsAbo();
                        if (voll) toast.error("Die Abo-Liste ist voll.", { toasterId: "warenkorb" });
                        else if (dazu > 0) toast.success("Warenkorb in die Abo-Liste gelegt", { toasterId: "warenkorb" });
                      }}
                      className="text-xs font-semibold text-primary underline"
                    >
                      Alle ins Abo
                    </button>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {shippingCost > 0 ? <>Versand {formatPrice(String(shippingCost), currency)}</> : "Versand kostenlos"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Lieferzeit {liefer.zeit.label}
                    {liefer.verschieden ? " · gilt für die langsamste Position" : ""}
                  </p>
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="shrink-0 border-t border-border bg-card" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
                {kasseOffen && (
                  <div className="px-4 pt-3 space-y-2 border-b border-border">
                    {mindestalter > 0 && (
                      <label className="flex items-start gap-2 text-sm">
                        <input type="checkbox" className="mt-1" checked={alterBestaetigt} onChange={(e) => setAlterBestaetigt(e.target.checked)} />
                        <span>Ich bin mindestens {mindestalter} Jahre alt.</span>
                      </label>
                    )}
                    {gefahrgut.length > 0 && (
                      <p className="text-xs text-muted-foreground">{gefahrgut.map((g) => g.unNr).join(", ")} im Warenkorb</p>
                    )}
                    {aboAktiv && !mitAbo && aboErsparnis > 0 && (
                      <p className="text-[11px] text-muted-foreground">Abo-Preise gelten in der Summe, bei Abholung und auf Rechnung.</p>
                    )}
                    {mitAbo ? (
                      <>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          Einmalig {formatPrice(String(total + shippingCost), currency)}, dazu {formatPrice(String(aboListeGesamt(aboListe.produkte)?.beitrag || 0), currency)} im Monat. Monatlich kündbar, keine Mindestlaufzeit.
                        </p>
                        <button type="button" onClick={handleAboKasse} disabled={kasseZu || aboLaeuft} className="btn-primary w-full text-sm min-h-11 disabled:opacity-50">
                          {aboLaeuft ? "Einen Moment …" : "Zahlungspflichtig bestellen"}
                        </button>
                      </>
                    ) : (
                      <button onClick={handleOnlineCheckout} disabled={kasseZu} className="btn-gold-bright w-full text-sm min-h-11 gap-2 disabled:opacity-50">
                        <CreditCard className="w-4 h-4" /> Jetzt kaufen
                      </button>
                    )}
                    <div className="flex justify-center gap-4 pb-2 text-xs">
                      <button
                        type="button"
                        disabled={!!user && (placing || kasseZu)}
                        onClick={() => {
                          if (!user) { setShowAuthModal(true); return; }
                          if (hasIban) handleExpressOrder();
                          else toast.info("IBAN für Express-Kauf hinterlegen", {
                            action: { label: "Einstellungen", onClick: () => { onClose(); navigate("/dashboard?tab=settings"); } },
                          });
                        }}
                        className="underline text-muted-foreground disabled:opacity-50"
                      >
                        {placing ? "Wird bestätigt …" : "Express-Kauf"}
                      </button>
                      <button
                        type="button"
                        disabled={!!user && (placing || kasseZu)}
                        onClick={() => {
                          if (!user) { setShowAuthModal(true); return; }
                          if (isWuppertal) handleInvoiceOrder();
                          else toast.info("Lieferung auf Rechnung nur mit Wuppertal-Adresse im Profil", {
                            action: { label: "Einstellungen", onClick: () => { onClose(); navigate("/dashboard?tab=settings"); } },
                          });
                        }}
                        className="underline text-muted-foreground disabled:opacity-50"
                      >
                        Auf Rechnung
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 px-4 py-3 max-h-[120px]">
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground leading-none">Gesamt</p>
                    <p className="text-lg font-bold leading-tight tabular-nums">{formatPrice(String(total + shippingCost), currency)}</p>
                    {mitAbo && (
                      <p className="text-[11px] text-muted-foreground leading-tight">inkl. Versand + {formatPrice(String(aboListeGesamt(aboListe.produkte)?.beitrag || 0), currency)}/Monat Abo</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (mitAbo && !user) { setShowAuthModal(true); return; }
                      setKasseOffen((v) => !v);
                    }}
                    aria-expanded={kasseOffen}
                    className="btn-primary flex-1 text-sm min-h-11"
                  >
                    {kasseOffen ? "Zahlarten schließen" : "Zur Kasse"}
                  </button>
                </div>
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
                Sie werden zu unserem sicheren Checkout weitergeleitet.
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
