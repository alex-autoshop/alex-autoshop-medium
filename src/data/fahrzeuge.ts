// Fahrzeugbestand Alex Autoshop — Stand: aus den Fahrzeug-Datenblättern übernommen.
// Eine Datei, eine Wahrheit: Bestandsliste und Detailseite lesen beide hier.
// Preise in Euro, Verhandlungsbasis. Fahrgestellnummern stehen bewusst NICHT hier
// (öffentliches Repo — eine FIN gehört nicht ins Netz).

export type Kraftstoff = "Benzin" | "Diesel" | "Elektro" | "Hybrid";
export type Getriebe = "Schaltgetriebe" | "Automatik";

export interface Fahrzeug {
  slug: string;
  marke: string;
  modell: string;
  variante: string;
  /** Überschrift auf Karte und Detailseite */
  titel: string;
  preis: number;
  km: number;
  /** MM/JJJJ */
  erstzulassung: string;
  kraftstoff: Kraftstoff;
  getriebe: Getriebe;
  kw?: number;
  ps?: number;
  hubraum?: number;
  zylinder?: number;
  tueren: number;
  sitze: number;
  /** z. B. "Euro 5", "4 (Grün)" */
  plakette?: string;
  /** MM/JJJJ, "neu" wenn frisch gemacht */
  tuev: string;
  garantieMonate?: number;
  ersteHand?: boolean;
  bauart: string;
  ausstattung: string[];
  zustand: string[];
  beschreibung: string;
  bild: string;
}

