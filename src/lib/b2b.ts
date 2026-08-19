/**
 * B2B-Werkzeuge fürs Dashboard: Nachbestellen, Schnellerfassung, Bestelllisten.
 *
 * Grundgedanke: Eine Werkstatt kauft immer wieder dieselben 20–30 Artikel.
 * Wer die in zwei Klicks nachbestellen kann, bleibt — deshalb bauen alle drei
 * Werkzeuge auf der Bestellhistorie und auf gespeicherten Listen auf.
 */
import { supabase } from "@/lib/supabase";
import { getOrders, type OrderItem } from "@/lib/orders";
import type { ShopifyProduct } from "@/lib/shopify";

/* ─────────────────── Meine Artikel (aus der Historie) ─────────────────── */

export interface PurchasedArticle {
  handle: string;
  title: string;
  image: string;
  variantId: string;
  variantTitle: string;
  price: { amount: string; currencyCode: string };
  /** Gesamtmenge über alle Bestellungen. */
  totalQty: number;
  /** Wie oft bestellt (Anzahl Bestellungen, nicht Stück). */
  orderCount: number;
  lastOrderedAt: string;
  /** Tage seit der letzten Bestellung. */
  daysSince: number;
  /** Durchschnittlicher Abstand zwischen zwei Bestellungen in Tagen. */
  avgIntervalDays: number | null;
}

const DAY = 86400000;

export async function getPurchasedArticles(userId: string): Promise<PurchasedArticle[]> {
  const orders = await getOrders(userId);
  const map = new Map<string, PurchasedArticle & { dates: number[] }>();

  for (const o of orders) {
    const t = new Date(o.created_at).getTime();
    for (const it of o.items ?? []) {
      const key = it.variantId || it.handle;
      if (!key) continue;
      const cur = map.get(key);
      if (cur) {
        cur.totalQty += it.quantity;
        cur.orderCount += 1;
        cur.dates.push(t);
        if (t > new Date(cur.lastOrderedAt).getTime()) cur.lastOrderedAt = o.created_at;
      } else {
        map.set(key, {
          handle: it.handle,
          title: it.title,
          image: it.image,
          variantId: it.variantId,
          variantTitle: it.variantTitle,
          price: it.price,
          totalQty: it.quantity,
          orderCount: 1,
          lastOrderedAt: o.created_at,
          daysSince: 0,
          avgIntervalDays: null,
          dates: [t],
        });
      }
    }
  }

  const now = Date.now();
  return [...map.values()]
    .map(({ dates, ...a }) => {
      const sorted = [...dates].sort((x, y) => x - y);
      let avg: number | null = null;
      if (sorted.length > 1) {
        const gaps = sorted.slice(1).map((d, i) => (d - sorted[i]) / DAY);
        avg = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length);
      }
      return {
        ...a,
        daysSince: Math.floor((now - new Date(a.lastOrderedAt).getTime()) / DAY),
        avgIntervalDays: avg,
      };
    })
    .sort((a, b) => b.orderCount - a.orderCount || b.totalQty - a.totalQty);
}

/** Nachschub fällig? Wenn der übliche Abstand überschritten ist. */
export function isDueForReorder(a: PurchasedArticle): boolean {
  if (!a.avgIntervalDays || a.avgIntervalDays < 3) return false;
  return a.daysSince >= a.avgIntervalDays;
}

/** Aus einem Historien-Eintrag ein Produkt-Objekt für den Warenkorb bauen. */
export function articleToProduct(a: PurchasedArticle | OrderItem): ShopifyProduct {
  return {
    node: {
      id: `history:${a.handle}`,
      title: a.title,
      description: "",
      handle: a.handle,
      priceRange: { minVariantPrice: a.price },
      images: { edges: a.image ? [{ node: { url: a.image, altText: a.title } }] : [] },
      variants: {
        edges: [
          {
            node: {
              id: a.variantId,
              title: a.variantTitle,
              price: a.price,
              availableForSale: true,
              selectedOptions: [],
            },
          },
        ],
      },
      options: [],
    },
  };
}

