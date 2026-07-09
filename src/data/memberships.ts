export interface MembershipLevel {
  level: number;
  name: string;
  pricePerMonth: number;
  discountPercent: number;
  tagline: string;
  modules: string[];
  features: string[];
  savingsExample: number; // beispielhafte Ersparnis €/Monat
  highlight?: boolean;
  badge?: string;
}

export function discountForLevel(level: number | undefined): number {
  const m = MEMBERSHIP_LEVELS.find((x) => x.level === level);
  return m ? m.discountPercent : 0;
}

export const MEMBERSHIP_MODULES = ["Autoteile", "Lackfarben", "Lackmaterial"];

export const MEMBERSHIP_LEVELS: MembershipLevel[] = [
  {
    level: 1,
    name: "Level 1",
    pricePerMonth: 49,
    discountPercent: 15,
    tagline: "Für Aufbereiter & kleine Werkstätten — clever ab Tag 1",
    modules: ["Autoteile", "Lackfarben", "Lackmaterial"],
    savingsExample: 467,
    features: [
      "Gratis Farbe: 250 ml / Monat",
      "Farbfehlerschutz: bis 2 L / Monat",
      "Expresslieferung: unbegrenzt",
      "Willkommensgeschenk: 50 €",
      "Jahresbonus: Geld-zurück-Garantie",
      "Blacklist-Preisschutz",
      "Mitgliedspreise im Shop sichtbar",
    ],
  },
  {
    level: 2,
    name: "Level 2",
    pricePerMonth: 224,
    discountPercent: 24,
    tagline: "Der Bestseller für aktive Werkstätten",
    highlight: true,
    badge: "Beste Wahl",
    modules: ["Autoteile", "Lackfarben", "Lackmaterial"],
    savingsExample: 2347,
    features: [
      "Gratis Farbe: 1 L / Monat",
      "Farbfehlerschutz: bis zu 4 L / Monat",
      "Expresslieferung: unbegrenzt",
      "Willkommensgeschenk: 250 €",
      "Jahresbonus: Geld-zurück-Garantie",
      "Blacklist-Preisschutz",
      "Bevorzugter Vermittlungspartner",
    ],
  },
  {
    level: 3,
    name: "Level 3",
    pricePerMonth: 338,
    discountPercent: 38,
    tagline: "Höchstrabatt & VIP-Service für Lackier- & Karosseriebetriebe",
    badge: "Premium",
    modules: ["Autoteile", "Lackfarben", "Lackmaterial"],
    savingsExample: 5930,
    features: [
      "Maximale Ersparnis",
      "Bester Schutz",
      "Höchste Priorität",
      "Gratis Farbe: 2 L / Monat",
      "Farbfehlerschutz: unbegrenzt",
      "Expresslieferung: unbegrenzt",
      "Willkommensgeschenk: 450 €",
      "Jahresbonus: Geld-zurück-Garantie",
      "Blacklist-Preisschutz",
      "Bevorzugte Auftragsbearbeitung",
    ],
  },
];
