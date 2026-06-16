import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface PlannerItem {
  id: number;
  name: string;
  quantity: number;
  done: boolean;
}

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
    }),
    { name: "material-planner", storage: createJSONStorage(() => localStorage) }
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
