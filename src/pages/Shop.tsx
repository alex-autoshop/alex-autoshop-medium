import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { Search, Palette, Droplets, Layers, Pipette, FlaskConical } from "lucide-react";
import { Seo } from "@/components/Seo";
import { ProductGrid } from "@/components/ProductGrid";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/hooks/useProducts";
import {
  storefrontApiRequest,
  STOREFRONT_PRODUCT_BY_HANDLE_QUERY,
  type ShopifyProduct,
} from "@/lib/shopify";
import { allCategories, getCategoryBySlug, collections } from "@/lib/categories";
import { cn } from "@/lib/utils";

// Eigene-Farbe-Konfiguratoren: ganz oben, wenn man den Shop betritt.
const FEATURED_HANDLES = [
  "farben-mix",
  "individuelle-spraydose-erstellen",
  "individuellen-lackstift-bestellen-20ml",
];

// Produkte die komplett ausgeblendet werden (FRIZ + grau UBS)
const HIDDEN_HANDLES = new Set<string>([
  // Alle FRIZ-Produkte verstecken
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
  // Grau UBS — Schleifschwamm kommt stattdessen
  "troton-ubs-steinschlagschutz-korrosionsschutz-unterbodenschutz-grau-500ml",
]);

// Produkt-Sortierung: Bestseller oben
const PRODUCT_PRIORITY: string[] = [
  // Tier 1: Bestseller Klarlack
  "mipa-cc9-2k-hs-klarlack-5l",
  "mipa-cx4-express-klarlack",
  "master-hs-2-1-klarlack-5l",
  "mipa-cc-9-klarlack-1-l",
  // Tier 2: Lackstift + Konfiguratoren
  "individuellen-lackstift-bestellen-20ml",
  // Tier 3: Härter — Mipa zuerst
  "mipa-hs-25-2k-harter-normal",
  "mipa-hs25-harter-normal",
  "mipa-hs-10-2k-hs-harter-kurz",
  "mipa-hs-35-2k-hs-harter-lang",
  "mipa-h5-2k-harter-extra-schnell",
  "master-hs-harter-2k",
  "master-harter-hs-1-2-fast-0-5-l",
  "master-hs-1-2-harter-standard",
  "master-hs-1-2-harter-fast",
  // Tier 4: Verdünnung
  "avo-acrylverdunnung-profi-line",
  "meyer-nitro-universalverdunnung",
  // Tier 5: Schleif & UBS
  "feiner-schleifschwamm-p220-p400",
  "troton-ubs-steinschlagschutz-korrosionsschutz-unterbodenschutz-500ml",
  "mipa-steinschlagschutz-ubs-uberlackierbar-schwarz",
  "rhynogrip-p800-schleifscheiben",
  "rhynogrip-p600-schleifscheiben",
  "rhynogrip-p500-schleifscheiben",
  "rhynogrip-p400-schleifscheiben",
  "mp-schleifscheiben-goldfilm",
  "app-ws-222-schleifvlies",
  // Tier 6: Abdeckmaterial
  "beiges-abdeckband-19-mm-prazise-kanten-perfektes-finish",
  "beiges-abdeckband-30-mm-fur-breite-saubere-kanten",
  "green-tape-19-mm-profi-abdeckband-fur-lackierer",
  "green-tape-30-mm-abdeckband-fur-prazise-lackierarbeiten",
  "green-tape-50-mm-extra-breit-fur-maximale-kontrolle",
  "crs-foam-tape",
  // Tier 7: Werkstatt-Standard
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
  handle.includes("friz") || handle.startsWith("hochglanz-antihologramm-politur") || handle.startsWith("schleifpaste-perfect-heavy-cut");

export default function Shop() {
  const { category } = useParams();
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");

  const activeCategory = category ? getCategoryBySlug(category) ?? collections.find((c) => c.slug === category) : undefined;

  const query = useMemo(() => {
    if (submittedSearch.trim()) return `title:*${submittedSearch.trim()}*`;
    if (activeCategory) return activeCategory.query;
    return "";
  }, [submittedSearch, activeCategory]);

  const { products, isLoading, error, hasNextPage, loadMore } = useProducts({ query });

  // Konfigurator-Produkte exakt per Handle laden (zuverlässiger als eine OR-Suche)
  const [featured, setFeatured] = useState<ShopifyProduct[]>([]);
  useEffect(() => {
    Promise.all(
      FEATURED_HANDLES.map((h) =>
        storefrontApiRequest(STOREFRONT_PRODUCT_BY_HANDLE_QUERY, { handle: h })
          .then((d) => d?.data?.productByHandle)
          .catch(() => null)
      )
    ).then((nodes) =>
      setFeatured(nodes.filter(Boolean).map((node: ShopifyProduct["node"]) => ({ node })))
    );
  }, []);

  // nur in der "Alle"-Ansicht (keine Kategorie, keine Suche)
  const showFeatured = !category && !submittedSearch.trim();

  // im Hauptraster: Konfiguratoren + versteckte Produkte rausfiltern
  const gridProducts = products.filter((p) => {
    if (HIDDEN_HANDLES.has(p.node.handle)) return false;
    if (isFrizProduct(p.node.handle)) return false;
    if (showFeatured && FEATURED_HANDLES.includes(p.node.handle)) return false;
    return true;
  });

  // Sortierung: Bestseller oben, FRIZ nach unten
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

  // Schatten wenn sticky-Bar gescrollt ist
  const [isStuck, setIsStuck] = useState(false);
  const stickyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = stickyRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { threshold: 1, rootMargin: "-81px 0px 0px 0px" }
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

      {/* Sentinel-Element — wird vom IntersectionObserver beobachtet */}
      <div ref={stickyRef} className="h-px -mt-px" />

      {/* Sticky Suchleiste + Kategorie-Filter */}
      <div
        className={cn(
          "sticky top-20 sm:top-24 z-30 -mx-4 sm:mx-0 px-4 sm:px-0 pt-3 pb-3",
          "bg-background/95 backdrop-blur-md transition-shadow duration-200",
          isStuck && "shadow-[0_4px_24px_rgba(0,0,0,0.10)] border-b border-border/60"
        )}
      >
        <form
          className="relative mb-3 max-w-xl"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmittedSearch(search);
          }}
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (e.target.value === "") setSubmittedSearch("");
            }}
            placeholder="Produkt suchen … (z.B. Klarlack)"
            className="input-base pl-12"
            aria-label="Produktsuche"
            autoComplete="off"
          />
        </form>

        <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap no-scrollbar">
          <Link
            to="/shop"
            className={cn(
              "shrink-0 px-5 py-2.5 rounded-full border font-medium text-sm min-h-[44px] flex items-center transition-colors",
              !category ? "bg-night text-white border-night" : "bg-card border-border hover:border-primary"
            )}
          >
            Alle
          </Link>
          {allCategories.map((cat) => (
            <Link
              key={cat.slug}
              to={`/shop/${cat.slug}`}
              className={cn(
                "shrink-0 px-5 py-2.5 rounded-full border font-medium text-sm min-h-[44px] flex items-center transition-colors",
                category === cat.slug
                  ? "bg-night text-white border-night"
                  : "bg-card border-border hover:border-primary"
              )}
            >
              {cat.label}
            </Link>
          ))}
        </div>
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

      {/* Eigene Farbe konfigurieren — Top 3 */}
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
