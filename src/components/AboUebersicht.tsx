import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { aboLeisteText } from "../../shared/abo-leiste.js";
import {
  aboListeGesamt,
  istWunschfarbeMenge,
  mengeZahl,
  wunschfarbeAboTitel,
  wunschfarbeDetail,
} from "../../shared/produktabo.js";
import {
  ABO_EREIGNIS,
  ABO_UEBERSICHT,
  aboListeLesen,
  aboPositionLoeschen,
} from "@/lib/aboListe";
import { cn } from "@/lib/utils";

const euro = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

type AboRoh = ReturnType<typeof aboListeLesen>["produkte"][number];

function str(wert: unknown): string {
  return typeof wert === "string" ? wert : "";
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

function useAboListe() {
  const [liste, setListe] = useState(aboListeLesen);
  useEffect(() => {
    const sync = () => setListe(aboListeLesen());
    window.addEventListener(ABO_EREIGNIS, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ABO_EREIGNIS, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return liste;
}

function mengenForm(p: AboRoh) {
  return {
    art: typeof p.art === "string" ? p.art : undefined,
    handle: str(p.handle) || undefined,
    id: str(p.id) || undefined,
    einzelpreis: typeof p.einzelpreis === "number" ? p.einzelpreis : undefined,
  };
}

function titelVon(p: AboRoh): string {
  if (p.art === "menge" && istWunschfarbeMenge(mengenForm(p))) {
    return wunschfarbeAboTitel(p.rabatt, Number(p.menge)) || str(p.titel);
  }
  return str(p.titel);
}

function detailVon(p: AboRoh): string {
  if (p.art !== "menge") return "";
  const menge = `${mengeZahl(Number(p.menge))}× / Monat`;
  if (istWunschfarbeMenge(mengenForm(p))) {
    return `${wunschfarbeDetail(str(p.variante), Number(p.menge))} · ${menge}`;
  }
  const variante = str(p.variante).trim();
  return variante ? `${variante} · ${menge}` : menge;
}

function rechenZeile(p: AboRoh) {
  return {
    art: typeof p.art === "string" ? p.art : undefined,
    rabatt: p.rabatt,
    preis: p.preis == null ? undefined : Number(p.preis),
    einzelpreis: p.einzelpreis == null ? undefined : Number(p.einzelpreis),
    menge: p.menge == null ? undefined : Number(p.menge),
  };
}

function fokussierbar(bereich: HTMLElement) {
  return [...bereich.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])")]
    .filter((el) => !el.hasAttribute("disabled") && el.getClientRects().length > 0);
}

/**
 * Kompakte Abo-Übersicht im Shop. Liest die bestehende Liste und
 * aboListeGesamt. Kein Abschluss, keine eigene Preisrechnung.
 */
export function AboUebersicht() {
  const { pathname } = useLocation();
  const liste = useAboListe();
  const [offen, setOffen] = useState(false);
  const [cookie, setCookie] = useState(0);
  const leiste = useRef<HTMLDivElement>(null);
  const rahmen = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const titelId = useId();
  const produkte = liste.produkte;
  const sichtbar = !pathname.startsWith("/mitgliedschaft") && produkte.length > 0;
  const gesamt = useMemo(() => aboListeGesamt(produkte.map(rechenZeile)), [produkte]);
  const beitrag = gesamt?.beitrag ?? 0;

  useEffect(() => {
    const oeffnen = () => {
      if (window.location.pathname.startsWith("/mitgliedschaft")) return;
      if (aboListeLesen().produkte.length === 0) return;
      setOffen(true);
    };
    window.addEventListener(ABO_UEBERSICHT, oeffnen);
    return () => window.removeEventListener(ABO_UEBERSICHT, oeffnen);
  }, []);

  useEffect(() => {
    if (!sichtbar) setOffen(false);
  }, [sichtbar]);

  useEffect(() => {
    if (!sichtbar) {
      document.documentElement.style.setProperty("--abo-leiste", "0px");
      return;
    }
    const setzen = () => {
      const hoehe = leiste.current?.offsetHeight ?? 0;
      const abstand = cookieAbstand();
      setCookie(abstand);
      document.documentElement.style.setProperty("--abo-leiste", `${hoehe + abstand}px`);
    };
    setzen();
    const mo = new MutationObserver(setzen);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    mo.observe(document.body, { childList: true, subtree: true });
    const ro = new ResizeObserver(setzen);
    if (leiste.current) ro.observe(leiste.current);
    window.addEventListener("resize", setzen);
    return () => {
      mo.disconnect();
      ro.disconnect();
      window.removeEventListener("resize", setzen);
      document.documentElement.style.setProperty("--abo-leiste", "0px");
    };
  }, [sichtbar, produkte.length, offen]);

  useEffect(() => {
    if (!offen) return;
    const vorher = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = document.getElementById("root");
    root?.setAttribute("inert", "");
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    const aufTaste = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOffen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const bereich = rahmen.current;
      if (!bereich) return;
      const knoepfe = fokussierbar(bereich);
      if (!knoepfe.length) return;
      const erst = knoepfe[0];
      const letzt = knoepfe[knoepfe.length - 1];
      const aktiv = document.activeElement;
      if (e.shiftKey && (aktiv === erst || !bereich.contains(aktiv))) {
        e.preventDefault();
        letzt.focus();
      } else if (!e.shiftKey && (aktiv === letzt || !bereich.contains(aktiv))) {
        e.preventDefault();
        erst.focus();
      }
    };
    document.addEventListener("keydown", aufTaste);
    return () => {
      document.removeEventListener("keydown", aufTaste);
      root?.removeAttribute("inert");
      document.body.style.overflow = overflow;
      if (vorher && document.contains(vorher)) vorher.focus();
    };
  }, [offen]);

  if (!sichtbar) return null;

  const anzahlText = produkte.length === 1 ? "1 Produkt im Abo" : `${produkte.length} Produkte im Abo`;

  return (
    <>
      {createPortal(
        <div
          ref={leiste}
          data-abo-leiste=""
          inert={offen}
          aria-hidden={offen || undefined}
          style={{ bottom: cookie, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          className={cn("fixed inset-x-0 z-40 px-3 pointer-events-none", offen && "invisible")}
        >
          <div className="pointer-events-auto mx-auto w-full max-w-md">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOffen(true);
              }}
              aria-haspopup="dialog"
              aria-expanded={offen}
              aria-label={`${aboLeisteText(produkte.length, beitrag)}. Übersicht öffnen`}
              className="flex w-full items-center gap-3 rounded-2xl border border-primary/40 bg-white px-3 py-2 text-left text-night shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{anzahlText}</span>
                <span className="block text-xs font-medium text-neutral-600">{euro(beitrag)} / Monat</span>
              </span>
              <span className="inline-flex min-h-11 shrink-0 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-white">
                Ansehen
              </span>
            </button>
          </div>
        </div>,
        document.body,
      )}
      {offen && createPortal(
        <div
          ref={rahmen}
          className="fixed inset-0 z-[60] flex items-end justify-center"
          style={{ paddingBottom: cookie }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Schließen"
            onClick={() => setOffen(false)}
          />
          <div
            ref={dialog}
            id="abo-uebersicht"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titelId}
            tabIndex={-1}
            data-abo-blatt=""
            className="relative flex max-h-[min(78dvh,36rem)] w-full flex-col rounded-t-3xl border border-primary/30 bg-white text-night shadow-2xl outline-none lg:mb-4 lg:max-w-md lg:rounded-3xl"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            <div className="px-4 pt-2">
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-primary/40 lg:hidden" aria-hidden="true" />
              <div className="flex items-center justify-between gap-3 pb-2">
                <h2 id={titelId} className="font-display text-xl">Dein Abo</h2>
                <button
                  type="button"
                  onClick={() => setOffen(false)}
                  aria-label="Abo-Übersicht schließen"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
            <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 pb-2">
              {produkte.map((p, i) => {
                const id = str(p.id);
                const titel = titelVon(p);
                const detail = detailVon(p);
                const zeile = gesamt?.zeilen[i];
                const ab = p.ab ? "ab " : "";
                return (
                  <li key={id || titel} className="flex items-center gap-3 rounded-xl bg-[#FAF9F7] p-2.5">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white">
                      {str(p.bild) && <img src={str(p.bild)} alt="" className="h-full w-full object-contain" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p lang="de" className="produkt-titel">{titel}</p>
                      {detail && <p className="text-[11px] leading-tight text-neutral-600">{detail}</p>}
                      {zeile && (
                        <p className="text-[11px] leading-snug text-neutral-600">
                          {ab}Dein Preis {euro(zeile.mitglied)} · {p.rabatt} %
                        </p>
                      )}
                      <p className="text-sm font-semibold tabular-nums">
                        Abo {zeile ? euro(zeile.beitrag) : "–"} / Monat
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        aboPositionLoeschen(id);
                      }}
                      aria-label={`${titel} entfernen`}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-neutral-500 hover:bg-red-50 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-primary/20 px-4 py-3">
              <p className="text-sm text-neutral-600">Monatlich</p>
              <p data-abo-summe="" className="font-display text-3xl font-bold tabular-nums leading-none">
                {euro(beitrag)} <span className="text-base font-normal text-neutral-600">/ Monat</span>
              </p>
              <Link
                to="/mitgliedschaft"
                className="btn-outline mt-3 w-full text-sm"
                onClick={(e) => e.stopPropagation()}
              >
                Zur Mitgliedschaft
              </Link>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