export const FAHRZEUGE: Fahrzeug[] = [
  {
    slug: "bmw-523-touring",
    marke: "BMW", modell: "523", variante: "Touring 3.0",
    titel: "BMW 523 Touring 3.0",
    preis: 10570, km: 183724, erstzulassung: "08/2011",
    kraftstoff: "Benzin", getriebe: "Automatik",
    kw: 150, ps: 204, hubraum: 2996, zylinder: 6, tueren: 5, sitze: 5,
    plakette: "4 (Grün)", tuev: "06/2028", garantieMonate: 12, bauart: "Kombi",
    ausstattung: ["Navigation","Klimaautomatik","Einparkhilfe vorne & hinten (PDC)","Elektrische Fensterheber","Elektrische Heckklappe","Elektrische Sitzeinstellung","Lederausstattung","Lederlenkrad","Sitzheizung","Tempomat","Bordcomputer","Radio / CD / MP3 / USB / Bluetooth","Regensensor","Lichtsensor","Multifunktionslenkrad","Leichtmetallfelgen","Nebelscheinwerfer","Zentralverriegelung mit Funkfernbedienung","ABS / ESP","Front-, Seiten- und Kopfairbags","ISOFIX","Servolenkung"],
    zustand: ["Technisch einwandfrei","Sehr gepflegter Zustand","Nichtraucherfahrzeug","Inspektion vor Übergabe neu"],
    beschreibung: "BMW 523 Touring mit 204 PS, Automatik und umfangreicher Ausstattung. Sehr gepflegt, technisch einwandfrei und sofort fahrbereit. Die Inspektion wird vor der Übergabe neu gemacht.",
    bild: "/fahrzeuge/bmw-523-touring.jpg",
  },
  {
    slug: "bmw-316-touring",
    marke: "BMW", modell: "316", variante: "Touring 1.6",
    titel: "BMW 316 Touring 1.6",
    preis: 10570, km: 186224, erstzulassung: "11/2013",
    kraftstoff: "Benzin", getriebe: "Schaltgetriebe",
    kw: 100, ps: 136, hubraum: 1598, zylinder: 4, tueren: 5, sitze: 5,
    plakette: "4 (Grün)", tuev: "01/2027", garantieMonate: 12, bauart: "Kombi",
    ausstattung: ["Navigationssystem","Klimaautomatik","Einparkhilfe vorne & hinten (PDC)","Elektrische Fensterheber","Elektrische Heckklappe","Elektrische Seitenspiegel","Sitzheizung","Tempomat","Bordcomputer","Radio / CD / MP3 / USB / Bluetooth","Regensensor","Lichtsensor","Multifunktionslenkrad","Lederlenkrad","Getönte Scheiben","Bi-Xenon Scheinwerfer","Alufelgen (19\")","Sportfahrwerk","Sportsitze"],
    zustand: ["Technisch einwandfrei","Sehr gepflegter Zustand","Nichtraucherfahrzeug"],
    beschreibung: "BMW 316 Touring 1.6 Benziner mit 136 PS und Schaltgetriebe. Umfangreiche Ausstattung inkl. Navigation, Klimaautomatik und PDC. Sehr gepflegt, technisch einwandfrei und sofort fahrbereit.",
    bild: "/fahrzeuge/bmw-316-touring.jpg",
  },
  {
    slug: "ford-tourneo-courier-1-0",
    marke: "Ford", modell: "Tourneo Courier", variante: "1.0 EcoBoost",
    titel: "Ford Tourneo Courier 1.0 EcoBoost",
    preis: 9800, km: 75313, erstzulassung: "12/2015",
    kraftstoff: "Benzin", getriebe: "Schaltgetriebe",
    kw: 74, ps: 101, hubraum: 998, tueren: 5, sitze: 5,
    plakette: "4 (Grün)", tuev: "07/2028", garantieMonate: 12, bauart: "Hochdachkombi",
    ausstattung: ["Klimaanlage","Sitzheizung","Tempomat","Einparkhilfe hinten","Elektrische Fensterheber","Elektrische Seitenspiegel","Bordcomputer","Radio / CD / MP3","Bluetooth","Multifunktionslenkrad","Beheizbare Frontscheibe","Armlehne","Getönte Scheiben","Lichtsensor & Regensensor","Zentralverriegelung mit Funkfernbedienung"],
    zustand: ["Technisch einwandfrei","Sehr gepflegter Zustand","Nichtraucherfahrzeug"],
    beschreibung: "Praktischer Ford Tourneo Courier 1.0 EcoBoost mit 101 PS und Schaltgetriebe. Geräumig, variabel und ideal für Familie, Freizeit oder Alltag. Sehr wenig gelaufen, sehr gepflegt und sofort fahrbereit.",
    bild: "/fahrzeuge/ford-tourneo-courier-1-0.jpg",
  },
  {
    slug: "audi-a5-sportback-1-8-tfsi",
    marke: "Audi", modell: "A5", variante: "Sportback 1.8 TFSI",
    titel: "Audi A5 Sportback 1.8 TFSI",
    preis: 9000, km: 189252, erstzulassung: "10/2010",
    kraftstoff: "Benzin", getriebe: "Automatik",
    kw: 118, ps: 160, hubraum: 1798, zylinder: 4, tueren: 5, sitze: 4,
    plakette: "Euro 5 · 4 (Grün)", tuev: "04/2028", garantieMonate: 12, bauart: "Coupé / Sportback",
    ausstattung: ["Navigationssystem","Klimaautomatik","Einparkhilfe hinten (PDC)","Elektrische Fensterheber","Elektrische Seitenspiegel","Multifunktionslenkrad","Sitzheizung","Tempomat","Bordcomputer","Radio / CD / MP3","Bluetooth","Zentralverriegelung mit Funkfernbedienung","Xenonscheinwerfer","LED-Tagfahrlicht","Leichtmetallfelgen (19\")","Servolenkung","ABS / ESP"],
    zustand: ["Technisch einwandfrei","Sehr gepflegter Zustand","Nichtraucherfahrzeug"],
    beschreibung: "Audi A5 Sportback 1.8 TFSI mit 160 PS und Automatikgetriebe. Sehr gepflegt, technisch einwandfrei und sofort fahrbereit.",
    bild: "/fahrzeuge/audi-a5-sportback-1-8-tfsi.jpg",
  },
  {
    slug: "hyundai-ix35-1-6",
    marke: "Hyundai", modell: "ix35", variante: "1.6",
    titel: "Hyundai ix35 1.6",
    preis: 9000, km: 153840, erstzulassung: "04/2013",
    kraftstoff: "Benzin", getriebe: "Schaltgetriebe",
    kw: 99, ps: 135, hubraum: 1591, zylinder: 4, tueren: 5, sitze: 5,
    plakette: "Euro 5 · 4 (Grün)", tuev: "01/2028", garantieMonate: 12, bauart: "SUV",
    ausstattung: ["Klimaautomatik","Einparkhilfe hinten (PDC)","Navigationssystem","Sitzheizung","Elektrische Fensterheber","Elektrische Seitenspiegel","Multifunktionslenkrad","Bordcomputer","Radio / CD / MP3","Bluetooth","Lederlenkrad","Tempomat","Getönte Scheiben","Zentralverriegelung mit Funkfernbedienung","Servolenkung","Leichtmetallfelgen","ABS / ESP","Nebelscheinwerfer"],
    zustand: ["Technisch einwandfrei","Sehr gepflegter Zustand","Nichtraucherfahrzeug"],
    beschreibung: "Hyundai ix35 1.6 Benziner mit 135 PS und Schaltgetriebe. 5 Sitze, ideal für Familie, Freizeit oder Alltag. Sehr gepflegt, technisch einwandfrei und sofort fahrbereit.",
    bild: "/fahrzeuge/hyundai-ix35-1-6.jpg",
  },
  {
    slug: "ford-c-max-1-5",
    marke: "Ford", modell: "C-MAX", variante: "1.5",
    titel: "Ford C-MAX 1.5 · 7 Sitzer",
    preis: 7500, km: 137000, erstzulassung: "2016",
    kraftstoff: "Benzin", getriebe: "Schaltgetriebe",
    ps: 150, hubraum: 1498, zylinder: 4, tueren: 5, sitze: 7,
    plakette: "Euro 6", tuev: "10/2027", ersteHand: true, bauart: "Van",
    ausstattung: ["Klimaanlage","Einparkhilfe","Elektrische Fensterheber","Elektrische Seitenspiegel","Radio / CD / MP3","Zentralverriegelung","Servolenkung","ABS / ESP","Airbag","Leichtmetallfelgen"],
    zustand: ["1. Hand","Technisch einwandfrei","Sehr gepflegter Zustand"],
    beschreibung: "Ford C-MAX 1.5 Benziner mit 150 PS und Schaltgetriebe. 7 Sitze, ideal für Familie, Freizeit oder Alltag. 1. Hand, sehr gepflegt und sofort fahrbereit.",
    bild: "/fahrzeuge/ford-c-max-1-5.jpg",
  },
  {
    slug: "bmw-x1-sdrive-2-0-diesel",
    marke: "BMW", modell: "X1", variante: "sDrive 2.0 Diesel",
    titel: "BMW X1 sDrive 2.0 Diesel",
    preis: 7500, km: 215304, erstzulassung: "09/2011",
    kraftstoff: "Diesel", getriebe: "Schaltgetriebe",
    kw: 105, ps: 143, hubraum: 1995, zylinder: 4, tueren: 5, sitze: 5,
    plakette: "Euro 5 · 4 (Grün)", tuev: "05/2026", garantieMonate: 12, bauart: "SUV",
    ausstattung: ["Klimaanlage","Xenonscheinwerfer","Einparkhilfe vorne & hinten (PDC)","Sitzheizung","Tempomat","Navigationssystem","Elektrische Fensterheber","Elektrische Seitenspiegel","Bordcomputer","Radio / CD / MP3","Zentralverriegelung","Multifunktionslenkrad","Leichtmetallfelgen","Servolenkung","ABS / ESP","Anhängerkupplung"],
    zustand: ["Technisch einwandfrei","Sehr gepflegter Zustand","Nichtraucherfahrzeug"],
    beschreibung: "BMW X1 sDrive 2.0 Diesel mit 143 PS und Schaltgetriebe. 5 Sitze, ideal für Familie, Freizeit oder Alltag. Sehr gepflegt, technisch einwandfrei und sofort fahrbereit.",
    bild: "/fahrzeuge/bmw-x1-sdrive-2-0-diesel.jpg",
  },
  {
    slug: "audi-a1-1-4-tfsi",
    marke: "Audi", modell: "A1", variante: "1.4 TFSI",
    titel: "Audi A1 1.4 TFSI",
    preis: 7370, km: 153287, erstzulassung: "10/2010",
    kraftstoff: "Benzin", getriebe: "Schaltgetriebe",
    kw: 90, ps: 122, hubraum: 1390, zylinder: 4, tueren: 3, sitze: 4,
    plakette: "4 (Grün)", tuev: "07/2028", garantieMonate: 12, bauart: "Kleinwagen",
    ausstattung: ["Klimaanlage","Einparkhilfe hinten (PDC)","Elektrische Fensterheber","Elektrische Seitenspiegel","Getönte Scheiben","Lederlenkrad & Multifunktionslenkrad","Sitzheizung","Start/Stop-Automatik","Tempomat","Bordcomputer","Radio / CD / MP3","Bluetooth","Zentralverriegelung mit Funkfernbedienung","Leichtmetallfelgen","Servolenkung","Nebelscheinwerfer"],
    zustand: ["Technisch einwandfrei","Sehr gepflegter Zustand","Nichtraucherfahrzeug"],
    beschreibung: "Audi A1 1.4 TFSI Benziner mit 122 PS und Schaltgetriebe. Sehr gepflegt, technisch einwandfrei und sofort fahrbereit.",
    bild: "/fahrzeuge/audi-a1-1-4-tfsi.jpg",
  },
  {
    slug: "vw-tiguan-2-0-tsi",
    marke: "Volkswagen", modell: "Tiguan", variante: "2.0 TSI 4Motion",
    titel: "VW Tiguan 2.0 TSI 4Motion",
    preis: 6800, km: 197155, erstzulassung: "06/2009",
    kraftstoff: "Benzin", getriebe: "Schaltgetriebe",
    kw: 125, ps: 170, hubraum: 1984, zylinder: 4, tueren: 5, sitze: 5,
    plakette: "Euro 4 · 4 (Grün)", tuev: "12/2026", garantieMonate: 12, bauart: "SUV",
    ausstattung: ["Klimaanlage","Sitzheizung","Navigationssystem","Einparkhilfe (PDC)","Elektrische Fensterheber","Elektrische Seitenspiegel","Bordcomputer","Radio / CD / MP3","Zentralverriegelung mit Funkfernbedienung","Multifunktionslenkrad","Tempomat","Servolenkung","ABS / ESP","Leichtmetallfelgen","Airbag","Getönte Scheiben"],
    zustand: ["Technisch einwandfrei","Sehr gepflegter Zustand","Nichtraucherfahrzeug"],
    beschreibung: "VW Tiguan 2.0 TSI mit 170 PS, Allrad (4Motion) und Schaltgetriebe. 5 Sitze, ideal für Familie, Freizeit oder Alltag. Sehr gepflegt und sofort fahrbereit.",
    bild: "/fahrzeuge/vw-tiguan-2-0-tsi.jpg",
  },
  {
    slug: "opel-zafira-tourer-1-6-diesel",
    marke: "Opel", modell: "Zafira Tourer", variante: "1.6 Diesel",
    titel: "Opel Zafira Tourer 1.6 Diesel · 7 Sitzer",
    preis: 6370, km: 188154, erstzulassung: "12/2014",
    kraftstoff: "Diesel", getriebe: "Schaltgetriebe",
    kw: 88, ps: 120, hubraum: 1598, zylinder: 4, tueren: 5, sitze: 7,
    plakette: "Euro 6 · 4 (Grün)", tuev: "07/2026", garantieMonate: 12, bauart: "Van",
    ausstattung: ["Navigationssystem","Klimaanlage","Einparkhilfe vorne & hinten (PDC)","Elektrische Fensterheber","Elektrische Seitenspiegel","Getönte Scheiben","Multifunktionslenkrad","Sitzheizung","Standheizung","Tempomat","Bordcomputer","Radio / CD / MP3","Bluetooth","Zentralverriegelung mit Funkfernbedienung","Lederlenkrad","Xenonscheinwerfer","LED-Tagfahrlicht","ABS / ESP","Servolenkung"],
    zustand: ["Technisch einwandfrei","Sehr gepflegter Zustand","Nichtraucherfahrzeug"],
    beschreibung: "Opel Zafira Tourer 1.6 Diesel mit 120 PS und Schaltgetriebe. 7 Sitze, ideal für Familie, Freizeit oder Alltag. Sehr gepflegt, technisch einwandfrei und sofort fahrbereit.",
    bild: "/fahrzeuge/opel-zafira-tourer-1-6-diesel.jpg",
  },
  {
    slug: "vw-touran-1-2-tsi",
    marke: "Volkswagen", modell: "Touran", variante: "1.2 TSI",
    titel: "VW Touran 1.2 TSI · 7 Sitzer",
    preis: 6000, km: 207731, erstzulassung: "09/2012",
    kraftstoff: "Benzin", getriebe: "Schaltgetriebe",
    kw: 77, ps: 105, hubraum: 1197, zylinder: 4, tueren: 5, sitze: 7,
    plakette: "Euro 5 · 4 (Grün)", tuev: "10/2026", garantieMonate: 12, bauart: "Van",
    ausstattung: ["Klimaanlage","Einparkhilfe hinten","Elektrische Fensterheber","Elektrische Seitenspiegel","Getönte Scheiben","Sitzheizung","Start/Stop-Automatik","Tempomat","Bordcomputer","Radio / CD / MP3","Navigationssystem","Servolenkung","Zentralverriegelung mit Funkfernbedienung","Multifunktionslenkrad","Leichtmetallfelgen","ABS / ESP","Airbag hinten"],
    zustand: ["Technisch einwandfrei","Sehr gepflegter Zustand","Nichtraucherfahrzeug"],
    beschreibung: "VW Touran 1.2 TSI Benziner mit 105 PS und Schaltgetriebe. 7 Sitze, ideal für Familie, Freizeit oder Alltag. Sehr gepflegt, technisch einwandfrei und sofort fahrbereit.",
    bild: "/fahrzeuge/vw-touran-1-2-tsi.jpg",
  },
  {
    slug: "renault-megane-1-6-16v",
    marke: "Renault", modell: "Megane", variante: "1.6 16V",
    titel: "Renault Megane 1.6 16V",
    preis: 5870, km: 178000, erstzulassung: "06/2011",
    kraftstoff: "Benzin", getriebe: "Schaltgetriebe",
    kw: 81, ps: 110, hubraum: 1598, zylinder: 4, tueren: 5, sitze: 5,
    plakette: "Euro 5 · 4 (Grün)", tuev: "06/2027", bauart: "Kombi",
    ausstattung: ["Klimaanlage","Einparkhilfe hinten","Elektrische Fensterheber","Elektrische Seitenspiegel","Getönte Scheiben","Zentralverriegelung mit Funkfernbedienung","Bordcomputer","Radio / CD / MP3","Bluetooth","Multifunktionslenkrad","Servolenkung","ABS / ESP","Leichtmetallfelgen","Nebelscheinwerfer"],
    zustand: ["Technisch einwandfrei","Sehr gepflegter Zustand","Nichtraucherfahrzeug"],
    beschreibung: "Renault Megane 1.6 16V mit 110 PS. 5-Türer, Benzin, Schaltgetriebe. Ideal für Familie, Freizeit oder Alltag. Sehr gepflegt, technisch einwandfrei und sofort fahrbereit.",
    bild: "/fahrzeuge/renault-megane-1-6-16v.jpg",
  },
  {
    slug: "opel-corsa-1-2",
    marke: "Opel", modell: "Corsa", variante: "1.2",
    titel: "Opel Corsa 1.2",
    preis: 5800, km: 162162, erstzulassung: "05/2016",
    kraftstoff: "Benzin", getriebe: "Schaltgetriebe",
    kw: 51, ps: 69, hubraum: 1229, zylinder: 4, tueren: 5, sitze: 5,
    plakette: "Euro 6d-TEMP · 4 (Grün)", tuev: "01/2027", garantieMonate: 12, bauart: "Kleinwagen",
    ausstattung: ["Klimaanlage","Einparkhilfe hinten","Elektrische Fensterheber","Elektrische Seitenspiegel","Bordcomputer","Sitzheizung","Start/Stop-Automatik","Tempomat","Servolenkung","Zentralverriegelung","Multifunktionslenkrad","Leichtmetallfelgen (optional vorhanden)","ABS / ESP","Airbag","Getönte Scheiben"],
    zustand: ["Technisch einwandfrei","Sehr gepflegter Zustand","Nichtraucherfahrzeug"],
    beschreibung: "Opel Corsa 1.2 Benziner mit 69 PS und Schaltgetriebe. 5 Sitze, ideal für Stadt, Familie oder Alltag. Sehr gepflegt, technisch einwandfrei und sofort fahrbereit.",
    bild: "/fahrzeuge/opel-corsa-1-2.jpg",
  },
  {
    slug: "fiat-500-1-2",
    marke: "Fiat", modell: "500", variante: "1.2",
    titel: "Fiat 500 1.2",
    preis: 5800, km: 134529, erstzulassung: "08/2012",
    kraftstoff: "Benzin", getriebe: "Schaltgetriebe",
    kw: 51, ps: 69, hubraum: 1242, tueren: 3, sitze: 4,
    plakette: "4 (Grün)", tuev: "05/2028", garantieMonate: 12, bauart: "Kleinwagen",
    ausstattung: ["Klimaanlage","Getönte Scheiben","Elektrische Fensterheber","Elektrische Seitenspiegel","Lederlenkrad","Start/Stopp-Automatik","Radio / CD / MP3","Bluetooth","Bordcomputer","USB","Tempomat","ABS / ESP","Isofix","Zentralverriegelung","Leichtmetallfelgen"],
    zustand: ["Technisch einwandfrei","Sehr gepflegter Zustand","Nichtraucherfahrzeug"],
    beschreibung: "Fiat 500 1.2 Benziner mit 69 PS und Schaltgetriebe. Sehr gepflegt, technisch einwandfrei und sofort fahrbereit.",
    bild: "/fahrzeuge/fiat-500-1-2.jpg",
  },
  {
    slug: "vw-touran-1-4-tsi",
    marke: "Volkswagen", modell: "Touran", variante: "1.4 TSI",
    titel: "VW Touran 1.4 TSI · 7 Sitzer",
    preis: 5500, km: 245882, erstzulassung: "06/2011",
    kraftstoff: "Benzin", getriebe: "Schaltgetriebe",
    kw: 103, ps: 140, hubraum: 1390, zylinder: 4, tueren: 5, sitze: 7,
    plakette: "Euro 5 · 4 (Grün)", tuev: "06/2026", garantieMonate: 12, bauart: "Van",
    ausstattung: ["Klimaanlage / Klimaautomatik","Einparkhilfe hinten (PDC)","Elektrische Fensterheber","Elektrische Seitenspiegel","Getönte Scheiben","Multifunktionslenkrad","Sitzheizung","Start/Stop-Automatik","Tempomat","Bordcomputer","Radio / CD / MP3","Bluetooth","Zentralverriegelung mit Funkfernbedienung","Leichtmetallfelgen","Servolenkung","Nebelscheinwerfer","ABS / ESP"],
    zustand: ["Technisch einwandfrei","Sehr gepflegter Zustand","Nichtraucherfahrzeug"],
    beschreibung: "VW Touran 1.4 TSI Benziner mit 140 PS und Schaltgetriebe. 7 Sitzer, ideal für Familie, Freizeit oder Alltag. Sehr gepflegt, technisch einwandfrei und sofort fahrbereit.",
    bild: "/fahrzeuge/vw-touran-1-4-tsi.jpg",
  },
  {
    slug: "bmw-x3-2-0-diesel",
    marke: "BMW", modell: "X3", variante: "2.0 Diesel",
    titel: "BMW X3 2.0 Diesel",
    preis: 4470, km: 256815, erstzulassung: "05/2010",
    kraftstoff: "Diesel", getriebe: "Automatik",
    kw: 130, ps: 177, hubraum: 1995, zylinder: 4, tueren: 5, sitze: 5,
    plakette: "4 (Grün)", tuev: "10/2025", bauart: "SUV",
    ausstattung: ["Klimaanlage","Elektrische Fensterheber","Zentralverriegelung","Radio / CD","Servolenkung","ABS","ESP","Airbag","Getönte Scheiben","Nebelscheinwerfer","Bordcomputer","Isofix","Leichtmetallfelgen"],
    zustand: ["Technisch einwandfrei","Sehr gepflegter Zustand","Nichtraucherfahrzeug"],
    beschreibung: "BMW X3 2.0 Diesel mit 177 PS und Automatikgetriebe. 5 Sitzplätze, robust, komfortabel und ideal für Familie, Freizeit oder Alltag. Sehr gepflegt und sofort fahrbereit.",
    bild: "/fahrzeuge/bmw-x3-2-0-diesel.jpg",
  },
  {
    slug: "nissan-micra-cabrio",
    marke: "Nissan", modell: "Micra", variante: "Cabrio 1.6",
    titel: "Nissan Micra Cabrio 1.6",
    preis: 3800, km: 164992, erstzulassung: "02/2006",
    kraftstoff: "Benzin", getriebe: "Schaltgetriebe",
    kw: 81, ps: 110, hubraum: 1598, tueren: 2, sitze: 4,
    plakette: "4 (Grün)", tuev: "04/2028", garantieMonate: 12, bauart: "Cabrio",
    ausstattung: ["Klimaanlage","Sitzheizung","Elektrische Fensterheber","Elektrische Seitenspiegel","Getönte Scheiben","Lederlenkrad","Radio / Tuner","CD / MP3","Bordcomputer","Servolenkung","Zentralverriegelung","ABS","ESP","Leichtmetallfelgen","Isofix"],
    zustand: ["Technisch einwandfrei","Sehr gepflegter Zustand","Nichtraucherfahrzeug"],
    beschreibung: "Nissan Micra Cabrio 1.6 Benziner mit 110 PS und Schaltgetriebe. Ideal für den Sommer. Sehr gepflegt, technisch einwandfrei und sofort fahrbereit.",
    bild: "/fahrzeuge/nissan-micra-cabrio.jpg",
  },
  {
    slug: "opel-meriva-1-4",
    marke: "Opel", modell: "Meriva", variante: "1.4",
    titel: "Opel Meriva 1.4",
    preis: 3500, km: 233160, erstzulassung: "09/2010",
    kraftstoff: "Benzin", getriebe: "Schaltgetriebe",
    kw: 74, ps: 101, hubraum: 1398, zylinder: 4, tueren: 5, sitze: 5,
    plakette: "Euro 5 · 4 (Grün)", tuev: "11/2027", garantieMonate: 12, bauart: "Van",
    ausstattung: ["Klimaanlage","Einparkhilfe hinten","Elektrische Fensterheber","Elektrische Seitenspiegel","Getönte Scheiben","Sitzheizung","Start/Stop-Automatik","Tempomat","Bordcomputer","Radio / CD / MP3","Servolenkung","Zentralverriegelung","Multifunktionslenkrad","Leichtmetallfelgen","ABS / ESP","Airbag hinten"],
    zustand: ["Technisch einwandfrei","Sehr gepflegter Zustand","Nichtraucherfahrzeug"],
    beschreibung: "Opel Meriva 1.4 Benziner mit 101 PS und Schaltgetriebe. 5 Sitze, ideal für Familie, Freizeit oder Alltag. Sehr gepflegt, technisch einwandfrei und sofort fahrbereit.",
    bild: "/fahrzeuge/opel-meriva-1-4.jpg",
  },
  {
    slug: "toyota-aygo-1-0",
    marke: "Toyota", modell: "Aygo", variante: "1.0",
    titel: "Toyota Aygo 1.0",
    preis: 2000, km: 106522, erstzulassung: "03/2009",
    kraftstoff: "Benzin", getriebe: "Schaltgetriebe",
    kw: 51, ps: 69, hubraum: 998, zylinder: 3, tueren: 5, sitze: 5,
    plakette: "Euro 4 · 4 (Grün)", tuev: "10/2027", garantieMonate: 12, bauart: "Kleinwagen",
    ausstattung: ["Klimaanlage","Elektrische Fensterheber","Zentralverriegelung","Radio / CD","Servolenkung","ABS / ESP","Airbag","Getönte Scheiben","Leichtmetallfelgen"],
    zustand: ["Technisch einwandfrei","Sehr gepflegter Zustand"],
    beschreibung: "Toyota Aygo 1.0 Benziner mit 69 PS und Schaltgetriebe. 5 Sitze, ideal für Stadt, Familie oder Alltag. Sehr gepflegt, technisch einwandfrei und sofort fahrbereit.",
    bild: "/fahrzeuge/toyota-aygo-1-0.jpg",
  },
  {
    slug: "vw-fox-1-6",
    marke: "Volkswagen", modell: "Fox", variante: "1.6",
    titel: "VW Fox 1.6",
    preis: 1500, km: 145342, erstzulassung: "09/2008",
    kraftstoff: "Benzin", getriebe: "Schaltgetriebe",
    hubraum: 1598, tueren: 5, sitze: 5,
    plakette: "4 (Grün)", tuev: "10/2025", bauart: "Kleinwagen",
    ausstattung: ["Klimaanlage","Elektrische Fensterheber","Zentralverriegelung","Radio / CD","Servolenkung","ABS","ESP","Airbag","Getönte Scheiben","Isofix","Leichtmetallfelgen","Gepflegter Innenraum"],
    zustand: ["Technisch einwandfrei","Sehr gepflegter Zustand","Nichtraucherfahrzeug"],
    beschreibung: "VW Fox 1.6 Benziner mit Schaltgetriebe. 5 Sitzplätze, ideal für Stadt, Familie oder Alltag. Sehr gepflegt, technisch einwandfrei und sofort fahrbereit.",
    bild: "/fahrzeuge/vw-fox-1-6.jpg",
  },
];

/** "06/2027" → Date am Monatsende; "neu" o. ä. → null */
export function tuevDatum(tuev: string): Date | null {
  const m = /^(\d{2})\/(\d{4})$/.exec(tuev.trim());
  if (!m) return null;
  return new Date(Number(m[2]), Number(m[1]), 0, 23, 59, 59);
}

export function tuevAbgelaufen(tuev: string, jetzt = new Date()): boolean {
  const d = tuevDatum(tuev);
  return d !== null && d < jetzt;
}

export function fahrzeugNachSlug(slug?: string): Fahrzeug | undefined {
  return FAHRZEUGE.find((f) => f.slug === slug);
}

export const MARKEN = [...new Set(FAHRZEUGE.map((f) => f.marke))].sort();
