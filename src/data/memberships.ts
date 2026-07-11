export interface Feature {
  label: string;
  info?: string;
}

export interface MembershipLevel {
  level: number;
  name: string;
  pricePerMonth: number;
  originalPrice?: number;
  discountPercent: number;
  basePrice: number;         // Preis wenn 0 Module aktiv
  baseDiscountPercent: number; // Rabatt wenn 0 Module aktiv (10/20/30%)
  tagline: string;
  modules: string[];
  defaultModules?: string[];
  features: Feature[];
  savingsExample: number;
  highlight?: boolean;
  badge?: string;
}

export function discountForLevel(level: number | undefined): number {
  const m = MEMBERSHIP_LEVELS.find((x) => x.level === level);
  return m ? m.discountPercent : 0;
}


export const MEMBERSHIP_MODULE_KEYS = ["Autoteile", "Lackfarben", "Lackmaterial"] as const;
export type MembershipModule = typeof MEMBERSHIP_MODULE_KEYS[number];

/** Gibt den Rabatt zurück NUR wenn das Modul für den User freigeschaltet ist */
export function discountForModule(
  level: number | undefined,
  modules: string[],
  module: MembershipModule
): number {
  if (!modules.includes(module)) return 0;
  const m = MEMBERSHIP_LEVELS.find((x) => x.level === level);
  return m ? m.discountPercent : 0;
}

/** Gibt alle aktiven Rabatte als Map zurück */
export function moduleDiscounts(
  level: number | undefined,
  modules: string[]
): Record<MembershipModule, number> {
  const pct = MEMBERSHIP_LEVELS.find((x) => x.level === level)?.discountPercent ?? 0;
  return {
    Autoteile: modules.includes("Autoteile") ? pct : 0,
    Lackfarben: modules.includes("Lackfarben") ? pct : 0,
    Lackmaterial: modules.includes("Lackmaterial") ? pct : 0,
  };
}

export const MEMBERSHIP_MODULES = ["Autoteile", "Lackfarben", "Lackmaterial"];

