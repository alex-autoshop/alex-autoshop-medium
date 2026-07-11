import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Search, Palette } from "lucide-react";
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

// Produkt-Sortierung: Bestseller oben, FRIZ nach unten
const PRODUCT_PRIORITY: string[] = [
  // Tier 1: Bestseller
  "mipa-cx4-express-klarlack",
  "master-hs-2-1-klarlack-5l",
  "mipa-cc-9-klarlack-1-l",
  "mipa-cc9-2k-hs-klarlack-5l",
  // Tier 2: Immer wieder — Verbrauchsmaterial
  "master-hs-harter-2k",
  "master-harter-hs-1-2-fast-0-5-l",
  "master-hs-1-2-harter-standard",
  "master-hs-1-2-harter-fast",
  "mipa-hs-10-2k-hs-harter-kurz",
  "mipa-hs-25-2k-harter-normal",
  "mipa-hs25-harter-normal",
  "avo-acrylverdunnung-profi-line",
  "meyer-nitro-universalverdunnung",
  "beiges-abdeckband-19-mm-prazise-kanten-perfektes-finish",
  "beiges-abdeckband-30-mm-fur-breite-saubere-kanten",
  "green-tape-19-mm-profi-abdeckband-fur-lackierer",
  "green-tape-30-mm-abdeckband-fur-prazise-lackierarbeiten",
  "green-tape-50-mm-extra-breit-fur-maximale-kontrolle",
  "rhynogrip-p800-schleifscheiben",
  "rhynogrip-p600-schleifscheiben",
  "rhynogrip-p500-schleifscheiben",
  "rhynogrip-p400-schleifscheiben",
  "mp-schleifscheiben-goldfilm",
  "app-ws-222-schleifvlies",
  // Tier 3: Werkstatt-Standard
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
  // Tier 4: Mipa Spezial
  "mipa-mipatherm-silber-hitzebestandiger-lack-bis-800-c-400-ml-spraydose",
  "mipa-mipatherm-hitzebestandiger-lack-bis-800-c-400-ml-spraydose",
  // FRIZ kommt zuletzt (automatisch via isFrizProduct)
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

  // im Hauptraster die Konfigurator-Produkte rausfiltern (keine Dopplung)
  const gridProducts = showFeatured
    ? products.filter((p) => !FEATURED_HANDLES.includes(p.node.handle))
    : products;

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

  return (
    <div className="container py-8 sm:py-12">
      <Seo
        title={title}
        description={`${title} bei Alex Autoshop Wuppertal – Lackierprodukte, Autoteile und Werkstattbedarf mit B2B-Rabatten bis 40%.`}
      />

      <h1 className="text-3xl sm:text-4xl mb-6">{title}</h1>

      <form
        className="relative mb-5 max-w-xl"
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
        />
      </form>

      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        <Link
          to="/shop"
          className={cn(
            "shrink-0 px-5 py-3 rounded-full border font-medium text-sm min-h-[48px] flex items-center transition-colors",
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
              "shrink-0 px-5 py-3 rounded-full border font-medium text-sm min-h-[48px] flex items-center transition-colors",
              category === cat.slug
                ? "bg-night text-white border-night"
                : "bg-card border-border hover:border-primary"
            )}
          >
            {cat.label}
          </Link>
        ))}
      </div>

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
