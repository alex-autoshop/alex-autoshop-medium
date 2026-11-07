// Produkt-Abo: erst die Bezahlseite. Ohne URL keine E-Mail-Anfrage davor.
export function aboZahlungErgebnis(status, data) {
  const d = data && typeof data === "object" ? data : {};
  if (status >= 200 && status < 300 && d.url) return { art: "weiter", url: d.url };
  if (d.fallback) {
    return {
      art: "fehler",
      text: "Die Online-Zahlung ist noch nicht freigeschaltet. Vor der Zahlung wird keine Anfrage gesendet.",
    };
  }
  return {
    art: "fehler",
    text: d.error || (status === 400 || status === 409
      ? "Buchung nicht möglich — bitte die Seite neu laden."
      : "Der Abschluss ist gerade nicht erreichbar."),
  };
}
