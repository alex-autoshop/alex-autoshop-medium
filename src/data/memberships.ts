export interface MembershipLevel {
  level: number;
  name: string;
  pricePerMonth: number;
  originalPrice?: number; // durchgestrichener Originalpreis
  discountPercent: number;
  tagline: string;
  modules: string[];
  defaultModules?: string[]; // welche Module per default aktiv sind
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
    defaultModules: ["Lackfarben", "Lackmaterial"],
    savingsExample: 467,
    features: [
      "Gratis Farbe: 250 ml / Monat",
      "Farbfehlerschutz: bis 2 L / Monat",
      "Expresslieferung: unbegrenzt",
      "Willkommensgeschenk: 50 €",
      "Preisgarantie: Dein Einkaufspreis steigt nie — auch wenn wir Grundpreise erhöhen",
      "Mitgliedspreise im Shop sichtbar",
      "7 % Cashback ab 500 € Teileumsatz / Monat",
    ],
  },
  {
    level: 2,
    name: "Level 2",
    pricePerMonth: 228,
    discountPercent: 28,
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
      "Preisgarantie: Dein Einkaufspreis steigt nie — auch wenn wir Grundpreise erhöhen",
      "Im Alex-Netzwerk gelistet: Kratzer- & Lackschaden-Kunden werden direkt an dich vermittelt",
      "8,5 % Cashback ab 1.200 € Teileumsatz / Monat",
    ],
  },
  {
    level: 3,
    name: "Level 3",
    pricePerMonth: 430,
    originalPrice: 555,
    discountPercent: 40,
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
      "Preisgarantie: Dein Einkaufspreis steigt nie — auch wenn wir Grundpreise erhöhen",
      "Bevorzugte Auftragsbearbeitung",
      "12,5 % Cashback ab 2.500 € Teileumsatz / Monat",
    ],
  },
];
