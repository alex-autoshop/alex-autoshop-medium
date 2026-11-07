/** Gewerbekunde an einer Shopify-Bestellung. Privatkunden bleiben außen vor. */

function tags(kunde) {
  const roh = kunde && kunde.tags;
  const liste = Array.isArray(roh) ? roh : String(roh || "").split(",");
  return liste.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
}

function firma(wert) {
  return String(wert || "").trim();
}

export function istGeschaeftskunde(bestellung) {
  const kunde = bestellung && bestellung.customer;
  if (tags(kunde).some((t) => t === "b2b" || t === "gewerbe" || t === "werkstatt" || t === "firma")) return true;
  const adressen = [
    bestellung && bestellung.billing_address,
    bestellung && bestellung.shipping_address,
    kunde && (kunde.default_address || kunde.defaultAddress),
  ];
  if (adressen.some((a) => firma(a && a.company))) return true;
  const notizen = (bestellung && bestellung.note_attributes) || [];
  return notizen.some((n) => /ust|umsatzsteuer|\bvat\b/i.test(String(n && n.name || "")) && firma(n && n.value));
}
