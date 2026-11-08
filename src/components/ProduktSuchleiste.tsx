import { useEffect, useRef, useState, type RefObject } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, X, Check, SlidersHorizontal } from "lucide-react";
import { categoryPath, navCategories, type ShopLink } from "@/lib/categories";
import { MarkenLeiste } from "@/components/MarkenLeiste";
import { cn } from "@/lib/utils";

/** Misst den Kopf und hält die Leiste direkt darunter, ohne etwas zu verdecken. */
export function useKlebeLeiste() {
  const leisteRef = useRef<HTMLDivElement>(null);
  const [klebt, setKlebt] = useState(false);
  useEffect(() => {
    const el = leisteRef.current;
    if (!el) return;
    const kopf = document.querySelector("#root header");
    const messen = () => {
      const px = kopf ? Math.ceil(kopf.getBoundingClientRect().height) : 96;
      document.documentElement.style.setProperty("--shop-kopf", `${px}px`);
      el.style.top = `${px}px`;
      document.documentElement.style.setProperty("--shop-leiste", `${el.offsetHeight}px`);
    };
    messen();
    const ro = new ResizeObserver(messen);
    ro.observe(el);
    if (kopf) ro.observe(kopf);
    let rahmen = 0;
    const pruefen = () => {
      cancelAnimationFrame(rahmen);
      rahmen = requestAnimationFrame(() => {
        const kante = kopf ? kopf.getBoundingClientRect().bottom : 0;
        const jetzt = el.getBoundingClientRect().top <= kante + 1;
        setKlebt((alt) => (alt === jetzt ? alt : jetzt));
      });
    };
    pruefen();
    window.addEventListener("scroll", pruefen, { passive: true });
    window.addEventListener("resize", pruefen);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(rahmen);
      window.removeEventListener("scroll", pruefen);
      window.removeEventListener("resize", pruefen);
      document.documentElement.style.removeProperty("--shop-leiste");
      document.documentElement.style.removeProperty("--shop-kopf");
    };
  }, []);
  return { leisteRef, klebt };
}

