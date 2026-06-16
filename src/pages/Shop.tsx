import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Search } from "lucide-react";
import { Seo } from "@/components/Seo";
import { ProductGrid } from "@/components/ProductGrid";
import { useProducts } from "@/hooks/useProducts";
import { allCategories, getCategoryBySlug, collections } from "@/lib/categories";
import { cn } from "@/lib/utils";

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

      <ProductGrid
        products={products}
        isLoading={isLoading}
        error={error}
        hasNextPage={hasNextPage}
        onLoadMore={loadMore}
      />
    </div>
  );
}
