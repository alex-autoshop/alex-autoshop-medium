import { useState } from "react";
import { Link } from "react-router-dom";
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
} from "lucide-react";
import { Seo } from "@/components/Seo";
import { MemberProductCard } from "@/components/MemberProductCard";
import { useProducts } from "@/hooks/useProducts";
import { useAuth } from "@/context/AuthContext";
import { MEMBERSHIP_LEVELS } from "@/data/memberships";
import { allCategories } from "@/lib/categories";
import { cn } from "@/lib/utils";

type Tab = "overview" | "shop" | "planner" | "orders" | "profile";

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Übersicht", icon: LayoutDashboard },
  { id: "shop", label: "Shop & Ersparnis", icon: ShoppingBag },
  { id: "planner", label: "Materialplaner", icon: ClipboardCheck },
  { id: "orders", label: "Bestellungen", icon: ClipboardList },
  { id: "profile", label: "Firmendaten", icon: Building2 },
];

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");

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
          Im Tab „Shop & Ersparnis" siehst du bei jedem Produkt, wie viel du mit
          Level 1, 2 oder 3 sparen würdest. Mitglied wirst du in 5 Minuten — telefonisch oder im Laden.
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

  return (
    <div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {products.map((p) => (
              <MemberProductCard key={p.node.id} product={p} memberLevel={level} />
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
  const [items, setItems] = useState<{ id: number; name: string; done: boolean }[]>([]);
  const [input, setInput] = useState("");

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setItems((p) => [...p, { id: Date.now(), name: input.trim(), done: false }]);
    setInput("");
  };

  return (
    <div className="max-w-2xl">
      <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide bg-primary/10 text-primary px-3 py-1 rounded-full mb-4">
        Beta
      </div>
      <h2 className="text-2xl mb-2">Materialplaner</h2>
      <p className="text-muted-foreground mb-6">
        Plane das Material für dein nächstes Projekt. Häkchen abhaken, was schon da ist.
        (Beta — Speichern & Übernahme in den Warenkorb folgt.)
      </p>

      <form onSubmit={add} className="flex gap-3 mb-5">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="z.B. 2K Klarlack, Härter, Schleifpapier P400 …" className="input-base flex-1" />
        <button type="submit" className="btn-primary"><Plus className="w-5 h-5" /> Hinzu</button>
      </form>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Noch keine Positionen. Füg oben dein erstes Material hinzu.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id} className="card-tilt hover:translate-y-0 flex items-center gap-3 p-3">
              <input
                type="checkbox"
                checked={it.done}
                onChange={() => setItems((p) => p.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)))}
                className="w-5 h-5 accent-[#B8860B]"
              />
              <span className={cn("flex-1", it.done && "line-through text-muted-foreground")}>{it.name}</span>
              <button onClick={() => setItems((p) => p.filter((x) => x.id !== it.id))} className="w-10 h-10 flex items-center justify-center text-destructive hover:bg-destructive/10 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Orders() {
  return (
    <div className="card-tilt hover:translate-y-0 p-8 text-center max-w-2xl mx-auto">
      <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
      <h2 className="text-xl mb-2">Noch keine Bestellungen</h2>
      <p className="text-muted-foreground mb-6">
        Deine Bestellungen und Anfragen erscheinen hier, sobald die Anbindung an unser
        Bestellsystem aktiv ist. Bis dahin: bestell direkt im Shop oder ruf uns an.
      </p>
      <Link to="/shop" className="btn-primary">Zum Shop</Link>
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
