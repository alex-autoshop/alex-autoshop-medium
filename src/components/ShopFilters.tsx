import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, X, RotateCcw } from "lucide-react";
import { navCategories } from "@/lib/categories";
import { cn } from "@/lib/utils";
import type { ShopifyProduct } from "@/lib/shopify";

export interface ShopFilterState {
  brands: string[];
  tags: string[];
  priceMax: number | null;
  onlyAvailable: boolean;
}

export const EMPTY_FILTERS: ShopFilterState = {
  brands: [],
  tags: [],
  priceMax: null,
  onlyAvailable: false,
};

export const PRICE_STEPS = [10, 25, 50, 100, 250];

/** Tags, die als Filter wirklich helfen — Shopify-Tags sind sonst zu wild. */
const TAG_WHITELIST = [
  "Klarlack", "Härter", "Verdünnung", "Grundierung", "Grundierfüller", "2K Grundierfüller",
  "Spachtel", "Spritzspachtel", "Haftprimer", "Acrylfiller", "Basislack", "Autolack",
  "Schleifpads", "Schleifscheibe", "Schleifscheiben", "Politur", "Motoröl", "Ölfilter",
  "Filtereinsatz", "Anschraubfilter", "Hydraulikfilter", "Spraydose", "Lackstift",
];

export function productPrice(p: ShopifyProduct): number {
  return Number(p.node.priceRange?.minVariantPrice?.amount ?? 0);
}

export function productAvailable(p: ShopifyProduct): boolean {
  const v = p.node.variants?.edges;
  if (!v || v.length === 0) return true;
  return v.some((e) => e.node.availableForSale);
}

/** Zählt, wie viele Produkte je Filterwert übrig blieben. */
function countBy<T extends string>(items: ShopifyProduct[], pick: (p: ShopifyProduct) => T[]) {
  const m = new Map<string, number>();
  for (const p of items) for (const key of pick(p)) m.set(key, (m.get(key) ?? 0) + 1);
  return m;
}

function Section({
  title,
  children,
  defaultOpen = true,
  count,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  count?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-3 text-left"
      >
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {title}
          {count ? <span className="ml-1.5 text-muted-foreground/50 font-semibold">{count}</span> : null}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open && <div className="pb-4 space-y-1">{children}</div>}
    </div>
  );
}

function CheckRow({
  label,
  count,
  active,
  onToggle,
}: {
  label: string;
  count: number;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-sm transition-colors",
        active ? "bg-primary/10 text-foreground" : "hover:bg-secondary/70 text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "w-[15px] h-[15px] rounded-[4px] border shrink-0 flex items-center justify-center transition-colors",
          active ? "bg-primary border-primary" : "border-border bg-card"
        )}
      >
        {active && (
          <svg viewBox="0 0 10 8" className="w-2.5 h-2 text-primary-foreground" fill="none">
            <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className={cn("flex-1 truncate", active && "font-semibold")}>{label}</span>
      <span className="text-[11px] tabular-nums text-muted-foreground/60 shrink-0">{count}</span>
    </button>
  );
}

