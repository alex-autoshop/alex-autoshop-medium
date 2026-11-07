/**
 * Voraussichtliche Lieferzeit aus den Feldern custom.lieferzeit_min und
 * custom.lieferzeit_max (Werktage). Eine Variante geht vor dem Produkt.
 * Fehlt die Angabe, gelten 2–3 Werktage.
 */

import {
  laengsteLieferzeit,
  lieferzeitenVerschieden,
  lieferzeitText,
  lieferzeitWaehlen,
} from "../../shared/lieferzeit.js";

export interface DeliveryTime {
  minDays: number;
  maxDays: number;
  /** z. B. "2–3 Werktage" */
  label: string;
}

export interface Lieferfeld {
  key?: string;
  value?: string | null;
}

export interface DeliveryNode {
  title?: string;
  handle?: string;
  vendor?: string;
  lieferzeit?: Array<Lieferfeld | null> | null;
}

function ausSpan(spanne: { min: number; max: number }): DeliveryTime {
  return { minDays: spanne.min, maxDays: spanne.max, label: lieferzeitText(spanne) };
}

export const DEFAULT_DELIVERY = ausSpan({ min: 2, max: 3 });

export function deliveryFor(
  node: DeliveryNode | undefined | null,
  variant?: DeliveryNode | null
): DeliveryTime {
  return ausSpan(lieferzeitWaehlen(node?.lieferzeit, variant?.lieferzeit));
}

/** Eine Zeit für den ganzen Warenkorb: das höchste Minimum und das höchste Maximum. */
export function deliveryForCart(zeiten: DeliveryTime[]): { zeit: DeliveryTime; verschieden: boolean } {
  const spannen = zeiten.map((z) => ({ min: z.minDays, max: z.maxDays }));
  return {
    zeit: ausSpan(laengsteLieferzeit(spannen)),
    verschieden: lieferzeitenVerschieden(spannen),
  };
}
