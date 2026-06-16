import { useState, useEffect } from "react";
import { Plus, Trash2, MessageCircle, Sparkles, Search, ShoppingCart, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { usePlannerStore, PLANNER_TEMPLATES } from "@/stores/plannerStore";
import { useCartStore } from "@/stores/cartStore";
import {
  storefrontApiRequest,
  STOREFRONT_PRODUCTS_QUERY,
  formatPrice,
  type ShopifyProduct,
} from "@/lib/shopify";
import { PRODUCT_IMAGES } from "@/lib/productImages";
import { whatsappLink } from "@/data/shopInfo";
import { cn } from "@/lib/utils";

// Intelligenter Materialplaner — Dashboard + schwebendes Widget.
export function MaterialPlanner({ compact = false }: { compact?: boolean }) {
  const { items, projectName, setProjectName, add, addMany, toggle, setQuantity, remove, clear } = usePlannerStore();
  const [input, setInput] = useState("");
  const [qty, setQty] = useState(1);
  const [openFinder, setOpenFinder] = useState<number | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    add(input, qty);
    setInput("");
    setQty(1);
  };

  const openItems = items.filter((i) => !i.done);

  const whatsappRequest = () => {
    const lines = [
      `Hallo Alex Autoshop, Materialanfrage${projectName ? ` für „${projectName}"` : ""}:`,
      ...items.map((i) => `• ${i.quantity}× ${i.name}${i.done ? " (erledigt)" : ""}`),
    ];
    return whatsappLink(lines.join("\n"));
  };

  return (
    <div className={cn(compact ? "" : "max-w-2xl")}>
      <input
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        placeholder="Projektname (z.B. BMW 3er Heckklappe)"
        className="input-base mb-3 font-semibold"
      />

      {/* Vorlagen */}
      <div className="mb-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          <Sparkles className="w-3.5 h-3.5 text-primary" /> Vorlage laden
        </p>
        <div className="flex flex-wrap gap-2">
          {PLANNER_TEMPLATES.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => addMany(t.items)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card hover:border-primary text-sm font-medium transition-colors"
            >
              <span>{t.emoji}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={submit} className="flex gap-2 mb-4">
        <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} className="input-base w-16 text-center shrink-0 px-2" aria-label="Menge" />
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Material hinzufügen …" className="input-base flex-1" />
        <button type="submit" className="btn-primary shrink-0 px-4"><Plus className="w-5 h-5" /></button>
      </form>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm py-4 text-center">
          Lade eine Vorlage oben oder füg dein erstes Material hinzu.
        </p>
      ) : (
        <>
          <ul className={cn("space-y-2 mb-4", compact && "max-h-[40vh] overflow-y-auto pr-1")}>
            {items.map((it) => (
              <li key={it.id} className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2 p-2">
                  <input type="checkbox" checked={it.done} onChange={() => toggle(it.id)} className="w-5 h-5 accent-[#B8860B] shrink-0" />
                  <div className="flex items-center border border-border rounded-md shrink-0">
                    <button onClick={() => setQuantity(it.id, it.quantity - 1)} className="w-7 h-8 flex items-center justify-center hover:bg-secondary text-sm">−</button>
                    <span className="w-6 text-center text-xs font-semibold">{it.quantity}</span>
                    <button onClick={() => setQuantity(it.id, it.quantity + 1)} className="w-7 h-8 flex items-center justify-center hover:bg-secondary text-sm">+</button>
                  </div>
                  <span className={cn("flex-1 min-w-0 text-sm truncate", it.done && "line-through text-muted-foreground")}>{it.name}</span>
                  <button
                    onClick={() => setOpenFinder(openFinder === it.id ? null : it.id)}
                    className={cn("h-8 px-2 inline-flex items-center gap-1 rounded-md text-xs font-semibold shrink-0", openFinder === it.id ? "bg-night text-white" : "text-primary hover:bg-secondary")}
                    title="Passendes Produkt finden"
                  >
                    <Search className="w-3.5 h-3.5" /> Finden
                  </button>
                  <button onClick={() => remove(it.id)} className="w-8 h-8 flex items-center justify-center text-destructive hover:bg-destructive/10 rounded-md shrink-0" aria-label="Entfernen">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {openFinder === it.id && (
                  <ItemFinder term={it.name} quantity={it.quantity} onAdded={() => { if (!it.done) toggle(it.id); setOpenFinder(null); }} />
                )}
              </li>
            ))}
          </ul>

          <div className="flex flex-col sm:flex-row gap-2">
            <a href={whatsappRequest()} target="_blank" rel="noopener noreferrer" className="btn-outline flex-1 text-sm">
              <MessageCircle className="w-4 h-4" /> Per WhatsApp anfragen
            </a>
            <button onClick={clear} className="btn-outline text-sm">Leeren</button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 text-center">
            Tipp: „Finden" legt das passende Produkt direkt in den Warenkorb — dann zur Kasse.
          </p>
        </>
      )}
    </div>
  );
}

// Inline-Produktsuche je Position → in den Warenkorb
function ItemFinder({ term, quantity, onAdded }: { term: string; quantity: number; onAdded: () => void }) {
  const addItem = useCartStore((s) => s.addItem);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<ShopifyProduct[]>([]);
  const [addedId, setAddedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    storefrontApiRequest(STOREFRONT_PRODUCTS_QUERY, { first: 5, query: term })
      .then((d) => active && setResults(d?.data?.products?.edges ?? []))
      .catch(() => active && setResults([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [term]);

  const addToCart = async (p: ShopifyProduct) => {
    const node = p.node;
    const variant = node.variants?.edges?.[0]?.node;
    if (!variant) return;
    await addItem({
      product: p,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity,
      selectedOptions: variant.selectedOptions ?? [],
    });
    setAddedId(node.id);
    toast.success("In den Warenkorb", { description: `${quantity}× ${node.title}` });
    setTimeout(onAdded, 600);
  };

  return (
    <div className="border-t border-border bg-secondary/40 p-2 space-y-1.5">
      {loading ? (
        <div className="py-3 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" /></div>
      ) : results.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2 text-center">Kein passendes Produkt gefunden — per WhatsApp anfragen.</p>
      ) : (
        results.slice(0, 4).map((p) => {
          const node = p.node;
          const img = node.images?.edges?.[0]?.node?.url || PRODUCT_IMAGES[node.handle] || "";
          const pr = node.priceRange.minVariantPrice;
          const multiple = (node.variants?.edges?.length ?? 0) > 1;
          return (
            <div key={node.id} className="flex items-center gap-2 bg-card rounded-md p-1.5">
              <div className="w-9 h-9 rounded bg-secondary shrink-0 overflow-hidden">
                {img && <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium leading-tight line-clamp-1">{node.title}</p>
                <p className="text-[11px] text-muted-foreground">{multiple && "ab "}{formatPrice(pr.amount, pr.currencyCode)}</p>
              </div>
              <button
                onClick={() => addToCart(p)}
                className="w-8 h-8 rounded-md bg-night text-white flex items-center justify-center hover:bg-primary shrink-0"
                aria-label="In den Warenkorb"
              >
                {addedId === node.id ? <Check className="w-4 h-4 text-gold-bright" /> : <ShoppingCart className="w-4 h-4" />}
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
