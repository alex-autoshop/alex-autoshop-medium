export interface Brand {
  name: string;
  logo: string;
}

// Reihenfolge: gewünschte Hauptmarken zuerst, danach weitere vorhandene Marken zum Auffüllen.
// Fehlende Logos (friz, troton, mirka, petec, holts, kovax, tesa) werden ergänzt,
// sobald die Logodateien in public/images/brands/ liegen.
export const BRANDS: Brand[] = [
  // --- Wunschmarken (Logo vorhanden) ---
  { name: "Standox", logo: "/images/brands/standox.png" },
  { name: "Mipa", logo: "/images/brands/mipa.png" },
  { name: "Glasurit", logo: "/images/brands/glasurit.png" },
  { name: "Indasa", logo: "/images/brands/indasa.png" },
  { name: "Liqui Moly", logo: "/images/brands/liqui-moly.png" },
  { name: "Castrol", logo: "/images/brands/castrol.png" },
  { name: "Rupes", logo: "/images/brands/rupes.png" },
  { name: "SATA", logo: "/images/brands/sata.png" },
  { name: "Colad", logo: "/images/brands/colad.png" },
  { name: "Sonax", logo: "/images/brands/sonax.png" },

  // --- Weitere Marken zum Auffüllen (Logo vorhanden) ---
  { name: "3M", logo: "/images/brands/3m.png" },
  { name: "Bosch", logo: "/images/brands/bosch.png" },
  { name: "Spies Hecker", logo: "/images/brands/spies-hecker.png" },
  { name: "PPG", logo: "/images/brands/ppg.png" },
  { name: "Lechler", logo: "/images/brands/lechler.png" },
  { name: "Koch-Chemie", logo: "/images/brands/kochchemie.png" },
  { name: "Meguiar's", logo: "/images/brands/meguiars.png" },
  { name: "Menzerna", logo: "/images/brands/menzerna.png" },
  { name: "Sagola", logo: "/images/brands/sagola.png" },
  { name: "DeVilbiss", logo: "/images/brands/devilbiss.png" },
  { name: "Finixa", logo: "/images/brands/finix.png" },
  { name: "Novol", logo: "/images/brands/novol.png" },
  { name: "U-POL", logo: "/images/brands/upol.png" },
  { name: "febi", logo: "/images/brands/febi.png" },
];
