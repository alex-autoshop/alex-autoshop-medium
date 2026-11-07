import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
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
import {
  categoryPath,
  getCategoryBySlug,
  getParentCategory,
  legacyCategoryRedirect,
  navCategories,
} from "@/lib/categories";
import { brandOf, brandRank, markeAktiv, markeUmschalten, markenZaehlen } from "@/lib/marken";
import { MarkenLeiste } from "@/components/MarkenLeiste";
import {
  ShopFilters, ActiveFilterChips, productPrice, productAvailable,
  type ShopFilterState,
} from "@/components/ShopFilters";
import { shopZustandSchreiben, sucheAusZustand, zustandAusSuche } from "../../shared/shop-zustand.js";
import { istOelFilter, OEL_KATEGORIE, oeleVorFiltern } from "../../shared/oel-reihenfolge.js";
import { useShopKontextMerken } from "@/lib/shopRueckkehr";
import { PRODUKTLISTE_ID, SHOP_LISTE_ABSTAND, zumProduktanfang } from "@/lib/produktanfang";
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

// Markenerkennung (Titel/Handle/vendor) liegt in @/lib/marken.
export { brandOf };

/** Wunschfarben = konfigurierbare Lacke (Shopify product_type "Autolack").
 *  Fallback über Handle, falls productType am Produkt fehlt. */
function isWunschfarbe(p: { node: { productType?: string; handle: string; title?: string } }): boolean {
  if (/autolack/i.test(p.node.productType || "")) return true;
  return /wunschfarbe|lackstift|spraydose|autolack/i.test(
    `${p.node.handle} ${p.node.title || ""}`,
  );
}

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
            className="absolute right-0 top-[calc(100%+8px)] w-[22rem] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
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
                const children = group.children ?? [];
                const groupHref = group.slug ? `/shop/${group.slug}` : null;
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
                      const href = categoryPath(child);
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

type ShopMode = 'standard' | 'schnell' | 'menge';

type SortMode = "empfohlen" | "preis-auf" | "preis-ab" | "name" | "marke";

const SORT_LABELS: Record<SortMode, string> = {
  empfohlen: "Empfohlen",
  "preis-auf": "Preis aufsteigend",
  "preis-ab": "Preis absteigend",
  name: "Name A–Z",
  marke: "Marke A–Z",
};

