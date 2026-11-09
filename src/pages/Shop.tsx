import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Droplets, Layers, Pipette, FlaskConical, X } from "lucide-react";
import { Seo } from "@/components/Seo";
import { ProductGrid } from "@/components/ProductGrid";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/hooks/useProducts";
import {
  storefrontApiRequest,
  STOREFRONT_PRODUCT_BY_HANDLE_QUERY,
  type ShopifyProduct,
} from "@/lib/shopify";
import { katalogLesen } from "@/lib/katalog";
import { bildAdresse } from "../../shared/katalog-regeln.js";
import { getCategoryBySlug, getParentCategory, legacyCategoryRedirect } from "@/lib/categories";
import { findCategory } from "@/lib/shopCategories";
import { brandOf, brandRank, markeAktiv, markeUmschalten, markenZaehlen } from "@/lib/marken";
import { ProduktSuchleiste } from "@/components/ProduktSuchleiste";
import {
  ShopFilters, ActiveFilterChips, productPrice, productAvailable,
  type ShopFilterState,
} from "@/components/ShopFilters";
import { shopZustandSchreiben, sucheAusZustand, zustandAusSuche } from "../../shared/shop-zustand.js";
import { LISTEN_SCHRITT, labelFuer, queryMitSeite, seiteAusSuche } from "../../shared/listen-zustand.js";
import { nachArtMischen } from "../../shared/marken-vergleich.js";
import { ListenRahmen } from "@/lib/listenRueckkehr";
import { istOelFilter, OEL_KATEGORIE, oeleVorFiltern } from "../../shared/oel-reihenfolge.js";
import { PRODUKTLISTE_ID, SHOP_LISTE_ABSTAND, zumProduktanfang } from "@/lib/produktanfang";
import { Grundpreis } from "@/components/Grundpreis";
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
  const location = useLocation();
  const { category: rawCategory } = useParams();
  const seite = seiteAusSuche(location.search);
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

  // Kompletten Katalog laden, damit die
  // Markensortierung über ALLE Produkte greift und nicht nur über die erste Seite.
  // In einer Kategorie zuerst die Shopify-Collection, sonst die Regel-Suche.
  const sucheText = submittedSearch.trim();
  const { products, isLoading, error, hasNextPage, loadMore } = useProducts({
    suche: sucheText,
    query: sucheText ? "" : (activeCategory?.query ?? ""),
    collectionHandle: sucheText ? undefined : activeCategory?.slug,
    pageSize: 100,
    loadAll: true,
    einbettung: sucheText
      ? `shop::${sucheText}`
      : activeCategory
        ? `kollektion:${activeCategory.slug}:empfohlen`
        : "shop::",
  });

  // Featured konfigurator products
  const [featured, setFeatured] = useState<ShopifyProduct[]>([]);
  useEffect(() => {
    let aktiv = true;
    (async () => {
      const cache = await katalogLesen({ was: "handles", handles: FEATURED_HANDLES.join(",") });
      let liste = (cache?.data?.products?.edges ?? []) as ShopifyProduct[];
      if (!liste.length) {
        const nodes = await Promise.all(
          FEATURED_HANDLES.map((h) =>
            storefrontApiRequest(STOREFRONT_PRODUCT_BY_HANDLE_QUERY, { handle: h })
              .then((d) => d?.data?.productByHandle)
              .catch(() => null),
          ),
        );
        liste = nodes.filter(Boolean).map((node: ShopifyProduct["node"]) => ({ node }));
      }
      if (aktiv) setFeatured(liste);
    })();
    return () => { aktiv = false; };
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

  const mehrereMarken = filters.brands.length >= 2 && sortMode === "empfohlen";
  const vergleich = useMemo(() => {
    if (!mehrereMarken) return null;
    return nachArtMischen(filteredProducts, {
      markeVon: (p) => brandOf(p as ShopifyProduct),
      markenFolge: filters.brands,
    });
  }, [filteredProducts, mehrereMarken, filters.brands]);

  /** Shop-Sortierung: Wunschfarben ganz oben → Mipa komplett → Eigenmarken
   *  (FRIZ, Master) → übrige Marken als geschlossene Blöcke → Unbekanntes zuletzt.
   *  Innerhalb einer Marke bleibt PRODUCT_PRIORITY erhalten, danach alphabetisch.
   *  Ab zwei Marken bei „Empfohlen“ stattdessen nach Produktart gemischt.
   *  In „Öle, Flüssigkeiten & Filter“ stehen Öle und Flüssigkeiten vor den Filtern;
   *  die Sortierung gilt jeweils innerhalb der Gruppe und über die ganze Liste. */
  const sortedGridProducts = useMemo(() => {
    if (vergleich) return vergleich.produkte as ShopifyProduct[];
    const vergleichen = (a: ShopifyProduct, b: ShopifyProduct) => {
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
    if (category === OEL_KATEGORIE && !submittedSearch.trim()) return oeleVorFiltern(filteredProducts, vergleichen);
    return [...filteredProducts].sort(vergleichen);
  }, [filteredProducts, sortMode, category, submittedSearch, vergleich]);

  const filterTrennung = useMemo(() => {
    if (vergleich || category !== OEL_KATEGORIE || submittedSearch.trim()) return undefined;
    const idx = sortedGridProducts.findIndex((p) => istOelFilter(p));
    if (idx <= 0) return undefined;
    return { vorId: sortedGridProducts[idx].node.id, titel: "Filter" };
  }, [sortedGridProducts, category, submittedSearch, vergleich]);

  const title = activeCategory ? activeCategory.label : "Shop";
  const marken = useMemo(() => markenZaehlen(gridProducts), [gridProducts]);

  if (legacyTarget) return <Navigate to={legacyTarget} replace />;

  const noetig = seite * LISTEN_SCHRITT;
  const bereit = sortedGridProducts.length >= noetig || (!isLoading && !hasNextPage);
  const zeigMehr = () => {
    const jetzt = seiteAusSuche(window.location.search);
    navigate(
      { pathname: location.pathname, search: queryMitSeite(window.location.search, Math.min(40, jetzt + 1)) },
      { replace: true },
    );
  };

  return (
    <ListenRahmen label={labelFuer(location.pathname, location.search)} seite={seite} bereit={bereit}>
    <div className="mx-auto w-full max-w-[1760px] px-3 sm:px-6 py-8 sm:py-10">
      <Seo
        title={title}
        description={`${title} bei Alex Autoshop in Wuppertal. Lackierprodukte, Autoteile und Werkstattbedarf, Abholung in der Handelstraße.`}
        noindex={Boolean(submittedSearch.trim())}
        canonical={category && findCategory(category) ? `https://www.alex-autoshop.de/kategorie/${category}` : undefined}
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

      <ProduktSuchleiste
        suche={search}
        onSuche={setSearch}
        onLeeren={() => {
          setSearch("");
          schreibe({
            brands: [],
            tags: [],
            priceMax: null,
            onlyAvailable: false,
            q: "",
            sort: sortMode,
          });
        }}
        inputRef={inputRef}
        kategorieLabel={activeCategory?.label}
        kategorieSlug={category}
        marken={marken}
        markenWerte={filters.brands}
        onMarke={waehleMarke}
      />

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
            { id: 'schnell' as const, label: 'Schnellbestellung' },
            { id: 'menge' as const, label: 'Mengenmodus' },
          ]).map(m => (
            <button
              key={m.id}
              type="button"
              aria-pressed={shopMode === m.id}
              onClick={() => setShopMode((aktuell) => {
                const naechstes = aktuell === m.id ? "standard" : m.id;
                if (naechstes === "schnell") inputRef.current?.focus();
                return naechstes;
              })}
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
                  <img src={bildAdresse(p.node.images.edges[0].node.url, 96)} alt={title} width={40} height={40} loading="lazy"
                    className="w-10 h-10 object-contain rounded-lg bg-white border border-border/50 p-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p lang="de" className="produkt-titel">{title}</p>
                  {price && <p className="text-xs text-muted-foreground">{Number(price).toFixed(2).replace('.', ',')} €</p>}
                  <Grundpreis variant={p.node.variants?.edges?.[0]?.node} />
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
        fenster={LISTEN_SCHRITT}
        seite={seite}
        onMehr={zeigMehr}
        trennung={filterTrennung}
        trennungen={vergleich && vergleich.gruppen.length > 1 ? vergleich.gruppen : undefined}
      />
      )}
        </div>{/* Ende Hauptspalte */}
      </div>{/* Ende Layout-Grid */}
    </div>
    </ListenRahmen>
  );
}
