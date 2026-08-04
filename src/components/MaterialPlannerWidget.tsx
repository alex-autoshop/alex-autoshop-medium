import { X } from "lucide-react";
import { usePlannerStore } from "@/stores/plannerStore";
import { MaterialPlanner } from "@/components/MaterialPlanner";

// Materialplaner-Panel — wird über den Navbar-Button geöffnet.
export function MaterialPlannerWidget() {
  const isPlannerOpen = usePlannerStore((s) => s.isPlannerOpen);
  const closePlanner = usePlannerStore((s) => s.closePlanner);

  if (!isPlannerOpen) return null;

  return (
    <div className="fixed top-20 sm:top-24 right-4 sm:right-6 z-50 w-[min(92vw,400px)] bg-card rounded-2xl border border-border shadow-2xl flex flex-col max-h-[78vh] animate-fade-up">
      <div className="section-dark rounded-t-2xl px-5 py-4 flex items-center justify-between">
        <div>
          <p className="font-display font-bold text-white">Materialplaner</p>
          <p className="text-xs text-white/60">Plane dein Projekt — alles wird gespeichert</p>
        </div>
        <button
          onClick={closePlanner}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-white/80 hover:bg-white/10"
          aria-label="Schließen"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-4 overflow-y-auto">
        <MaterialPlanner compact />
      </div>
    </div>
  );
}
