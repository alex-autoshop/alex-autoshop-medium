import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ChevronRight, PackageOpen, ArrowRight, X } from "lucide-react";
import { brandOf, brandRank } from "@/lib/marken";
import { Seo } from "@/components/Seo";
import { ProductGrid } from "@/components/ProductGrid";
import { useCollectionProducts } from "@/hooks/useCollectionProducts";
import {
  COLLECTION_SORTS,
  findCategory,
  kategoriePfad,
  SHOP_CATEGORIES,
  type CollectionSort,
  type SubCategory,
} from "@/lib/shopCategories";
import { cn } from "@/lib/utils";
import { SHOP_INFO } from "@/data/shopInfo";

function Chips({ items, activeHandle }: { items: SubCategory[]; activeHandle?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((c) => {
        const aktiv = c.handle === activeHandle;
        return (
          <Link
            key={c.handle}
            to={kategoriePfad(c.handle)}
            aria-current={aktiv ? "page" : undefined}
            className={cn(
              "inline-flex items-center min-h-[40px] px-4 rounded-full border text-sm font-medium transition-colors",
              aktiv
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border hover:border-primary/60 hover:text-primary"
            )}
          >
            {c.label}
          </Link>
        );
      })}
    </div>
  );
}

function Hinweis({ titel, text }: { titel: string; text: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center max-w-xl mx-auto">
      <PackageOpen className="w-10 h-10 text-primary mx-auto mb-4" />
      <h2 className="text-lg mb-2">{titel}</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}

export default function Kategorie() {
  const { handle = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const sortParam = params.get("sort") as CollectionSort | null;
  const sort: CollectionSort = COLLECTION_SORTS.some((s) => s.value === sortParam) ? sortParam! : "empfohlen";

  const treffer = findCategory(handle);
  const { products, isLoading, error, notFound, hasNextPage } = useCollectionProducts(handle, sort);

  // Markenfilter: ?marke=Mipa,FRIZ — Marke kommt aus Titel/Handle (siehe @/lib/marken)
  const gewaehlteMarken = useMemo(
    () => (params.get("marke") ?? "").split(",").map((m) => m.trim()).filter(Boolean),
    [params]
  );
  const marken = useMemo(() => {
    const zaehler = new Map<string, { name: string; anzahl: number; rang: number }>();
    for (const p of products) {
      const name = brandOf(p);
      const e = zaehler.get(name);
      if (e) e.anzahl++;
      else zaehler.set(name, { name, anzahl: 1, rang: name === "Sonstige" ? 9999 : brandRank(p) });
    }
    return [...zaehler.values()].sort((a, b) => a.rang - b.rang || a.name.localeCompare(b.name, "de"));
  }, [products]);
  const sichtbar = useMemo(
    () => (gewaehlteMarken.length ? products.filter((p) => gewaehlteMarken.includes(brandOf(p))) : products),
    [products, gewaehlteMarken]
  );

  if (!treffer) {
    return (
      <div className="container py-16">
        <Seo title="Kategorie nicht gefunden" noindex />
        <Hinweis
          titel="Diese Kategorie gibt es nicht"
          text={<>Schau dich in unseren Kategorien um oder <Link to="/shop" className="text-primary underline">geh zum Shop</Link>.</>}
        />
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {SHOP_CATEGORIES.map((m) => (
            <Link key={m.handle} to={kategoriePfad(m.handle)} className="btn-outline text-sm">{m.label}</Link>
          ))}
        </div>
      </div>
    );
  }

  const main = treffer.main;
  const sub = treffer.type === "sub" ? treffer.sub : null;
  const titel = sub ? sub.label : main.label;

  const setMarken = (liste: string[]) => {
    const next = new URLSearchParams(params);
    if (liste.length) next.set("marke", liste.join(","));
    else next.delete("marke");
    setParams(next, { replace: true });
  };
  const toggleMarke = (m: string) =>
    setMarken(gewaehlteMarken.includes(m) ? gewaehlteMarken.filter((x) => x !== m) : [...gewaehlteMarken, m]);

  const setSort = (v: CollectionSort) => {
    const next = new URLSearchParams(params);
    if (v === "empfohlen") next.delete("sort");
    else next.set("sort", v);
    setParams(next, { replace: true });
  };

  return (
    <div className="container py-8 sm:py-12">
      <Seo
        title={`${titel} kaufen`}
        description={`${titel} bei Alex Autoshop Wuppertal: Profi-Qualität für Werkstatt und Lackiererei, schnell abholbereit.`}
      />

      {/* Breadcrumb */}
      <nav aria-label="Brotkrümel" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground mb-4">
        <Link to="/" className="hover:text-primary">Start</Link>
        <ChevronRight className="w-4 h-4" />
        {sub ? (
          <>
            <Link to={kategoriePfad(main.handle)} className="hover:text-primary">{main.label}</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground font-medium">{sub.label}</span>
          </>
        ) : (
          <span className="text-foreground font-medium">{main.label}</span>
        )}
      </nav>

      <h1 className="text-3xl sm:text-4xl mb-6">{titel}</h1>

      {/* Unterkategorien (Hauptseite) bzw. Geschwister (Unterseite) */}
      {main.children.length > 0 && (
        <div className="mb-8">
          {sub && (
            <Link
              to={kategoriePfad(main.handle)}
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline mb-3"
            >
              Alle {main.label} <ArrowRight className="w-4 h-4" />
            </Link>
          )}
          <Chips items={main.children} activeHandle={sub?.handle} />
        </div>
      )}

      {/* Markenfilter */}
      {marken.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Nach Marke filtern">
          <span className="text-sm font-semibold mr-1">Marke:</span>
          {marken.map((m) => {
            const aktiv = gewaehlteMarken.includes(m.name);
            return (
              <button
                key={m.name}
                type="button"
                onClick={() => toggleMarke(m.name)}
                aria-pressed={aktiv}
                className={cn(
                  "inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-lg border text-sm transition-colors",
                  aktiv
                    ? "bg-night text-white border-night"
                    : "bg-card border-border hover:border-primary/60"
                )}
              >
                {m.name}
                <span className={cn("text-xs tabular-nums", aktiv ? "text-white/70" : "text-muted-foreground")}>{m.anzahl}</span>
              </button>
            );
          })}
          {gewaehlteMarken.length > 0 && (
            <button
              type="button"
              onClick={() => setMarken([])}
              className="inline-flex items-center gap-1 min-h-[36px] px-2 text-sm font-semibold text-primary hover:underline"
            >
              <X className="w-4 h-4" /> Marken zurücksetzen
            </button>
          )}
        </div>
      )}

      {/* Ergebnisleiste mit Sortierung */}
      <div className="flex flex-wrap items-center gap-3 mb-4 py-2.5 px-4 rounded-xl border border-border bg-card">
        <p className="text-sm font-semibold">
          {isLoading && products.length === 0
            ? "lädt …"
            : gewaehlteMarken.length
              ? `${sichtbar.length} von ${products.length}${hasNextPage ? "+" : ""} Produkten`
              : `${products.length}${hasNextPage ? "+" : ""} Produkte`}
        </p>
        <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">Sortiert nach:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as CollectionSort)}
            className="h-9 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60"
          >
            {COLLECTION_SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <Hinweis
          titel="Produkte konnten gerade nicht geladen werden"
          text={<>Bitte lade die Seite in einem Moment neu. Oder ruf uns an: <a href={`tel:${SHOP_INFO.phoneIntl}`} className="text-primary underline">{SHOP_INFO.phone}</a>.</>}
        />
      ) : !isLoading && (notFound || products.length === 0) ? (
        <Hinweis
          titel="Hier ist gerade noch nichts"
          text={<>In dieser Kategorie sind aktuell keine Produkte. Schau in eine andere Kategorie oder frag uns direkt: <a href={`tel:${SHOP_INFO.phoneIntl}`} className="text-primary underline">{SHOP_INFO.phone}</a>.</>}
        />
      ) : !isLoading && gewaehlteMarken.length > 0 && sichtbar.length === 0 ? (
        <Hinweis
          titel="Keine Produkte dieser Marke hier"
          text={<>In dieser Kategorie gibt es keine Produkte von {gewaehlteMarken.join(", ")}. <button type="button" onClick={() => setMarken([])} className="text-primary underline">Filter zurücksetzen</button></>}
        />
      ) : (
        <ProductGrid products={sichtbar} isLoading={isLoading && products.length === 0} />
      )}
    </div>
  );
}
