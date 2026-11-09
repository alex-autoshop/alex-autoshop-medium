import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import {
  eintragNormalisieren,
  listeBeimProdukt,
  leseListen,
  listenSchreiben,
  type ListenEintrag,
} from "../../shared/listen-zustand.js";

if (typeof history !== "undefined" && "scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

type ZusatzLeser = () => unknown;

const ListenCtx = createContext<{
  merken: (handle: string) => void;
  rueckkehr: ListenEintrag | null;
  zusatz: { current: ZusatzLeser | null };
}>({
  merken: () => {},
  rueckkehr: null,
  zusatz: { current: null },
});

export function useListenMerken() {
  return useContext(ListenCtx).merken;
}

export function useListenRueckkehr() {
  return useContext(ListenCtx).rueckkehr;
}

/** Mitgliedschaft legt hier Kategorie, Suche, Marke und geladene Reihen ab. */
export function useListenZusatz(lese: ZusatzLeser) {
  const ctx = useContext(ListenCtx);
  ctx.zusatz.current = lese;
}

function sprung(y: number) {
  const top = Math.max(0, Math.round(y));
  document.documentElement.scrollTop = top;
  document.body.scrollTop = top;
}

function kopfHoehe() {
  const gemessen = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--shop-kopf"));
  if (Number.isFinite(gemessen) && gemessen > 0) return gemessen;
  const kopf = document.querySelector("header");
  return kopf ? kopf.getBoundingClientRect().height : 72;
}

function karteFinden(handle: string) {
  if (!handle || typeof document === "undefined") return null;
  const selector = typeof CSS !== "undefined" && CSS.escape
    ? `[data-produkt="${CSS.escape(handle)}"]`
    : `[data-produkt="${handle}"]`;
  const el = document.querySelector(selector);
  return el instanceof HTMLElement ? el : null;
}

function stempel(eintrag: ListenEintrag) {
  const state = window.history.state;
  if (!state || typeof state !== "object") return;
  try {
    const usr = state.usr && typeof state.usr === "object" ? state.usr : {};
    window.history.replaceState({ ...state, usr: { ...usr, liste: eintrag } }, "");
  } catch { /* ältere Browser */ }
}

/**
 * Umschließt eine Produktliste. Merkt beim Produktklick den Stand und stellt
 * ihn beim Zurückkommen wieder her, sobald die Karten im DOM stehen.
 */
export function ListenRahmen({
  label,
  seite = 1,
  bereit = true,
  children,
}: {
  label: string;
  seite?: number;
  bereit?: boolean;
  children: ReactNode;
}) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const zusatz = useRef<ZusatzLeser | null>(null);
  const angewandt = useRef("");
  const lauf = useRef(0);
  const labelRef = useRef(label);
  const seiteRef = useRef(seite);
  const bereitRef = useRef(bereit);
  labelRef.current = label;
  seiteRef.current = seite;
  bereitRef.current = bereit;
  const rueckId = `${location.key}|${location.pathname}|${location.search}|${navigationType}`;
  const shopZurueck = Boolean((location.state as { shopZurueck?: boolean } | null)?.shopZurueck);
  const rueckkehr = useMemo(() => {
    if (navigationType !== "POP" && !shopZurueck) return null;
    const liste = (location.state as { liste?: unknown } | null)?.liste;
    return leseListen(location.pathname, location.search) || eintragNormalisieren(liste);
    // location.state nur über shopZurueck/key, sonst neue Objektidentität bei jedem Render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigationType, shopZurueck, location.pathname, location.search, location.key]);

  const merken = useCallback((handle: string) => {
    const extra = zusatz.current?.();
    const eintrag = listeBeimProdukt({
      pathname: window.location.pathname,
      search: window.location.search,
      scroll: window.scrollY,
      seite: seiteRef.current,
      label: labelRef.current,
      handle,
      historyLength: window.history.length,
      zusatz: extra || undefined,
    });
    if (eintrag) stempel(eintrag);
  }, []);

  const api = useMemo(() => ({ merken, rueckkehr, zusatz }), [merken, rueckkehr]);

  useLayoutEffect(() => {
    if (!rueckkehr || angewandt.current === rueckId) return;
    const snap = rueckkehr;
    const gen = ++lauf.current;
    let versuch = 0;
    let timer = 0;
    let wegTimer = 0;
    const lebendig = () => lauf.current === gen;
    const los = () => {
      if (!lebendig()) return;
      const karte = karteFinden(snap.handle);
      const wartetAufKarte = Boolean(snap.handle) && !karte;
      const wartetAufDaten = !bereitRef.current;
      const hoch = document.documentElement.scrollHeight - window.innerHeight >= snap.scroll - 80;
      if ((wartetAufDaten || wartetAufKarte || (snap.scroll > 0 && !hoch)) && versuch < 100) {
        versuch += 1;
        timer = window.setTimeout(los, 50);
        return;
      }
      angewandt.current = rueckId;
      const setzen = () => {
        if (!lebendig()) return;
        // Zwischenzeitlich eine Produktseite geöffnet: deren Anfang nicht
        // mit dem Listen-Offset überschreiben.
        if (window.location.pathname !== snap.pathname) return;
        const el = karteFinden(snap.handle);
        if (el) {
          const kopf = kopfHoehe();
          const ziel = el.getBoundingClientRect().top + window.scrollY - kopf - 12;
          sprung(ziel);
          el.classList.add("aa-zurueck");
          window.clearTimeout(wegTimer);
          wegTimer = window.setTimeout(() => el.classList.remove("aa-zurueck"), 1700);
          return;
        }
        sprung(snap.scroll);
      };
      setzen();
      requestAnimationFrame(() => requestAnimationFrame(setzen));
    };
    los();
    return () => {
      lauf.current += 1;
      window.clearTimeout(timer);
    };
  }, [rueckkehr, rueckId]);

  useEffect(() => {
    let timer = 0;
    const speichern = () => {
      if (window.location.pathname !== location.pathname) return;
      if ((window.location.search || "") !== (location.search || "")) return;
      // Wiederherstellen läuft noch: ein Scroll bei 0 darf den gemerkten Stand nicht löschen.
      if (rueckkehr && angewandt.current !== rueckId) return;
      const extra = zusatz.current?.();
      listenSchreiben({
        pathname: location.pathname,
        search: location.search,
        scroll: window.scrollY,
        seite,
        label,
        ...(extra ? { zusatz: extra } : {}),
      });
    };
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(speichern, 120);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [location.pathname, location.search, seite, label, rueckId, rueckkehr]);

  return <ListenCtx.Provider value={api}>{children}</ListenCtx.Provider>;
}
