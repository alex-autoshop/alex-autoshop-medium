import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ShoppingCart,
  MessageCircle,
  Printer,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  AlertTriangle,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { usePlannerStore, type AIPlan, type AIPlanItem } from "@/stores/plannerStore";
import { useCartStore } from "@/stores/cartStore";
import {
  storefrontApiRequest,
  STOREFRONT_PRODUCTS_QUERY,
  type ShopifyProduct,
} from "@/lib/shopify";
import { whatsappLink } from "@/data/shopInfo";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────
// AI-Materialplaner — 3 Schritte auf einer Page:
// 1. Projekt-Briefing (große Touch-Buttons, kein Tippen nötig)
// 2. AI generiert Materialplan (/api/alex-ai, SSE-Stream)
// 3. Aktionen: Warenkorb, WhatsApp, Drucken, Neu planen
// ─────────────────────────────────────────────────────────────────────

const JOBS = ["Komplettlackierung", "Beilackierung", "Politur/Aufbereitung", "Karosserie/Spachtel", "Steinschlagschutz", "Andere..."];
const AREAS = ["Motorhaube", "Tür", "Stoßstange", "Komplettfahrzeug", "Heckklappe", "Dach", "Andere..."];
const QUALITIES = [
  { value: "Professionell (Standox/Sikkens)", label: "Professionell", sub: "Standox / Sikkens" },
  { value: "Mittelklasse (Mipa)", label: "Mittelklasse", sub: "Mipa" },
  { value: "Budget (FRIZ)", label: "Budget", sub: "FRIZ / Master" },
];

const LOADING_STEPS = [
  "Projekt wird analysiert …",
  "Mengen werden kalkuliert …",
  "Produkte aus dem Sortiment gewählt …",
  "Preise werden geprüft …",
];

// Framer Motion Varianten für Step-Übergänge
const stepVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

let aiSeq = 0;
const nextAiId = () => Date.now() * 100 + (aiSeq++ % 100);

// SSE-Stream von /api/alex-ai lesen und Volltext zurückgeben
async function streamAiResponse(briefingText: string): Promise<string> {
  const res = await fetch("/api/alex-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "material_plan",
      messages: [{ role: "user", content: briefingText }],
    }),
  });
  if (!res.ok || !res.body) throw new Error(`AI-Anfrage fehlgeschlagen (${res.status})`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const chunk = JSON.parse(payload);
        full += chunk?.choices?.[0]?.delta?.content ?? "";
      } catch {
        /* unvollständige Chunks ignorieren */
      }
    }
  }
  return full;
}

// JSON aus der AI-Antwort extrahieren (robust gegen Code-Fences / Prosa)
function parseAiPlan(raw: string): AIPlan {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Keine gültige Antwort erhalten");
  const data = JSON.parse(match[0]);
  const items: AIPlanItem[] = (data.items ?? []).map(
    (it: { name?: string; quantity?: string; price_estimate?: string; reason?: string; search_query?: string }) => ({
      id: nextAiId(),
      name: String(it.name ?? "").trim(),
      quantity: String(it.quantity ?? "").trim(),
      price: String(it.price_estimate ?? "").trim(),
      reason: String(it.reason ?? "").trim(),
      searchQuery: String(it.search_query ?? it.name ?? "").trim(),
      included: true,
    })
  ).filter((it: AIPlanItem) => it.name);
  if (items.length === 0) throw new Error("Der Plan kam leer zurück");
  return {
    title: String(data.project_title ?? "Dein Materialplan"),
    items,
    totalEstimate: String(data.total_estimate ?? ""),
    hint: data.hint ? String(data.hint) : undefined,
  };
}

