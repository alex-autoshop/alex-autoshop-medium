import { useState } from "react";
import { Plus, Trash2, MessageCircle, Sparkles } from "lucide-react";
import { usePlannerStore, PLANNER_TEMPLATES } from "@/stores/plannerStore";
import { whatsappLink } from "@/data/shopInfo";
import { cn } from "@/lib/utils";

// Intelligenter Materialplaner — wird im Dashboard und im schwebenden Widget genutzt.
export function MaterialPlanner({ compact = false }: { compact?: boolean }) {
  const { items, projectName, setProjectName, add, addMany, toggle, setQuantity, remove, clear } = usePlannerStore();
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
      `Hallo Alex Autoshop, Materialanfrage${projectName ? ` für „${projectName}"` : ""}:`,
      ...items.map((i) => `• ${i.quantity}× ${i.name}${i.done ? " (habe ich schon)" : ""}`),
    ];
    return whatsappLink(lines.join("\n"));
  };

  return (
    <div className={cn(compact ? "" : "max-w-2xl")}>
      {/* Projektname */}
      <input
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        placeholder="Projektname (z.B. BMW 3er Heckklappe)"
        className="input-base mb-3 font-semibold"
      />

      {/* Intelligente Vorlagen */}
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

      {/* Eigenes Material hinzufügen */}
      <form onSubmit={submit} className="flex gap-2 mb-4">
        <input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
          className="input-base w-16 text-center shrink-0 px-2"
          aria-label="Menge"
        />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Material hinzufügen …"
          className="input-base flex-1"
        />
        <button type="submit" className="btn-primary shrink-0 px-4">
          <Plus className="w-5 h-5" />
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm py-4 text-center">
          Lade eine Vorlage oben oder füg dein erstes Material hinzu.
        </p>
      ) : (
        <>
          <ul className={cn("space-y-2 mb-4", compact && "max-h-[34vh] overflow-y-auto pr-1")}>
            {items.map((it) => (
              <li key={it.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
                <input
                  type="checkbox"
                  checked={it.done}
                  onChange={() => toggle(it.id)}
                  className="w-5 h-5 accent-[#B8860B] shrink-0"
                />
                <div className="flex items-center border border-border rounded-md shrink-0">
                  <button onClick={() => setQuantity(it.id, it.quantity - 1)} className="w-7 h-8 flex items-center justify-center hover:bg-secondary text-sm">−</button>
                  <span className="w-6 text-center text-xs font-semibold">{it.quantity}</span>
                  <button onClick={() => setQuantity(it.id, it.quantity + 1)} className="w-7 h-8 flex items-center justify-center hover:bg-secondary text-sm">+</button>
                </div>
                <span className={cn("flex-1 min-w-0 text-sm truncate", it.done && "line-through text-muted-foreground")}>
                  {it.name}
                </span>
                <button onClick={() => remove(it.id)} className="w-8 h-8 flex items-center justify-center text-destructive hover:bg-destructive/10 rounded-md shrink-0" aria-label="Entfernen">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>

          <div className="flex flex-col sm:flex-row gap-2">
            <a href={whatsappRequest()} target="_blank" rel="noopener noreferrer" className="btn-primary flex-1 text-sm">
              <MessageCircle className="w-4 h-4" /> Anfrage senden ({openItems.length})
            </a>
            <button onClick={clear} className="btn-outline text-sm">Leeren</button>
          </div>
        </>
      )}
    </div>
  );
}
