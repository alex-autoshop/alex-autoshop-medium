import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ShoppingCart, Minus, Plus, Loader2, Car, Hash, Type, Palette } from "lucide-react";
import { toast } from "sonner";
import { type ShopifyProduct, formatPrice } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { useAuth } from "@/context/AuthContext";
import { discountForLevel } from "@/data/memberships";
import { cn } from "@/lib/utils";

type Variant = ShopifyProduct["node"]["variants"]["edges"][number]["node"];

// hübschere Step-Labels für bekannte Shopify-Optionsnamen
const LABEL: Record<string, string> = { Hersteller: "Marke", Komponenten: "System", Menge: "Menge" };

const COLOR_TABS = [
  { id: "Lackcode", label: "Lackcode", icon: Palette, placeholder: "z.B. LY9T, A1A1, 040" },
  { id: "Lackname", label: "Lackname", icon: Type, placeholder: "z.B. Tornadorot, Brillantsilber" },
  { id: "VIN", label: "VIN / FIN", icon: Hash, placeholder: "17-stellige Fahrgestellnummer" },
] as const;

export function PaintConfigurator({ product }: { product: ShopifyProduct["node"] }) {
  const addItem = useCartStore((s) => s.addItem);
  const cartLoading = useCartStore((s) => s.isLoading);
  const { user, profile } = useAuth();
  const discount = user ? discountForLevel(profile.membership_level) : 0;

  const options = product.options ?? [];
  const variants: Variant[] = (product.variants?.edges ?? []).map((e) => e.node);

  const [selected, setSelected] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [automarke, setAutomarke] = useState("");
  const [modell, setModell] = useState("");
  const [baujahr, setBaujahr] = useState("");
  const [colorMode, setColorMode] = useState<(typeof COLOR_TABS)[number]["id"]>("Lackcode");
  const [colorValue, setColorValue] = useState("");
  const [note, setNote] = useState("");

  // welcher Optionswert ist verfügbar gegeben die bisherige Auswahl?
  const isValueAvailable = (optName: string, value: string) =>
    variants.some(
      (v) =>
        v.selectedOptions.some((o) => o.name === optName && o.value === value) &&
        options.every((opt) => {
          if (opt.name === optName) return true;
          const sel = selected[opt.name];
          return !sel || v.selectedOptions.some((o) => o.name === opt.name && o.value === sel);
        })
    );

  const allSelected = options.every((o) => selected[o.name]);
  const variant = useMemo(
    () =>
      allSelected
        ? variants.find((v) => options.every((o) => v.selectedOptions.some((so) => so.name === o.name && so.value === selected[o.name])))
        : undefined,
    [allSelected, selected, variants, options]
  );

  const basePrice = variant ? parseFloat(variant.price.amount) : 0;
  const cur = variant?.price.currencyCode ?? "EUR";
  const memberPrice = basePrice * (1 - discount / 100);

  const pick = (optName: string, value: string) =>
    setSelected((p) => {
      const next = { ...p, [optName]: value };
      // spätere (abhängige) Auswahlen zurücksetzen, falls sie ungültig werden
      return next;
    });

  const add = async () => {
    if (!variant) return toast.error("Bitte Marke, System und Menge wählen");
    if (!automarke.trim()) return toast.error("Bitte die Automarke angeben");
    if (!colorValue.trim()) return toast.error(`Bitte ${colorMode} angeben`);

    const fahrzeug = [automarke, modell, baujahr].map((s) => s.trim()).filter(Boolean).join(" ");
    const attributes = [
      { key: "Fahrzeug", value: fahrzeug },
      { key: colorMode, value: colorValue.trim() },
      ...(note.trim() ? [{ key: "Hinweis", value: note.trim() }] : []),
    ];

    await addItem({
      product: { node: product },
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: qty,
      selectedOptions: variant.selectedOptions,
      attributes,
    });
    toast.success("Wunschfarbe im Warenkorb", { description: `${qty}× ${variant.title}` });
    setQty(1);
  };

  let step = 0;

  return (
    <div className="space-y-6">
      {/* Optionen als Schritte */}
      {options.map((opt) => {
        step += 1;
        return (
          <Section key={opt.name} n={step} title={LABEL[opt.name] ?? opt.name}>
            <div className="flex flex-wrap gap-2">
              {opt.values.map((value) => {
                const avail = isValueAvailable(opt.name, value);
                const active = selected[opt.name] === value;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={!avail}
                    onClick={() => pick(opt.name, value)}
                    className={cn(
                      "px-4 py-3 rounded-lg border font-medium text-sm min-h-[48px] transition-colors",
                      active ? "bg-night text-white border-night" : "bg-card border-border hover:border-primary",
                      !avail && "opacity-30 cursor-not-allowed line-through"
                    )}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </Section>
        );
      })}

      {/* Fahrzeugdaten */}
      <Section n={++step} title="Fahrzeugdaten">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-1">
            <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={automarke} onChange={(e) => setAutomarke(e.target.value)} placeholder="Automarke *" className="input-base pl-9" />
          </div>
          <input value={modell} onChange={(e) => setModell(e.target.value)} placeholder="Modell (optional)" className="input-base" />
          <input value={baujahr} onChange={(e) => setBaujahr(e.target.value)} placeholder="Baujahr (optional)" className="input-base" />
        </div>
      </Section>

      {/* Farbangabe */}
      <Section n={++step} title="Farbangabe">
        <p className="text-sm text-muted-foreground mb-2">Mindestens eine Angabe nötig — Lackcode geht am schnellsten.</p>
        <div className="flex gap-2 mb-3 flex-wrap">
          {COLOR_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setColorMode(t.id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-lg border text-sm font-medium",
                colorMode === t.id ? "bg-night text-white border-night" : "bg-card border-border hover:border-primary"
              )}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>
        <input
          value={colorValue}
          onChange={(e) => setColorValue(e.target.value)}
          placeholder={COLOR_TABS.find((t) => t.id === colorMode)?.placeholder}
          className="input-base"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Notiz (optional) — z.B. Foto vom Farbcode schicken wir per WhatsApp"
          className="input-base mt-2"
        />
      </Section>

      {/* Preis + Warenkorb */}
      <div className="card-tilt hover:translate-y-0 p-5 sm:p-6">
        {variant ? (
          <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
            <div>
              <p className="text-xs text-muted-foreground">{variant.title}</p>
              <p className="text-3xl font-display font-bold">
                {formatPrice(String((discount > 0 ? memberPrice : basePrice) * qty), cur)}
                <span className="text-xs font-normal text-muted-foreground ml-1">inkl. MwSt. · zzgl. Versand</span>
              </p>
              {discount > 0 && (
                <p className="text-xs text-primary font-semibold">
                  Mitgliederpreis (−{discount}%) · statt {formatPrice(String(basePrice * qty), cur)}
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm mb-4">Wähle oben Marke, System und Menge, um den Preis zu sehen.</p>
        )}

        <div className="flex items-center gap-3">
          <div className="flex items-center border border-border rounded-lg shrink-0">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-11 h-12 flex items-center justify-center hover:bg-secondary rounded-l-lg" aria-label="weniger">
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-10 text-center font-bold">{qty}</span>
            <button onClick={() => setQty((q) => q + 1)} className="w-11 h-12 flex items-center justify-center hover:bg-secondary rounded-r-lg" aria-label="mehr">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <button onClick={add} disabled={cartLoading || !variant} className="btn-primary flex-1">
            {cartLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
            In den Warenkorb
          </button>
        </div>

        {discount === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            <Link to="/mitgliedschaft" className="text-primary font-semibold underline">Mitglied werden</Link> und bis 38% sparen.
          </p>
        )}
      </div>
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center shrink-0">
          {n}
        </span>
        <h3 className="text-lg font-display font-bold uppercase tracking-wide text-sm sm:text-base">{title}</h3>
      </div>
      {children}
    </div>
  );
}
