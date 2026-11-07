/** Herstellerangaben nach der Produktsicherheitsverordnung. Fehlt alles, bleibt der Block weg. */

function mehrzeilig(wert, max) {
  return String(wert || "").replace(/\r\n/g, "\n").trim().slice(0, max);
}

function einzeilig(wert) {
  return mehrzeilig(wert, 300).replace(/[ \t]*\n[ \t]*/g, " ").replace(/[ \t]+/g, " ").trim();
}

export function gpsrLesen(felder) {
  const roh = {};
  for (const feld of felder || []) {
    if (feld && feld.key) roh[feld.key] = feld.value;
  }
  const angabe = {
    name: einzeilig(roh.gpsr_hersteller_name),
    adresse: mehrzeilig(roh.gpsr_hersteller_adresse, 1000),
    kontakt: einzeilig(roh.gpsr_hersteller_kontakt),
    eu: mehrzeilig(roh.gpsr_eu_verantwortlicher, 1000),
    hinweise: mehrzeilig(roh.gpsr_sicherheitshinweise, 2000),
  };
  angabe.hat = Boolean(angabe.name || angabe.adresse || angabe.kontakt || angabe.eu || angabe.hinweise);
  return angabe;
}
