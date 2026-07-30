/**
 * AISearchWidget — KI-gestützte Teilesuche ohne Sprache, nur Karten.
 *
 * Flow:
 *  1. User tippt (z.B. "Kotflügel Golf 7 2015 silber")
 *  2. POST /api/parts-ai → strukturiertes JSON
 *  3. Zeigt: Fahrzeug-Badge | Teil-Chips | Farb-Card | Material-Plan
 *  4. User kann bestätigen / entfernen / ergänzen
 *  5. "Alles in den Warenkorb" / "Teile suchen"
 */

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, X, Check, Plus, Minus, ShoppingBag, RotateCcw, Car, Palette, Package, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface AIVehicle {
  make: string; model: string; generation?: string;
  year?: number; color?: string; colorCode?: string;
  confirmed: boolean;
}
interface AISegment {
  id: string; label: string; category?: string;
  selected: boolean; essential?: boolean; searchQuery?: string;
}
interface AIPaint {
  name: string; code?: string; brand?: string; liters?: number; type?: string;
}
interface AIMaterialItem {
  id: string; name: string; category: string;
  qty: number; unit: string; estimatedPrice?: number;
  selected: boolean; essential?: boolean;
}
interface AIQuestion {
  id: string; text: string; options: string[]; impact?: string;
}
interface AIResult {
  vehicle?: AIVehicle;
  intent?: string;
  segments: AISegment[];
  paint?: AIPaint;
  materialPlan: AIMaterialItem[];
  questions?: AIQuestion[];
  confidence?: number;
  summary?: string;
}

