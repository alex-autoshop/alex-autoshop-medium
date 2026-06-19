import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";

const STORAGE_KEY = "cookie-consent";

// Cookie-Hinweis — erscheint nur beim ersten Besuch (Auswahl in localStorage gemerkt).
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const choose = (value: "all" | "necessary") => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* localStorage nicht verfügbar — Banner trotzdem schließen */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4">
      <div className="mx-auto max-w-3xl bg-card border border-border rounded-2xl shadow-2xl p-5 sm:p-6 animate-fade-up">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Cookie className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-lg">Cookies & Datenschutz</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Wir verwenden notwendige Cookies, damit die Seite funktioniert (z.&nbsp;B. Warenkorb &amp; Login).
              Optionale Cookies helfen uns, das Angebot zu verbessern. Details findest du in der{" "}
              <Link to="/datenschutz" className="text-primary font-semibold underline">
                Datenschutzerklärung
              </Link>
              .
            </p>
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <button onClick={() => choose("all")} className="btn-gold-bright sm:flex-1">
                Alle akzeptieren
              </button>
              <button onClick={() => choose("necessary")} className="btn-outline sm:flex-1">
                Nur notwendige
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