/* ───────────────────────── Bestelllisten ───────────────────────── */

export interface OrderListItem {
  handle: string;
  title: string;
  image?: string;
  variantId: string;
  variantTitle: string;
  price: { amount: string; currencyCode: string };
  quantity: number;
}

export interface OrderList {
  id: string;
  name: string;
  items: OrderListItem[];
  created_at: string;
}

const LS_KEY = "b2b:orderLists";

function localLists(): OrderList[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]") as OrderList[];
  } catch {
    return [];
  }
}
function writeLocal(lists: OrderList[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(lists));
  } catch {
    /* Speicher voll oder privat — dann eben nur diese Sitzung */
  }
}

/**
 * Listen laden. Bevorzugt aus Supabase (Tabelle `order_lists`), fällt auf
 * localStorage zurück, solange die Tabelle noch nicht angelegt ist.
 */
export async function getOrderLists(userId: string): Promise<OrderList[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from("order_lists")
      .select("id,name,items,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!error && data) return data as OrderList[];
  }
  return localLists();
}

export async function saveOrderList(
  userId: string,
  name: string,
  items: OrderListItem[]
): Promise<OrderList> {
  const entry: OrderList = {
    id: `local-${Date.now()}`,
    name: name.trim() || "Neue Liste",
    items,
    created_at: new Date().toISOString(),
  };
  if (supabase) {
    const { data, error } = await supabase
      .from("order_lists")
      .insert({ user_id: userId, name: entry.name, items })
      .select("id,name,items,created_at")
      .single();
    if (!error && data) return data as OrderList;
  }
  writeLocal([entry, ...localLists()]);
  return entry;
}

export async function deleteOrderList(id: string): Promise<void> {
  if (supabase && !id.startsWith("local-")) {
    const { error } = await supabase.from("order_lists").delete().eq("id", id);
    if (!error) return;
  }
  writeLocal(localLists().filter((l) => l.id !== id));
}

/* ─────────────────────── Schnellerfassung ─────────────────────── */

export interface QuickRow {
  /** Eingegebene Artikelnummer / Suchbegriff. */
  code: string;
  quantity: number;
}

/**
 * Zerlegt eingefügten Text in Zeilen "Nummer  Menge".
 * Erlaubt Tab, Semikolon, Komma, mehrere Leerzeichen oder "x" als Trenner —
 * damit lässt sich eine Excel-Spalte einfach reinkopieren.
 */
export function parseQuickEntry(text: string): QuickRow[] {
  return text
    .split(/[\r\n]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(.*?)[\s;,\t]+(?:x\s*)?(\d+)\s*(?:stk\.?|stück)?$/i);
      if (m && m[1].trim()) return { code: m[1].trim(), quantity: Math.max(1, Number(m[2])) };
      return { code: line, quantity: 1 };
    });
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Sucht das passende Produkt zu einer Eingabe: erst exakte Artikelnummer (SKU),
 * dann Handle, dann Titel-Teiltreffer. Gibt Produkt + gewählte Variante zurück.
 */
export function findByCode(
  products: ShopifyProduct[],
  code: string
): { product: ShopifyProduct; variantId: string; variantTitle: string; price: { amount: string; currencyCode: string } } | null {
  const n = norm(code);
  if (!n) return null;

  for (const p of products) {
    for (const v of p.node.variants?.edges ?? []) {
      if (v.node.sku && norm(v.node.sku) === n) {
        return { product: p, variantId: v.node.id, variantTitle: v.node.title, price: v.node.price };
      }
    }
  }
  const byHandle = products.find((p) => norm(p.node.handle) === n);
  const byTitle =
    byHandle ??
    products.find((p) => norm(p.node.title).includes(n) && n.length >= 3);
  if (!byTitle) return null;

  const v = byTitle.node.variants?.edges?.[0]?.node;
  if (!v) return null;
  return { product: byTitle, variantId: v.id, variantTitle: v.title, price: v.price };
}
