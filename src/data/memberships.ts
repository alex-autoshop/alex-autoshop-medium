/** Optische Hervorhebung besonderer Leistungen in der Vorteilsliste. */
export type FeatureAccent = "emergency" | "detailing" | "hotline";

export interface Feature {
  label: string;
  info?: string;
  /** Hebt die Zeile farbig hervor (Notfall / Aufbereitung / Hotline). */
  accent?: FeatureAccent;
  /** Kleines Label rechts, z.B. "NEU". */
  badge?: string;
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
  /** Einzelpreise je Modul (Autoteile günstigst, Lackmaterial mittig, Lackfarben teuerst) */
  modulePrices: Record<string, number>;
  /** Monatlicher Abzug wenn das Mitglied die Gratis-Farbe abwählt (nur möglich wenn kein Lack-Modul aktiv) */
  freePaintValue: number;
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
    // Autoteile günstigst · Lackmaterial mittig · Lackfarben teuerst → Summe = 49 - 19 = 30 €
    modulePrices: { Autoteile: 8, Lackmaterial: 10, Lackfarben: 12 },
    freePaintValue: 6,
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
        label: "Notfallbeschaffung in ~3 h",
        accent: "emergency",
        badge: "NEU",
        info: "Mitten im Auftrag fehlt ein Teil oder das Lackmaterial ist leer? Wir beschaffen es und liefern im Raum Wuppertal (ca. 30 km) innerhalb von etwa 3 Stunden — auch wenn wir es selbst erst besorgen müssen. In Level 1 mit Eilzuschlag von 29 € pro Einsatz, Mo–Sa während der Öffnungszeiten.",
      },
      {
        label: "Fahrzeugaufbereitung zum Mitgliedspreis (−10 %)",
        accent: "detailing",
        badge: "NEU",
        info: "Aufbereitung in unserer Werkstatt zum Mitgliedspreis: 10 % Nachlass auf alle Aufbereitungspakete, 1 Fahrzeug pro Monat, Fertigstellung in der Regel innerhalb von 72 Stunden. An- und Abgabe bei uns in Wuppertal. Die Aufbereitung wird separat berechnet — die Mitgliedschaft sichert dir den Preis und den Platz.",
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
        info: "Erreichst du im Monat mind. 500 € Umsatz über das Teilebörse, bekommst du 7 % zurück als Guthaben für deine nächste Bestellung. ⚡ Früheinsteiger-Konditionen: Da das Mitgliedschaftsprogramm neu ist, starten wir mit niedrigen Einstiegsschwellen. Ab 2027 werden die Mindest­umsätze angehoben — wer jetzt einsteigt, sichert sich dauerhaft die aktuellen Konditionen.",
      },
    ],
  },
  {
    level: 2,
    name: "Level 2",
    pricePerMonth: 228,
    discountPercent: 28,
    basePrice: 49,
    baseDiscountPercent: 15,
    tagline: "Der Bestseller für aktive Werkstätten",
    highlight: true,
    badge: "Beste Wahl",
    modules: ["Autoteile", "Lackfarben", "Lackmaterial"],
    // Autoteile günstigst · Lackmaterial mittig · Lackfarben teuerst → Summe = 228 - 49 = 179 €
    modulePrices: { Autoteile: 7, Lackmaterial: 80, Lackfarben: 92 },
    freePaintValue: 15,
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
        label: "Notfallbeschaffung in ~2 h · 2× / Monat ohne Zuschlag",
        accent: "emergency",
        badge: "NEU",
        info: "Teil oder Lackmaterial fehlt akut? Wir beschaffen und liefern im Raum Wuppertal innerhalb von etwa 2 Stunden. Zweimal pro Monat ohne Eilzuschlag, danach nur 15 € pro Einsatz. Mo–Sa bis 20:00 Uhr erreichbar.",
      },
      {
        label: "Aufbereitungs-Paket: 8 Fahrzeuge / Monat (−20 %)",
        accent: "detailing",
        badge: "NEU",
        info: "Fester Aufbereitungs-Platz für bis zu 8 Fahrzeuge im Monat, 20 % Nachlass auf alle Pakete und Fertigstellung innerhalb von 48 Stunden. Abholung im Raum Wuppertal kostenlos. Gedacht für Händler und Werkstätten mit regelmäßigem Zulauf. Die Aufbereitung selbst wird separat berechnet — die Mitgliedschaft sichert dir Preis, Platz und Termin.",
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
        info: "Erreichst du im Monat mind. 1.200 € Umsatz über das Teilebörse, bekommst du 8,5 % zurück als Guthaben. ⚡ Früheinsteiger-Konditionen: Das Mitgliedschaftsprogramm ist neu — deshalb gelten aktuell noch niedrige Einstiegsschwellen. Ab 2027 werden die Mindest­umsätze für das Cashback angehoben. Wer jetzt Mitglied wird, behält die heutigen Bedingungen dauerhaft.",
      },
    ],
  },
  {
    level: 3,
    name: "Level 3",
    pricePerMonth: 430,
    originalPrice: 555,
    discountPercent: 40,
    basePrice: 89,
    baseDiscountPercent: 20,
    tagline: "Höchstrabatt & VIP-Service für Lackier- & Karosseriebetriebe",
    badge: "Premium",
    modules: ["Autoteile", "Lackfarben", "Lackmaterial"],
    // Autoteile günstigst · Lackmaterial mittig · Lackfarben teuerst → Summe = 430 - 89 = 341 €
    modulePrices: { Autoteile: 15, Lackmaterial: 145, Lackfarben: 181 },
    freePaintValue: 25,
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
        label: "Notfallbeschaffung in ~1 h · unbegrenzt, ohne Zuschlag",
        accent: "emergency",
        badge: "NEU",
        info: "Teil oder Lackmaterial fehlt akut? Wir beschaffen und liefern im Raum Wuppertal innerhalb von etwa 1 Stunde — unbegrenzt oft und ohne Eilzuschlag, 7 Tage die Woche, auch sonntags.",
      },
      {
        label: "Alex-Notfallnummer — 24/7, auch sonntags",
        accent: "hotline",
        badge: "NUR LEVEL 3",
        info: "Die direkte Handynummer von Alex persönlich. Anruf oder WhatsApp, rund um die Uhr, 7 Tage die Woche — auch sonntags und an Feiertagen. Kein Ticket, keine Warteschleife, kein Mitarbeiter dazwischen. Diese Nummer bekommst du ausschließlich als Level-3-Mitglied.",
      },
      {
        label: "Händler-Aufbereitung: 30 Fahrzeuge / Monat · 24-h-Garantie (−30 %)",
        accent: "detailing",
        badge: "NEU",
        info: "Für Händler: bis zu 30 Fahrzeuge im Monat, 30 % Nachlass auf alle Aufbereitungspakete — und eine echte Termingarantie. Auto kommt rein, nach 24 Stunden geht es verkaufsfertig wieder raus. Halten wir die 24 Stunden nicht ein, ist die Aufbereitung für dich kostenlos. Abholung und Rückführung NRW-weit inklusive. Die Aufbereitung wird separat berechnet — die Mitgliedschaft sichert dir Preis, Kapazität und Termingarantie.",
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
        info: "Erreichst du im Monat mind. 2.500 € Umsatz über das Teilebörse, bekommst du 12,5 % zurück als Guthaben. ⚡ Früheinsteiger-Konditionen: Da das Programm noch neu ist, bieten wir bewusst niedrige Einstiegsschwellen — als echten Mehrwert für frühe Mitglieder. Ab 2027 steigen die Mindest­umsätze. Level-3-Mitglieder die heute einsteigen, sind dauerhaft zu diesen Konditionen eingefroren.",
      },
    ],
  },
];
