import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Palette, Droplets, Layers, Pipette, FlaskConical,
  ChevronDown, X, Check, SlidersHorizontal,
} from "lucide-react";
import { Seo } from "@/components/Seo";
import { ProductGrid } from "@/components/ProductGrid";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/hooks/useProducts";
import {
  storefrontApiRequest,
  STOREFRONT_PRODUCT_BY_HANDLE_QUERY,
  type ShopifyProduct,
} from "@/lib/shopify";
import { allCategories, getCategoryBySlug, collections, navCategories } from "@/lib/categories";
import { cn } from "@/lib/utils";

// Eigene-Farbe-Konfiguratoren: ganz oben, wenn man den Shop betritt.
const FEATURED_HANDLES = [
  "farben-mix",
  "individuelle-spraydose-erstellen",
  "individuellen-lackstift-bestellen-20ml",
];

// Produkte die komplett ausgeblendet werden (FRIZ + grau UBS)
const HIDDEN_HANDLES = new Set<string>([
  "friz-2k-klarlack-glanzender-schutz-fur-perfekten-finish",
  "friz-harter-10",
  "friz-2k-harter-25-standard-harter-fur-klarlack-und-2k-lacke",
  "friz-silikonentferner-mild",
  "friz-silikonentferner-mild-1",
  "friz-ubs-steinschlagschutz-schwarz-robuster-schutz-uberlackierbar",
  "friz-ubs-steinschlagschutz-robuster-schutz-uberlackierbar-vielseitig",
  "friz-multi-spachtel-rot",
  "friz-profi-pe-multi-green",
  "friz-2k-acrylverdunnung-n-5-liter",
  "friz-nitroverdunnung-5l",
  "friz-bc-verdunnung-5l",
  "friz-silikonentferner-5l",
  "friz-1k-dickschicht-grundierung-weiss",
  "friz-1k-dickschicht-grundierung-schwarz",
  "friz-1k-dickschicht-grundierung",
  "friz-1k-klarlack-glanzend",
  "friz-rallye-spray-schwarz-matt",
  "friz-schleifpaste-perfect-heavy-cut-250-g",
  "hochglanz-antihologramm-politur-750g-friz",
  "schleifpaste-perfect-heavy-cut-750g-silikonfrei-friz",
  "schleifpaste-perfect-heavy-cut-friz",
  "troton-ubs-steinschlagschutz-korrosionsschutz-unterbodenschutz-grau-500ml",
]);

const PRODUCT_PRIORITY: string[] = [
  "mipa-cc9-2k-hs-klarlack-5l",
  "mipa-cx4-express-klarlack",
  "master-hs-2-1-klarlack-5l",
  "mipa-cc-9-klarlack-1-l",
  "individuellen-lackstift-bestellen-20ml",
  "mipa-hs-25-2k-harter-normal",
  "mipa-hs25-harter-normal",
  "mipa-hs-10-2k-hs-harter-kurz",
  "mipa-hs-35-2k-hs-harter-lang",
  "mipa-h5-2k-harter-extra-schnell",
  "master-hs-harter-2k",
  "master-harter-hs-1-2-fast-0-5-l",
  "master-hs-1-2-harter-standard",
  "master-hs-1-2-harter-fast",
  "avo-acrylverdunnung-profi-line",
  "meyer-nitro-universalverdunnung",
  "feiner-schleifschwamm-p220-p400",
  "troton-ubs-steinschlagschutz-korrosionsschutz-unterbodenschutz-500ml",
  "mipa-steinschlagschutz-ubs-uberlackierbar-schwarz",
  "rhynogrip-p800-schleifscheiben",
  "rhynogrip-p600-schleifscheiben",
  "rhynogrip-p500-schleifscheiben",
  "rhynogrip-p400-schleifscheiben",
  "mp-schleifscheiben-goldfilm",
  "app-ws-222-schleifvlies",
  "beiges-abdeckband-19-mm-prazise-kanten-perfektes-finish",
  "beiges-abdeckband-30-mm-fur-breite-saubere-kanten",
  "green-tape-19-mm-profi-abdeckband-fur-lackierer",
  "green-tape-30-mm-abdeckband-fur-prazise-lackierarbeiten",
  "green-tape-50-mm-extra-breit-fur-maximale-kontrolle",
  "crs-foam-tape",
  "mipa-etch-filler-hb-der-1k-haftfuller-fur-schwierige-untergrunde",
  "mipa-etch-primer-spray",
  "mipa-acryl-lack-spray",
  "a1-speed-polish-dr-wack",
  "a1-speed-polish-glanz-in-rekordzeit",
  "a1-polish-wax",
  "a1-der-wax-schwamm",
  "a1-speed-shampoo-schnell-schonend-stark",
  "gewaffelte-polierpads",
  "mipa-mipatherm-silber-hitzebestandiger-lack-bis-800-c-400-ml-spraydose",
  "mipa-mipatherm-hitzebestandiger-lack-bis-800-c-400-ml-spraydose",
];

