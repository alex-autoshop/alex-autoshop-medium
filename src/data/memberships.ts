export interface MembershipLevel {
  level: number;
  name: string;
  pricePerMonth: number;
  discountPercent: number;
  tagline: string;
  features: string[];
  highlight?: boolean;
}

export const MEMBERSHIP_LEVELS: MembershipLevel[] = [
  {
    level: 1,
    name: "Level 1",
    pricePerMonth: 49,
    discountPercent: 15,
    tagline: "Für Aufbereiter & kleine Betriebe",
    features: [
      "15% Rabatt auf das gesamte Sortiment",
      "Bevorzugte Abholung im Laden",
      "Persönliche Produktberatung",
      "Monatlich kündbar",
    ],
  },
  {
    level: 2,
    name: "Level 2",
    pricePerMonth: 165,
    discountPercent: 33,
    tagline: "Für Werkstätten mit regelmäßigem Bedarf",
    highlight: true,
    features: [
      "33% Rabatt auf das gesamte Sortiment",
      "Prioritäts-Bestellung bei Lieferanten",
      "Wunschfarben-Mischservice bevorzugt",
      "Persönlicher Ansprechpartner",
      "Monatlich kündbar",
    ],
  },
  {
    level: 3,
    name: "Level 3",
    pricePerMonth: 425,
    discountPercent: 46,
    tagline: "Für Lackier- & Karosseriebetriebe",
    features: [
      "46% Rabatt auf das gesamte Sortiment",
      "Großmengen-Konditionen",
      "Express-Beschaffung von Sonderbestellungen",
      "Direkter Draht zu Alex",
      "Monatlich kündbar",
    ],
  },
];