export function ShopFilters({
  products,
  brandOf,
  filters,
  onChange,
  activeSlug,
}: {
  /** Alle Produkte der aktuellen Kategorie/Suche — VOR den Sidebar-Filtern. */
  products: ShopifyProduct[];
  brandOf: (p: ShopifyProduct) => string;
  filters: ShopFilterState;
  onChange: (f: ShopFilterState) => void;
  activeSlug?: string;
}) {
  const brandCounts = useMemo(
    () => countBy(products, (p) => [brandOf(p)]),
    [products, brandOf]
  );
  const tagCounts = useMemo(
    () =>
      countBy(products, (p) =>
        (p.node.tags ?? []).filter((t) =>
          TAG_WHITELIST.some((w) => w.toLowerCase() === t.toLowerCase())
        )
      ),
    [products]
  );

  const brands = useMemo(
    () =>
      [...brandCounts.entries()]
        .filter(([b]) => b !== "Sonstige")
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de")),
    [brandCounts]
  );
  const tags = useMemo(
    () => [...tagCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de")),
    [tagCounts]
  );

  const availableCount = useMemo(() => products.filter(productAvailable).length, [products]);

  const toggle = (key: "brands" | "tags", value: string) => {
    const list = filters[key];
    onChange({
      ...filters,
      [key]: list.includes(value) ? list.filter((x) => x !== value) : [...list, value],
    });
  };

  const activeCount =
    filters.brands.length + filters.tags.length + (filters.priceMax ? 1 : 0) + (filters.onlyAvailable ? 1 : 0);

  return (
    <div className="text-sm">
      {/* Kategorien */}
      <div className="rounded-2xl border border-border bg-card p-4 mb-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">
          Kategorien
        </p>
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {navCategories.map((group) => (
            <div key={group.label}>
              <p className="text-[11px] font-semibold text-foreground/70 mb-1">{group.label}</p>
              <div className="space-y-0.5">
                {(group.children ?? []).map((c) => (
                  <Link
                    key={c.slug}
                    to={`/shop/${c.slug}`}
                    className={cn(
                      "block px-2 py-1 rounded-md text-[13px] transition-colors",
                      activeSlug === c.slug
                        ? "bg-primary/10 text-foreground font-semibold"
                        : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                    )}
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="rounded-2xl border border-border bg-card px-4 pb-1">
        <div className="flex items-center justify-between pt-4 pb-1">
          <p className="text-sm font-bold">Filter</p>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => onChange(EMPTY_FILTERS)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Zurücksetzen ({activeCount})
            </button>
          )}
        </div>

        <Section title="Marke" count={brands.length}>
          <div className="max-h-[280px] overflow-y-auto pr-1 space-y-0.5">
            {brands.map(([b, n]) => (
              <CheckRow
                key={b}
                label={b}
                count={n}
                active={filters.brands.includes(b)}
                onToggle={() => toggle("brands", b)}
              />
            ))}
            {brands.length === 0 && (
              <p className="px-2 py-1 text-xs text-muted-foreground">Keine Marken erkannt</p>
            )}
          </div>
        </Section>

        {tags.length > 0 && (
          <Section title="Produktart" count={tags.length}>
            <div className="max-h-[260px] overflow-y-auto pr-1 space-y-0.5">
              {tags.map(([t, n]) => (
                <CheckRow
                  key={t}
                  label={t}
                  count={n}
                  active={filters.tags.includes(t)}
                  onToggle={() => toggle("tags", t)}
                />
              ))}
            </div>
          </Section>
        )}

        <Section title="Preis bis">
          <div className="flex flex-wrap gap-1.5 px-1">
            {PRICE_STEPS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onChange({ ...filters, priceMax: filters.priceMax === v ? null : v })}
                className={cn(
                  "px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors",
                  filters.priceMax === v
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                {v} €
              </button>
            ))}
          </div>
        </Section>

        <Section title="Verfügbarkeit">
          <CheckRow
            label="Nur lieferbare Artikel"
            count={availableCount}
            active={filters.onlyAvailable}
            onToggle={() => onChange({ ...filters, onlyAvailable: !filters.onlyAvailable })}
          />
        </Section>
      </div>
    </div>
  );
}

/** Chips über dem Grid — zeigen, was gerade filtert, und lassen es einzeln entfernen. */
export function ActiveFilterChips({
  filters,
  onChange,
}: {
  filters: ShopFilterState;
  onChange: (f: ShopFilterState) => void;
}) {
  const chips: Array<{ label: string; clear: () => void }> = [
    ...filters.brands.map((b) => ({
      label: b,
      clear: () => onChange({ ...filters, brands: filters.brands.filter((x) => x !== b) }),
    })),
    ...filters.tags.map((t) => ({
      label: t,
      clear: () => onChange({ ...filters, tags: filters.tags.filter((x) => x !== t) }),
    })),
  ];
  if (filters.priceMax) {
    chips.push({ label: `bis ${filters.priceMax} €`, clear: () => onChange({ ...filters, priceMax: null }) });
  }
  if (filters.onlyAvailable) {
    chips.push({ label: "nur lieferbar", clear: () => onChange({ ...filters, onlyAvailable: false }) });
  }
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-4">
      {chips.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={c.clear}
          className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full border border-primary/40 bg-primary/10 text-xs font-semibold hover:border-primary transition-colors"
        >
          {c.label}
          <X className="w-3 h-3 opacity-60" />
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(EMPTY_FILTERS)}
        className="text-xs text-muted-foreground hover:text-foreground ml-1"
      >
        alle entfernen
      </button>
    </div>
  );
}
