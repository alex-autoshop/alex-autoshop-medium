import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ListenRahmen } from "@/lib/listenRueckkehr";
import { LISTEN_SCHRITT, labelFuer, queryMitSeite, seiteAusSuche } from "../../shared/listen-zustand.js";
import { PRODUKTLISTE_ID, KATEGORIE_LISTE_ABSTAND, zumProduktanfang } from "@/lib/produktanfang";
import { ChevronRight, PackageOpen, ArrowRight } from "lucide-react";
import { brandOf, markeAktiv, markeUmschalten, markenName, markenSlug, markenZaehlen } from "@/lib/marken";
import { ProduktSuchleiste } from "@/components/ProduktSuchleiste";
import { Seo } from "@/components/Seo";
import { ProductGrid } from "@/components/ProductGrid";
import { useCollectionProducts } from "@/hooks/useCollectionProducts";
import {
  COLLECTION_SORTS,
  findCategory,
  kategoriePfad,
  SHOP_CATEGORIES,
  menueKinder,
  unterkategoriePfad,
  type CollectionSort,
  type SubCategory,
} from "@/lib/shopCategories";
import type { ShopifyProduct } from "@/lib/shopify";
import { cn } from "@/lib/utils";
import { SHOP_INFO } from "@/data/shopInfo";
import { legacyCategoryRedirect } from "@/lib/categories";
import { kategorieDokument } from "../../shared/seo-katalog.js";
import { nachArtMischen } from "../../shared/marken-vergleich.js";
import { sucheAusgefuehrt } from "@/lib/besuch";

