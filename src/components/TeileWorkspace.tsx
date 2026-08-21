import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, Check, X, Copy, ChevronRight, Package, Layers,
  ArrowDown, ArrowUp, CornerDownLeft, Search as SearchIcon, ZoomIn,
} from "lucide-react";
import { PriceBlock, DeliveryBadge, SpecStrip, eur, memberPrice, MEMBER_LEVELS, type MemberLevelId } from "@/components/TeileportalPricing";
import { cn } from "@/lib/utils";

/**
 * Arbeitsfläche der Teilebörse — drei Spalten wie im Werkstatt-Katalog:
 *
 *   Filter │ Trefferliste │ Angebot
 *
 * Der Gedanke: Wer ein Teil sucht, will nicht klicken–zurück–klicken. Links
 * bleibt die Eingrenzung stehen, in der Mitte läuft man mit den Pfeiltasten
 * durch die Treffer, rechts steht sofort alles zum ausgewählten Teil —
 * Bild, Daten, Alternativen anderer Marken mit Preis und Lieferzeit.
 * Kein Modal, kein Seitenwechsel, kein Kontextverlust.
 */

export interface WorkArticle {
  id: string | number;
  name: string;
  brand: string;
  articleNumber: string;
  imageUrl?: string;
  category?: string;
  oeNumbers?: string[];
  specs?: { name: string; value: string }[];
  price?: number;
  availability?: string;
  deliveryDays?: number;
}

const key = (a: WorkArticle) => String(a.id);

/* ───────────────────────── Trefferzeile ───────────────────────── */

function Row({
  a,
  active,
  level,
  brandLogo,
  onSelect,
  onAdd,
  innerRef,
}: {
  a: WorkArticle;
  active: boolean;
  level: MemberLevelId;
  brandLogo?: string;
  onSelect: () => void;
  onAdd: () => void;
  innerRef: (el: HTMLDivElement | null) => void;
}) {
  const lvl = MEMBER_LEVELS.find((l) => l.id === level);
  const shown = a.price != null ? (lvl ? memberPrice(a.price, lvl.pct) : a.price) : null;

  return (
    <div
      ref={innerRef}
      onClick={onSelect}
      role="option"
      aria-selected={active}
      tabIndex={-1}
      className={cn(
        "grid grid-cols-[40px_1fr_auto] lg:grid-cols-[40px_minmax(0,1fr)_92px_104px_100px_32px] items-center gap-3 px-3 py-2 cursor-pointer border-l-[3px] transition-colors",
        active
          ? "border-l-primary bg-primary/[0.07]"
          : "border-l-transparent hover:bg-secondary/60"
      )}
    >
      <div className="w-10 h-10 rounded-lg bg-white border border-border/60 flex items-center justify-center overflow-hidden p-0.5 shrink-0">
        {a.imageUrl ? (
          <img src={a.imageUrl} alt="" loading="lazy" className="w-full h-full object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }} />
        ) : brandLogo ? (
          <img src={brandLogo} alt="" className="w-full h-full object-contain p-1 opacity-60" />
        ) : (
          <Package className="w-4 h-4 text-muted-foreground/40" />
        )}
      </div>

      <div className="min-w-0">
        <p className={cn("text-[13px] leading-tight truncate", active ? "font-semibold" : "font-medium")}>
          {a.name}
        </p>
        <p className="text-[11px] text-muted-foreground font-mono truncate">{a.articleNumber}</p>
      </div>

      <span className="hidden lg:block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
        {a.brand}
      </span>

      <div className="hidden lg:block">
        {a.deliveryDays != null ? (
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border",
            a.deliveryDays <= 1
              ? "bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-400"
              : a.deliveryDays === 2
              ? "bg-amber-400/15 text-amber-700 border-amber-400/30 dark:text-amber-300"
              : "bg-secondary text-muted-foreground border-border"
          )}>
            {a.deliveryDays <= 1 ? "1 Werktag" : `${a.deliveryDays} Werktage`}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground/60">auf Anfrage</span>
        )}
      </div>

      <div className="text-right">
        {shown != null ? (
          <>
            <p className="text-sm font-bold tabular-nums leading-tight">{eur(shown)}</p>
            {lvl && a.price != null && (
              <p className="text-[10px] text-muted-foreground line-through tabular-nums">{eur(a.price)}</p>
            )}
          </>
        ) : (
          <span className="text-[11px] text-muted-foreground">auf Anfrage</span>
        )}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onAdd(); }}
        title="In den Teile-Warenkorb"
        className="hidden lg:flex w-8 h-8 rounded-lg border border-border items-center justify-center text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
      >
        <ShoppingBag className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ───────────────────────── Angebots-Panel ───────────────────────── */

