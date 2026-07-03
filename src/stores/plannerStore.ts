import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface PlannerItem {
  id: number;
  name: string;
  quantity: number;
  done: boolean;
}

// ── AI-Materialplaner ────────────────────────────────────────────────

export type PlannerStep = 1 | 2 | 3;

export interface PlannerBriefing {
  job: string; // Was wird gemacht?
  vehicle: string; // Marke + Modell (optional)
  colorCode: string; // Farbcode falls bekannt (z.B. "LC9Z"), "" = AI/Theke klärt
  colorName: string; // Farbname falls bekannt (z.B. "Deep Black")
  vin: string; // VIN — Alex Autoshop ermittelt daraus den Farbcode (kostenlos)
  area: string; // Schadenstelle
  quality: string; // Qualitätsstufe
  paintAmount: string; // gewünschte Lackmenge, "" = AI kalkuliert
  paintSystem: string; // Lacksystem: "" = AI, "1K Basislack + Klarlack", "2K Decklack …", "Nur Basislack …"
  clearcoat: string; // Klarlack-Wunsch (nur bei 1K-System), "" = AI empfiehlt
  inStock: string[]; // Material, das die Werkstatt schon hat — kommt NICHT in den Plan
  needTools: string[]; // Werkzeug, das der Kunde zusätzlich braucht (Pistole, Poliermaschine …)
}

export interface AIPlanItem {
  id: number;
  name: string; // Produktempfehlung aus dem Sortiment
  quantity: string; // z.B. "500 ml" oder "2 Rollen"
  price: string; // Preisschätzung, z.B. "13€" / "ab 19€"
  reason: string; // Warum wird das gebraucht?
  searchQuery: string; // Shopify-Suchbegriff
  included: boolean; // im Warenkorb/WhatsApp berücksichtigen
}

export interface AIPlan {
  title: string;
  items: AIPlanItem[];
  totalEstimate: string;
  hint?: string;
}

const EMPTY_BRIEFING: PlannerBriefing = { job: "", vehicle: "", colorCode: "", colorName: "", vin: "", area: "", quality: "", paintAmount: "", paintSystem: "", clearcoat: "", inStock: [], needTools: [] };

interface PlannerStore {
  items: PlannerItem[];
  projectName: string;
  setProjectName: (name: string) => void;
  add: (name: string, quantity?: number) => void;
  addMany: (names: string[]) => void;
  toggle: (id: number) => void;
  setQuantity: (id: number, quantity: number) => void;
  remove: (id: number) => void;
  clear: () => void;
  // AI-Planner State
  step: PlannerStep;
  briefing: PlannerBriefing;
  aiPlan: AIPlan | null;
  planNote: string; // Freitext-Anmerkung des Kunden — geht mit in WhatsApp/Druck
  setStep: (step: PlannerStep) => void;
  setBriefing: (patch: Partial<PlannerBriefing>) => void;
  setAiPlan: (plan: AIPlan | null) => void;
  setPlanNote: (note: string) => void;
  toggleAiItem: (id: number) => void;
  resetPlanner: () => void;
}

let seq = 0;
const nextId = () => Date.now() * 1000 + (seq++ % 1000);

export const usePlannerStore = create<PlannerStore>()(
  persist(
    (set) => ({
      items: [],
      projectName: "",
      setProjectName: (name) => set({ projectName: name }),
      add: (name, quantity = 1) =>
        set((s) => ({
          items: [...s.items, { id: nextId(), name: name.trim(), quantity, done: false }],
        })),
      // Vorlage übernehmen: nur Positionen ergänzen, die noch nicht in der Liste sind
      addMany: (names) =>
        set((s) => {
          const existing = new Set(s.items.map((i) => i.name.toLowerCase()));
          const toAdd = names
            .filter((n) => n.trim() && !existing.has(n.trim().toLowerCase()))
            .map((n) => ({ id: nextId(), name: n.trim(), quantity: 1, done: false }));
          return { items: [...s.items, ...toAdd] };
        }),
      toggle: (id) =>
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)) })),
      setQuantity: (id, quantity) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i)),
        })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [], projectName: "" }),

      // ── AI-Planner ──
      step: 1,
      briefing: EMPTY_BRIEFING,
      aiPlan: null,
      planNote: "",
      setStep: (step) => set({ step }),
      setBriefing: (patch) => set((s) => ({ briefing: { ...s.briefing, ...patch } })),
      setAiPlan: (plan) => set({ aiPlan: plan }),
      setPlanNote: (planNote) => set({ planNote }),
      toggleAiItem: (id) =>
        set((s) =>
          s.aiPlan
            ? {
                aiPlan: {
                  ...s.aiPlan,
                  items: s.aiPlan.items.map((i) =>
                    i.id === id ? { ...i, included: !i.included } : i
                  ),
                },
              }
            : s
        ),
      resetPlanner: () => set({ step: 1, briefing: EMPTY_BRIEFING, aiPlan: null, planNote: "" }),
    }),
    {
      name: "material-planner",
      storage: createJSONStorage(() => localStorage),
      // step 2 (AI lädt) NIE persistieren — sonst hängt die Ladeanimation
      // nach Reload/Abbruch für immer fest, ohne dass ein Request läuft.
      partialize: (s) =>
        ({ ...s, step: s.step === 2 ? (s.aiPlan ? 3 : 1) : s.step }) as PlannerStore,
      // Alte localStorage-Stände kennen neue Briefing-Felder nicht —
      // mit Defaults auffüllen, damit Inputs nie undefined-Werte bekommen.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PlannerStore>;
        return { ...current, ...p, briefing: { ...current.briefing, ...(p.briefing ?? {}) } };
      },
    }
  )
);

// Intelligente Projekt-Vorlagen: typische Materiallisten je Arbeit.
export const PLANNER_TEMPLATES: { label: string; emoji: string; items: string[] }[] = [
  {
    label: "Komplettlackierung",
    emoji: "🎨",
    items: ["Wunschfarbe", "2K Klarlack", "Härter", "Verdünnung", "Grundierfüller", "Spachtel", "Schleifpapier", "Schleifpads", "Abdeckband", "Silikonentferner"],
  },
  {
    label: "Beilackierung / Smart Repair",
    emoji: "✨",
    items: ["Wunschfarbe", "Klarlack", "Härter", "Verdünnung", "Schleifpads", "Antihologramm-Politur", "Polierpads", "Silikonentferner"],
  },
  {
    label: "Aufbereitung / Politur",
    emoji: "💎",
    items: ["Schleifpaste", "Antihologramm-Politur", "Hochglanz-Politur", "Polierpads", "Exzenter-Schleifscheiben", "Mikrofasertücher", "Felgenreiniger", "Silikonentferner"],
  },
  {
    label: "Spachtel- & Karosseriearbeit",
    emoji: "🔧",
    items: ["Spachtel", "Glasfaserspachtel", "Spritzspachtel", "Schleifpapier", "Schleifpads", "Grundierung", "Karosseriekleber", "Steinschlagschutz"],
  },
];
