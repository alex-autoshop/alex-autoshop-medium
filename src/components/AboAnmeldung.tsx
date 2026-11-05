import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { LogIn, UserPlus } from "lucide-react";

/** Anmeldung erst beim Abschließen. Die Auswahl liegt schon im Browser. */
export function AboAnmeldung({ offen, onZu }: { offen: boolean; onZu: () => void }) {
  const ort = useLocation();
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!offen) return;
    const vorher = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    const zu = (e: KeyboardEvent) => { if (e.key === "Escape") onZu(); };
    document.addEventListener("keydown", zu);
    return () => {
      document.removeEventListener("keydown", zu);
      vorher?.focus();
    };
  }, [offen, onZu]);

  if (!offen) return null;
  const zurueck = { from: ort.pathname + ort.search };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-3 sm:p-6">
      <button type="button" className="absolute inset-0 bg-black/60" aria-label="Schließen" onClick={onZu} />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="abo-anmeldung"
        tabIndex={-1}
        className="relative w-full max-w-md rounded-2xl bg-[#FAF9F7] text-[#1a1a1a] p-5 sm:p-6 shadow-card outline-none"
      >
        <h2 id="abo-anmeldung" className="font-display text-xl sm:text-2xl mb-2">Zum Abschließen anmelden</h2>
        <p className="text-sm leading-relaxed text-neutral-600">
          Deine Auswahl bleibt erhalten. Melde dich an oder erstelle ein Konto, danach geht es mit derselben Liste weiter.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Link
            to="/konto"
            state={zurueck}
            className="btn-primary text-sm"
          >
            <LogIn className="w-4 h-4" /> Anmelden
          </Link>
          <Link
            to="/konto"
            state={{ ...zurueck, tab: "register" }}
            className="btn-outline text-sm"
          >
            <UserPlus className="w-4 h-4" /> Konto erstellen
          </Link>
          <button type="button" onClick={onZu} className="min-h-11 text-sm font-semibold text-neutral-600">
            Zurück zur Auswahl
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
