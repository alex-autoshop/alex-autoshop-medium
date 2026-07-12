import { useState } from "react";
import { useLocation } from "react-router-dom";
import { ClipboardList, X } from "lucide-react";
import { usePlannerStore } from "@/stores/plannerStore";
import { useCartStore } from "@/stores/cartStore";
import { MaterialPlanner } from "@/components/MaterialPlanner";

// Schwebendes Materialplaner-Widget unten rechts — auf allen Seiten verfügbar.
export function MaterialPlannerWidget() {
  const [open, setOpen] = useState(false);
  const count = usePlannerStore((s) => s.items.filter((i) => !i.done).length);
  // Wenn der Warenkorb offen ist, das Widget ausblenden — sonst überdeckt es die Kasse-Buttons.
  const cartOpen = useCartStore((s) => s.isOpen);
  // Im Teileportal ausgeblendet — dort sitzt der Teile-Warenkorb an derselben Stelle.
  const { pathname } = useLocation();
  if (pathname.startsWith("/teileportal")) return null;

  return (
    <>
      {/* Panel — bei offenem Warenkorb ausgeblendet, damit nichts überdeckt wird */}
      {open && !cartOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[min(92vw,400px)] bg-card rounded-2xl border border-border shadow-2xl flex flex-col max-h-[78vh] animate-fade-up">
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
        </div>
      )}

      {/* Schwebender Button — bei offenem Warenkorb schrumpft er auf einen kleinen Icon-Button,
          damit er die Kasse-Buttons nicht überdeckt. */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={
          cartOpen
            ? { width: 48, height: 48, paddingLeft: 0, paddingRight: 0, gap: 0 }
            : { height: 56, paddingLeft: 20, paddingRight: 20, gap: 8 }
        }
        className="fixed bottom-5 right-4 sm:right-6 z-50 inline-flex items-center justify-center rounded-full bg-night text-white shadow-xl hover:bg-neutral-800 active:scale-95 transition-colors"
        aria-label="Materialplaner öffnen"
      >
        <ClipboardList className="w-6 h-6 text-gold-bright" />
        {!cartOpen && (
          <span className="font-semibold hidden sm:inline">Materialplaner</span>
        )}
        {count > 0 && !cartOpen && (
          <span className="bg-gold-bright text-night text-xs font-bold rounded-full min-w-[22px] h-[22px] px-1 flex items-center justify-center">
            {count}
          </span>
        )}
        {count > 0 && cartOpen && (
          <span className="absolute -top-1 -right-1 bg-gold-bright text-night text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
            {count}
          </span>
        )}
      </button>
    </>
  );
}
