import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  LayoutDashboard,
  ShoppingBag,
  ClipboardList,
  Package,
  Building2,
  ClipboardCheck,
  Search,
  BadgePercent,
  Loader2,
  Plus,
  Trash2,
  MessageCircle,
  Inbox as InboxIcon,
  RotateCcw,
  Car,
  Truck,
  ShieldCheck,
} from "lucide-react";
import { Seo } from "@/components/Seo";
import { B2BProductCard } from "@/components/B2BProductCard";
import { Inbox } from "@/components/Inbox";
import Teileportal from "@/pages/Teileportal";
import { useProducts } from "@/hooks/useProducts";
import { useAuth } from "@/context/AuthContext";
import { usePlannerStore } from "@/stores/plannerStore";
import { useCartStore } from "@/stores/cartStore";
import { getOrders, type Order } from "@/lib/orders";
import { formatPrice } from "@/lib/shopify";
import { MEMBERSHIP_LEVELS } from "@/data/memberships";
import { allCategories } from "@/lib/categories";
import { whatsappLink } from "@/data/shopInfo";
import { cn } from "@/lib/utils";

type Tab = "overview" | "shop" | "teileportal" | "inbox" | "planner" | "orders" | "profile";

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Übersicht", icon: LayoutDashboard },
  { id: "shop", label: "B2B Shop", icon: ShoppingBag },
  { id: "teileportal", label: "Teileportal", icon: Car },
  { id: "inbox", label: "Nachrichten", icon: InboxIcon },
  { id: "planner", label: "Materialplaner", icon: ClipboardCheck },
  { id: "orders", label: "Bestellungen", icon: ClipboardList },
  { id: "profile", label: "Firmendaten", icon: Building2 },
];

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [params] = useSearchParams();
  const initialTab = (params.get("tab") as Tab) || "overview";
  const [tab, setTab] = useState<Tab>(initialTab);

  const level = profile.membership_level ?? 0;
  const levelInfo = MEMBERSHIP_LEVELS.find((m) => m.level === level);
  const greeting = profile.contact_name || profile.company_name || user?.email?.split("@")[0] || "Willkommen";

  return (
    <div className="container py-8 sm:py-12">
      <Seo title="Mitgliederbereich" description="Dein Alex Autoshop Dashboard: Shop mit Mitglieder-Ersparnis, Materialplaner, Bestellungen und Firmendaten." />

      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl">Hallo, {greeting} 👋</h1>
          <p className="text-muted-foreground mt-1">
            {level > 0 ? (
              <>Mitgliedschaft <span className="text-primary font-semibold">{levelInfo?.name}</span> · {levelInfo?.discountPercent}% Rabatt</>
            ) : (
              <>Kein aktives Mitglied — du zahlst Normalpreis. <Link to="/mitgliedschaft" className="text-primary font-semibold underline">Jetzt bis 46% sparen →</Link></>
            )}
          </p>
        </div>
      </div>

      {/* Tab-Leiste */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 inline-flex items-center gap-2 px-4 min-h-[48px] rounded-full border font-medium text-sm transition-colors",
              tab === t.id ? "bg-night text-white border-night" : "bg-card border-border hover:border-primary"
            )}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <Overview level={level} />}
      {tab === "shop" && <DashboardShop level={level} />}
      {tab === "teileportal" && (
        <div className="-mt-4">
          <Teileportal />
        </div>
      )}
      {tab === "inbox" && <Inbox />}
      {tab === "planner" && <Planner />}
      {tab === "orders" && <Orders />}
      {tab === "profile" && <ProfileForm />}
    </div>
  );
}

function Overview({ level }: { level: number }) {
  return (
    <div className="grid sm:grid-cols-3 gap-5">
      <div className="card-tilt hover:translate-y-0 p-6 sm:col-span-1">
        <BadgePercent className="w-9 h-9 text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Deine Stufe</p>
        <p className="text-2xl font-display font-bold">
          {level > 0 ? `Level ${level}` : "Kein Mitglied"}
        </p>
        <p className="text-sm text-primary font-semibold">
          {MEMBERSHIP_LEVELS.find((m) => m.level === level)?.discountPercent ?? 0}% Rabatt
        </p>
      </div>
      <div className="card-tilt hover:translate-y-0 p-6 sm:col-span-2 flex flex-col justify-center">
        <h2 className="text-lg mb-2">Mehr sparen?</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Im Tab „B2B Shop" siehst du deine Netto-Mitgliederpreise und bestellst direkt mit Menge.
          Mitglied wirst du in 5 Minuten — telefonisch oder im Laden.
        </p>
        <div className="flex gap-3 flex-wrap">
          <Link to="/mitgliedschaft" className="btn-primary">Mitgliedschaft ansehen</Link>
          <a href="tel:+4920282690" className="btn-outline">Anrufen: 0202 82690</a>
        </div>
      </div>
    </div>
  );
}