const isFrizProduct = (handle: string) =>
  handle.includes("friz") ||
  handle.startsWith("hochglanz-antihologramm-politur") ||
  handle.startsWith("schleifpaste-perfect-heavy-cut");

// ── Category Dropdown ──────────────────────────────────────────────────────────
function CategoryDropdown({
  activeCategory,
  activeSlug,
}: {
  activeCategory: { label: string } | undefined;
  activeSlug: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
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
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 h-[44px] px-4 rounded-xl border text-sm font-medium transition-all duration-200",
          "bg-muted/50",
          open
            ? "border-primary/50 text-foreground"
            : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border",
        )}
      >
        <SlidersHorizontal className="w-4 h-4 shrink-0" />
        <span className="max-w-[120px] sm:max-w-[160px] truncate">{label}</span>
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
            className="absolute right-0 top-[calc(100%+8px)] w-72 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Alle Produkte */}
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

            {/* Grouped categories */}
            <div className="p-2 max-h-[62vh] overflow-y-auto">
              {navCategories.map((group) => {
                const children = group.children ?? (group.slug ? [group as { label: string; slug: string }] : []);
                if (!children.length) return null;
                return (
                  <div key={group.label} className="mb-1">
                    <p className="px-3 pt-3 pb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest select-none">
                      {group.label}
                    </p>
                    {children.map((child) => (
                      <Link
                        key={child.slug}
                        to={`/shop/${child.slug}`}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors",
                          activeSlug === child.slug
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted/60 text-foreground/80 hover:text-foreground",
                        )}
                      >
                        <span>{child.label}</span>
                        {activeSlug === child.slug && (
                          <Check className="w-3.5 h-3.5 shrink-0" />
                        )}
                      </Link>
                    ))}
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

// ── Shop Page ─────────────────────────────────────────────────────────────────
export default function Shop() {
  const { category } = useParams();
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const activeCategory =
    category
      ? getCategoryBySlug(category) ?? collections.find((c) => c.slug === category)
      : undefined;

  // Live search — debounced 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setSubmittedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Keyboard shortcut: "/" focuses search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const query = useMemo(() => {
    if (submittedSearch.trim()) return `title:*${submittedSearch.trim()}*`;
    if (activeCategory) return activeCategory.query;
    return "";
  }, [submittedSearch, activeCategory]);

  const { products, isLoading, error, hasNextPage, loadMore } = useProducts({ query });

  // Featured konfigurator products
  const [featured, setFeatured] = useState<ShopifyProduct[]>([]);
  useEffect(() => {
    Promise.all(
      FEATURED_HANDLES.map((h) =>
        storefrontApiRequest(STOREFRONT_PRODUCT_BY_HANDLE_QUERY, { handle: h })
          .then((d) => d?.data?.productByHandle)
          .catch(() => null),
      ),
    ).then((nodes) =>
      setFeatured(nodes.filter(Boolean).map((node: ShopifyProduct["node"]) => ({ node }))),
    );
  }, []);

  const showFeatured = !category && !submittedSearch.trim();

  const gridProducts = products.filter((p) => {
    if (HIDDEN_HANDLES.has(p.node.handle)) return false;
    if (isFrizProduct(p.node.handle)) return false;
    if (showFeatured && FEATURED_HANDLES.includes(p.node.handle)) return false;
    return true;
  });

  const sortedGridProducts = useMemo(() => {
    return [...gridProducts].sort((a, b) => {
      const ah = a.node.handle;
      const bh = b.node.handle;
      const ai = PRODUCT_PRIORITY.indexOf(ah);
      const bi = PRODUCT_PRIORITY.indexOf(bh);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      const aFriz = isFrizProduct(ah);
      const bFriz = isFrizProduct(bh);
      if (aFriz && !bFriz) return 1;
      if (!aFriz && bFriz) return -1;
      return 0;
    });
  }, [gridProducts]);

  const title = activeCategory ? activeCategory.label : "Shop";

  // Sticky shadow on scroll
  const [isStuck, setIsStuck] = useState(false);
  const stickyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = stickyRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { threshold: 1, rootMargin: "-81px 0px 0px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="container py-8 sm:py-12">
      <Seo
        title={title}
        description={`${title} bei Alex Autoshop Wuppertal – Lackierprodukte, Autoteile und Werkstattbedarf mit B2B-Rabatten bis 40%.`}
      />

      <h1 className="text-3xl sm:text-4xl mb-6">{title}</h1>

      {/* Sentinel for IntersectionObserver */}
      <div ref={stickyRef} className="h-px -mt-px" />

      {/* ── Sticky Search Bar ───────────────────────────────────────────── */}
      <div
        className={cn(
          "sticky top-20 sm:top-24 z-30 py-3",
          "transition-all duration-300",
        )}
      >
        <div className={cn(
          "flex items-center gap-3 rounded-2xl border px-3 py-2",
          "bg-card border-border/80 backdrop-blur-md transition-all duration-300",
          isStuck
            ? "shadow-[0_8px_32px_rgba(0,0,0,0.18)] border-border"
            : "shadow-[0_2px_12px_rgba(0,0,0,0.08)]",
        )}>
          {/* Search input */}
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground transition-colors duration-200 group-focus-within:text-primary" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Produkt suchen …"
              className={cn(
                "w-full h-[44px] pl-10 pr-10 rounded-xl border-0 text-sm",
                "bg-transparent",
                "outline-none transition-all duration-200",
                "placeholder:text-muted-foreground/50",
              )}
              aria-label="Produktsuche"
              autoComplete="off"
            />

            {/* Clear button */}
            <AnimatePresence>
              {search && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => {
                    setSearch("");
                    setSubmittedSearch("");
                    inputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  aria-label="Suche zurücksetzen"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Keyboard hint — only when empty and not mobile */}
            <AnimatePresence>
              {!search && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 pointer-events-none"
                >
                  <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono border border-border/60 text-muted-foreground/50 bg-muted/30">
                    /
                  </kbd>
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Category dropdown */}
          <CategoryDropdown activeCategory={activeCategory} activeSlug={category} />
        </div>{/* end card row */}


        {/* Active category breadcrumb */}
        <AnimatePresence>
          {category && activeCategory && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 8 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link to="/shop" className="hover:text-foreground transition-colors">
                  Alle
                </Link>
                <span>/</span>
                <span className="text-foreground font-medium">{activeCategory.label}</span>
                <Link
                  to="/shop"
                  className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                  Filter entfernen
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mb-4" />

      {/* Schnellzugriff: Klarlack · Härter · Wunschfarbe · Verdünnung */}
      {showFeatured && (
        <section className="mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { slug: "klarlacke", label: "Klarlack", sub: "2K HS & Express", icon: <Layers className="w-7 h-7" />, color: "from-blue-500/20 to-blue-400/5" },
              { slug: "haerter", label: "Härter", sub: "Standard · Fast · Slow", icon: <FlaskConical className="w-7 h-7" />, color: "from-amber-500/20 to-amber-400/5" },
              { slug: "wunschfarben", label: "Wunschfarbe", sub: "Mipa · Standox · Sikkens", icon: <Pipette className="w-7 h-7" />, color: "from-primary/20 to-primary/5" },
              { slug: "verduennungen", label: "Verdünnung", sub: "Acryl · Nitro · Uni", icon: <Droplets className="w-7 h-7" />, color: "from-emerald-500/20 to-emerald-400/5" },
            ].map(({ slug, label, sub, icon, color }) => (
              <Link
                key={slug}
                to={`/shop/${slug}`}
                className={`group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${color} p-5 flex flex-col gap-3 hover:border-primary/50 transition-all duration-200 hover:scale-[1.02] min-h-[130px]`}
              >
                <span className="text-primary opacity-80 group-hover:opacity-100 transition-opacity">{icon}</span>
                <div>
                  <p className="font-bold text-base leading-tight">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Eigene Farbe konfigurieren */}
      {showFeatured && featured.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-5 h-5 text-primary" />
            <h2 className="text-xl sm:text-2xl">Eigene Farbe konfigurieren</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5 items-start">
            {featured.map((p) => (
              <ProductCard key={p.node.id} product={p} />
            ))}
          </div>
          <div className="h-px bg-border my-8" />
          <h2 className="text-xl sm:text-2xl mb-4">Alle Produkte</h2>
        </section>
      )}

      <ProductGrid
        products={sortedGridProducts}
        isLoading={isLoading}
        error={error}
        hasNextPage={hasNextPage}
        onLoadMore={loadMore}
      />
    </div>
  );
}