interface Props {
  /** Called when user wants to search for specific parts (segment clicked) */
  onSearchParts?: (query: string) => void;
  /** Called to add items to cart */
  onAddToCart?: (items: { name: string; qty: number; price?: number }[]) => void;
  className?: string;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const eur = (x?: number) => x != null ? `${x.toFixed(2).replace('.', ',')} €` : null;

const CATEGORY_COLORS: Record<string, string> = {
  'Lack':         'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  'Grundierung':  'bg-gray-500/10 text-gray-600 dark:text-gray-300 border-gray-500/30',
  'Klarlack':     'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
  'Härter':       'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
  'Füller':       'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30',
  'Schleifmittel':'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
  'Reiniger':     'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30',
  'Hilfsmittel':  'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30',
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function AISearchWidget({ onSearchParts, onAddToCart, className }: Props) {
  const [query, setQuery]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<AIResult | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const inputRef                    = useRef<HTMLInputElement>(null);

  // Lokaler State für interaktive Karten
  const [segments, setSegments]     = useState<AISegment[]>([]);
  const [materials, setMaterials]   = useState<AIMaterialItem[]>([]);
  const [vehicle, setVehicle]       = useState<AIVehicle | null>(null);
  const [answeredQs, setAnsweredQs] = useState<Record<string, string>>({});

  const reset = () => {
    setResult(null); setError(null); setSegments([]); setMaterials([]);
    setVehicle(null); setAnsweredQs({}); setQuery('');
    inputRef.current?.focus();
  };

  const search = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || trimmed.length < 2) return;
    setLoading(true); setError(null); setResult(null);

    try {
      const res = await fetch('/api/parts-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
        signal: AbortSignal.timeout(15_000),
      });
      const data: AIResult = await res.json();
      if (!res.ok || (data as any).error) throw new Error((data as any).error || 'Fehler');

      setResult(data);
      setSegments(data.segments || []);
      setMaterials(data.materialPlan || []);
      setVehicle(data.vehicle ?? null);
    } catch (e: any) {
      setError(e.message || 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    search(query);
  };

  const toggleSegment  = (id: string) => setSegments(s => s.map(x => x.id === id ? { ...x, selected: !x.selected } : x));
  const toggleMaterial = (id: string) => setMaterials(m => m.map(x => x.id === id ? { ...x, selected: !x.selected } : x));
  const updateQty      = (id: string, delta: number) =>
    setMaterials(m => m.map(x => x.id === id ? { ...x, qty: Math.max(1, x.qty + delta) } : x));

  const selectedSegments  = segments.filter(s => s.selected);
  const selectedMaterials = materials.filter(m => m.selected);
  const totalEstimate     = selectedMaterials.reduce((s, m) => s + (m.estimatedPrice ?? 0) * m.qty, 0);

  const handleAddToCart = () => {
    const items = selectedMaterials.map(m => ({
      name: m.name, qty: m.qty, price: m.estimatedPrice,
    }));
    onAddToCart?.(items);
    toast.success(`${items.length} Artikel in den Warenkorb gelegt`);
  };

  const handleSearchParts = (seg: AISegment) => {
    onSearchParts?.(seg.searchQuery || seg.label);
  };

  return (
    <div className={cn("w-full", className)}>
      {/* ── SUCHLEISTE ─────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="relative">
        <div className={cn(
          "flex items-center gap-2 rounded-2xl border-2 bg-card transition-all duration-200",
          loading ? "border-primary/60 shadow-lg shadow-primary/10" : "border-border hover:border-primary/40",
          result ? "rounded-b-none border-b-0" : ""
        )}>
          <div className="flex items-center gap-2 pl-4 shrink-0">
            {loading
              ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                  <Sparkles className="w-5 h-5 text-primary" />
                </motion.div>
              : <Sparkles className="w-5 h-5 text-primary/60" />
            }
          </div>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit(e as any)}
            placeholder="Was suchst du? (z.B. Kotflügel Golf 7 2015 silber, Ölwechsel BMW E90…)"
            className="flex-1 py-4 text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground/50 font-medium"
          />
          {(query || result) && (
            <button type="button" onClick={reset}
              className="p-2 mr-1 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary">
              <X className="w-4 h-4" />
            </button>
          )}
          <button type="submit" disabled={loading || !query.trim()}
            className="mr-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 shrink-0">
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">KI-Suche</span>
          </button>
        </div>

        {/* ── KI-ERGEBNIS-KARTEN ────────────────────────────────────────────── */}
        <AnimatePresence>
          {result && !loading && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="border-2 border-t-0 border-border rounded-b-2xl bg-card overflow-hidden"
            >
              {/* Summary-Zeile */}
              {result.summary && (
                <div className="px-5 py-3 bg-primary/5 border-b border-border/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="w-4 h-4 text-primary shrink-0" />
                    <span>{result.summary}</span>
                  </div>
                  <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0">
                    <RotateCcw className="w-3 h-3" /> Neu suchen
                  </button>
                </div>
              )}

              <div className="p-4 space-y-4">

                {/* FAHRZEUG-BADGE */}
                {vehicle && (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-secondary/30">
                    <Car className="w-5 h-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold">
                        {vehicle.make} {vehicle.model} {vehicle.generation && `(Gen. ${vehicle.generation})`} {vehicle.year}
                      </p>
                      {vehicle.color && (
                        <p className="text-xs text-muted-foreground">{vehicle.color} {vehicle.colorCode && `· Code: ${vehicle.colorCode}`}</p>
                      )}
                    </div>
                    {vehicle.confirmed ? (
                      <span className="text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Bestätigt
                      </span>
                    ) : (
                      <button onClick={() => setVehicle(v => v ? { ...v, confirmed: true } : v)}
                        className="text-xs font-semibold text-primary border border-primary/40 rounded-lg px-2.5 py-1 hover:bg-primary hover:text-primary-foreground transition-all">
                        ✓ Stimmt
                      </button>
                    )}
                  </div>
                )}

                {/* TEILE-SEGMENTE */}
                {segments.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5" /> Erkannte Teile
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {segments.map(seg => (
                        <div key={seg.id} className="flex items-center gap-1">
                          <button
                            onClick={() => toggleSegment(seg.id)}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-all",
                              seg.selected
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-secondary/50 text-muted-foreground border-border/60 line-through opacity-60"
                            )}
                          >
                            {seg.selected ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                            {seg.label}
                          </button>
                          {seg.selected && onSearchParts && (
                            <button onClick={() => handleSearchParts(seg)}
                              title="Teile suchen"
                              className="w-8 h-8 rounded-xl border border-border bg-secondary/50 hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center">
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* FARBE */}
                {result.paint && (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5">
                    <Palette className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-bold">{result.paint.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {result.paint.brand && `${result.paint.brand} · `}
                        {result.paint.type && `${result.paint.type} · `}
                        {result.paint.code && `Farbcode: ${result.paint.code} · `}
                        {result.paint.liters && `ca. ${result.paint.liters}L benötigt`}
                      </p>
                    </div>
                  </div>
                )}

                {/* KLÄRUNGSFRAGEN */}
                {result.questions && result.questions.length > 0 && (
                  <div className="space-y-2">
                    {result.questions.filter(q => !answeredQs[q.id]).map(q => (
                      <div key={q.id} className="p-3 rounded-xl border border-border bg-secondary/20">
                        <p className="text-sm font-medium mb-2">{q.text}</p>
                        <div className="flex flex-wrap gap-2">
                          {q.options.map(opt => (
                            <button key={opt}
                              onClick={() => setAnsweredQs(prev => ({ ...prev, [q.id]: opt }))}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-card hover:border-primary/50 hover:text-primary transition-all">
                              {opt}
                            </button>
                          ))}
                        </div>
                        {q.impact && <p className="text-[11px] text-muted-foreground mt-1.5">{q.impact}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {/* MATERIALPLAN */}
                {materials.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">
                      Materialplan
                    </p>
                    <div className="space-y-1.5">
                      {materials.map(m => (
                        <div key={m.id}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all",
                            m.selected ? "border-border bg-card" : "border-transparent bg-secondary/20 opacity-50"
                          )}
                        >
                          {/* Toggle */}
                          <button onClick={() => toggleMaterial(m.id)}
                            className={cn(
                              "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                              m.selected ? "bg-primary border-primary" : "border-border"
                            )}>
                            {m.selected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </button>

                          {/* Name + Kategorie */}
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-sm font-medium", !m.selected && "line-through")}>{m.name}</p>
                            <span className={cn(
                              "inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border mt-0.5",
                              CATEGORY_COLORS[m.category] || 'bg-secondary/50 text-muted-foreground border-border'
                            )}>
                              {m.category}
                            </span>
                          </div>

                          {/* Menge */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={() => updateQty(m.id, -1)}
                              className="w-6 h-6 rounded-md border border-border bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center text-sm font-mono font-bold">{m.qty}</span>
                            <button onClick={() => updateQty(m.id, 1)}
                              className="w-6 h-6 rounded-md border border-border bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Unit + Preis */}
                          <div className="text-right shrink-0 min-w-[80px]">
                            <p className="text-xs text-muted-foreground">{m.unit}</p>
                            {m.estimatedPrice != null && (
                              <p className="text-sm font-bold">{eur(m.estimatedPrice * m.qty)}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ACTION-LEISTE */}
                {(selectedSegments.length > 0 || selectedMaterials.length > 0) && (
                  <div className="flex items-center gap-3 pt-2 border-t border-border/60">
                    {selectedMaterials.length > 0 && (
                      <>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">
                            {selectedMaterials.length} Material{selectedMaterials.length !== 1 ? 'ien' : ''} ausgewählt
                          </p>
                          {totalEstimate > 0 && (
                            <p className="text-sm font-bold">≈ {eur(totalEstimate)}</p>
                          )}
                        </div>
                        <button onClick={handleAddToCart}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:brightness-95 transition-all">
                          <ShoppingBag className="w-4 h-4" />
                          In den Warenkorb
                        </button>
                      </>
                    )}
                    {selectedSegments.length > 0 && onSearchParts && (
                      <button
                        onClick={() => onSearchParts(selectedSegments.map(s => s.searchQuery || s.label).join(' '))}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all",
                          selectedMaterials.length > 0
                            ? "border-border bg-card hover:border-primary/50 hover:text-primary"
                            : "bg-primary text-primary-foreground hover:brightness-95"
                        )}
                      >
                        <Search className="w-4 h-4" />
                        Teile suchen
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ERROR */}
        {error && !loading && (
          <div className="mt-2 px-4 py-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
            <X className="w-4 h-4 shrink-0" />
            KI-Suche fehlgeschlagen: {error}
          </div>
        )}
      </form>
    </div>
  );
}
