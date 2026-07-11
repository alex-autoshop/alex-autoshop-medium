/**
 * Teileportal-Extras: Fahrzeug-Garage, Teile-Warenkorb, Artikel-Detail-Modal.
 * Vorbereitet für Livepreise (Inter Cars) und PartsLink24-OEM-Katalog.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Car, X, Plus, Minus, Trash2, ShoppingCart, MessageCircle, Package, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { SHOP_INFO, whatsappLink } from "@/data/shopInfo";

// ─── TYPEN ──────────────────────────────────────────────────

export interface GarageVehicle {
  id: string;
  label: string;
  manufacturer?: string;
  model?: string;
  typeName?: string;
  power?: string;
  fuel?: string;
  vin?: string;
  ktype?: number | null;
  addedAt: number;
}

export interface CartItem {
  key: string; // brand::articleNumber
  name: string;
  brand: string;
  articleNumber: string;
  imageUrl?: string;
  price?: number; // Verkaufspreis falls bekannt (IC × Markup)
  quantity: number;
  vehicleLabel?: string;
}

// ─── LOCALSTORAGE HELPERS ───────────────────────────────────

const GARAGE_KEY = "tp:garage";
const CART_KEY = "tp:cart";

function load<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}
function save(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* voll/aus */ }
}

export function useGarage() {
  const [garage, setGarage] = useState<GarageVehicle[]>(() => load(GARAGE_KEY, []));
  const add = (v: Omit<GarageVehicle, "id" | "addedAt">) => {
    setGarage((prev) => {
      const id = `${v.vin || ""}|${v.ktype || ""}|${v.label}`;
      const next = [{ ...v, id, addedAt: Date.now() }, ...prev.filter((g) => g.id !== id)].slice(0, 8);
      save(GARAGE_KEY, next);
      return next;
    });
  };
  const remove = (id: string) => {
    setGarage((prev) => { const next = prev.filter((g) => g.id !== id); save(GARAGE_KEY, next); return next; });
  };
  return { garage, add, remove };
}

export function usePartsCart() {
  const [items, setItems] = useState<CartItem[]>(() => load(CART_KEY, []));
  useEffect(() => save(CART_KEY, items), [items]);
  const add = (item: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const ex = prev.find((i) => i.key === item.key);
      return ex ? prev.map((i) => (i.key === item.key ? { ...i, quantity: i.quantity + 1 } : i)) : [...prev, { ...item, quantity: 1 }];
    });
  };
  const setQty = (key: string, qty: number) => {
    setItems((prev) => (qty <= 0 ? prev.filter((i) => i.key !== key) : prev.map((i) => (i.key === key ? { ...i, quantity: qty } : i))));
  };
  const clear = () => setItems([]);
  const count = items.reduce((s, i) => s + i.quantity, 0);
  const priced = items.filter((i) => i.price != null);
  const subtotal = priced.reduce((s, i) => s + (i.price || 0) * i.quantity, 0);
  return { items, add, setQty, clear, count, subtotal, allPriced: priced.length === items.length && items.length > 0 };
}

// ─── GARAGE-LISTE (Sidebar) ─────────────────────────────────

