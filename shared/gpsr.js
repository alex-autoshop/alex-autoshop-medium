/** Herstellerangaben nach der Produktsicherheitsverordnung. Fehlt alles, bleibt der Block weg. */

const FELDER = [
  ["gpsr_hersteller_name", "name"],
  ["gpsr_hersteller_adresse", "adresse"],
  ["gpsr_hersteller_kontakt", "kontakt"],
  ["gpsr_eu_verantwortlicher", "eu"],
  ["gpsr_sicherheitshinweise", "hinweise"],
];

function text(wert) {
  return String(wert || "").replace(/\s+/g, " ").trim().slice(0, 800);
}

export function gpsrLesen(felder) {
  const roh = {};
  for (const feld of felder || []) {
    if (feld && feld.key) roh[feld.key] = feld.value;
  }
  const angabe = { name: "", adresse: "", kontakt: "", eu: "", hinweise: "" };
  for (const [key, ziel] of FELDER) angabe[ziel] = text(roh[key]);
  angabe.hat = Boolean(angabe.name || angabe.adresse || angabe.kontakt || angabe.eu || angabe.hinweise);
  return angabe;
}
