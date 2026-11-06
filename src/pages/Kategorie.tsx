import { useMemo, useRef } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useShopKontextMerken } from "@/lib/shopRueckkehr";
import { PRODUKTLISTE_ID, KATEGORIE_LISTE_ABSTAND, zumProduktanfang } from "@/lib/produktanfang";
import { ChevronRight, PackageOpen, ArrowRight } from "lucide-react";
import { brandOf, markeAktiv, markeUmschalten, markenName, markenSlug, markenZaehlen } from "@/lib/marken";
import { MarkenLeiste } from "@/components/MarkenLeiste";
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
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sortParam = params.get("sort") as CollectionSort | null;
  const sort: CollectionSort = COLLECTION_SORTS.some((s) => s.value === sortParam) ? sortParam! : "empfohlen";

  const treffer = findCategory(handle);
  const { products, isLoading, error, notFound, hasNextPage } = useCollectionProducts(handle, sort);
  useShopKontextMerken(!isLoading);

  // Markenfilter: ?marke=glasurit,rm — Slug aus Titel/Handle (siehe @/lib/marken)
  const gewaehlteMarken = useMemo(
    () => (params.get("marke") ?? "").split(",").map((m) => m.trim()).filter(Boolean),
    [params]
  );
  const marken = useMemo(() => markenZaehlen(products), [products]);
  const sichtbar = useMemo(
    () => (gewaehlteMarken.length ? products.filter((p) => markeAktiv(gewaehlteMarken, brandOf(p))) : products),
    [products, gewaehlteMarken]
  );
  const markenRef = useRef(gewaehlteMarken);
  markenRef.current = gewaehlteMarken;

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

  const schreibeParams = (next: URLSearchParams) => {
    const roh = next.toString().replace(
      /(^|&)marke=([^&]*)/g,
      (_, trenner, wert) => `${trenner}marke=${wert.replace(/%2C/gi, ",")}`,
    );
    navigate({ pathname: window.location.pathname, search: roh ? `?${roh}` : "" }, { replace: true });
  };

  const setMarken = (liste: string[]) => {
    const next = new URLSearchParams(params);
    const slugs = [...new Set(liste.map((m) => markenSlug(m)).filter(Boolean))];
    if (slugs.length) next.set("marke", slugs.join(","));
    else next.delete("marke");
    schreibeParams(next);
  };

  const setSort = (v: CollectionSort) => {
    const next = new URLSearchParams(params);
    if (v === "empfohlen") next.delete("sort");
    else next.set("sort", v);
    schreibeParams(next);
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
      {marken.length > 0 && (
        <div className="mb-4">
          <MarkenLeiste
            marken={marken}
            werte={gewaehlteMarken}
            onWahl={(name) => {
              const next = markeUmschalten(markenRef.current, name);
              markenRef.current = next;
              setMarken(next);
              zumProduktanfang(document.getElementById(PRODUKTLISTE_ID));
            }}
            label="Nach Marke filtern"
          />
        </div>
      )}

      {/* Ergebnisleiste mit Sortierung */}
      <div id={PRODUKTLISTE_ID} className={`flex flex-wrap items-center gap-3 mb-4 py-2.5 px-4 rounded-xl border border-border bg-card ${KATEGORIE_LISTE_ABSTAND}`}>
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
          text={<>In dieser Kategorie gibt es keine Produkte von {gewaehlteMarken.map((m) => markenName(m, marken.map((x) => x.name))).join(", ")}. <button type="button" onClick={() => setMarken([])} className="text-primary underline">Filter zurücksetzen</button></>}
        />
      ) : (
        <ProductGrid products={sichtbar} isLoading={isLoading && products.length === 0} fenster={24} />
      )}
    </div>
  );
}