export function CategoryDropdown({
  activeCategory,
  activeSlug,
  zu = (slug: string) => `/shop/${slug}`,
}: {
  activeCategory?: { label: string };
  activeSlug?: string;
  /** Wohin eine Kategorie führt. Produktlinks (Wunschfarbe) bleiben, wie sie sind. */
  zu?: (slug: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const ziel = (item: Pick<ShopLink, "slug" | "to">) => {
    if (item.to) return item.to;
    if (item.slug) return zu(item.slug);
    return null;
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const label = activeCategory?.label ?? "Kategorien";

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 h-10 lg:h-[44px] px-3 lg:px-4 rounded-xl border text-sm font-medium transition-all duration-200",
          "bg-muted/50",
          open
            ? "border-primary/50 text-foreground"
            : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border",
        )}
      >
        <SlidersHorizontal className="w-4 h-4 shrink-0" />
        <span className="max-w-[11rem] truncate sm:max-w-[10rem] lg:max-w-[160px]">{label}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="shrink-0"
        >
          <ChevronDown className="w-4 h-4" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{ willChange: "transform, opacity" }}
            className="absolute right-0 top-[calc(100%+8px)] w-[22rem] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-2">
              <Link
                to="/shop"
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  !activeSlug
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted/60 text-foreground",
                )}
              >
                <span>Alle Produkte</span>
                {!activeSlug && <Check className="w-4 h-4" />}
              </Link>
            </div>
            <div className="h-px bg-border/50 mx-3" />
            <div className="p-2 max-h-[62vh] overflow-y-auto">
              {navCategories.map((group) => {
                const children = group.children ?? [];
                const groupHref = ziel(group);
                const groupActive = Boolean(group.slug && activeSlug === group.slug);
                return (
                  <div key={group.label} className="mb-1">
                    {groupHref && children.length === 0 ? (
                      <Link
                        to={groupHref}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center justify-between px-3 py-2.5 mt-2 rounded-xl text-sm font-medium transition-colors",
                          groupActive
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted/60 text-foreground/80 hover:text-foreground",
                        )}
                      >
                        <span>{group.label}</span>
                        {groupActive && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </Link>
                    ) : groupHref ? (
                      <Link
                        to={groupHref}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center justify-between gap-2 px-3 pt-3 pb-1.5 text-[11px] font-bold leading-snug rounded-lg",
                          groupActive ? "text-primary" : "text-foreground/80 hover:text-foreground",
                        )}
                      >
                        <span>{group.label}</span>
                        {groupActive && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </Link>
                    ) : (
                      <p className="px-3 pt-3 pb-1.5 text-[11px] font-bold text-foreground/70 leading-snug select-none">
                        {group.label}
                      </p>
                    )}
                    {children.map((child) => {
                      const href = child.to ? child.to : child.slug ? zu(child.slug) : categoryPath(child);
                      if (!href) return null;
                      const active = Boolean(child.slug && activeSlug === child.slug);
                      return (
                        <Link
                          key={child.slug ?? href}
                          to={href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors",
                            active
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-muted/60 text-foreground/80 hover:text-foreground",
                          )}
                        >
                          <span>{child.label}</span>
                          {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ProduktSuchleiste({
  suche,
  onSuche,
  onLeeren,
  inputRef,
  kategorieLabel,
  kategorieSlug,
  kategorieZu,
  marken,
  markenWerte,
  onMarke,
  ganzSuche,
  rand = "shop",
}: {
  suche: string;
  onSuche: (wert: string) => void;
  onLeeren: () => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  kategorieLabel?: string;
  kategorieSlug?: string;
  kategorieZu?: (slug: string) => string;
  marken: { name: string; anzahl: number }[];
  markenWerte: string[];
  onMarke: (name: string) => void;
  /** Link, der die gleiche Suche im ganzen Shop öffnet. */
  ganzSuche?: string;
  /** Negativer Rand, damit der Hintergrund die Seitenpolster mit abdeckt. */
  rand?: "shop" | "seite";
}) {
  const { leisteRef, klebt } = useKlebeLeiste();
  const eigen = useRef<HTMLInputElement>(null);
  const feld = inputRef ?? eigen;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const ziel = document.activeElement;
      if (ziel && (ziel.tagName === "INPUT" || ziel.tagName === "TEXTAREA" || (ziel as HTMLElement).isContentEditable)) return;
      e.preventDefault();
      feld.current?.focus();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [feld]);

  return (
    <div
      ref={leisteRef}
      className={cn(
        "sticky z-30 mb-3 py-1.5 sm:py-2 top-24 lg:top-36",
        rand === "shop" ? "-mx-3 px-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0" : "-mx-4 px-4",
        "bg-background/95 backdrop-blur-md",
        klebt && "shadow-[0_8px_18px_rgba(0,0,0,0.08)]",
      )}
    >
      <div className="flex flex-col gap-1.5 lg:flex-row lg:items-center lg:gap-3">
        <div className="flex w-full flex-col gap-2 rounded-2xl border px-2 py-1 sm:flex-row sm:items-center lg:px-3 lg:py-2 bg-card border-border/80 shadow-[0_2px_12px_rgba(0,0,0,0.06)] lg:w-[min(100%,34rem)] lg:shrink-0">
          <div className="relative min-w-0 flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 lg:left-4 lg:w-[18px] lg:h-[18px] text-muted-foreground transition-colors duration-200 group-focus-within:text-primary" />
            <input
              ref={feld}
              value={suche}
              onChange={(e) => onSuche(e.target.value)}
              placeholder="Produkt suchen …"
              className="w-full min-w-0 h-10 lg:h-[44px] pl-9 pr-9 lg:pl-10 lg:pr-10 rounded-xl border-0 text-sm bg-transparent outline-none transition-all duration-200 placeholder:text-muted-foreground/50"
              aria-label="Produktsuche"
              autoComplete="off"
            />
            <AnimatePresence>
              {suche ? (
                <motion.button
                  key="leer"
                  type="button"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => {
                    onLeeren();
                    feld.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  aria-label="Suche zurücksetzen"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              ) : (
                <motion.span
                  key="taste"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 pointer-events-none"
                >
                  <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono border border-border/60 text-muted-foreground/50 bg-muted/30">/</kbd>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <CategoryDropdown
            activeCategory={kategorieLabel ? { label: kategorieLabel } : undefined}
            activeSlug={kategorieSlug}
            zu={kategorieZu}
          />
        </div>
        <div className="flex items-center gap-2 min-w-0 lg:flex-1">
          <span className="hidden lg:inline shrink-0 text-xs font-bold uppercase tracking-wide text-muted-foreground">Marke</span>
          <div className="min-w-0 flex-1">
            <MarkenLeiste marken={marken} werte={markenWerte} onWahl={onMarke} label="Marke" />
          </div>
        </div>
      </div>
      {ganzSuche && suche.trim() && (
        <Link to={ganzSuche} className="mt-1.5 inline-flex items-center min-h-8 text-xs font-semibold text-primary hover:underline">
          Im ganzen Shop suchen
        </Link>
      )}
    </div>
  );
}
