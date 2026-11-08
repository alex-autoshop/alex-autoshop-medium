import { produktanfangZiel } from "../../shared/produktanfang.js";

export const PRODUKTLISTE_ID = "produktliste";

/** Kopf plus die mitlaufende Such- und Markenleiste. Der Shop misst beides. */
export const SHOP_LISTE_ABSTAND =
  "scroll-mt-[calc(var(--shop-kopf,8.75rem)+var(--shop-leiste,8.5rem))]";

/** Kategorieseite nutzt dieselbe mitlaufende Leiste wie der Shop. */
export const KATEGORIE_LISTE_ABSTAND = SHOP_LISTE_ABSTAND;

/** Sanft nach oben zum Listenanfang. Liegt der Anfang noch unter dem Sichtfeld, bleibt die Seite stehen. */
export function zumProduktanfang(el: HTMLElement | null) {
  if (!el || typeof window === "undefined") return;
  const abstand = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  const oben = el.getBoundingClientRect().top + window.scrollY;
  const ziel = produktanfangZiel(window.scrollY, oben, abstand);
  if (ziel === null) return;
  const reduziert = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: ziel, behavior: reduziert ? "auto" : "smooth" });
}