function OfferPanel({
  a,
  alternatives,
  level,
  brandLogo,
  onAdd,
  onPick,
  onZoom,
  vehicleLabel,
  onClose,
}: {
  a: WorkArticle;
  alternatives: WorkArticle[];
  level: MemberLevelId;
  brandLogo?: (b: string) => string | undefined;
  onAdd: (a: WorkArticle, qty: number) => void;
  onPick: (a: WorkArticle) => void;
  onZoom?: (a: WorkArticle) => void;
  vehicleLabel?: string;
  onClose?: () => void;
}) {
  const [qty, setQty] = useState(1);
  const [copied, setCopied] = useState(false);
  useEffect(() => { setQty(1); }, [a.id]);

  const copy = () => {
    navigator.clipboard?.writeText(a.articleNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }).catch(() => { /* ohne Zwischenablage eben nicht */ });
  };

  const lvl = MEMBER_LEVELS.find((l) => l.id === level);
  const cheapest = alternatives.find((x) => x.price != null && a.price != null && x.price < a.price);

  return (
    <div className="flex flex-col h-full">
      {/* Kopf */}
      <div className="flex items-start gap-3 p-4 border-b border-border">
        <button
          onClick={() => onZoom?.(a)}
          className="w-20 h-20 rounded-xl bg-white border border-border flex items-center justify-center overflow-hidden p-1.5 shrink-0 relative group"
        >
          {a.imageUrl ? (
            <img src={a.imageUrl} alt={a.name} className="w-full h-full object-contain" />
          ) : (
            <Package className="w-7 h-7 text-muted-foreground/40" />
          )}
          {onZoom && (
            <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ZoomIn className="w-5 h-5 text-white" />
            </span>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">{a.brand}</p>
          <p className="font-semibold leading-tight text-sm mt-0.5">{a.name}</p>
          <button
            onClick={copy}
            className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
            title="Artikelnummer kopieren"
          >
            {a.articleNumber}
            {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3 opacity-50" />}
          </button>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden w-8 h-8 rounded-lg border border-border flex items-center justify-center shrink-0">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {vehicleLabel && (
          <p className="flex items-center gap-1.5 px-4 py-2 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-b border-emerald-500/20">
            <Check className="w-3.5 h-3.5 shrink-0" /> Passt zu {vehicleLabel}
          </p>
        )}

        {/* Preis + Menge + Warenkorb */}
        <div className="p-4 border-b border-border">
          <div className="flex items-end justify-between gap-3">
            <div>
              {a.deliveryDays != null && (
                <DeliveryBadge deliveryDays={a.deliveryDays} availability={a.availability} />
              )}
            </div>
            {a.price != null ? (
              <PriceBlock price={a.price} level={level} />
            ) : (
              <span className="text-sm text-muted-foreground">Preis auf Anfrage</span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-4">
            <div className="flex items-center border border-border rounded-lg h-11">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-9 h-full text-muted-foreground hover:text-foreground font-bold">−</button>
              <input
                type="number" min={1} value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                className="w-12 h-full text-center bg-transparent font-mono text-sm focus:outline-none"
              />
              <button onClick={() => setQty((q) => q + 1)} className="w-9 h-full text-muted-foreground hover:text-foreground font-bold">+</button>
            </div>
            <button onClick={() => onAdd(a, qty)} className="btn-primary flex-1 h-11">
              <ShoppingBag className="w-4 h-4" /> In den Warenkorb
            </button>
          </div>
          {lvl && a.price != null && qty > 1 && (
            <p className="text-[11px] text-muted-foreground mt-2 text-right">
              {qty} × {eur(memberPrice(a.price, lvl.pct))} = <b className="text-foreground">{eur(memberPrice(a.price, lvl.pct) * qty)}</b>
            </p>
          )}
        </div>

        {/* Technische Daten */}
        <div className="p-4 border-b border-border">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Technische Daten</p>
          <SpecStrip articleId={String(a.id)} specs={a.specs} auto />
        </div>

        {/* Alternativen — das ist die eigentliche Börse */}
        {alternatives.length > 0 && (
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {alternatives.length} weitere Angebote
              </p>
            </div>
            {cheapest && cheapest.price != null && a.price != null && (
              <p className="text-[11px] text-muted-foreground mb-2">
                Günstigste Alternative spart{" "}
                <b className="text-primary">{eur(a.price - cheapest.price)}</b>
              </p>
            )}
            <div className="space-y-1">
              {alternatives.map((alt) => {
                const p = alt.price != null ? (lvl ? memberPrice(alt.price, lvl.pct) : alt.price) : null;
                return (
                  <button
                    key={key(alt)}
                    onClick={() => onPick(alt)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/[0.04] transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded bg-white border border-border/60 flex items-center justify-center overflow-hidden p-0.5 shrink-0">
                      {alt.imageUrl ? (
                        <img src={alt.imageUrl} alt="" loading="lazy" className="w-full h-full object-contain" />
                      ) : brandLogo?.(alt.brand) ? (
                        <img src={brandLogo(alt.brand)!} alt="" className="w-full h-full object-contain p-0.5 opacity-60" />
                      ) : (
                        <Package className="w-3.5 h-3.5 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground leading-tight">{alt.brand}</p>
                      <p className="text-[11px] text-muted-foreground/80 truncate">
                        {alt.deliveryDays != null ? `${alt.deliveryDays} Werktag${alt.deliveryDays === 1 ? "" : "e"}` : "auf Anfrage"}
                      </p>
                    </div>
                    {p != null && <span className="text-sm font-bold tabular-nums shrink-0">{eur(p)}</span>}
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* OE-Nummern */}
        {a.oeNumbers && a.oeNumbers.length > 0 && (
          <div className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              OE-Nummern ({a.oeNumbers.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {a.oeNumbers.slice(0, 24).map((n) => (
                <span key={n} className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-mono text-muted-foreground">
                  {n}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Arbeitsfläche ───────────────────────── */

export function TeileWorkspace({
  articles,
  level,
  brandLogo,
  onAddToCart,
  onZoom,
  vehicleLabel,
  left,
  toolbar,
  title,
}: {
  articles: WorkArticle[];
  level: MemberLevelId;
  brandLogo?: (b: string) => string | undefined;
  onAddToCart: (a: WorkArticle, qty: number) => void;
  onZoom?: (a: WorkArticle) => void;
  vehicleLabel?: string;
  /** Filterspalte (Marken, Schnellfilter) — kommt aus der Seite. */
  left?: React.ReactNode;
  /** Sortier-/Suchleiste über der Liste. */
  toolbar?: React.ReactNode;
  title?: React.ReactNode;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const listRef = useRef<HTMLDivElement>(null);

  // Immer eine Auswahl haben — sonst steht die rechte Spalte leer herum.
  useEffect(() => {
    if (articles.length === 0) { setSelectedId(null); return; }
    if (!selectedId || !articles.some((a) => key(a) === selectedId)) {
      setSelectedId(key(articles[0]));
    }
  }, [articles, selectedId]);

  const selected = useMemo(
    () => articles.find((a) => key(a) === selectedId) ?? articles[0],
    [articles, selectedId]
  );

  const alternatives = useMemo(() => {
    if (!selected) return [];
    return articles
      .filter((a) => key(a) !== key(selected))
      .filter((a) => !selected.category || !a.category || a.category === selected.category)
      .sort((x, y) => (x.price ?? Infinity) - (y.price ?? Infinity))
      .slice(0, 8);
  }, [articles, selected]);

  const pick = (a: WorkArticle, openSheet = false) => {
    setSelectedId(key(a));
    if (openSheet) setSheetOpen(true);
    const el = rowRefs.current[key(a)];
    el?.scrollIntoView({ block: "nearest" });
  };

  // Tastatur: Pfeile blättern, Enter legt in den Warenkorb.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (articles.length === 0) return;
      const i = articles.findIndex((a) => key(a) === selectedId);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        pick(articles[Math.min(articles.length - 1, i + 1)]);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        pick(articles[Math.max(0, i - 1)]);
      } else if (e.key === "Enter" && selected) {
        e.preventDefault();
        onAddToCart(selected, 1);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [articles, selectedId, selected, onAddToCart]);

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_410px] min-[1800px]:grid-cols-[220px_minmax(0,1fr)_410px] lg:gap-4 lg:items-start">
      {/* ── Links: Filter ── */}
      {left && (
        <aside className="hidden min-[1800px]:block lg:sticky lg:top-[68px] lg:max-h-[calc(100vh-84px)] lg:overflow-y-auto pb-4">
          {left}
        </aside>
      )}

      {/* ── Mitte: Trefferliste ── */}
      <div className="min-w-0">
        {title}
        {toolbar}

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="hidden lg:grid grid-cols-[40px_minmax(0,1fr)_92px_104px_100px_32px] gap-3 px-3 py-2 bg-secondary/60 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span />
            <span>Teil / Artikelnummer</span>
            <span>Marke</span>
            <span>Lieferung</span>
            <span className="text-right">Preis</span>
            <span />
          </div>

          <div ref={listRef} className="divide-y divide-border/60 max-h-[calc(100vh-220px)] overflow-y-auto" role="listbox">
            {articles.map((a) => (
              <Row
                key={key(a)}
                a={a}
                active={key(a) === selectedId}
                level={level}
                brandLogo={brandLogo?.(a.brand)}
                onSelect={() => pick(a, true)}
                onAdd={() => onAddToCart(a, 1)}
                innerRef={(el) => { rowRefs.current[key(a)] = el; }}
              />
            ))}
            {articles.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-12">
                Keine Treffer — Filter zurücksetzen oder anders suchen.
              </p>
            )}
          </div>
        </div>

        {/* Tastatur-Hinweis — Profis bedienen so am schnellsten */}
        {articles.length > 1 && (
          <p className="hidden lg:flex items-center gap-2 mt-2 text-[11px] text-muted-foreground/70">
            <kbd className="px-1 py-0.5 rounded border border-border"><ArrowUp className="w-2.5 h-2.5" /></kbd>
            <kbd className="px-1 py-0.5 rounded border border-border"><ArrowDown className="w-2.5 h-2.5" /></kbd>
            blättern
            <kbd className="px-1.5 py-0.5 rounded border border-border inline-flex items-center gap-1">
              <CornerDownLeft className="w-2.5 h-2.5" />
            </kbd>
            in den Warenkorb
            <kbd className="px-1.5 py-0.5 rounded border border-border font-mono">/</kbd>
            suchen
          </p>
        )}
      </div>

      {/* ── Rechts: Angebot (Desktop) ── */}
      <aside className="hidden lg:block lg:sticky lg:top-[68px] lg:h-[calc(100vh-84px)] rounded-xl border border-border bg-card overflow-hidden">
        {selected ? (
          <OfferPanel
            a={selected}
            alternatives={alternatives}
            level={level}
            brandLogo={brandLogo}
            onAdd={onAddToCart}
            onPick={(alt) => pick(alt)}
            onZoom={onZoom}
            vehicleLabel={vehicleLabel}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 text-muted-foreground">
            <SearchIcon className="w-8 h-8 opacity-30 mb-3" />
            <p className="text-sm">Teil links auswählen — hier stehen dann Preis, Daten und Alternativen.</p>
          </div>
        )}
      </aside>

      {/* ── Rechts: Angebot (Handy als Sheet) ── */}
      <AnimatePresence>
        {sheetOpen && selected && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden"
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setSheetOpen(false)} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="absolute inset-x-0 bottom-0 h-[86vh] bg-background rounded-t-2xl border-t border-border overflow-hidden"
            >
              <OfferPanel
                a={selected}
                alternatives={alternatives}
                level={level}
                brandLogo={brandLogo}
                onAdd={(x, q) => { onAddToCart(x, q); setSheetOpen(false); }}
                onPick={(alt) => pick(alt)}
                onZoom={onZoom}
                vehicleLabel={vehicleLabel}
                onClose={() => setSheetOpen(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
