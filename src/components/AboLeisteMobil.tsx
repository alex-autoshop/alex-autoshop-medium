import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { aboLeisteText } from "../../shared/abo-leiste.js";

const euro = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

export interface AboLeisteProdukt {
  id: string;
  titel: string;
  bild?: string;
}

function cookieAbstand() {
  const el = document.getElementById("aa-cookies");
  if (!el) return 0;
  const stil = getComputedStyle(el);
  if (stil.display === "none" || stil.visibility === "hidden") return 0;
  const box = el.getBoundingClientRect();
  if (box.height < 8) return 0;
  return Math.ceil(box.height);
}

/** Die Leiste sitzt über dem Cookie-Hinweis, nicht darauf. */
function useCookieAbstand() {
  useEffect(() => {
    const setzen = () => {
      document.documentElement.style.setProperty("--abo-cookie", `${cookieAbstand()}px`);
    };
    setzen();
    const mo = new MutationObserver(setzen);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", setzen);
    return () => {
      mo.disconnect();
      window.removeEventListener("resize", setzen);
      document.documentElement.style.removeProperty("--abo-cookie");
    };
  }, []);
}

export function AboLeisteMobil({
  produkte,
  beitrag,
  mitglied = 0,
  verdeckt,
  onAnsehen,
}: {
  produkte: AboLeisteProdukt[];
  beitrag: number;
  /** Summe der künftigen Produktpreise, nur wenn in der Leiste Platz ist. */
  mitglied?: number;
  verdeckt: boolean;
  onAnsehen: () => void;
}) {
  useCookieAbstand();
  const leiste = useRef<HTMLDivElement>(null);
  const vorher = useRef(produkte.length);

  useEffect(() => {
    const el = leiste.current;
    const dazu = produkte.length > vorher.current;
    vorher.current = produkte.length;
    if (!el || !dazu) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.animate(
      [
        { transform: "translateY(10px)" },
        { transform: "translateY(-8px)" },
        { transform: "translateY(0)" },
      ],
      { duration: 420, easing: "ease-out" },
    );
  }, [produkte.length]);

  if (produkte.length === 0 || verdeckt) return null;

  const daumen = produkte.slice(0, 3);

  return createPortal(
    <div
      className="lg:hidden fixed inset-x-0 z-40 px-3 pointer-events-none"
      style={{ bottom: "calc(var(--abo-cookie, 0px) + env(safe-area-inset-bottom, 0px))" }}
    >
      <div
        ref={leiste}
        className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-border bg-card shadow-lg px-2.5 py-2"
        aria-live="polite"
      >
        <div className="hidden min-[430px]:flex shrink-0 -space-x-2" aria-hidden="true">
          {daumen.map((p) => (
            <span key={p.id} className="w-8 h-8 rounded-full border-2 border-card bg-white overflow-hidden">
              {p.bild && <img src={p.bild} alt="" className="w-full h-full object-cover" />}
            </span>
          ))}
        </div>
        <p className="min-w-0 flex-1 text-sm font-semibold leading-snug">
          <span className="min-[380px]:hidden">{aboLeisteText(produkte.length, beitrag)}</span>
          <span className="hidden min-[380px]:block truncate">
            {produkte.length === 1 ? "1 Produkt im Abo" : `${produkte.length} Produkte im Abo`}
          </span>
          <span className="hidden min-[380px]:block text-[11px] font-medium text-muted-foreground truncate">
            Dein Preis {euro(mitglied)} · Abo {euro(beitrag)}
          </span>
        </p>
        <button
          type="button"
          onClick={onAnsehen}
          className="shrink-0 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-3 min-h-11"
        >
          Abo ansehen
        </button>
      </div>
    </div>,
    document.body,
  );
}