function Chips({ items, activeHandle }: { items: SubCategory[]; activeHandle?: string }) {
  const seite = activeHandle ? kategoriePfad(activeHandle) : "";
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((c) => {
        const aktiv = Boolean(seite) && unterkategoriePfad(c) === seite;
        return (
          <Link
            key={c.handle}
            to={unterkategoriePfad(c)}
            aria-current={aktiv ? "page" : undefined}
            className={cn(
              "inline-flex items-center min-h-[40px] px-4 rounded-full border text-sm font-medium transition-colors",
              aktiv
                ? "bg-primary text-primary-foreground border-primary"
                : c.accent
                  ? "bg-card border-primary/40 text-primary font-semibold hover:border-primary"
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

function passtZurSuche(p: ShopifyProduct, suche: string) {
  const worte = suche.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!worte.length) return true;
  const n = p.node;
  const skus = (n.variants?.edges ?? []).map((e) => e.node.sku || "");
  const text = [n.title, n.vendor, n.productType, ...skus].join("\n").toLowerCase();
  return worte.every((wort) => text.includes(wort));
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
  const location = useLocation();
  const [params] = useSearchParams();
  const seite = seiteAusSuche(location.search);
  const sortParam = params.get("sort") as CollectionSort | null;
  const sort: CollectionSort = COLLECTION_SORTS.some((s) => s.value === sortParam) ? sortParam! : "empfohlen";

  const alt = legacyCategoryRedirect(handle);
  const treffer = findCategory(handle);
  const { products, isLoading, error, notFound, hasNextPage } = useCollectionProducts(handle, sort);

  // Markenfilter: ?marke=glasurit,rm — Slug aus Titel/Handle (siehe @/lib/marken)
  const qAusUrl = (params.get("q") || "").trim();
  const [suche, setSuche] = useState(qAusUrl);
  const qGemerk = useRef(qAusUrl);
  if (qGemerk.current !== qAusUrl) {
    qGemerk.current = qAusUrl;
    setSuche(qAusUrl);
  }
  const gewaehlteMarken = useMemo(
    () => (params.get("marke") ?? "").split(",").map((m) => m.trim()).filter(Boolean),
    [params]
  );
  const suchtreffer = useMemo(
    () => products.filter((p) => passtZurSuche(p, suche)),
    [products, suche],
  );
  const marken = useMemo(() => markenZaehlen(suchtreffer), [suchtreffer]);
  const sichtbar = useMemo(
    () => (gewaehlteMarken.length ? suchtreffer.filter((p) => markeAktiv(gewaehlteMarken, brandOf(p))) : suchtreffer),
    [suchtreffer, gewaehlteMarken]
  );
  // Mehrere Marken: die ganze schon geladene Liste nach Produktart mischen,
  // nicht die Markenblöcke der Kollektion durchreichen.
  const vergleich = useMemo(() => {
    if (gewaehlteMarken.length < 2 || sort !== "empfohlen") return null;
    return nachArtMischen(sichtbar, {
      markeVon: (p) => brandOf(p as ShopifyProduct),
      markenFolge: gewaehlteMarken,
    });
  }, [sichtbar, gewaehlteMarken, sort]);
  const liste = (vergleich?.produkte ?? sichtbar) as ShopifyProduct[];
  const artKoepfe = vergleich && vergleich.gruppen.length > 1 ? vergleich.gruppen : undefined;
  const markenRef = useRef(gewaehlteMarken);
  markenRef.current = gewaehlteMarken;

  useEffect(() => {
    if (suche.trim() === qAusUrl) return;
    const t = window.setTimeout(() => {
      const next = new URLSearchParams(params);
      const wert = suche.trim();
      if (wert) next.set("q", wert);
      else next.delete("q");
      next.delete("seite");
      const roh = next.toString().replace(
        /(^|&)marke=([^&]*)/g,
        (_, trenner, marke) => `${trenner}marke=${marke.replace(/%2C/gi, ",")}`,
      );
      navigate({ pathname: window.location.pathname, search: roh ? `?${roh}` : "" }, { replace: true });
    }, 300);
    return () => window.clearTimeout(t);
  }, [suche, qAusUrl, params, navigate]);

  const sucheGemeldet = useRef("");
  useEffect(() => {
    if (!qAusUrl) {
      sucheGemeldet.current = "";
      return;
    }
    const schluessel = `${handle}:${qAusUrl}`;
    if (sucheGemeldet.current === schluessel) return;
    sucheGemeldet.current = schluessel;
    sucheAusgefuehrt(qAusUrl.length, "kategorie", handle);
  }, [qAusUrl, handle]);

  const kategorieLabel = treffer
    ? treffer.type === "sub" ? treffer.sub.label : treffer.main.label
    : "";
  const seoSeite = useMemo(() => {
    if (!kategorieLabel) return null;
    return kategorieDokument({
      handle,
      label: kategorieLabel,
      produkte: products.map((p) => ({ handle: p.node.handle, title: p.node.title })),
    });
  }, [handle, kategorieLabel, products]);

  if (alt) return <Navigate to={alt} replace />;

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
  const titel = kategorieLabel;

  const schreibeParams = (next: URLSearchParams) => {
    next.delete("seite");
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

  const noetig = seite * LISTEN_SCHRITT;
  const bereit = products.length >= noetig || (!isLoading && !hasNextPage);
  const zeigMehr = () => {
    const jetzt = seiteAusSuche(window.location.search);
    navigate(
      { pathname: location.pathname, search: queryMitSeite(window.location.search, Math.min(40, jetzt + 1)) },
      { replace: true },
    );
  };

  return (
    <ListenRahmen label={labelFuer(location.pathname, location.search)} seite={seite} bereit={bereit}>
    <div className="container py-8 sm:py-12">
      <Seo
        titelFertig
        title={seoSeite?.title || titel}
        description={seoSeite?.description}
        jsonLd={seoSeite?.jsonLd}
        canonical={seoSeite?.canonical}
        noindex={Boolean(qAusUrl)}
        preloadImage={products[0]?.node.images?.edges?.[0]?.node?.url}
        imageSizes="(min-width: 1280px) 18vw, (min-width: 640px) 30vw, 46vw"
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
        <div className="mb-4">
          {sub && (
            <Link
              to={kategoriePfad(main.handle)}
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline mb-3"
            >
              Alle {main.label} <ArrowRight className="w-4 h-4" />
            </Link>
          )}
          <Chips items={menueKinder(main.children)} activeHandle={sub?.handle} />
        </div>
      )}

      <ProduktSuchleiste
        suche={suche}
        onSuche={setSuche}
        onLeeren={() => {
          setSuche("");
          const next = new URLSearchParams(params);
          next.delete("q");
          schreibeParams(next);
        }}
        kategorieLabel={titel}
        kategorieSlug={handle}
        kategorieZu={kategoriePfad}
        marken={marken}
        markenWerte={gewaehlteMarken}
        onMarke={(name) => {
          const next = markeUmschalten(markenRef.current, name);
          markenRef.current = next;
          setMarken(next);
          zumProduktanfang(document.getElementById(PRODUKTLISTE_ID));
        }}
        ganzSuche={suche.trim() ? `/shop?q=${encodeURIComponent(suche.trim())}` : undefined}
        rand="seite"
      />

      {/* Ergebnisleiste mit Sortierung */}
      <div id={PRODUKTLISTE_ID} className={`flex flex-wrap items-center gap-3 mb-4 py-2.5 px-4 rounded-xl border border-border bg-card ${KATEGORIE_LISTE_ABSTAND}`}>
        <p className="text-sm font-semibold">
          {isLoading && products.length === 0
            ? "lädt …"
            : suche.trim() || gewaehlteMarken.length
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
      ) : !isLoading && suche.trim() && sichtbar.length === 0 ? (
        <Hinweis
          titel="Nichts dazu in dieser Kategorie"
          text={<>Für „{suche.trim()}“ gibt es hier keinen Treffer. <Link to={`/shop?q=${encodeURIComponent(suche.trim())}`} className="text-primary underline">Im ganzen Shop suchen</Link>.</>}
        />
      ) : !isLoading && gewaehlteMarken.length > 0 && sichtbar.length === 0 ? (
        <Hinweis
          titel="Keine Produkte dieser Marke hier"
          text={<>In dieser Kategorie gibt es keine Produkte von {gewaehlteMarken.map((m) => markenName(m, marken.map((x) => x.name))).join(", ")}. <button type="button" onClick={() => setMarken([])} className="text-primary underline">Filter zurücksetzen</button></>}
        />
      ) : (
        <ProductGrid
          products={liste}
          isLoading={isLoading && products.length === 0}
          fenster={LISTEN_SCHRITT}
          seite={seite}
          onMehr={zeigMehr}
          trennungen={artKoepfe}
        />
      )}
    </div>
    </ListenRahmen>
  );
}
