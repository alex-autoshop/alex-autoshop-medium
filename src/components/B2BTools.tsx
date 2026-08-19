import { useEffect, useMemo, useState } from "react";
import {
  ShoppingCart, RotateCcw, Clock, Check, Trash2, Plus, Loader2,
  ClipboardPaste, ListPlus, AlertCircle, Search,
} from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cartStore";
import { formatPrice, type ShopifyProduct } from "@/lib/shopify";
import {
  getPurchasedArticles, isDueForReorder, articleToProduct,
  getOrderLists, saveOrderList, deleteOrderList,
  parseQuickEntry, findByCode,
  type PurchasedArticle, type OrderList, type OrderListItem,
} from "@/lib/b2b";
import { cn } from "@/lib/utils";

const netto = (amount: string, discount: number) => Number(amount) * (1 - discount / 100);

/**
 * Legt einen Artikel in den Warenkorb und prüft, ob er auch wirklich drin ist.
 * Nötig, weil Positionen aus der Historie auf Varianten zeigen können, die es
 * in Shopify nicht mehr gibt — der Store schluckt das sonst still.
 */
async function addVerified(
  addItem: ReturnType<typeof useCartStore.getState>["addItem"],
  payload: Parameters<ReturnType<typeof useCartStore.getState>["addItem"]>[0],
  label: string
): Promise<boolean> {
  const count = () => useCartStore.getState().items.reduce((s, i) => s + i.quantity, 0);
  const before = count();
  await addItem(payload);
  if (count() > before) return true;
  toast.error(`„${label}" ließ sich nicht hinzufügen`, {
    description: "Der Artikel ist vermutlich nicht mehr im Sortiment. Ruf uns an: 0202 82690.",
  });
  return false;
}

function PriceCell({ amount, currency, discount }: { amount: string; currency: string; discount: number }) {
  const p = netto(amount, discount);
  return (
    <div className="text-right shrink-0">
      <p className="font-bold tabular-nums leading-tight">{formatPrice(String(p), currency)}</p>
      {discount > 0 && (
        <p className="text-[11px] text-muted-foreground line-through tabular-nums">
          {formatPrice(amount, currency)}
        </p>
      )}
    </div>
  );
}

function QtyInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center border border-border rounded-lg shrink-0 h-9">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="w-8 h-full text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        −
      </button>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
        className="w-11 h-full text-center text-sm font-mono bg-transparent focus:outline-none"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-8 h-full text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        +
      </button>
    </div>
  );
}

/* ══════════════════════════ 1 · Meine Artikel ══════════════════════════ */