// ── Shop Page ─────────────────────────────────────────────────────────────────
export default function Shop() {
  const navigate = useNavigate();
  const { category: rawCategory } = useParams();
  const legacyTarget = rawCategory ? legacyCategoryRedirect(rawCategory) : undefined;
  const category = legacyTarget ? undefined : rawCategory;
  const [params, setParams] = useSearchParams();
  // Kategorie bleibt im Pfad (/shop/lackierbedarf-alle). Marke, Art, Preis,
  // Suche und Sortierung stehen in der Query, damit Zurück und der
  // Browser-Zurück nicht auf der Wunschfarben-Ansicht landen.
  const ausUrl = useMemo(() => zustandAusSuche(params.toString()), [params]);
  const filters: ShopFilterState = useMemo(() => ({
    brands: ausUrl.brands,
    tags: ausUrl.tags,
    priceMax: ausUrl.priceMax,
    onlyAvailable: ausUrl.onlyAvailable,
  }), [ausUrl]);
  const sortMode = ausUrl.sort as SortMode;
  const submittedSearch = ausUrl.q;
  const [search, setSearch] = useState(ausUrl.q);
  const qGemerk = useRef(ausUrl.q);
  if (qGemerk.current !== ausUrl.q) {
    qGemerk.current = ausUrl.q;
    setSearch(ausUrl.q);
  }
  const [shopMode, setShopMode] = useState<ShopMode>('standard');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const [columns, setColumns] = useState<4 | 5 | 6>(() => {
    const saved = Number(typeof window !== "undefined" ? localStorage.getItem("shop:cols") : 0);
    return saved === 4 || saved === 5 || saved === 6 ? (saved as 4 | 5 | 6) : 5;
  });
  const setCols = (c: 4 | 5 | 6) => {
    setColumns(c);
    try { localStorage.setItem("shop:cols", String(c)); } catch { /* egal */ }
  };

  const schreibe = useCallback((next: ShopFilterState & { q: string; sort: SortMode }) => {
    const suche = sucheAusZustand(next);
    const aktuell = sucheAusZustand(zustandAusSuche(window.location.search));
    if (suche === aktuell) return;
    shopZustandSchreiben({ pathname: window.location.pathname, search: suche, scroll: window.scrollY });
    navigate({ pathname: window.location.pathname, search: suche }, { replace: true });
  }, [navigate]);

  const stand = useRef(filters);
  stand.current = filters;
  const setFilters = (f: ShopFilterState) => {
    stand.current = f;
    schreibe({ ...f, q: submittedSearch, sort: sortMode });
  };
  const waehleMarke = (name: string) => {
    setFilters({ ...stand.current, brands: markeUmschalten(stand.current.brands, name) });
    zumProduktanfang(document.getElementById(PRODUKTLISTE_ID));
  };

  // Neue Suche setzt die Facetten zurück — sonst bleibt man bei 0 Treffern.
  useEffect(() => {
    if (search.trim() === submittedSearch) return;
    const t = window.setTimeout(() => {
      schreibe({
        brands: [],
        tags: [],
        priceMax: null,
        onlyAvailable: false,
        q: search.trim(),
        sort: sortMode,
      });
    }, 300);
    return () => window.clearTimeout(t);
  }, [search, submittedSearch, sortMode, schreibe]);

  const activeCategory = category ? getCategoryBySlug(category) : undefined;
  const parentCategory = category ? getParentCategory(category) : undefined;

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

  // Kompletten Katalog laden (442 Produkte = 2 Requests à 250), damit die
  // Markensortierung über ALLE Produkte greift und nicht nur über die erste Seite.
  // In einer Kategorie zuerst die Shopify-Collection, sonst die Regel-Suche.
  const { products, isLoading, error, hasNextPage, loadMore } = useProducts({
    query,
    collectionHandle: submittedSearch.trim() ? undefined : activeCategory?.slug,
    pageSize: 250,
    loadAll: true,
  });

  useShopKontextMerken(!isLoading);

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

  /** Sidebar-Filter anwenden — die Zählungen in der Sidebar beziehen sich auf
   *  gridProducts (also VOR den Filtern), damit man sieht was noch käme. */
  const filteredProducts = useMemo(() => {
    return gridProducts.filter((p) => {
      if (filters.brands.length && !markeAktiv(filters.brands, brandOf(p))) return false;
      if (filters.tags.length) {
        const tags = p.node.tags ?? [];
        if (!filters.tags.some((t) => markeAktiv(tags, t))) return false;
      }
      if (filters.priceMax !== null && productPrice(p) > filters.priceMax) return false;
      if (filters.onlyAvailable && !productAvailable(p)) return false;
      return true;
    });
  }, [gridProducts, filters]);

  /** Shop-Sortierung: Wunschfarben ganz oben → Mipa komplett → Eigenmarken
   *  (FRIZ, Master) → übrige Marken als geschlossene Blöcke → Unbekanntes zuletzt.
   *  Innerhalb einer Marke bleibt PRODUCT_PRIORITY erhalten, danach alphabetisch.
   *  In „Öle, Flüssigkeiten & Filter“ stehen Öle und Flüssigkeiten vor den Filtern;
   *  die Sortierung gilt jeweils innerhalb der Gruppe und über die ganze Liste. */
  const sortedGridProducts = useMemo(() => {
    const vergleich = (a: ShopifyProduct, b: ShopifyProduct) => {
      if (sortMode === "preis-auf") return productPrice(a) - productPrice(b);
      if (sortMode === "preis-ab") return productPrice(b) - productPrice(a);
      if (sortMode === "name") return (a.node.title || "").localeCompare(b.node.title || "", "de");
      if (sortMode === "marke") {
        return brandOf(a).localeCompare(brandOf(b), "de") || (a.node.title || "").localeCompare(b.node.title || "", "de");
      }
      const aw = isWunschfarbe(a) ? 0 : 1;
      const bw = isWunschfarbe(b) ? 0 : 1;
      if (aw !== bw) return aw - bw;
      const ar = brandRank(a);
      const br = brandRank(b);
      if (ar !== br) return ar - br;
      const ai = PRODUCT_PRIORITY.indexOf(a.node.handle);
      const bi = PRODUCT_PRIORITY.indexOf(b.node.handle);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return (a.node.title || "").localeCompare(b.node.title || "", "de");
    };
    if (category === OEL_KATEGORIE && !submittedSearch.trim()) return oeleVorFiltern(filteredProducts, vergleich);
    return [...filteredProducts].sort(vergleich);
  }, [filteredProducts, sortMode, category, submittedSearch]);

  const filterTrennung = useMemo(() => {
    if (category !== OEL_KATEGORIE || submittedSearch.trim()) return undefined;
    const idx = sortedGridProducts.findIndex((p) => istOelFilter(p));
    if (idx <= 0) return undefined;
    return { vorId: sortedGridProducts[idx].node.id, titel: "Filter" };
  }, [sortedGridProducts, category, submittedSearch]);

  const title = activeCategory ? activeCategory.label : "Shop";
  const marken = useMemo(() => markenZaehlen(gridProducts), [gridProducts]);
  const leisteRef = useRef<HTMLDivElement>(null);
  const [leisteKlebt, setLeisteKlebt] = useState(false);
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
        const klebt = el.getBoundingClientRect().top <= kante + 1;
        setLeisteKlebt((alt) => (alt === klebt ? alt : klebt));
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

  if (legacyTarget) return <Navigate to={legacyTarget} replace />;

  return (
    <div className="mx-auto w-full max-w-[1760px] px-3 sm:px-6 py-8 sm:py-10">
      <Seo
        title={title}
        description={`${title} bei Alex Autoshop Wuppertal – Lackierprodukte, Autoteile und Werkstattbedarf mit bis zu 40 % Rabatt.`}
      />

      <h1 className="text-3xl sm:text-4xl mb-6">{title}</h1>

      {/* Sidebar nur ab 1024 px. Darunter eine Leiste über dem Raster. */}
      <div className="lg:grid lg:grid-cols-[264px_minmax(0,1fr)] lg:gap-7 lg:items-start">
        <aside
          aria-label="Filter"
          className="hidden lg:block sticky top-24 min-w-0 max-h-[calc(100vh-7rem)] overflow-y-auto overscroll-y-contain pb-4"
        >
          <ShopFilters
            products={gridProducts}
            brandOf={brandOf}
            filters={filters}
            onChange={setFilters}
            activeSlug={category}
          />
        </aside>

        {/* ── Hauptspalte ──────────────────────────────────────────────── */}
        <div className="min-w-0">

      {/* Suche, Kategorien und Marken laufen unter dem Kopf mit — eine Leiste, kein zweites Band. */}
      <div
        ref={leisteRef}
        className={cn(
          "sticky z-30 mb-3 py-1.5 sm:py-2 top-24 lg:top-36",
          "-mx-3 px-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0",
          "bg-background/95 backdrop-blur-md",
          leisteKlebt && "shadow-[0_8px_18px_rgba(0,0,0,0.08)]",
        )}
      >
        <div className="flex flex-col gap-1.5 lg:flex-row lg:items-center lg:gap-3">
        <div className="flex items-center gap-2 rounded-2xl border px-2 py-1 lg:px-3 lg:py-2 bg-card border-border/80 shadow-[0_2px_12px_rgba(0,0,0,0.06)] lg:w-[min(100%,34rem)] lg:shrink-0">
          {/* Search input */}
          <div className="relative flex-1 min-w-0 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 lg:left-4 lg:w-[18px] lg:h-[18px] text-muted-foreground transition-colors duration-200 group-focus-within:text-primary" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Produkt suchen …"
              className={cn(
                "w-full h-10 lg:h-[44px] pl-9 pr-9 lg:pl-10 lg:pr-10 rounded-xl border-0 text-sm",
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
                    schreibe({
                      brands: [],
                      tags: [],
                      priceMax: null,
                      onlyAvailable: false,
                      q: "",
                      sort: sortMode,
                    });
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

          {/* Kategorien stehen ab 1024 px neben der Suche. Darunter bleibt das Feld volle Breite. */}
          <div className="hidden lg:block shrink-0">
            <CategoryDropdown activeCategory={activeCategory} activeSlug={category} />
          </div>
        </div>
        <div className="flex items-center gap-2 min-w-0 lg:flex-1">
          <span className="hidden lg:inline shrink-0 text-xs font-bold uppercase tracking-wide text-muted-foreground">Marke</span>
          <div className="min-w-0 flex-1">
            <MarkenLeiste
              marken={marken}
              werte={filters.brands}
              onWahl={waehleMarke}
              label="Marke"
            />
          </div>
        </div>
        </div>
      </div>

      <AnimatePresence>
        {category && activeCategory && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 8 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-3"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <Link to="/shop" className="hover:text-foreground transition-colors">
                Alle
              </Link>
              {parentCategory && (
                <>
                  <span>/</span>
                  <Link to={`/shop/${parentCategory.slug}`} className="hover:text-foreground transition-colors">
                    {parentCategory.label}
                  </Link>
                </>
              )}
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

      {/* Schnellzugriff: Klarlack · Härter · Wunschfarbe · Verdünnung */}
      {showFeatured && (
        <section className="mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {[
              { slug: "klarlack-produkte", label: "Klarlack", sub: "2K HS & Express", icon: <Layers className="w-7 h-7" />, color: "from-blue-500/20 to-blue-400/5" },
              { slug: "haerter", label: "Härter", sub: "Standard · Fast · Slow", icon: <FlaskConical className="w-7 h-7" />, color: "from-amber-500/20 to-amber-400/5" },
              { slug: "wunschfarbe-lackstift", label: "Wunschfarbe", sub: "Mipa · Standox · Sikkens", icon: <Pipette className="w-7 h-7" />, color: "from-primary/20 to-primary/5" },
              { slug: "verduennung-zusaetze", label: "Verdünnung", sub: "Acryl · Nitro · Uni", icon: <Droplets className="w-7 h-7" />, color: "from-emerald-500/20 to-emerald-400/5" },
            ].map(({ slug, label, sub, icon, color }) => (
              <Link
                key={slug}
                to={`/shop/${slug}`}
                className={`group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${color} p-3.5 sm:p-5 flex flex-col gap-2 sm:gap-3 hover:border-primary/50 transition-all duration-200 hover:scale-[1.02] min-h-[104px] sm:min-h-[130px]`}
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
      {showFeatured && featured.length === 0 && (
        <div className="mb-10 grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border overflow-hidden">
              <div className="aspect-square bg-secondary" />
              <div className="h-52" />
            </div>
          ))}
        </div>
      )}
      {showFeatured && featured.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-5 h-5 text-primary" />
            <h2 className="text-xl sm:text-2xl">Eigene Farbe konfigurieren</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 items-stretch">
            {featured.map((p) => (
              <ProductCard key={p.node.id} product={p} />
            ))}
          </div>
          <div className="h-px bg-border my-8" />
          <h2 className="text-xl sm:text-2xl mb-4">Alle Produkte</h2>
        </section>
      )}

      {/* ── Einkaufsmodus-Selector ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-5 min-h-[52px] py-3 px-3 sm:px-4 rounded-xl border border-border bg-card/60">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 shrink-0">
          Einkaufsmodus
        </span>
        <div className="flex flex-wrap w-full sm:w-auto items-center rounded-lg border border-border bg-secondary/40 p-0.5 gap-0.5">
          {([
            { id: 'standard', label: 'Standard' },
            { id: 'schnell',  label: 'Schnellbestellung' },
            { id: 'menge',    label: 'Mengenmodus' },
          ] as { id: ShopMode; label: string }[]).map(m => (
            <button
              key={m.id}
              onClick={() => setShopMode(m.id)}
              className={cn(
                "flex-1 sm:flex-none px-2 sm:px-4 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all duration-150",
                shopMode === m.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        {shopMode === 'schnell' && (
          <span className="basis-full sm:basis-auto min-w-0 text-xs text-muted-foreground sm:ml-2">Artikelnummer eingeben → sofort in den Warenkorb</span>
        )}
        {shopMode === 'menge' && (
          <span className="basis-full sm:basis-auto min-w-0 text-xs text-muted-foreground sm:ml-2">Mengen direkt anpassen und alles auf einmal bestellen</span>
        )}
      </div>

      {/* Schnellbestellung: Artikel-Nr. Direkteingabe */}
      {shopMode === 'schnell' && (
        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">⚡</span>
            Schnellbestellung — Produkt direkt suchen und in den Warenkorb legen
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                placeholder="Produktname oder Artikelnummer …"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-card text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
            <button className="btn-primary px-4 text-sm">Suchen</button>
          </div>
        </div>
      )}

      {/* ── Ergebnisleiste: Treffer · Ansicht · Sortierung ──────────────── */}
      <div id={PRODUKTLISTE_ID} className={`flex flex-wrap items-center gap-3 mb-4 py-2.5 px-4 rounded-xl border border-border bg-card ${SHOP_LISTE_ABSTAND}`}>
        <p className="text-sm font-semibold">
          {isLoading && sortedGridProducts.length === 0 ? "lädt …" : `${sortedGridProducts.length} Produkte`}
          {sortedGridProducts.length !== gridProducts.length && (
            <span className="text-muted-foreground font-normal"> von {gridProducts.length}</span>
          )}
        </p>

        <div className="ml-auto flex items-center gap-3">
          {/* Spaltenzahl — wie bei den grossen Katalogen */}
          <div className="hidden xl:flex items-center gap-0.5 rounded-lg border border-border bg-secondary/40 p-0.5">
            {([4, 5, 6] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCols(c)}
                title={`${c} Produkte pro Zeile`}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-bold tabular-nums transition-colors",
                  columns === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {c}
              </button>
            ))}
          </div>

          <label className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline">Sortiert nach:</span>
            <select
              value={sortMode}
              onChange={(e) => schreibe({ ...filters, q: submittedSearch, sort: e.target.value as SortMode })}
              className="h-9 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60"
            >
              {(Object.keys(SORT_LABELS) as SortMode[]).map((k) => (
                <option key={k} value={k}>{SORT_LABELS[k]}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="hidden lg:block">
        <ActiveFilterChips filters={filters} onChange={setFilters} marken={marken.map((m) => m.name)} />
      </div>

      {/* Mengenmodus: Alle Produkte als kompakte Liste mit Mengenfeld */}
      {shopMode === 'menge' ? (
        <div className="space-y-2 mb-8">
          {sortedGridProducts.slice(0, 80).map(p => {
            const title = p.node.title;
            const handle = p.node.handle;
            const price = p.node.priceRange?.minVariantPrice?.amount;
            const qty = quantities[handle] ?? 0;
            return (
              <div key={handle} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border bg-card hover:border-primary/30 transition-all">
                {p.node.images?.edges?.[0]?.node?.url && (
                  <img src={p.node.images.edges[0].node.url} alt="" width={40} height={40}
                    className="w-10 h-10 object-contain rounded-lg bg-white border border-border/50 p-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p lang="de" className="produkt-titel">{title}</p>
                  {price && <p className="text-xs text-muted-foreground">{Number(price).toFixed(2).replace('.', ',')} €</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setQuantities(q => ({ ...q, [handle]: Math.max(0, (q[handle] ?? 0) - 1) }))}
                    className="w-7 h-7 rounded-md border border-border bg-secondary hover:bg-secondary/80 text-sm font-bold flex items-center justify-center transition-colors"
                  >−</button>
                  <input
                    type="number" min={0}
                    value={qty}
                    onChange={e => setQuantities(q => ({ ...q, [handle]: Math.max(0, Number(e.target.value)) }))}
                    className="w-12 h-7 text-center text-sm font-mono border border-border rounded-md bg-card focus:outline-none focus:border-primary/50"
                  />
                  <button
                    onClick={() => setQuantities(q => ({ ...q, [handle]: (q[handle] ?? 0) + 1 }))}
                    className="w-7 h-7 rounded-md border border-border bg-secondary hover:bg-secondary/80 text-sm font-bold flex items-center justify-center transition-colors"
                  >+</button>
                </div>
                {qty > 0 && (
                  <button className="btn-primary text-xs px-3 py-1.5 min-h-0 h-auto shrink-0">
                    In Warenkorb
                  </button>
                )}
              </div>
            );
          })}
          {Object.values(quantities).some(q => q > 0) && (
            <div className="sticky bottom-4 flex justify-end pt-2">
              <div className="rounded-xl border border-primary/50 bg-card shadow-lg px-5 py-3 flex items-center gap-4">
                <span className="text-sm font-medium">
                  {Object.values(quantities).reduce((s, q) => s + q, 0)} Artikel ausgewählt
                </span>
                <button onClick={() => setQuantities({})} className="text-xs text-muted-foreground hover:text-foreground">Zurücksetzen</button>
                <button className="btn-primary text-sm px-5 py-2">Alle bestellen</button>
              </div>
            </div>
          )}
        </div>
      ) : (
      <ProductGrid
        products={sortedGridProducts}
        isLoading={isLoading}
        error={error}
        hasNextPage={hasNextPage}
        onLoadMore={loadMore}
        columns={columns}
        fenster={24}
        trennung={filterTrennung}
      />
      )}
        </div>{/* Ende Hauptspalte */}
      </div>{/* Ende Layout-Grid */}
    </div>
  );
}
