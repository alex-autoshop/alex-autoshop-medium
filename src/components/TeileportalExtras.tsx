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

// ─── ARTIKEL-EXPANDER (wie Inter Cars: Mehr Info / Ersatz / Anwendungen / OE) ─

import { ChevronDown, Loader2 } from "lucide-react";
import { apArticleSpecs, apAnalogParts, apCompatibleCars, type ApAnalogPart } from "@/lib/autoparts";

type ExpTab = "info" | "ersatz" | "anwendungen" | "oe";
const EXP_TABS: { id: ExpTab; label: string }[] = [
  { id: "info", label: "Mehr Info" },
  { id: "ersatz", label: "Ersatz" },
  { id: "anwendungen", label: "Anwendungen" },
  { id: "oe", label: "OE-Nummern" },
];

export function ArticleExpander({ articleId, articleNumber, specs, oeNumbers, onSearchNumber }: {
  articleId: string | number;
  articleNumber: string;
  specs?: { name: string; value: string }[];
  oeNumbers?: string[];
  onSearchNumber: (no: string) => void;
}) {
  const [tab, setTab] = useState<ExpTab | null>(null);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<{ name: string; value: string }[] | null>(null);
  const [analogs, setAnalogs] = useState<ApAnalogPart[] | null>(null);
  const [cars, setCars] = useState<Array<{ brand: string; count: number; models: string[] }> | null>(null);
  const [openBrand, setOpenBrand] = useState<string | null>(null);

  const openTab = async (t: ExpTab) => {
    if (tab === t) { setTab(null); return; }
    setTab(t);
    setLoading(true);
    try {
      if (t === "info" && info === null) setInfo(specs && specs.length > 2 ? specs : await apArticleSpecs(articleId));
      if ((t === "ersatz" || t === "oe") && analogs === null) setAnalogs(await apAnalogParts(articleNumber));
      if (t === "anwendungen" && cars === null) setCars(await apCompatibleCars(articleNumber));
    } finally { setLoading(false); }
  };

  return (
    <div className="border-t border-border/60">
      <div className="flex flex-wrap gap-1.5 px-4 py-2">
        {EXP_TABS.map((x) => (
          <button key={x.id} onClick={() => openTab(x.id)}
            className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors",
              tab === x.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground")}>
            {x.label} <ChevronDown className={cn("w-3 h-3 transition-transform", tab === x.id && "rotate-180")} />
          </button>
        ))}
      </div>
      <AnimatePresence>
        {tab && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 pt-1 text-sm">
              {loading && <div className="flex items-center gap-2 text-muted-foreground py-3"><Loader2 className="w-4 h-4 animate-spin" /> Lädt …</div>}

              {!loading && tab === "info" && (
                (info && info.length > 0) ? (
                  <div className="rounded-lg border border-border divide-y divide-border/60 text-xs overflow-hidden max-w-xl">
                    {info.map((s, i) => <div key={i} className="flex justify-between gap-4 px-3 py-1.5"><span className="text-muted-foreground">{s.name}</span><span className="font-medium text-right">{s.value}</span></div>)}
                  </div>
                ) : <p className="text-xs text-muted-foreground">Keine technischen Details verfügbar — frag uns direkt.</p>
              )}

              {!loading && tab === "ersatz" && (
                (analogs && analogs.length > 0) ? (
                  <div className="flex flex-wrap gap-1.5">
                    {analogs.map((x, i) => (
                      <button key={i} onClick={() => onSearchNumber(x.articleNumber)}
                        className="px-2.5 py-1.5 rounded-lg border border-border text-xs hover:border-primary/50 hover:text-primary transition-colors">
                        <span className="font-bold">{x.brand}</span> <span className="font-mono">{x.articleNumber}</span>
                      </button>
                    ))}
                  </div>
                ) : <p className="text-xs text-muted-foreground">Keine Ersatz-Artikel gefunden.</p>
              )}

              {!loading && tab === "anwendungen" && (
                (cars && cars.length > 0) ? (
                  <div className="space-y-1 max-w-xl">
                    {cars.map((g) => (
                      <div key={g.brand} className="rounded-lg border border-border overflow-hidden">
                        <button onClick={() => setOpenBrand(openBrand === g.brand ? null : g.brand)}
                          className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold hover:bg-secondary/50 transition-colors">
                          <span>{g.brand} ({g.count})</span>
                          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", openBrand === g.brand && "rotate-180")} />
                        </button>
                        {openBrand === g.brand && (
                          <div className="px-3 pb-2 text-xs text-muted-foreground">{g.models.join(" · ") || "Modelle auf Anfrage"}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-muted-foreground">Keine Fahrzeugliste verfügbar.</p>
              )}

              {!loading && tab === "oe" && (
                <div className="space-y-2 max-w-xl">
                  {oeNumbers && oeNumbers.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">OEM-Teilenummern</p>
                      <div className="flex flex-wrap gap-1">
                        {oeNumbers.map((oe) => <button key={oe} onClick={() => onSearchNumber(oe)} className="px-2 py-0.5 rounded bg-secondary font-mono text-[11px] hover:text-primary">{oe}</button>)}
                      </div>
                    </div>
                  )}
                  {analogs && analogs.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Ersatzteilnummern</p>
                      <div className="flex flex-wrap gap-1">
                        {analogs.slice(0, 12).map((x, i) => <span key={i} className="px-2 py-0.5 rounded bg-secondary text-[11px]"><b>{x.brand}</b> <span className="font-mono">{x.articleNumber}</span></span>)}
                      </div>
                    </div>
                  )}
                  {(!oeNumbers || oeNumbers.length === 0) && (!analogs || analogs.length === 0) && <p className="text-xs text-muted-foreground">Keine Referenznummern verfügbar.</p>}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── HERSTELLER-FILTER im Inter-Cars-Look (Logos, Suche, Sortierung) ─

import { ArrowDownAZ, ArrowDown01 } from "lucide-react";

function BrandLogo({ name, logo }: { name: string; logo?: string }) {
  const [err, setErr] = useState(false);
  const src = logo || `https://logo.clearbit.com/${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
  if (err || !name) {
    return <span className="w-10 h-5 rounded bg-secondary text-[8px] font-bold flex items-center justify-center shrink-0 uppercase">{name.slice(0, 4)}</span>;
  }
  return <img src={src} alt={name} loading="lazy" onError={() => setErr(true)}
    className="w-10 h-5 object-contain shrink-0 bg-white rounded border border-border/60 p-px" />;
}

export function BrandFilter({ brands, selected, onToggle, onReset }: {
  brands: Array<{ name: string; count: number; logo?: string }>;
  selected: Set<string>;
  onToggle: (brand: string) => void;
  onReset: () => void;
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"az" | "count">("az");
  const shown = brands
    .filter((b) => !q || b.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (sort === "az" ? a.name.localeCompare(b.name) : b.count - a.count));
  return (
    <aside className="w-56 shrink-0 hidden lg:block">
      <div className="border border-border rounded-xl p-4 sticky top-6">
        <h3 className="font-bold text-xs mb-2 uppercase tracking-widest text-muted-foreground">Filter</h3>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nach Filtern suchen"
          className="input-base w-full text-xs mb-3 py-1.5" />
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Hersteller</span>
          <div className="flex gap-1">
            <button onClick={() => setSort("az")} title="Alphabetisch"
              className={cn("p-1 rounded border", sort === "az" ? "border-primary text-primary" : "border-border text-muted-foreground")}>
              <ArrowDownAZ className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setSort("count")} title="Nach Anzahl"
              className={cn("p-1 rounded border", sort === "count" ? "border-primary text-primary" : "border-border text-muted-foreground")}>
              <ArrowDown01 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="space-y-1 max-h-[26rem] overflow-y-auto pr-1">
          {shown.map((b) => (
            <label key={b.name} className="flex items-center gap-2 cursor-pointer group py-0.5">
              <input type="checkbox" className="w-3.5 h-3.5 accent-primary shrink-0" checked={selected.has(b.name)} onChange={() => onToggle(b.name)} />
              <BrandLogo name={b.name} logo={b.logo} />
              <span className="text-xs group-hover:text-primary transition-colors flex-1 truncate font-medium">{b.name}</span>
              <span className="text-[11px] text-muted-foreground">({b.count})</span>
            </label>
          ))}
          {shown.length === 0 && <p className="text-xs text-muted-foreground py-2">Kein Hersteller gefunden.</p>}
        </div>
        {selected.size > 0 && <button onClick={onReset} className="mt-3 text-xs text-primary hover:underline">Zurücksetzen</button>}
      </div>
    </aside>
  );
}

// ─── UNTERKATEGORIEN-LISTE (aufklappbar wie Inter Cars) ─────

import type { ApCategoryNode } from "@/lib/autoparts";
import { ChevronRight } from "lucide-react";

export function SubCatList({ nodes, onPick, depth = 0 }: {
  nodes: ApCategoryNode[];
  onPick: (n: ApCategoryNode) => void;
  depth?: number;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  return (
    <div className={cn("space-y-0.5", depth > 0 && "ml-5 border-l border-border/60 pl-3 mt-1")}>
      {nodes.map((n) => {
        const key = `${n.name}|${n.id}`;
        const hasKids = n.children.length > 0;
        const isOpen = open.has(key);
        return (
          <div key={key}>
            <button
              onClick={() => {
                if (hasKids) { const s = new Set(open); isOpen ? s.delete(key) : s.add(key); setOpen(s); }
                else onPick(n);
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left hover:bg-secondary/60 hover:text-primary transition-colors group">
              <ChevronRight className={cn("w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform", isOpen && "rotate-90")} />
              <span className="font-medium">{n.name}</span>
              {!hasKids && <span className="text-xs text-muted-foreground group-hover:text-primary ml-auto">Teile anzeigen →</span>}
            </button>
            {hasKids && isOpen && (
              <>
                {n.id && (
                  <button onClick={() => onPick(n)} className="ml-9 text-xs text-primary hover:underline">Alle in „{n.name}" anzeigen</button>
                )}
                <SubCatList nodes={n.children} onPick={onPick} depth={depth + 1} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