export function GarageList({ garage, onPick, onRemove }: {
  garage: GarageVehicle[];
  onPick: (v: GarageVehicle) => void;
  onRemove: (id: string) => void;
}) {
  if (garage.length === 0) return null;
  return (
    <div className="border-t border-border pt-4">
      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Meine Fahrzeuge</h3>
      <div className="space-y-1.5">
        {garage.map((g) => (
          <div key={g.id} className="group flex items-center gap-2 rounded-lg border border-border bg-secondary/30 hover:border-primary/40 transition-colors">
            <button onClick={() => onPick(g)} className="flex items-center gap-2 flex-1 min-w-0 p-2 text-left">
              <Car className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs font-medium truncate">{g.label}</span>
            </button>
            <button onClick={() => onRemove(g.id)} aria-label="Entfernen"
              className="p-2 text-muted-foreground/40 hover:text-destructive transition-colors shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DETAIL-MODAL ───────────────────────────────────────────

export interface DetailArticle {
  name: string;
  brand: string;
  articleNumber: string;
  imageUrl?: string;
  category?: string;
  oeNumbers?: string[];
  specs?: { name: string; value: string }[];
  price?: number;
  availability?: string;
}

export function PartDetailModal({ article, vehicleLabel, onClose, onAddToCart, brandLogo }: {
  article: DetailArticle | null;
  vehicleLabel: string;
  onClose: () => void;
  onAddToCart: (a: DetailArticle) => void;
  brandLogo?: string;
}) {
  if (!article) return null;
  const wa = whatsappLink([
    "Hallo Alex Autoshop, Frage zu diesem Teil:",
    `${article.brand} ${article.name} (Art.-Nr. ${article.articleNumber})`,
    vehicleLabel ? `Fahrzeug: ${vehicleLabel}` : "",
  ].filter(Boolean).join("\n"));
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
        <motion.div initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card rounded-2xl border border-border w-full max-w-2xl max-h-[88vh] overflow-y-auto shadow-2xl">
          <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
            <div className="min-w-0">
              <p className="font-bold text-primary text-sm">{article.articleNumber}</p>
              <p className="font-semibold truncate">{article.name}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors shrink-0" aria-label="Schließen"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-5 grid sm:grid-cols-2 gap-5">
            <div className="rounded-xl bg-white border border-border flex items-center justify-center p-4" style={{ minHeight: 220 }}>
              {article.imageUrl ? (
                <img src={article.imageUrl} alt={article.name} className="max-h-64 object-contain" />
              ) : brandLogo ? (
                <img src={brandLogo} alt={article.brand} className="max-h-24 object-contain opacity-80" />
              ) : <Package className="w-16 h-16 text-muted-foreground/30" />}
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-secondary text-xs font-bold uppercase">{article.brand}</span>
                {article.category && <span className="text-xs text-muted-foreground">{article.category}</span>}
              </div>
              {vehicleLabel && (
                <div className="rounded-lg bg-green-500/10 border border-green-600/30 px-3 py-2 text-xs font-medium text-green-700 dark:text-green-400">
                  ✓ Passend für: {vehicleLabel}
                </div>
              )}
              {article.price != null ? (
                <p className="text-2xl font-bold">{article.price.toFixed(2).replace(".", ",")} €</p>
              ) : (
                <p className="text-sm text-muted-foreground">Preis auf Anfrage — wir bestätigen sofort.</p>
              )}
              {article.specs && article.specs.length > 0 && (
                <div className="rounded-lg border border-border divide-y divide-border/60 text-xs overflow-hidden">
                  {article.specs.slice(0, 8).map((s, i) => (
                    <div key={i} className="flex justify-between px-3 py-1.5"><span className="text-muted-foreground">{s.name}</span><span className="font-medium text-right">{s.value}</span></div>
                  ))}
                </div>
              )}
              {article.oeNumbers && article.oeNumbers.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">OE-Referenzen</p>
                  <div className="flex flex-wrap gap-1">
                    {article.oeNumbers.slice(0, 6).map((oe) => <span key={oe} className="px-2 py-0.5 rounded bg-secondary font-mono text-[10px]">{oe}</span>)}
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-2 pt-1">
                <button onClick={() => { onAddToCart(article); onClose(); }} className="btn-primary w-full gap-2">
                  <ShoppingCart className="w-4 h-4" /> In den Teile-Warenkorb
                </button>
                <a href={wa} target="_blank" rel="noopener noreferrer" className="w-full py-2.5 rounded-lg border border-border text-sm font-medium text-center hover:bg-secondary transition-colors inline-flex items-center justify-center gap-2">
                  <MessageCircle className="w-4 h-4" /> Frage zum Teil stellen
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── WARENKORB-DRAWER + FLOATING BUTTON ─────────────────────

export function PartsCartButton({ count, onClick }: { count: number; onClick: () => void }) {
  if (count === 0) return null;
  return (
    <button onClick={onClick}
      className="fixed bottom-6 left-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-primary-foreground font-bold shadow-xl hover:scale-105 transition-transform">
      <ShoppingCart className="w-5 h-5" />
      <span className="text-sm">Teile-Warenkorb</span>
      <span className="w-6 h-6 rounded-full bg-background text-foreground text-xs flex items-center justify-center font-bold">{count}</span>
    </button>
  );
}

export function PartsCartDrawer({ open, onClose, cart, vehicleLabel, vehicleVin }: {
  open: boolean;
  onClose: () => void;
  cart: ReturnType<typeof usePartsCart>;
  vehicleLabel: string;
  vehicleVin?: string;
}) {
  const { items, setQty, clear, subtotal, allPriced } = cart;
  const orderText = [
    "🛒 BESTELLANFRAGE — Alex Autoshop Teileportal",
    vehicleLabel ? `Fahrzeug: ${vehicleLabel}` : "",
    vehicleVin ? `FIN: ${vehicleVin}` : "",
    "",
    ...items.map((i, n) => `${n + 1}. ${i.quantity}× ${i.brand} ${i.name} — Art.-Nr. ${i.articleNumber}${i.price != null ? ` — ${(i.price * i.quantity).toFixed(2)} €` : ""}`),
    "",
    allPriced ? `Zwischensumme: ${subtotal.toFixed(2)} €` : "Bitte Preise und Verfügbarkeit bestätigen.",
  ].filter((l) => l !== null).join("\n");

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
          <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "tween", duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 h-full w-full max-w-md bg-card border-l border-border flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-bold flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-primary" /> Teile-Warenkorb</h2>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary" aria-label="Schließen"><X className="w-5 h-5" /></button>
            </div>
            {vehicleLabel && <div className="px-4 py-2 bg-primary/10 border-b border-primary/20 text-xs font-semibold text-primary truncate">📋 {vehicleLabel}</div>}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">Noch keine Teile im Warenkorb.</p>}
              {items.map((i) => (
                <div key={i.key} className="flex gap-3 rounded-xl border border-border p-3">
                  <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                    {i.imageUrl ? <img src={i.imageUrl} alt={i.name} className="w-full h-full object-contain" /> : <Package className="w-6 h-6 text-muted-foreground/40" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-primary truncate">{i.articleNumber}</p>
                    <p className="text-sm font-medium leading-tight truncate">{i.name}</p>
                    <p className="text-xs text-muted-foreground">{i.brand}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-1 rounded-lg border border-border">
                        <button onClick={() => setQty(i.key, i.quantity - 1)} className="p-1.5 hover:text-primary" aria-label="Weniger"><Minus className="w-3.5 h-3.5" /></button>
                        <span className="text-sm font-bold w-6 text-center">{i.quantity}</span>
                        <button onClick={() => setQty(i.key, i.quantity + 1)} className="p-1.5 hover:text-primary" aria-label="Mehr"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                      <span className="text-sm font-bold">{i.price != null ? `${(i.price * i.quantity).toFixed(2).replace(".", ",")} €` : "auf Anfrage"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {items.length > 0 && (
              <div className="p-4 border-t border-border space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{allPriced ? "Zwischensumme" : "Positionen mit Preis"}</span>
                  <span className="font-bold">{subtotal > 0 ? `${subtotal.toFixed(2).replace(".", ",")} €` : "—"}</span>
                </div>
                {!allPriced && <p className="text-xs text-muted-foreground">Endpreise & Verfügbarkeit bestätigen wir sofort nach der Anfrage — meist ist das Teil am selben Tag da.</p>}
                <a href={whatsappLink(orderText)} target="_blank" rel="noopener noreferrer" className="btn-primary w-full gap-2">
                  <MessageCircle className="w-4 h-4" /> Bestellanfrage senden
                </a>
                <div className="flex justify-between items-center">
                  <a href={`tel:${SHOP_INFO.phone}`} className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {SHOP_INFO.phone}</a>
                  <button onClick={clear} className="text-xs text-muted-foreground hover:text-destructive">Leeren</button>
                </div>
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