export function MeineArtikel({ userId, discount }: { userId: string; discount: number }) {
  const addItem = useCartStore((s) => s.addItem);
  const [articles, setArticles] = useState<PurchasedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [onlyDue, setOnlyDue] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    getPurchasedArticles(userId)
      .then((a) => { if (alive) setArticles(a); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [userId]);

  const dueCount = useMemo(() => articles.filter(isDueForReorder).length, [articles]);
  const shown = onlyDue ? articles.filter(isDueForReorder) : articles;
  const pickedList = shown.filter((a) => picked[a.variantId]);

  const addOne = async (a: PurchasedArticle, quantity: number) => {
    const ok = await addVerified(
      addItem,
      { product: articleToProduct(a), variantId: a.variantId, variantTitle: a.variantTitle, price: a.price, quantity, selectedOptions: [] },
      a.title
    );
    if (ok) toast.success(`${quantity}× ${a.title} im Warenkorb`);
    return ok;
  };

  const addPicked = async () => {
    setBusy(true);
    try {
      let ok = 0;
      for (const a of pickedList) if (await addOne(a, qty[a.variantId] ?? 1)) ok++;
      setPicked({});
      if (ok > 1) toast.success(`${ok} Artikel im Warenkorb`);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> Bestellhistorie wird geladen …
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <RotateCcw className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="font-semibold mb-1">Noch keine Bestellungen</p>
        <p className="text-sm text-muted-foreground">
          Sobald du das erste Mal bestellt hast, findest du hier alle deine Artikel zum Nachbestellen —
          mit einem Klick statt langem Suchen.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{articles.length} Artikel</span> aus deinen bisherigen Bestellungen
        </p>
        {dueCount > 0 && (
          <button
            type="button"
            onClick={() => setOnlyDue((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors",
              onlyDue
                ? "border-primary bg-primary/10 text-foreground"
                : "border-amber-400/50 bg-amber-400/10 text-amber-600 hover:border-amber-400"
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            {dueCount} × Nachschub fällig
          </button>
        )}
        {pickedList.length > 0 && (
          <button onClick={addPicked} disabled={busy} className="btn-primary ml-auto text-sm px-4 py-2 min-h-0">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
            {pickedList.length} Artikel in den Warenkorb
          </button>
        )}
      </div>

      <div className="space-y-2">
        {shown.map((a) => {
          const due = isDueForReorder(a);
          const q = qty[a.variantId] ?? 1;
          return (
            <div
              key={a.variantId}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-card transition-colors",
                picked[a.variantId] ? "border-primary/60 bg-primary/5" : "border-border hover:border-primary/30"
              )}
            >
              <input
                type="checkbox"
                checked={!!picked[a.variantId]}
                onChange={(e) => setPicked((p) => ({ ...p, [a.variantId]: e.target.checked }))}
                className="w-4 h-4 accent-[hsl(var(--primary))] shrink-0"
                aria-label="Für Sammelbestellung auswählen"
              />
              {a.image ? (
                <img src={a.image} alt="" className="w-11 h-11 object-contain rounded-lg bg-white border border-border/50 p-0.5 shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded-lg bg-secondary shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight truncate">{a.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {a.orderCount}× bestellt · {a.totalQty} Stück gesamt · zuletzt vor {a.daysSince} Tagen
                  {a.avgIntervalDays ? ` · üblich alle ${a.avgIntervalDays} Tage` : ""}
                  {a.variantTitle && a.variantTitle !== "Default Title" ? ` · ${a.variantTitle}` : ""}
                </p>
              </div>
              {due && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-600 text-[10px] font-bold uppercase tracking-wide shrink-0">
                  <Clock className="w-3 h-3" /> fällig
                </span>
              )}
              <PriceCell amount={a.price.amount} currency={a.price.currencyCode} discount={discount} />
              <QtyInput value={q} onChange={(n) => setQty((s) => ({ ...s, [a.variantId]: n }))} />
              <button
                type="button"
                onClick={() => addOne(a, q)}
                className="btn-primary text-xs px-3 py-2 min-h-0 h-9 shrink-0"
                title="Nachbestellen"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Nachbestellen</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════ 2 · Schnellerfassung ═══════════════════════ */

interface ResolvedRow {
  code: string;
  quantity: number;
  match: ReturnType<typeof findByCode>;
}

export function Schnellerfassung({
  products,
  discount,
  isLoading,
}: {
  products: ShopifyProduct[];
  discount: number;
  isLoading?: boolean;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const [rows, setRows] = useState<Array<{ code: string; quantity: number }>>([
    { code: "", quantity: 1 },
    { code: "", quantity: 1 },
    { code: "", quantity: 1 },
  ]);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [busy, setBusy] = useState(false);

  const resolved: ResolvedRow[] = useMemo(
    () =>
      rows
        .filter((r) => r.code.trim())
        .map((r) => ({ ...r, match: findByCode(products, r.code) })),
    [rows, products]
  );
  const ok = resolved.filter((r) => r.match);
  const bad = resolved.filter((r) => !r.match);

  const setRow = (i: number, patch: Partial<{ code: string; quantity: number }>) =>
    setRows((rs) => {
      const next = rs.map((r, k) => (k === i ? { ...r, ...patch } : r));
      // Immer eine leere Zeile am Ende — so tippt man ohne Mausklick durch.
      if (next.every((r) => r.code.trim())) next.push({ code: "", quantity: 1 });
      return next;
    });

  const applyPaste = () => {
    const parsed = parseQuickEntry(pasteText);
    if (parsed.length === 0) return toast.error("Keine Zeilen erkannt");
    setRows([...parsed, { code: "", quantity: 1 }]);
    setPasteOpen(false);
    setPasteText("");
    toast.success(`${parsed.length} Zeilen übernommen`);
  };

  const addAll = async () => {
    if (ok.length === 0) return;
    setBusy(true);
    try {
      let done = 0;
      for (const r of ok) {
        if (!r.match) continue;
        const added = await addVerified(
          addItem,
          { product: r.match.product, variantId: r.match.variantId, variantTitle: r.match.variantTitle, price: r.match.price, quantity: r.quantity, selectedOptions: [] },
          r.match.product.node.title
        );
        if (added) done++;
      }
      if (done > 0) toast.success(`${done} Positionen im Warenkorb`);
      if (done === ok.length) setRows([{ code: "", quantity: 1 }, { code: "", quantity: 1 }, { code: "", quantity: 1 }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <p className="text-sm text-muted-foreground flex-1 min-w-[240px]">
          Artikelnummer oder Produktname eintippen, <kbd className="px-1.5 py-0.5 rounded border border-border text-[10px] font-mono">Tab</kbd> für die Menge,
          <kbd className="px-1.5 py-0.5 rounded border border-border text-[10px] font-mono ml-1">Enter</kbd> für die nächste Zeile.
        </p>
        <button
          type="button"
          onClick={() => setPasteOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-semibold hover:border-primary/50 transition-colors"
        >
          <ClipboardPaste className="w-3.5 h-3.5" /> Liste einfügen
        </button>
      </div>

      {pasteOpen && (
        <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-xs text-muted-foreground mb-2">
            Eine Zeile je Position — „Artikelnummer Menge". Excel-Spalte einfach reinkopieren.
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={6}
            placeholder={"MIPA-CC9-5L 2\nHS25 1\nRhynogrip P800 3"}
            className="w-full rounded-lg border border-border bg-card p-3 text-sm font-mono focus:outline-none focus:border-primary/60"
          />
          <div className="flex gap-2 mt-2">
            <button onClick={applyPaste} className="btn-primary text-sm px-4 py-2 min-h-0">Übernehmen</button>
            <button onClick={() => setPasteOpen(false)} className="btn-outline text-sm px-4 py-2 min-h-0">Abbrechen</button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_minmax(180px,1.2fr)] gap-2 px-3 py-2 bg-secondary/60 border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <span>Artikelnummer / Name</span>
          <span>Menge</span>
          <span>Treffer</span>
        </div>
        {rows.map((r, i) => {
          const match = r.code.trim() ? findByCode(products, r.code) : null;
          return (
            <div
              key={i}
              className="grid grid-cols-[1fr_120px_minmax(180px,1.2fr)] gap-2 px-3 py-1.5 border-b border-border last:border-b-0 items-center"
            >
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input
                  value={r.code}
                  onChange={(e) => setRow(i, { code: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const inputs = Array.from(
                        (e.currentTarget.closest(".rounded-xl") as HTMLElement).querySelectorAll<HTMLInputElement>("input[data-code]")
                      );
                      inputs[i + 1]?.focus();
                    }
                  }}
                  data-code
                  placeholder="z.B. MIPA-CC9-5L"
                  className="w-full h-9 pl-8 pr-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:border-primary/60"
                />
              </div>
              <QtyInput value={r.quantity} onChange={(n) => setRow(i, { quantity: n })} />
              <div className="min-w-0 text-xs">
                {!r.code.trim() ? (
                  <span className="text-muted-foreground/40">—</span>
                ) : match ? (
                  <span className="inline-flex items-center gap-1.5 text-foreground">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate">{match.product.node.title}</span>
                    <span className="ml-auto font-bold tabular-nums shrink-0">
                      {formatPrice(String(netto(match.price.amount, discount) * r.quantity), match.price.currencyCode)}
                    </span>
                  </span>
                ) : isLoading ? (
                  <span className="text-muted-foreground">sucht …</span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-amber-600">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> nicht gefunden
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-4">
        <p className="text-sm text-muted-foreground">
          {ok.length} erkannt{bad.length > 0 && <span className="text-amber-600"> · {bad.length} ohne Treffer</span>}
        </p>
        <button onClick={addAll} disabled={ok.length === 0 || busy} className="btn-primary ml-auto text-sm px-5 py-2.5 min-h-0">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
          Alles in den Warenkorb
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════ 3 · Bestelllisten ═══════════════════════ */

export function Bestelllisten({ userId, discount }: { userId: string; discount: number }) {
  const { items: cartItems, addItem } = useCartStore();
  const [lists, setLists] = useState<OrderList[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getOrderLists(userId)
      .then((l) => { if (alive) setLists(l); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [userId]);

  const saveCart = async () => {
    if (cartItems.length === 0) return toast.error("Der Warenkorb ist leer");
    const items: OrderListItem[] = cartItems.map((c) => ({
      handle: c.product.node.handle,
      title: c.product.node.title,
      image: c.product.node.images?.edges?.[0]?.node?.url,
      variantId: c.variantId,
      variantTitle: c.variantTitle,
      price: c.price,
      quantity: c.quantity,
    }));
    setBusy("save");
    try {
      const created = await saveOrderList(userId, name || `Liste vom ${new Date().toLocaleDateString("de-DE")}`, items);
      setLists((l) => [created, ...l]);
      setName("");
      toast.success(`Liste „${created.name}" gespeichert`);
    } finally {
      setBusy(null);
    }
  };

  const loadToCart = async (list: OrderList) => {
    setBusy(list.id);
    try {
      let done = 0;
      for (const it of list.items) {
        const added = await addVerified(
          addItem,
          { product: articleToProduct(it as never), variantId: it.variantId, variantTitle: it.variantTitle, price: it.price, quantity: it.quantity, selectedOptions: [] },
          it.title
        );
        if (added) done++;
      }
      if (done > 0) toast.success(`„${list.name}" — ${done} von ${list.items.length} Positionen im Warenkorb`);
    } finally {
      setBusy(null);
    }
  };

  const remove = async (list: OrderList) => {
    await deleteOrderList(list.id);
    setLists((l) => l.filter((x) => x.id !== list.id));
    toast.success("Liste gelöscht");
  };

  const listTotal = (l: OrderList) =>
    l.items.reduce((s, it) => s + netto(it.price.amount, discount) * it.quantity, 0);

  return (
    <div>
      <div className="rounded-xl border border-border bg-card p-4 mb-5">
        <p className="text-sm font-semibold mb-1 flex items-center gap-2">
          <ListPlus className="w-4 h-4 text-primary" /> Aktuellen Warenkorb als Liste speichern
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          Einmal zusammenstellen, immer wieder mit einem Klick bestellen — z.B. „Monats-Nachschub" oder „Lackierkabine".
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name der Liste"
            className="flex-1 min-w-[200px] h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-primary/60"
          />
          <button onClick={saveCart} disabled={busy === "save"} className="btn-primary text-sm px-4 py-2 min-h-0">
            {busy === "save" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Speichern ({cartItems.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Listen werden geladen …
        </div>
      ) : lists.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <ListPlus className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-semibold mb-1">Noch keine Bestelllisten</p>
          <p className="text-sm text-muted-foreground">
            Leg deinen Warenkorb einmal an und speichere ihn — beim nächsten Mal ist die komplette Bestellung ein Klick.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {lists.map((l) => (
            <div key={l.id} className="rounded-xl border border-border bg-card p-4 flex flex-col">
              <div className="flex items-start gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{l.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {l.items.length} Positionen · {new Date(l.created_at).toLocaleDateString("de-DE")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(l)}
                  className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors shrink-0"
                  aria-label="Liste löschen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <ul className="text-xs text-muted-foreground space-y-0.5 mb-3 flex-1">
                {l.items.slice(0, 4).map((it, i) => (
                  <li key={i} className="truncate">
                    {it.quantity}× {it.title}
                  </li>
                ))}
                {l.items.length > 4 && <li>… und {l.items.length - 4} weitere</li>}
              </ul>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tabular-nums">
                  {formatPrice(String(listTotal(l)), l.items[0]?.price.currencyCode || "EUR")}
                </span>
                <button
                  onClick={() => loadToCart(l)}
                  disabled={busy === l.id}
                  className="btn-primary text-xs px-3 py-2 min-h-0 ml-auto"
                >
                  {busy === l.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShoppingCart className="w-3.5 h-3.5" />}
                  In den Warenkorb
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
