/**
 * Lieferzeiten je Produkt.
 *
 * Regeln werden der Reihe nach geprueft — die erste passende gewinnt,
 * sonst gilt DEFAULT_DELIVERY. Geprueft wird gegen Titel, Vendor und Handle,
 * genau wie bei der Markenerkennung in Shop.tsx (der Shopify-`vendor` ist bei
 * uns nur der Lieferant, die echte Marke steht im Titel).
 *
 * Neue Marke mit abweichender Lieferzeit? Einfach eine Zeile in
 * DELIVERY_RULES ergaenzen — sonst muss nichts angefasst werden.
 */

export interface DeliveryTime {
  minDays: number;
  maxDays: number;
  /** z. B. "1-2 Werktage" */
  label: string;
}

function days(minDays: number, maxDays: number): DeliveryTime {
  const label =
    minDays === maxDays
      ? `${minDays} Werktag${minDays === 1 ? "" : "e"}`
      : `${minDays}–${maxDays} Werktage`;
  return { minDays, maxDays, label };
}

/** Standard fuer alles, was keine eigene Regel hat. */
export const DEFAULT_DELIVERY = days(1, 2);

const DELIVERY_RULES: Array<{ match: RegExp; delivery: DeliveryTime }> = [
  // Glasurit kommt ueber DS Color — laengere Beschaffung
  { match: /\bglasurit\b/i, delivery: days(1, 4) },
];

export interface DeliveryNode {
  title?: string;
  handle?: string;
  vendor?: string;
}

export function deliveryFor(node: DeliveryNode | undefined | null): DeliveryTime {
  if (!node) return DEFAULT_DELIVERY;
  const haystack = [
    node.title ?? "",
    node.vendor ?? "",
    (node.handle ?? "").replace(/-/g, " "),
  ];
  const hit = DELIVERY_RULES.find((r) => haystack.some((h) => r.match.test(h)));
  return hit?.delivery ?? DEFAULT_DELIVERY;
}