export function MaterialPlanner({ compact = false }: { compact?: boolean }) {
  const { step, briefing, aiPlan, setStep, setBriefing, setAiPlan, toggleAiItem, resetPlanner } =
    usePlannerStore();
  const addItem = useCartStore((s) => s.addItem);

  // Briefing-Unterschritt (0=Arbeit, 1=Fahrzeug, 2=Stelle, 3=Qualität)
  const [q, setQ] = useState(0);
  const [customJob, setCustomJob] = useState("");
  const [customArea, setCustomArea] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cartBusy, setCartBusy] = useState(false);
  const [cartDone, setCartDone] = useState(false);
  const generating = useRef(false);

  // ── Schritt 2: AI-Plan generieren ──
  const generate = async (b = briefing) => {
    if (generating.current) return;
    generating.current = true;
    setError(null);
    setStep(2);
    setLoadingStep(0);
    const ticker = setInterval(() => setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 850);
    const minWait = new Promise((r) => setTimeout(r, 3000)); // Lade-Animation min. 3s

    const briefingText = [
      `Erstelle einen Materialplan für folgendes Lackier-Projekt:`,
      `Arbeit: ${b.job}`,
      b.vehicle ? `Fahrzeug: ${b.vehicle}` : `Fahrzeug: nicht angegeben`,
      `Schadenstelle: ${b.area}`,
      `Qualitätsstufe: ${b.quality}`,
    ].join("\n");

    try {
      const [raw] = await Promise.all([streamAiResponse(briefingText), minWait]);
      setAiPlan(parseAiPlan(raw));
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      clearInterval(ticker);
      generating.current = false;
    }
  };

  // ── Schritt 3: Alle in den Warenkorb ──
  const addAllToCart = async () => {
    if (!aiPlan || cartBusy) return;
    setCartBusy(true);
    let ok = 0;
    const missed: string[] = [];
    for (const it of aiPlan.items.filter((i) => i.included)) {
      try {
        const d = await storefrontApiRequest(STOREFRONT_PRODUCTS_QUERY, { first: 1, query: it.searchQuery });
        const p: ShopifyProduct | undefined = d?.data?.products?.edges?.[0];
        const variant = p?.node?.variants?.edges?.[0]?.node;
        if (!p || !variant) {
          missed.push(it.name);
          continue;
        }
        await addItem({
          product: p,
          variantId: variant.id,
          variantTitle: variant.title,
          price: variant.price,
          quantity: 1,
          selectedOptions: variant.selectedOptions ?? [],
        });
        ok++;
      } catch {
        missed.push(it.name);
      }
    }
    setCartBusy(false);
    if (ok > 0) {
      setCartDone(true);
      toast.success(`${ok} Produkte im Warenkorb`, {
        description: missed.length > 0 ? `Nicht gefunden: ${missed.join(", ")} — per WhatsApp anfragen.` : "Bereit zur Kasse!",
      });
      setTimeout(() => setCartDone(false), 2500);
    } else {
      toast.error("Keine Produkte gefunden", { description: "Frag den Plan direkt per WhatsApp an — wir kümmern uns." });
    }
  };

  // ── Schritt 3: WhatsApp-Text ──
  const whatsappHref = () => {
    if (!aiPlan) return "#";
    const lines = [
      `Hallo Alex Autoshop! 👋 Materialanfrage:`,
      `📋 ${aiPlan.title}`,
      briefing.vehicle ? `🚗 ${briefing.vehicle}` : "",
      "",
      ...aiPlan.items.filter((i) => i.included).map((i) => `• ${i.name} — ${i.quantity}${i.price ? ` (${i.price})` : ""}`),
      "",
      aiPlan.totalEstimate ? `Geschätzt gesamt: ${aiPlan.totalEstimate}` : "",
      `Bitte um Verfügbarkeit & Bestpreis. Danke!`,
    ].filter(Boolean);
    return whatsappLink(lines.join("\n"));
  };

  const restart = () => {
    resetPlanner();
    setQ(0);
    setCustomJob("");
    setCustomArea("");
    setError(null);
  };

  // ── Briefing-Fragen ──
  const questions = [
    {
      title: "Was wird gemacht?",
      subtitle: undefined as string | undefined,
      content: (
        <OptionGrid
          options={JOBS}
          selected={briefing.job}
          custom={customJob}
          onCustom={setCustomJob}
          customPlaceholder="z.B. Felgen lackieren"
          onPick={(v) => {
            setBriefing({ job: v });
            setQ(1);
          }}
        />
      ),
    },
    {
      title: "Welches Fahrzeug?",
      subtitle: "Optional — hilft bei der Mengenkalkulation" as string | undefined,
      content: (
        <VehicleInput
          value={briefing.vehicle}
          onChange={(v) => setBriefing({ vehicle: v })}
          onNext={() => setQ(2)}
        />
      ),
    },
    {
      title: "Welche Schadenstelle?",
      subtitle: undefined as string | undefined,
      content: (
        <OptionGrid
          options={AREAS}
          selected={briefing.area}
          custom={customArea}
          onCustom={setCustomArea}
          customPlaceholder="z.B. Kotflügel links"
          onPick={(v) => {
            setBriefing({ area: v });
            setQ(3);
          }}
        />
      ),
    },
    {
      title: "Qualitätsstufe?",
      subtitle: undefined as string | undefined,
      content: (
        <div className="grid gap-3">
          {QUALITIES.map((opt) => (
            <TouchButton
              key={opt.value}
              active={briefing.quality === opt.value}
              onClick={() => {
                const b = { ...briefing, quality: opt.value };
                setBriefing({ quality: opt.value });
                generate(b);
              }}
            >
              <span className="font-bold">{opt.label}</span>
              <span className="text-sm opacity-70">{opt.sub}</span>
            </TouchButton>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className={cn("relative", compact ? "" : "max-w-2xl")}>
      <AnimatePresence mode="wait">
        {/* ── SCHRITT 1: Briefing ── */}
        {step === 1 && (
          <motion.div key={`q${q}`} variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeOut" }}>
            {/* Fortschritt */}
            <div className="flex items-center gap-2 mb-5">
              {q > 0 && (
                <button onClick={() => setQ(q - 1)} className="w-11 h-11 flex items-center justify-center rounded-xl border border-border hover:border-primary transition-colors shrink-0" aria-label="Zurück">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div className="flex-1 flex gap-1.5">
                {questions.map((_, i) => (
                  <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= q ? "bg-gold-bright" : "bg-border")} />
                ))}
              </div>
              <span className="text-xs font-semibold text-muted-foreground shrink-0">{q + 1}/4</span>
            </div>

            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary mb-1">
              <Wand2 className="w-4 h-4" /> AI-Materialplaner
            </p>
            <h3 className="font-display text-xl sm:text-2xl font-bold mb-1">{questions[q].title}</h3>
            {questions[q].subtitle ? <p className="text-sm text-muted-foreground mb-4">{questions[q].subtitle}</p> : <div className="mb-4" />}
            {questions[q].content}

            <p className="text-[11px] text-muted-foreground mt-4 text-center">
              In 30 Sekunden zum kompletten, kaufbaren Materialplan — kein Tippen nötig.
            </p>
          </motion.div>
        )}

        {/* ── SCHRITT 2: AI generiert ── */}
        {step === 2 && !error && (
          <motion.div key="loading" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="py-10 text-center">
            <motion.div
              animate={{ scale: [1, 1.12, 1], rotate: [0, 6, -6, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-night flex items-center justify-center"
            >
              <Sparkles className="w-8 h-8 text-gold-bright" />
            </motion.div>
            <AnimatePresence mode="wait">
              <motion.p key={loadingStep} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="font-semibold">
                {LOADING_STEPS[loadingStep]}
              </motion.p>
            </AnimatePresence>
            <p className="text-xs text-muted-foreground mt-2">Alex AI erstellt deinen Materialplan mit echten Preisen</p>
            <div className="mt-5 h-1.5 max-w-[240px] mx-auto rounded-full bg-border overflow-hidden">
              <motion.div className="h-full bg-gold-bright" initial={{ width: "5%" }} animate={{ width: "95%" }} transition={{ duration: 3.2, ease: "easeOut" }} />
            </div>
          </motion.div>
        )}

        {/* ── Fehler (kein leerer Zustand ohne Erklärung) ── */}
        {step === 2 && error && (
          <motion.div key="error" variants={stepVariants} initial="enter" animate="center" exit="exit" className="py-8 text-center">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-destructive" />
            <p className="font-bold mb-1">Da ist etwas schiefgelaufen</p>
            <p className="text-sm text-muted-foreground mb-5">{error} — versuch es nochmal oder frag uns direkt.</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button onClick={() => generate()} className="btn-primary min-h-[56px] px-6"><RotateCcw className="w-4 h-4" /> Nochmal versuchen</button>
              <a href={whatsappLink(`Hallo Alex Autoshop! Ich brauche Material für: ${briefing.job} — ${briefing.area}${briefing.vehicle ? ` (${briefing.vehicle})` : ""}`)} target="_blank" rel="noopener noreferrer" className="btn-outline min-h-[56px] px-6">
                <MessageCircle className="w-4 h-4" /> Per WhatsApp fragen
              </a>
            </div>
          </motion.div>
        )}

        {/* ── SCHRITT 3: Plan + Aktionen ── */}
        {step === 3 && aiPlan && (
          <motion.div key="plan" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary mb-1">
              <Sparkles className="w-4 h-4" /> Dein AI-Materialplan
            </p>
            <div className="flex items-baseline justify-between gap-3 mb-4">
              <h3 className="font-display text-xl font-bold leading-tight">{aiPlan.title}</h3>
              {aiPlan.totalEstimate && (
                <span className="shrink-0 text-sm font-bold text-gold-bright bg-night rounded-lg px-3 py-1.5">{aiPlan.totalEstimate}</span>
              )}
            </div>

            {/* Karten-Liste: Produkt | Menge | Preis | Warum */}
            <motion.ul
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.06 } } }}
              className={cn("space-y-2 mb-4", compact && "max-h-[38vh] overflow-y-auto pr-1")}
            >
              {aiPlan.items.map((it) => (
                <motion.li
                  key={it.id}
                  variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                  onClick={() => toggleAiItem(it.id)}
                  className={cn(
                    "rounded-xl border bg-card p-3 cursor-pointer transition-all min-h-[56px] select-none",
                    it.included ? "border-primary/50 hover:border-primary" : "border-border opacity-50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className={cn("mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors", it.included ? "bg-gold-bright border-gold-bright text-night" : "border-border")}>
                      {it.included && <Check className="w-4 h-4" strokeWidth={3} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-semibold text-sm leading-tight">{it.name}</p>
                        <span className="shrink-0 text-sm font-bold text-gold-bright">{it.price}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-medium">{it.quantity}</span>
                        {it.reason && <> · {it.reason}</>}
                      </p>
                    </div>
                  </div>
                </motion.li>
              ))}
            </motion.ul>

            {aiPlan.hint && (
              <p className="text-xs text-muted-foreground bg-secondary/60 rounded-lg p-3 mb-4">💡 {aiPlan.hint}</p>
            )}

            {/* Aktionen */}
            <div className="grid gap-2">
              <button onClick={addAllToCart} disabled={cartBusy} className="btn-primary w-full min-h-[56px] text-base font-bold">
                {cartBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : cartDone ? <Check className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                {cartBusy ? "Produkte werden gesucht …" : cartDone ? "Im Warenkorb!" : "Alle in den Warenkorb"}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="btn-outline min-h-[56px] text-sm">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
                <button onClick={() => window.print()} className="btn-outline min-h-[56px] text-sm">
                  <Printer className="w-4 h-4" /> Exportieren
                </button>
              </div>
              <button onClick={restart} className="min-h-[48px] text-sm font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center justify-center gap-1.5">
                <RotateCcw className="w-4 h-4" /> Neu planen
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Große Touch-Buttons (min. 56px, dreckige Hände!) ──
function TouchButton({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        "w-full min-h-[56px] px-4 py-3 rounded-xl border-2 text-left flex flex-col justify-center transition-colors",
        active ? "border-gold-bright bg-night text-white" : "border-border bg-card hover:border-primary"
      )}
    >
      {children}
    </motion.button>
  );
}

function OptionGrid({
  options,
  selected,
  onPick,
  custom,
  onCustom,
  customPlaceholder,
}: {
  options: string[];
  selected: string;
  onPick: (v: string) => void;
  custom: string;
  onCustom: (v: string) => void;
  customPlaceholder: string;
}) {
  const [showCustom, setShowCustom] = useState(false);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {options.map((opt) =>
        opt === "Andere..." ? (
          <div key={opt} className={cn(!showCustom ? "" : "sm:col-span-2")}>
            {!showCustom ? (
              <TouchButton onClick={() => setShowCustom(true)}>
                <span className="font-semibold text-muted-foreground">Andere …</span>
              </TouchButton>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (custom.trim()) onPick(custom.trim());
                }}
                className="flex gap-2"
              >
                <input autoFocus value={custom} onChange={(e) => onCustom(e.target.value)} placeholder={customPlaceholder} className="input-base flex-1 min-h-[56px]" />
                <button type="submit" disabled={!custom.trim()} className="btn-primary min-h-[56px] px-5 shrink-0 disabled:opacity-40">
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            )}
          </div>
        ) : (
          <TouchButton key={opt} active={selected === opt} onClick={() => onPick(opt)}>
            <span className="font-semibold">{opt}</span>
          </TouchButton>
        )
      )}
    </div>
  );
}

function VehicleInput({ value, onChange, onNext }: { value: string; onChange: (v: string) => void; onNext: () => void }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onNext();
      }}
      className="grid gap-2.5"
    >
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="z.B. BMW 3er G20, 2021" className="input-base min-h-[56px] text-base" autoFocus />
      <button type="submit" className="btn-primary w-full min-h-[56px] text-base font-bold">
        Weiter <ArrowRight className="w-5 h-5" />
      </button>
      <button type="button" onClick={() => { onChange(""); onNext(); }} className="min-h-[48px] text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        Überspringen
      </button>
    </form>
  );
}
