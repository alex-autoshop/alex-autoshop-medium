import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { PRODUKT_ABO_PREISE } from "../../shared/produktabo.js";
import { teileboerseOeffentlich } from "../../shared/teileboerse-schalter.js";

const euro = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

const AGB = () => {
  const teile = teileboerseOeffentlich();
  return (
  <div>
    <Seo
      title="AGB"
      description="Allgemeine Geschäftsbedingungen von Alex Autoshop für den Online-Shop und die Mitgliedschaft."
    />
    <article className="prose-legal">
      <h1>Allgemeine Geschäfts{"\u00AD"}bedingungen (AGB)</h1>
      <p><em>Alex Autoshop – Alexander Haritopoulos · Stand: November 2026</em></p>

      <hr />

      <h3>1. Geltungsbereich</h3>
      <p>Diese AGB gelten für alle Verträge, die über den Online-Shop (shop.alex-autoshop.de){teile ? ", die Teilebörse" : ""} und die Mitgliedschaften unter <a href="https://www.alex-autoshop.de">www.alex-autoshop.de</a> zwischen uns und Verbrauchern oder Unternehmern geschlossen werden. Abweichende Bedingungen des Kunden gelten nicht, es sei denn, wir stimmen ihnen ausdrücklich zu.</p>
      <p>Verbraucher ist jede natürliche Person, die ein Rechtsgeschäft zu Zwecken abschließt, die überwiegend weder ihrer gewerblichen noch ihrer selbstständigen beruflichen Tätigkeit zugerechnet werden können (§ 13 BGB). Unternehmer ist eine natürliche oder juristische Person oder eine rechtsfähige Personengesellschaft, die bei Abschluss eines Rechtsgeschäfts in Ausübung ihrer gewerblichen oder selbstständigen beruflichen Tätigkeit handelt (§ 14 BGB).</p>

      <hr />

      <h3>2. Vertragspartner</h3>
      <p>
        <strong>Alex Autoshop</strong><br />
        Inhaber: Alexander Haritopoulos<br />
        Handelstraße 64, 42277 Wuppertal<br />
        E-Mail: info@alex-autoshop.de<br />
        Telefon/WhatsApp: 0202 82690
      </p>

      <hr />

      <h3>3. Vertragsschluss, Vertragssprache, Vertragstext</h3>
      <p>Die Darstellung der Produkte im Shop{teile ? " und in der Teilebörse" : ""} ist kein rechtlich bindendes Angebot, sondern eine Aufforderung zur Bestellung.</p>
      <p><strong>Online-Shop:</strong> Sie legen Artikel in den Warenkorb, geben im Checkout Ihre Daten ein, wählen Versand- und Zahlungsart und sehen vor dem Absenden eine Übersicht mit allen Angaben und dem Gesamtpreis. Mit dem Klick auf die Schaltfläche „Zahlungspflichtig bestellen“ (bzw. gleichbedeutend „Jetzt kaufen“) geben Sie ein verbindliches Angebot ab. Der Vertrag kommt zustande, wenn wir die Bestellung durch eine Auftragsbestätigung per E-Mail annehmen oder die Ware versenden; die automatische Eingangsbestätigung ist noch keine Annahme. Bei Zahlung per PayPal, Kreditkarte, Apple Pay oder Klarna kommt der Vertrag bereits mit der Zahlungsfreigabe zustande.</p>
      {teile && (
        <p><strong>Teilebörse:</strong> Sie legen Teile in den Warenkorb, sehen dort Teilepreise, Versandkosten, gegebenenfalls Batteriepfand und den Gesamtbetrag, bestätigen die AGB und klicken auf „Zahlungspflichtig bestellen“. Sie werden dann zum Zahlungsdienstleister (Stripe für Karte, GoCardless für SEPA-Lastschrift) weitergeleitet. Der Vertrag kommt mit Abschluss des Zahlungsvorgangs beim Zahlungsdienstleister zustande (Karte) bzw. mit Erteilung des SEPA-Mandats (Lastschrift). Anfragen per WhatsApp oder Formular sind keine Bestellung; wir schicken Ihnen dazu ein Angebot, das Sie annehmen können.</p>
      )}
      <p><strong>Mitgliedschaft und Produkt-Abo:</strong> siehe Ziffer 11.</p>
      <p>Eingabefehler können Sie vor dem Absenden in jedem Schritt über die Zurück-Funktion des Browsers bzw. die Bearbeiten-Funktionen im Warenkorb korrigieren. Vertragssprache ist Deutsch. Wir speichern den Vertragstext und senden Ihnen die Bestelldaten und diese AGB per E-Mail; die AGB können Sie jederzeit auf dieser Seite abrufen und ausdrucken. Ältere Bestellungen sehen eingeloggte Kunden im Kundenkonto.</p>

      <hr />

      <h3>4. Preise, Versandkosten, Pfand</h3>
      <p>Alle Preise sind Endpreise in Euro inklusive der gesetzlichen Mehrwertsteuer. Zusätzlich fallen nur die Versandkosten und gegebenenfalls das Batteriepfand an, die wir Ihnen vor Abgabe der Bestellung im Warenkorb bzw. Checkout nennen. Weitere Kosten oder Zuschläge berechnen wir nicht.</p>
      <p>Paketversand: höchstens 30 kg je Paket. Das erste Paket ist ab 150 € Warenwert frei, jedes weitere Paket wird berechnet. Ab vier Paketen, oder wenn ein Stück schwerer als 30 kg ist, nennen wir den Preis der Spedition auf Anfrage. Die Sätze stehen auf der Seite <Link to="/versand">Versand</Link>.</p>
      <p>Versandkosten innerhalb Deutschlands stehen auf der Seite <Link to="/versand">Versand</Link>{teile ? " und im Checkout des Online-Shops" : ""}. Lieferungen nach Österreich oder in die Schweiz nur nach vorheriger Absprache und gesondertem Angebot.</p>
      <p>Für Starterbatterien erheben wir nach § 19 Batterierecht-Durchführungsgesetz (BattDG) ein Pfand von 7,50 € inklusive Umsatzsteuer je Batterie, wenn Sie beim Kauf keine Starter-Altbatterie zurückgeben. Das Pfand erstatten wir, sobald Sie eine Starter-Altbatterie bei uns abgeben oder an uns zurücksenden; die Pfandquittung (Rechnung) bitte beilegen. Ein Altteilpfand erheben wir nicht.</p>

      <hr />

      <h3>5. Zahlung</h3>
      <ul>
        <li>Online-Shop: Kreditkarte, Apple Pay, Klarna und PayPal.</li>
        {teile && <li>Teilebörse: Kartenzahlung über Stripe und SEPA-Lastschrift über GoCardless. Den Einzug kündigen wir Ihnen vorher per E-Mail an (Pre-Notification).</li>}
        <li>Mitgliedschaft und Produkt-Abo: Karte oder SEPA-Lastschrift. Den Einzug kündigen wir Ihnen vorher per E-Mail an.</li>
        <li>Selbstabholung: zusätzlich Barzahlung oder EC-Karte im Laden.</li>
      </ul>

      <hr />

      <h3>6. Lieferung</h3>
      <p>Wir liefern innerhalb Deutschlands mit DHL oder über unseren Lieferservice im Raum Wuppertal; Selbstabholung in der Handelstraße 64, 42277 Wuppertal ist möglich.</p>
      <p><strong>Lieferzeit:</strong> Sie hängt vom Artikel ab und steht auf der Produktseite sowie im Warenkorb. Innerhalb Deutschlands sind es in der Regel 1–7 Werktage nach Vertragsschluss (bei Vorkasse nach Zahlungseingang). Das ist eine voraussichtliche Angabe, kein festes Datum.{teile ? " Teilebörse: das am Artikel angezeigte voraussichtliche Lieferdatum." : ""}</p>
      <p>Teillieferungen nehmen wir nur vor, wenn sie Ihnen zumutbar sind; zusätzliche Versandkosten entstehen Ihnen dadurch nicht.</p>
      <p>Ist ein bestellter Artikel ohne unser Verschulden nicht lieferbar, weil uns unser Lieferant trotz rechtzeitiger Bestellung nicht beliefert, informieren wir Sie unverzüglich und erstatten bereits geleistete Zahlungen sofort.</p>

      <hr />

      <h3>7. Eigentumsvorbehalt</h3>
      <p>Die Ware bleibt bis zur vollständigen Bezahlung unser Eigentum. Gegenüber Unternehmern gilt zusätzlich: Die Ware bleibt bis zur Begleichung aller Forderungen aus der laufenden Geschäftsbeziehung unser Eigentum.</p>

      <hr />

      <h3>8. Widerrufsrecht</h3>
      <p>Verbrauchern steht ein Widerrufsrecht zu. Einzelheiten, die Online-Funktion „Vertrag widerrufen“ und das Muster-Widerrufsformular finden Sie unter <Link to="/widerruf">Widerrufsrecht</Link>.</p>

      <hr />

      <h3>9. Gewährleistung, Garantie, Haftung</h3>
      <p>Es gelten die gesetzlichen Mängelrechte. Gegenüber Unternehmern beträgt die Verjährungsfrist für Mängelansprüche bei neuen Sachen ein Jahr ab Ablieferung; gegenüber Unternehmern ist die Gewährleistung für gebrauchte Sachen ausgeschlossen. Diese Verkürzungen gelten nicht für Schadensersatzansprüche und nicht bei Arglist oder einer Garantie.</p>
      <p>Garantien geben wir nur, wenn sie am jeweiligen Produkt ausdrücklich genannt sind. Herstellergarantien bleiben unberührt; ihre Bedingungen stehen beim Hersteller.</p>
      <p>Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit, bei Verletzung von Leben, Körper oder Gesundheit, nach dem Produkthaftungsgesetz und im Umfang einer übernommenen Garantie. Bei leicht fahrlässiger Verletzung einer wesentlichen Vertragspflicht (Kardinalpflicht) ist die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt. Im Übrigen ist die Haftung für leichte Fahrlässigkeit ausgeschlossen.</p>
      {teile && (
        <p><strong>Passgenauigkeit (Teilebörse):</strong> Wir zeigen die Fahrzeugzuordnung nach den Katalogdaten (TecDoc). Bitte prüfen Sie vor dem Einbau Ihre Fahrzeugdaten (Fahrzeugschein, Motorcode). Das ändert nichts an Ihren gesetzlichen Rechten, wenn ein Teil nicht zu dem von Ihnen angegebenen Fahrzeug passt.</p>
      )}

      <hr />

      <h3>10. Rücknahme von Altbatterien und Altöl</h3>
      <p>Hinweise zur Rückgabe von Altbatterien und zur kostenlosen Annahme von Altöl finden Sie auf der Seite <Link to="/versand#entsorgung">Versand → Rücknahme und Entsorgung</Link>.</p>

      <hr />

      <h3>11. Mitgliedschaft und Produkt-Abo</h3>
      <p><strong>Vertragsschluss:</strong> Sie stellen Ihre Produktliste zusammen, sehen den Monatsbeitrag und schließen den Vertrag mit dem Klick auf „Zahlungspflichtig bestellen“ und Abschluss der Zahlung bzw. Erteilung des SEPA-Mandats.</p>
      <p><strong>Laufzeit und Kündigung:</strong> Das Produkt-Abo hat eine Mindestlaufzeit von 3 Monaten und verlängert sich danach auf unbestimmte Zeit. Nach den 3 Monaten können beide Seiten zum Ende des laufenden Abrechnungsmonats kündigen. Kündigen Sie vorher, bleiben die offenen Monate der Mindestlaufzeit zahlungspflichtig. Jeder offene Monat wird zum höchsten Monatsbeitrag berechnet, der in diesem Abo bis dahin angefallen ist. Sie können über die Schaltfläche <Link to="/kuendigen">„Verträge hier kündigen“</Link>, per E-Mail an info@alex-autoshop.de oder per Brief kündigen. Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt. Die frühere Dienstleistungs-Mitgliedschaft wird nicht neu angeboten; für bereits bestehende Verträge dieser Art gilt keine Mindestlaufzeit, sie bleiben monatlich zum Monatsende kündbar.</p>
      <p><strong>Beitrag:</strong> Der Monatsbeitrag ist monatlich im Voraus fällig und wird per Karte oder SEPA-Lastschrift eingezogen. Beim Produkt-Abo beträgt er je Position 20 % Ihrer Ersparnis auf dieser Position (Normalpreis minus Abo-Preis, mal Menge), mindestens {euro(PRODUKT_ABO_PREISE[15])} im Monat bei 15 %, {euro(PRODUKT_ABO_PREISE[28])} bei 28 % und {euro(PRODUKT_ABO_PREISE[40])} bei 40 %. Die Ersparnis selbst kürzen wir nicht. Eine Erhöhung des Beitrags über diese Regel hinaus kündigen wir mindestens sechs Wochen vorher in Textform an; sie wird nur wirksam, wenn Sie ihr zustimmen. Stimmen Sie nicht zu, läuft der Vertrag zum bisherigen Beitrag weiter, und beide Seiten können ihn nach der Mindestlaufzeit wie oben kündigen.</p>
      <p><strong>Leistung:</strong> Der Rabatt und der kostenlose Versand gelten im Online-Shop (Lack und Werkstattbedarf) für eine bezahlte Mitgliedschaft der Stufe 1–3, auf den regulären Verkaufspreis, nicht zusätzlich auf Aktionspreise.{teile ? " In der Teilebörse gilt ein Preis für alle. Dort kostet jedes Paket 7,49 €, das erste Paket ist ab 150 € Warenwert frei, jedes weitere Paket wird berechnet. Ab vier Paketen nennen wir den Preis der Spedition auf Anfrage. Das gilt auch für Mitglieder." : ""} Abholung in Wuppertal ist kostenlos.</p>

      <hr />

      <h3>12. Kundenservice und Streitbeilegung</h3>
      <p>Fragen, Reklamationen und Beschwerden: info@alex-autoshop.de oder WhatsApp/Telefon 0202 82690 (Mo–Fr 9–17:30, Sa 9–14 Uhr).</p>
      <p>Wir sind nicht verpflichtet und nicht bereit, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen (§ 36 VSBG). Die Europäische Plattform zur Online-Streitbeilegung ist seit dem 20. Juli 2025 eingestellt. Einen Link dorthin gibt es nicht mehr.</p>

      <hr />

      <h3>13. Schlussbestimmungen</h3>
      <p>Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Bei Verbrauchern gilt diese Rechtswahl nur, soweit dadurch nicht der Schutz durch zwingende Vorschriften des Staates entzogen wird, in dem der Verbraucher seinen gewöhnlichen Aufenthalt hat. Ist der Kunde Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen, ist Gerichtsstand Wuppertal.</p>
    </article>
  </div>
  );
};

export default AGB;
