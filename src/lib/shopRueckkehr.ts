import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { shopZustandLesen, shopZustandSchreiben } from "../../shared/shop-zustand.js";

/**
 * Merkt Pfad, Query (Marke, Sortierung, …) und Scroll der aktuellen
 * Shop- oder Kategorieseite. Beim Zurück aus der Produktseite stellt die
 * Seite die Scrollposition wieder her, sobald `bereit` ist.
 */
export function useShopKontextMerken(bereit = true) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const rueckkehr = useRef<boolean | null>(null);
  const scrollZiel = useRef(0);

  if (rueckkehr.current === null) {
    const gespeichert = shopZustandLesen();
    const zurueckNav = navigationType === "POP"
      || Boolean((location.state as { shopZurueck?: boolean } | null)?.shopZurueck);
    const gleicheAdresse = Boolean(
      gespeichert
      && gespeichert.pathname === location.pathname
      && gespeichert.search === (location.search || ""),
    );
    rueckkehr.current = zurueckNav && gleicheAdresse;
    scrollZiel.current = rueckkehr.current ? gespeichert?.scroll || 0 : 0;
  }

  useLayoutEffect(() => {
    if (!rueckkehr.current) return;
    window.scrollTo({ top: scrollZiel.current, left: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    shopZustandSchreiben({
      pathname: location.pathname,
      search: location.search,
      scroll: rueckkehr.current ? scrollZiel.current : window.scrollY,
    });
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!rueckkehr.current || !bereit) return;
    const y = scrollZiel.current;
    rueckkehr.current = false;
    const id = window.setTimeout(() => {
      window.scrollTo({ top: y, left: 0, behavior: "instant" });
    }, 50);
    return () => window.clearTimeout(id);
  }, [bereit]);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (rueckkehr.current) return;
        shopZustandSchreiben({
          pathname: location.pathname,
          search: location.search,
          scroll: window.scrollY,
        });
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [location.pathname, location.search]);
}
