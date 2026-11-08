import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogIn, UserPlus } from "lucide-react";
import { ABO_KONTO_HINWEIS } from "../../shared/abo-konto.js";
import { aboZielLesen, aboZielMerken, aboZielVergessen } from "@/lib/aboListe";
import { useAuth } from "@/context/AuthContext";

/** Anmeldung erst beim Abschließen. Die Abo-Liste liegt schon im Browser. */
export function AboAnmeldung({ offen, onZu }: { offen: boolean; onZu: () => void }) {
  const ort = useLocation();
  const dialog = useRef<HTMLDivElement>(null);
  const ziel = ort.pathname === "/mitgliedschaft"
    ? `/mitgliedschaft${ort.search}`
    : "/mitgliedschaft";

  useEffect(() => {
    if (!offen) return;
    aboZielMerken(ziel);
    const vorher = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    const zu = (e: KeyboardEvent) => { if (e.key === "Escape") onZu(); };
    document.addEventListener("keydown", zu);
    return () => {
      document.removeEventListener("keydown", zu);
      vorher?.focus();
    };
  }, [offen, onZu, ziel]);

  if (!offen) return null;
  const zurueck = { from: ziel, abo: true };

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
          {ABO_KONTO_HINWEIS} Deine Abo-Liste bleibt erhalten.
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

/** Nach dem Link aus der Anmelde-Mail zurück zur Mitgliedschaft, Liste bleibt liegen. */
export function AboRueckkehr() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const ort = useLocation();

  useEffect(() => {
    if (loading || !user) return;
    const ziel = aboZielLesen();
    if (!ziel) return;
    if (ort.pathname === "/mitgliedschaft") {
      aboZielVergessen();
      return;
    }
    const vonMail = /type=(signup|magiclink|invite)/.test(window.location.hash);
    if (!vonMail) return;
    aboZielVergessen();
    navigate("/mitgliedschaft", { replace: true });
  }, [user, loading, ort.pathname, navigate]);

  return null;
}
