// ─────────────────────────────────────────────────────────────────────────────
// Teilenummern-Schreibweisen — eine Quelle für Browser und Server.
//
// TecDoc, Inter Cars und Kunden schreiben dieselbe Nummer verschieden:
//   "HU 719/6 x"  (TecDoc)   "HU719/6X" (Inter Cars)   "HU 719/6x" (Eingabe)
// OE-Nummern wie "1J0615301D" bleiben zusammen, sonst zerlegt ein
// Buchstabe-Ziffer-Schnitt die Originalnummer.
// ─────────────────────────────────────────────────────────────────────────────

/** Sieht die Eingabe nach einer Artikel- oder OE-Nummer aus (nicht nach "Bremsbelag")? */
export function siehtNachNummer(roh) {
  const s = String(roh || "").trim();
  if (s.length < 4 || s.length > 40) return false;
  if (!/\d/.test(s)) return false;
  const woerter = s.split(/\s+/);
  // "Golf 7" / "Polo 2012" ist eine Textsuche, keine Nummer.
  if (
    woerter.length >= 2 &&
    woerter.every((w) => /^[A-Za-zÄÖÜäöüß.]{2,}$/.test(w) || /^\d{1,4}$/.test(w))
  ) {
    return false;
  }
  return true;
}

/**
 * Mögliche Schreibweisen, von der wörtlichsten zur stärksten Normalisierung.
 * Begrenzt, damit eine Suche nicht Dutzende Katalog-Anfragen auslöst.
 */
export function artikelVarianten(roh) {
  const s = String(roh || "").trim();
  if (!s) return [];
  const seeds = new Set();
  const merk = (v) => {
    const t = String(v || "").trim();
    if (t) seeds.add(t);
  };

  merk(s);
  merk(s.toUpperCase());

  // "6x" und "6 x" sind dieselbe Größe.
  const mitLeerX = s.replace(/(\d)\s*([xX])\b/g, "$1 $2");
  const ohneLeerX = s.replace(/(\d)\s*([xX])\b/g, "$1$2");
  merk(mitLeerX);
  merk(ohneLeerX);
  merk(mitLeerX.toUpperCase());
  merk(ohneLeerX.toUpperCase());

  // MANN-Stil "HU719/6x" → "HU 719/6 x". Nicht bei OE-Nummern, die mit einer Ziffer beginnen.
  const kompakt = s.replace(/\s+/g, "");
  if (/^[A-Za-z]{1,8}\d/.test(kompakt)) {
    const geschnitten = kompakt.replace(/^([A-Za-z]+)(\d)/, "$1 $2").replace(/(\d)([xX])$/, "$1 $2");
    merk(geschnitten);
    merk(geschnitten.toUpperCase());
    merk(geschnitten.toUpperCase().replace(/(\d)\s*X\b/g, "$1 X"));
  }

  for (const base of [...seeds]) {
    merk(base.replace(/\./g, " "));
    merk(base.replace(/\./g, ""));
    merk(base.replace(/-/g, "/"));
    merk(base.replace(/-/g, ""));
    merk(base.replace(/\s+/g, ""));
    merk(base.replace(/\s+/g, "").toUpperCase());
    merk(base.replace(/[^A-Za-z0-9]/g, ""));
    merk(base.replace(/[^A-Za-z0-9]/g, "").toUpperCase());
    merk(base.replace(/\s+/g, " "));
  }

  // Führende Null im Zahlenblock: "W 0712/95" und "W 712/95".
  for (const base of [...seeds]) {
    merk(base.replace(/\b0+(\d)/g, "$1"));
    merk(base.replace(/\b0+(\d)/g, "$1").toUpperCase());
  }

  return [...seeds].filter(Boolean).slice(0, 28);
}
