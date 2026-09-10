/**
 * Marke aus der Fahrgestellnummer ableiten (WMI = erste drei Zeichen).
 *
 * Der Zubehör-Katalog kennt längst nicht jede FIN. Der Hersteller-Katalog
 * dagegen löst sie selbst auf — er braucht nur den passenden Marken-Katalog.
 * Das WMI ist weltweit genormt und steht in jeder FIN an erster Stelle,
 * deshalb reicht es als Zuordnung völlig aus.
 */
const WMI: Record<string, string> = {
  // Volkswagen-Konzern
  WVW: "Volkswagen", WV1: "Volkswagen", WV2: "Volkswagen", WV3: "Volkswagen",
  "1VW": "Volkswagen", "3VW": "Volkswagen", "9BW": "Volkswagen", AAV: "Volkswagen",
  WAU: "Audi", WA1: "Audi", TRU: "Audi", "93U": "Audi",
  TMB: "Skoda", TMP: "Skoda",
  VSS: "Seat", VSZ: "Seat",
  WP0: "Porsche", WP1: "Porsche",
  // BMW
  WBA: "BMW", WBS: "BMW", WBY: "BMW", WBX: "BMW", "4US": "BMW", "5UX": "BMW", "5YM": "BMW",
  WMW: "Mini", WMX: "Mini",
  WB1: "BMW Motorrad", WB0: "BMW Motorrad",
  // Mercedes
  WDB: "Mercedes-Benz", WDD: "Mercedes-Benz", WDC: "Mercedes-Benz", WDF: "Mercedes-Benz",
  W1K: "Mercedes-Benz", W1N: "Mercedes-Benz", W1V: "Mercedes-Benz", "4JG": "Mercedes-Benz",
  WME: "Smart", WMF: "Smart",
  // Opel / Vauxhall
  W0L: "Opel", W0V: "Opel", VXK: "Vauxhall", SED: "Opel",
  // Ford
  WF0: "Ford", WF1: "Ford", "1FA": "Ford", "1FM": "Ford", "3FA": "Ford", MAJ: "Ford",
  // PSA / Stellantis
  VF1: "Renault", VF2: "Renault", VF3: "Peugeot", VF7: "Citroen PSA", VR1: "DS Automobiles",
  VR3: "Peugeot", VR7: "Citroen PSA", VXE: "Opel (PSA)", W0U: "Opel (PSA)",
  UU1: "Dacia", UU2: "Dacia", VNV: "Dacia",
  // Fiat-Gruppe
  ZFA: "Fiat", ZFC: "Fiat Professional", ZAR: "Alfa Romeo", ZLA: "Lancia",
  "1C4": "Jeep", "3C4": "Jeep", "1J4": "Jeep",
  // Nordeuropa / GB
  YV1: "Volvo", YV4: "Volvo", "7JR": "Volvo", LVY: "Volvo",
  SAL: "Land Rover", SAJ: "Jaguar", SCA: "Rolls-Royce", SCB: "Rolls-Royce",
  YS3: "Saab",
  // Asien
  JMZ: "Mazda", JM1: "Mazda", "1YV": "Mazda",
  SJN: "Nissan", JN1: "Nissan", VSK: "Nissan", VWA: "Nissan",
  SHH: "Honda", JHM: "Honda", "1HG": "Honda",
  JT1: "Toyota", JT2: "Toyota", JTD: "Toyota", JTE: "Toyota", JTM: "Toyota",
  VNK: "Toyota", SB1: "Toyota", "5TD": "Toyota",
  JTH: "Lexus", JTJ: "Lexus",
  KNA: "Kia", KNB: "Kia", KND: "Kia", KNE: "Kia", U5Y: "Kia", "3KP": "Kia",
  KMH: "Hyundai", KM8: "Hyundai", TMA: "Hyundai", NLH: "Hyundai", "5NM": "Hyundai", "5NP": "Hyundai",
  TSM: "Suzuki", JS2: "Suzuki", JS3: "Suzuki",
  JF1: "Subaru", JF2: "Subaru",
  JMB: "Mitsubishi", JA3: "Mitsubishi", "4A3": "Mitsubishi",
  JNK: "Infiniti", JN8: "Infiniti",
  KL1: "Chevrolet", KL5: "Chevrolet", "1G1": "Chevrolet", "2G1": "Chevrolet",
  KLA: "Daewoo", KLY: "Daewoo",
  KPB: "SsangYong", KPT: "SsangYong",
  JAA: "Isuzu", JAL: "Isuzu",
};

/** Marke zur FIN, oder `undefined` wenn das Präfix unbekannt ist. */
export function brandFromVin(vin: string): string | undefined {
  const v = (vin || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (v.length < 3) return undefined;
  return WMI[v.slice(0, 3)];
}