export const MEMBERSHIP_LEVELS: MembershipLevel[] = [
  {
    level: 1,
    name: "Level 1",
    pricePerMonth: 49,
    discountPercent: 15,
    basePrice: 19,
    baseDiscountPercent: 10,
    tagline: "Für Aufbereiter & kleine Werkstätten — clever ab Tag 1",
    modules: ["Autoteile", "Lackfarben", "Lackmaterial"],
    defaultModules: ["Lackfarben", "Lackmaterial"],
    savingsExample: 467,
    features: [
      {
        label: "Gratis Farbe 250 ml / Monat",
        info: "Monatlich gratis: 1 Dose Wunschfarbe bis 250 ml — kein Aufpreis, direkt mit der nächsten Bestellung.",
      },
      {
        label: "Farbfehlerschutz bis 2 L / Monat",
        info: "Farbe falsch gewählt oder falsch angemischt? Wir mischen erneut — auf unsere Kosten. Gilt für bis zu 2 L pro Monat.",
      },
      {
        label: "NRW Tageslieferung bis 14:00 Uhr",
        info: "3 Touren täglich durch NRW (8:00, 11:00, 14:00 Uhr). Als Mitglied kannst du bis 14:00 Uhr bestellen und bekommst noch heute deine Ware.",
      },
      {
        label: "Wuppertal-Express in ~1 h",
        info: "Im Raum Wuppertal liefern wir innerhalb von ca. 1 Stunde — wie Lieferando, aber für Lack & Teile. Mitglieder bestellen bis 17:30 Uhr (Nicht-Mitglieder bis 16:00).",
      },
      {
        label: "Willkommensgeschenk 50 €",
        info: "Einmalig beim Start deiner Mitgliedschaft: 50 € Guthaben auf deine erste Bestellung.",
      },
      {
        label: "Preisschutz ab Mitgliedschaftsstart",
        info: "Ab dem ersten Tag deiner Mitgliedschaft sind deine Preise für immer eingefroren — egal was passiert. Steigen unsere Grundpreise für alle anderen, zahlst du weiterhin denselben Preis wie beim Start.",
      },
      {
        label: "7 % Cashback ab 500 € Teileumsatz",
        info: "Erreichst du im Monat mind. 500 € Umsatz über das Teileportal, bekommst du 7 % zurück als Guthaben für deine nächste Bestellung.",
      },
    ],
  },
  {
    level: 2,
    name: "Level 2",
    pricePerMonth: 228,
    discountPercent: 28,
    basePrice: 69,
    baseDiscountPercent: 15,
    tagline: "Der Bestseller für aktive Werkstätten",
    highlight: true,
    badge: "Beste Wahl",
    modules: ["Autoteile", "Lackfarben", "Lackmaterial"],
    savingsExample: 2347,
    features: [
      {
        label: "Gratis Farbe 1 L / Monat",
        info: "Monatlich gratis: 1 L Wunschfarbe deiner Wahl — einfach bei der Bestellung angeben.",
      },
      {
        label: "Farbfehlerschutz bis 4 L / Monat",
        info: "Farbe falsch gewählt oder falsch angemischt? Wir mischen erneut — auf unsere Kosten. Gilt für bis zu 4 L pro Monat.",
      },
      {
        label: "NRW Tageslieferung bis 14:00 Uhr",
        info: "3 Touren täglich durch NRW (8:00, 11:00, 14:00 Uhr). Als Mitglied kannst du bis 14:00 Uhr bestellen und bekommst noch heute deine Ware.",
      },
      {
        label: "Wuppertal-Express in ~1 h",
        info: "Im Raum Wuppertal liefern wir innerhalb von ca. 1 Stunde — wie Lieferando, aber für Lack & Teile. Mitglieder bestellen bis 17:30 Uhr (Nicht-Mitglieder bis 16:00).",
      },
      {
        label: "Willkommensgeschenk 250 €",
        info: "Einmalig beim Start: 250 € Guthaben auf deine erste Bestellung als Mitglied.",
      },
      {
        label: "Preisschutz ab Mitgliedschaftsstart",
        info: "Ab dem ersten Tag deiner Mitgliedschaft sind deine Preise für immer eingefroren — egal was passiert. Steigen unsere Grundpreise für alle anderen, zahlst du weiterhin denselben Preis wie beim Start.",
      },
      {
        label: "Kundenvermittlung: Kratzer & Lackschäden",
        info: "Du wirst im Alex-Netzwerk als Partnerwerkstatt gelistet. Kunden die bei uns nach Hilfe für Kratzer oder Lackschäden fragen, werden direkt an dich weitervermittelt.",
      },
      {
        label: "8,5 % Cashback ab 1.200 € Teileumsatz",
        info: "Erreichst du im Monat mind. 1.200 € Umsatz über das Teileportal, bekommst du 8,5 % zurück als Guthaben.",
      },
    ],
  },
  {
    level: 3,
    name: "Level 3",
    pricePerMonth: 430,
    originalPrice: 555,
    discountPercent: 40,
    basePrice: 149,
    baseDiscountPercent: 20,
    tagline: "Höchstrabatt & VIP-Service für Lackier- & Karosseriebetriebe",
    badge: "Premium",
    modules: ["Autoteile", "Lackfarben", "Lackmaterial"],
    savingsExample: 5930,
    features: [
      {
        label: "Gratis Farbe 2 L / Monat",
        info: "Monatlich gratis: 2 L Wunschfarbe — inklusive Sondermischungen auf Anfrage.",
      },
      {
        label: "Farbfehlerschutz unbegrenzt",
        info: "Farbe falsch gewählt oder falsch angemischt? Wir mischen erneut — auf unsere Kosten. Ohne mengenmäßiges Limit.",
      },
      {
        label: "NRW Tageslieferung bis 14:00 Uhr (Priorität)",
        info: "3 Touren täglich durch NRW (8:00, 11:00, 14:00 Uhr). Level-3-Mitglieder werden bei der Tourenplanung bevorzugt behandelt.",
      },
      {
        label: "Wuppertal-Express in ~1 h",
        info: "Im Raum Wuppertal liefern wir innerhalb von ca. 1 Stunde. Mitglieder bestellen bis 17:30 Uhr (Nicht-Mitglieder bis 16:00).",
      },
      {
        label: "Willkommensgeschenk 500 €",
        info: "Einmalig beim Start: 500 € Guthaben auf deine erste Bestellung als Premium-Mitglied.",
      },
      {
        label: "Preisschutz ab Mitgliedschaftsstart",
        info: "Ab dem ersten Tag deiner Mitgliedschaft sind deine Preise für immer eingefroren — egal was passiert. Steigen unsere Grundpreise für alle anderen, zahlst du weiterhin denselben Preis wie beim Start.",
      },
      {
        label: "Bevorzugte Auftragsbearbeitung",
        info: "Deine Bestellungen werden intern priorisiert — kürzere Wartezeit, direkte Bearbeitung durch unser Team.",
      },
      {
        label: "12,5 % Cashback ab 2.500 € Teileumsatz",
        info: "Erreichst du im Monat mind. 2.500 € Umsatz über das Teileportal, bekommst du 12,5 % zurück als Guthaben.",
      },
    ],
  },
];
