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

  const title = activeCategory ? activeCategory.label : "Shop";

  return (
    <div className="container py-8 sm:py-12">
      <Seo
        title={title}
        description={`${title} bei Alex Autoshop Wuppertal – Lackierprodukte, Autoteile und Werkstattbedarf mit B2B-Rabatten bis 38%.`}
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
        products={gridProducts}
        isLoading={isLoading}
        error={error}
        hasNextPage={hasNextPage}
        onLoadMore={loadMore}
      />
    </div>
  );
}
