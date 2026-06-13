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
  add: (name: string, quantity?: number) => void;
  toggle: (id: number) => void;
  setQuantity: (id: number, quantity: number) => void;
  remove: (id: number) => void;
  clear: () => void;
}

export const usePlannerStore = create<PlannerStore>()(
  persist(
    (set) => ({
      items: [],
      add: (name, quantity = 1) =>
        set((s) => ({
          items: [...s.items, { id: Date.now(), name: name.trim(), quantity, done: false }],
        })),
      toggle: (id) =>
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)) })),
      setQuantity: (id, quantity) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i)),
        })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    { name: "material-planner", storage: createJSONStorage(() => localStorage) }
  )
);
