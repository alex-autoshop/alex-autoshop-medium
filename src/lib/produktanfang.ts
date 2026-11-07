import { produktanfangZiel } from "../../shared/produktanfang.js";

export const PRODUKTLISTE_ID = "produktliste";

/** Kopf plus die mitlaufende Such- und Markenleiste. Die Höhe setzt der Shop als --shop-leiste. */
export const SHOP_LISTE_ABSTAND =
  "scroll-mt-[calc(5rem+env(safe-area-inset-top,0px)+var(--shop-leiste,8.5rem))] sm:scroll-mt-[calc(6rem+env(safe-area-inset-top,0px)+var(--shop-leiste,8.5rem))]";

/** Kategorieseite: die Chips kleben nicht, nur der Kopf. */
export const KATEGORIE_LISTE_ABSTAND =
  "scroll-mt-[calc(5rem+env(safe-area-inset-top,0px))] sm:scroll-mt-[calc(6rem+env(safe-area-inset-top,0px))]";

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