function DashboardShop({ level }: { level: number }) {
  const [category, setCategory] = useState<string>("");
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState("");
  const query = submitted ? `title:*${submitted}*` : category;
  const { products, isLoading, error, hasNextPage, loadMore } = useProducts({ query });
  const discount = MEMBERSHIP_LEVELS.find((m) => m.level === level)?.discountPercent ?? 0;

  return (
    <div>
      {/* B2B-Profi-Header */}
      <div className="section-dark rounded-2xl p-5 sm:p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl">B2B Shop</h2>
          <p className="text-white/65 text-sm mt-1">
            {discount > 0 ? (
              <>Deine Netto-Preise als <span className="text-gold-accent font-semibold">Mitglied · −{discount}%</span> — direkt mit Menge bestellen.</>
            ) : (
              <>Profi-Sortiment für Werkstätten. <Link to="/mitgliedschaft" className="text-gold-accent font-semibold underline">Mitglied werden</Link> & bis 46% sparen.</>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-white/70 shrink-0">
          <span className="inline-flex items-center gap-1.5"><Truck className="w-4 h-4 text-gold-accent" /> Schnelllieferung</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-gold-accent" /> Geprüfte Marken</span>
          <span className="inline-flex items-center gap-1.5"><BadgePercent className="w-4 h-4 text-gold-accent" /> Mengen-Konditionen</span>
        </div>
      </div>

      <form
        className="relative mb-4 max-w-xl"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(search);
        }}
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!e.target.value) setSubmitted("");
          }}
          placeholder="Produkt suchen …"
          className="input-base pl-12"
        />
      </form>

      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        <button
          onClick={() => { setCategory(""); setSubmitted(""); setSearch(""); }}
          className={cn("shrink-0 px-4 min-h-[44px] rounded-full border text-sm font-medium", !category ? "bg-night text-white border-night" : "bg-card border-border hover:border-primary")}
        >
          Alle
        </button>
        {allCategories.map((c) => (
          <button
            key={c.slug}
            onClick={() => { setCategory(c.query); setSubmitted(""); setSearch(""); }}
            className={cn("shrink-0 px-4 min-h-[44px] rounded-full border text-sm font-medium", category === c.query ? "bg-night text-white border-night" : "bg-card border-border hover:border-primary")}
          >
            {c.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="text-center py-12 text-muted-foreground">Produkte konnten nicht geladen werden.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {products.map((p) => (
              <B2BProductCard key={p.node.id} product={p} memberLevel={level} discount={discount} />
            ))}
            {isLoading &&
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="card-tilt overflow-hidden animate-pulse">
                  <div className="aspect-square bg-secondary" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-secondary rounded w-3/4" />
                    <div className="h-8 bg-secondary rounded w-1/2" />
                  </div>
                </div>
              ))}
          </div>
          {hasNextPage && !isLoading && (
            <div className="flex justify-center mt-8">
              <button onClick={loadMore} className="btn-outline">Mehr laden</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Planner() {
  const { items, add, toggle, setQuantity, remove, clear } = usePlannerStore();
  const [input, setInput] = useState("");
  const [qty, setQty] = useState(1);

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
      "Hallo Alex Autoshop, ich möchte folgendes Material anfragen:",
      ...items.map((i) => `• ${i.quantity}× ${i.name}${i.done ? " (habe ich schon)" : ""}`),
    ];
    return whatsappLink(lines.join("\n"));
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl mb-2">Materialplaner</h2>
      <p className="text-muted-foreground mb-6">
        Plane das Material für dein nächstes Projekt — wird automatisch gespeichert. Hak ab,
        was schon da ist, und schick die Liste als Bestellanfrage an uns.
      </p>

      <form onSubmit={submit} className="flex gap-2 sm:gap-3 mb-5">
        <input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
          className="input-base w-20 text-center shrink-0"
          aria-label="Menge"
        />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="z.B. 2K Klarlack, Härter, Schleifpapier P400 …"
          className="input-base flex-1"
        />
        <button type="submit" className="btn-primary shrink-0">
          <Plus className="w-5 h-5" /> <span className="hidden sm:inline">Hinzu</span>
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Noch keine Positionen. Füg oben dein erstes Material hinzu.
        </p>
      ) : (
        <>
          <ul className="space-y-2 mb-5">
            {items.map((it) => (
              <li key={it.id} className="card-tilt hover:translate-y-0 flex items-center gap-3 p-3">
                <input
                  type="checkbox"
                  checked={it.done}
                  onChange={() => toggle(it.id)}
                  className="w-5 h-5 accent-[#B8860B] shrink-0"
                />
                <div className="flex items-center border border-border rounded-lg shrink-0">
                  <button
                    onClick={() => setQuantity(it.id, it.quantity - 1)}
                    className="w-9 h-9 flex items-center justify-center hover:bg-secondary rounded-l-lg"
                    aria-label="Menge verringern"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{it.quantity}</span>
                  <button
                    onClick={() => setQuantity(it.id, it.quantity + 1)}
                    className="w-9 h-9 flex items-center justify-center hover:bg-secondary rounded-r-lg"
                    aria-label="Menge erhöhen"
                  >
                    +
                  </button>
                </div>
                <span className={cn("flex-1 min-w-0", it.done && "line-through text-muted-foreground")}>
                  {it.name}
                </span>
                <button
                  onClick={() => remove(it.id)}
                  className="w-10 h-10 flex items-center justify-center text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                  aria-label="Entfernen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>

          <div className="flex flex-col sm:flex-row gap-3">
            <a href={whatsappRequest()} target="_blank" rel="noopener noreferrer" className="btn-primary flex-1">
              <MessageCircle className="w-5 h-5" /> Als Anfrage senden ({openItems.length} offen)
            </a>
            <button onClick={clear} className="btn-outline">Liste leeren</button>
          </div>
        </>
      )}
    </div>
  );
}

function Orders() {
  const { user } = useAuth();
  const addItem = useCartStore((s) => s.addItem);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getOrders(user.id).then((o) => {
      setOrders(o);
      setLoading(false);
    });
  }, [user]);

  const reorder = async (order: Order) => {
    for (const it of order.items) {
      await addItem({
        product: {
          node: {
            id: it.variantId,
            title: it.title,
            description: "",
            handle: it.handle,
            priceRange: { minVariantPrice: it.price },
            images: it.image ? { edges: [{ node: { url: it.image, altText: it.title } }] } : { edges: [] },
            variants: { edges: [] },
            options: [],
          },
        },
        variantId: it.variantId,
        variantTitle: it.variantTitle,
        price: it.price,
        quantity: it.quantity,
        selectedOptions: [],
      });
    }
    toast.success("Wieder im Warenkorb", { description: `${order.items.length} Positionen` });
  };

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
  }

  if (orders.length === 0) {
    return (
      <div className="card-tilt hover:translate-y-0 p-8 text-center max-w-2xl mx-auto">
        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl mb-2">Noch keine Bestellungen</h2>
        <p className="text-muted-foreground mb-6">
          Sobald du über den Shop bestellst, erscheint deine Bestellung hier — mit einem Klick
          zum Nachbestellen.
        </p>
        <Link to="/shop" className="btn-primary">Zum Shop</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      {orders.map((o) => (
        <div key={o.id} className="card-tilt hover:translate-y-0 p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="font-semibold">
                {new Date(o.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
              <p className="text-xs text-muted-foreground capitalize">Status: {o.status}</p>
            </div>
            <p className="font-display font-bold text-lg">{formatPrice(String(o.total), o.currency)}</p>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1 mb-4">
            {o.items.map((it, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="truncate">{it.quantity}× {it.title}</span>
                <span className="shrink-0">{formatPrice(String(parseFloat(it.price.amount) * it.quantity), it.price.currencyCode)}</span>
              </li>
            ))}
          </ul>
          <button onClick={() => reorder(o)} className="btn-outline w-full">
            <RotateCcw className="w-4 h-4" /> Erneut bestellen
          </button>
        </div>
      ))}
    </div>
  );
}

function ProfileForm() {
  const { profile, updateProfile } = useAuth();
  const [form, setForm] = useState({
    company_name: profile.company_name ?? "",
    contact_name: profile.contact_name ?? "",
    phone: profile.phone ?? "",
    address: profile.address ?? "",
  });
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await updateProfile(form);
    setSaving(false);
    if (error) toast.error("Speichern fehlgeschlagen", { description: error });
    else toast.success("Gespeichert");
  };

  return (
    <form onSubmit={save} className="card-tilt hover:translate-y-0 p-6 sm:p-8 max-w-2xl space-y-4">
      <h2 className="text-2xl">Firmen- & Kontaktdaten</h2>
      <div>
        <label className="text-sm font-medium mb-1 block">Firma / Werkstatt</label>
        <input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="input-base" />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Ansprechpartner</label>
        <input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className="input-base" />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Telefon</label>
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-base" />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Lieferadresse</label>
        <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-base" />
      </div>
      <button type="submit" disabled={saving} className="btn-primary">
        {saving && <Loader2 className="w-5 h-5 animate-spin" />} Speichern
      </button>
    </form>
  );
}
