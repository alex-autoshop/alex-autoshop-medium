/**
 * Materialplaner — praktisch & direkt.
 * Kein AI-Wizard. Nutzer wählt selbst was und wie viel.
 * - Quick-Templates (Komplettlackierung, Politur, …)
 * - Freie Produktsuche / Eigeneingabe
 * - Mengensteuerung (+/–)
 * - Alles in Warenkorb / WhatsApp / Print
 */
import { useState, useRef } from "react";
import { Plus, Minus, Trash2, ShoppingCart, MessageCircle, Printer, Check, X, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { usePlannerStore } from "@/stores/plannerStore";
import { useCartStore } from "@/stores/cartStore";
import { useAuth } from "@/context/AuthContext";
import { discountForLevel } from "@/data/memberships";
import { whatsappLink } from "@/data/shopInfo";
import { cn } from "@/lib/utils";

// ── Schnell-Vorlagen ──────────────────────────────────────────────────
const TEMPLATES: { label: string; emoji: string; items: string[] }[] = [
  {
    label: "Komplettlackierung",
    emoji: "🎨",
    items: ["Basislack / Wunschfarbe", "2K Klarlack", "Härter", "Verdünnung", "Grundierfüller", "Spachtel", "Schleifpapier", "Schleifpads", "Abdeckband & Folie", "Silikonentferner", "Mischbecher & Siebe"],
  },
  {
    label: "Beilackierung / Smart Repair",
    emoji: "✨",
    items: ["Basislack / Wunschfarbe", "2K Klarlack", "Härter", "Verdünnung", "Schleifpads", "Antihologramm-Politur", "Silikonentferner"],
  },
  {
    label: "Politur / Aufbereitung",
    emoji: "💎",
    items: ["Schnittkorrektur-Paste", "Antihologramm-Politur", "Hochglanzpolitur", "Polierpads", "Mikrofasertücher", "Exzenterschleifer-Pads", "Silikonentferner"],
  },
  {
    label: "Spachtel / Karosserie",
    emoji: "🔧",
    items: ["Spachtel", "Glasfaserspachtel", "Spritzspachtel", "Schleifpapier", "Schleifpads", "Grundierung", "Steinschlagschutz"],
  },
  {
    label: "Felgen lackieren",
    emoji: "⚙️",
    items: ["Felgenlack", "Felgenprimer", "Verdünnung", "Schleifpapier", "Silikonentferner", "Abdeckband & Folie"],
  },
];

// ── Produkt-Schnellwahl nach Kategorie ───────────────────────────────
const CATEGORIES: { label: string; items: string[] }[] = [
  { label: "Lack & Klarlack", items: ["Basislack / Wunschfarbe", "2K Klarlack", "1K Klarlack", "2K Decklack", "Felgenlack", "Grundierfüller", "Grundierung", "Steinschlagschutz"] },
  { label: "Verdünner & Härter", items: ["Härter", "Verdünnung", "Aktivator", "2K Vorlack"] },
  { label: "Schleif & Polier", items: ["Schleifpapier", "Schleifpads", "Exzenterschleifer-Pads", "Antihologramm-Politur", "Schnittkorrektur-Paste", "Hochglanzpolitur", "Polierpads", "Mikrofasertücher"] },
  { label: "Karosserie", items: ["Spachtel", "Glasfaserspachtel", "Spritzspachtel", "Karosseriekleber", "Karosseriedichtmasse"] },
  { label: "Hilfsstoffe", items: ["Silikonentferner", "Abdeckband & Folie", "Mischbecher & Siebe", "Handschuhe & Tücher", "Atemschutzmaske", "Reinigungstücher"] },
];

interface MaterialPlannerProps {
  compact?: boolean;
}

export function MaterialPlanner({ compact = false }: MaterialPlannerProps) {
  const { items, add, addMany, remove, toggle, setQuantity, clear, projectName, setProjectName } = usePlannerStore();
  const addToShopifyCart = useCartStore((s) => s.addItem);
  const { user, profile } = useAuth();
  const [customInput, setCustomInput] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pendingCount = items.filter((i) => !i.done).length;
  const doneCount = items.filter((i) => i.done).length;

  // ── Vorlage laden ─────────────────────────────────────────────────
  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    addMany(tpl.items);
    toast.success(`"${tpl.label}" geladen`, { description: `${tpl.items.length} Positionen hinzugefügt` });
  };

  // ── Produkt aus Kategorie hinzufügen ─────────────────────────────
  const quickAdd = (name: string) => {
    add(name);
    toast.success(name, { description: "Zum Plan hinzugefügt" });
  };

  // ── Custom-Eingabe ────────────────────────────────────────────────
  const handleCustomAdd = () => {
    const name = customInput.trim();
    if (!name) return;
    add(name);
    setCustomInput("");
    inputRef.current?.focus();
  };

  // ── Alles in Shopify-Warenkorb ────────────────────────────────────
  const addAllToCart = async () => {
    const toAdd = items.filter((i) => !i.done);
    if (!toAdd.length) { toast.error("Keine offenen Positionen"); return; }
    toast.info(`${toAdd.length} Artikel werden hinzugefügt …`);
    // Materialplan-Artikel haben keine Shopify-Varianten → als Notiz via WhatsApp stattdessen
    const lines = toAdd.map((i) => `• ${i.name}${i.quantity > 1 ? ` (${i.quantity}×)` : ""}`).join("\n");
    const project = projectName || "Materialplan";
    window.open(whatsappLink(`Hallo Alex Autoshop! Ich möchte folgendes bestellen:\n\n*${project}*\n${lines}\n\nBitte Preise + Verfügbarkeit bestätigen.`), "_blank");
  };

  // ── WhatsApp ──────────────────────────────────────────────────────
  const sendWhatsApp = () => {
    if (!items.length) { toast.error("Plan ist leer"); return; }
    const lines = items.map((i) => `${i.done ? "✅" : "◻️"} ${i.name}${i.quantity > 1 ? ` (${i.quantity}×)` : ""}`).join("\n");
    window.open(whatsappLink(`*${projectName || "Materialplan"}*\n\n${lines}`), "_blank");
  };

  // ── Print ─────────────────────────────────────────────────────────
  const print = () => {
    const lines = items.map((i) => `${i.done ? "[x]" : "[ ]"} ${i.name}${i.quantity > 1 ? ` — ${i.quantity}×` : ""}`).join("\n");
    const w = window.open("", "_blank");
    w?.document.write(`<pre style="font-family:monospace;font-size:14px;padding:24px">${projectName || "Materialplan"}\n${"─".repeat(40)}\n${lines}</pre>`);
    w?.print();
  };

  // ── Mitgliedschaftsrabatt ─────────────────────────────────────────
  const discount = user ? discountForLevel(profile?.membership_level ?? 0) : 0;

  if (compact) {
    return (
      <div className="flex flex-col gap-3">
        {/* Projektname */}
        <input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Projektname (optional)"
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />

        {/* Artikel-Liste */}
        {items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">Noch keine Materialien — füge etwas hinzu.</p>
        ) : (
          <ul className="space-y-1.5">
            {items.map((item) => (
              <li key={item.id} className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5 group", item.done && "opacity-50")}>
                <button onClick={() => toggle(item.id)} className={cn("w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors", item.done ? "bg-primary border-primary text-white" : "border-border hover:border-primary")}>
                  {item.done && <Check className="w-3 h-3" />}
                </button>
                <span className={cn("flex-1 text-sm leading-tight", item.done && "line-through")}>{item.name}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setQuantity(item.id, item.quantity - 1)} className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-semibold w-4 text-center">{item.quantity}</span>
                  <button onClick={() => setQuantity(item.id, item.quantity + 1)} className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <button onClick={() => remove(item.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Eigene Position hinzufügen */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCustomAdd()}
            placeholder="Produkt eingeben …"
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button onClick={handleCustomAdd} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:brightness-95 active:scale-95 transition-all">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Aktionen */}
        {items.length > 0 && (
          <div className="flex gap-2 pt-1">
            <button onClick={sendWhatsApp} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#25D366] text-white text-xs font-semibold hover:brightness-95 active:scale-95 transition-all">
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </button>
            <button onClick={print} className="px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-secondary active:scale-95 transition-all">
              <Printer className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { if (confirm("Plan leeren?")) clear(); }} className="px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-secondary active:scale-95 transition-all text-muted-foreground">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── VOLLANSICHT (Dashboard / eigene Seite) ───────────────────────
  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-8">

      {/* Header + Projektname */}
      <div>
        <h2 className="text-2xl font-display font-bold mb-1">Materialplaner</h2>
        <p className="text-muted-foreground text-sm mb-4">Wähle selbst, was du brauchst — plane dein Projekt in Sekunden.</p>
        <input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Projektname (z.B. VW Golf Komplettlackierung)"
          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Quick-Templates */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Schnell-Vorlage laden</p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              onClick={() => applyTemplate(tpl)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-border bg-card hover:border-primary hover:text-primary hover:bg-primary/5 transition-all text-sm font-medium active:scale-95"
            >
              <span>{tpl.emoji}</span> {tpl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Kategorie-Schnellwahl */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Produkte hinzufügen</p>
        {/* Kategorie-Tabs */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              onClick={() => setActiveCat(activeCat === cat.label ? null : cat.label)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                activeCat === cat.label
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary hover:text-primary"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
        {/* Produkte der aktiven Kategorie */}
        {activeCat && (
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.find((c) => c.label === activeCat)?.items.map((item) => {
              const already = items.some((i) => i.name.toLowerCase() === item.toLowerCase());
              return (
                <button
                  key={item}
                  onClick={() => !already && quickAdd(item)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-all",
                    already
                      ? "border-primary/30 bg-primary/10 text-primary cursor-default"
                      : "border-border hover:border-primary hover:bg-primary/5 active:scale-95"
                  )}
                >
                  {already ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-muted-foreground" />}
                  {item}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Freie Eingabe */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCustomAdd()}
          placeholder="Eigenes Produkt eingeben und Enter drücken …"
          className="flex-1 px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={handleCustomAdd}
          className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:brightness-95 active:scale-95 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Hinzufügen
        </button>
      </div>

      {/* Material-Liste */}
      {items.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Deine Liste ({pendingCount} offen{doneCount > 0 ? `, ${doneCount} erledigt` : ""})
            </p>
            <button onClick={() => { if (confirm("Plan komplett leeren?")) clear(); }} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors">
              <RotateCcw className="w-3 h-3" /> Leeren
            </button>
          </div>

          <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border">
            {items.map((item) => (
              <div key={item.id} className={cn("flex items-center gap-3 px-4 py-3 group transition-colors", item.done ? "bg-muted/30" : "bg-card hover:bg-muted/20")}>
                {/* Checkbox */}
                <button
                  onClick={() => toggle(item.id)}
                  className={cn(
                    "w-5 h-5 rounded border shrink-0 flex items-center justify-center transition-all",
                    item.done ? "bg-primary border-primary text-white" : "border-border hover:border-primary"
                  )}
                >
                  {item.done && <Check className="w-3 h-3" />}
                </button>

                {/* Name */}
                <span className={cn("flex-1 text-sm font-medium", item.done && "line-through text-muted-foreground")}>
                  {item.name}
                </span>

                {/* Menge */}
                <div className="flex items-center gap-1.5 bg-secondary rounded-lg px-1 py-0.5">
                  <button
                    onClick={() => setQuantity(item.id, item.quantity - 1)}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-background transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-sm font-bold w-5 text-center tabular-nums">{item.quantity}</span>
                  <button
                    onClick={() => setQuantity(item.id, item.quantity + 1)}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-background transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Löschen */}
                <button
                  onClick={() => remove(item.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Aktionen */}
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={sendWhatsApp}
              className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#25D366] text-white font-bold text-sm hover:brightness-95 active:scale-95 transition-all shadow-sm"
            >
              <MessageCircle className="w-4 h-4" /> Per WhatsApp bestellen
            </button>
            <button
              onClick={print}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border text-sm font-semibold hover:bg-secondary active:scale-95 transition-all"
            >
              <Printer className="w-4 h-4" /> Drucken
            </button>
          </div>

          {discount > 0 && (
            <p className="text-xs text-primary font-semibold mt-3 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              Dein Mitgliederrabatt von {discount}% wird beim Checkout automatisch angewendet.
            </p>
          )}
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">Noch nichts geplant</p>
          <p className="text-sm mt-1">Wähle eine Vorlage oder füge Produkte manuell hinzu.</p>
        </div>
      )}
    </div>
  );
}
