import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ClipboardList, X } from "lucide-react";
import { usePlannerStore } from "@/stores/plannerStore";
import { MaterialPlanner } from "@/components/MaterialPlanner";

// Schwebendes Materialplaner-Widget unten rechts — auf allen Seiten verfügbar.
export function MaterialPlannerWidget() {
  const [open, setOpen] = useState(false);
  const count = usePlannerStore((s) => s.items.filter((i) => !i.done).length);

  return (
    <>
      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-4 sm:right-6 z-50 w-[min(92vw,400px)] bg-card rounded-2xl border border-border shadow-2xl flex flex-col max-h-[78vh]"
          >
            <div className="section-dark rounded-t-2xl px-5 py-4 flex items-center justify-between">
              <div>
                <p className="font-display font-bold text-white">Materialplaner</p>
                <p className="text-xs text-white/60">Plane dein Projekt — alles wird gespeichert</p>
              </div>
              <button onClick={() => setOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-lg text-white/80 hover:bg-white/10" aria-label="Schließen">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <MaterialPlanner compact />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Schwebender Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-4 sm:right-6 z-50 inline-flex items-center gap-2 h-14 px-5 rounded-full bg-night text-white shadow-xl hover:bg-neutral-800 active:scale-95 transition-all"
        aria-label="Materialplaner öffnen"
      >
        <ClipboardList className="w-6 h-6 text-gold-bright" />
        <span className="font-semibold hidden sm:inline">Materialplaner</span>
        {count > 0 && (
          <span className="bg-gold-bright text-night text-xs font-bold rounded-full min-w-[22px] h-[22px] px-1 flex items-center justify-center">
            {count}
          </span>
        )}
      </button>
    </>
  );
}
