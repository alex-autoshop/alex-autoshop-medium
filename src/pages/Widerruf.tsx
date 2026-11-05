import { Seo } from "@/components/Seo";
import { SHOP_INFO } from "@/data/shopInfo";
import { VertragsErklaerung } from "@/components/VertragsErklaerung";

/**
 * Widerrufsbelehrung nach dem Muster der Anlage 1 und 3 zu Art. 246a EGBGB,
 * getrennt für Waren (Shop, Teilebörse) und Dienstleistungen (Mitgliedschaft,
 * Produkt-Abo), plus Widerrufsfunktion nach § 356a BGB.
 */
export default function Widerruf() {
  const anschrift = (
    <>
      <strong>Alex Autoshop</strong>, Inhaber {SHOP_INFO.owner}, {SHOP_INFO.street}, {SHOP_INFO.zip} {SHOP_INFO.city},
      Telefon {SHOP_INFO.phone}, E-Mail {SHOP_INFO.email}
    </>
  );
  return (
    <div>
      <Seo title="Widerrufsrecht" description="Widerrufsbelehrung, Widerrufsfunktion und Muster-Widerrufsformular von Alex Autoshop." />
      <article className="prose-legal">
        <h1>Widerrufsrecht</h1>
        <p>Verbraucher haben ein Widerrufsrecht nach Maßgabe der folgenden Belehrungen.</p>

        <h2 id="vertrag-widerrufen">Vertrag widerrufen</h2>
        <p>
          Hier können Sie Ihren Vertrag online widerrufen. Nach dem Klick auf „Widerruf bestätigen“
          sehen Sie sofort eine Eingangsbestätigung mit Datum und Uhrzeit und erhalten sie
          zusätzlich per E-Mail.
        </p>
        <VertragsErklaerung typ="widerruf" />

        <h2>A. Widerrufsbelehrung für den Kauf von Waren</h2>
        <h3>Widerrufsrecht</h3>
        <p>
          Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu
          widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem Sie oder ein von
          Ihnen benannter Dritter, der nicht der Beförderer ist, die Waren in Besitz genommen haben
          bzw. hat. Haben Sie mehrere Waren im Rahmen einer einheitlichen Bestellung bestellt, die
          getrennt geliefert werden, beginnt die Frist an dem Tag, an dem Sie oder ein von Ihnen
          benannter Dritter, der nicht der Beförderer ist, die letzte Ware in Besitz genommen haben
          bzw. hat.
        </p>
        <p>
          Um Ihr Widerrufsrecht auszuüben, müssen Sie uns ({anschrift}) mittels einer eindeutigen
          Erklärung (z. B. ein mit der Post versandter Brief oder eine E-Mail) über Ihren
          Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte
          Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist. Sie können den
          Vertrag auch über die Funktion „Vertrag widerrufen“ auf dieser Seite widerrufen.
        </p>
        <p>
          Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung
          des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.
        </p>
        <h3>Folgen des Widerrufs</h3>
        <p>
          Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen
          erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten,
          die sich daraus ergeben, dass Sie eine andere Art der Lieferung als die von uns
          angebotene, günstigste Standardlieferung gewählt haben), unverzüglich und spätestens
          binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren
          Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir
          dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es
          sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden
          Ihnen wegen dieser Rückzahlung Entgelte berechnet. Wir können die Rückzahlung
          verweigern, bis wir die Waren wieder zurückerhalten haben oder bis Sie den Nachweis
          erbracht haben, dass Sie die Waren zurückgesandt haben, je nachdem, welches der frühere
          Zeitpunkt ist.
        </p>
        <p>
          Sie haben die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab
          dem Tag, an dem Sie uns über den Widerruf dieses Vertrags unterrichten, an uns
          ({SHOP_INFO.street}, {SHOP_INFO.zip} {SHOP_INFO.city}) zurückzusenden oder zu übergeben.
          Die Frist ist gewahrt, wenn Sie die Waren vor Ablauf der Frist von vierzehn Tagen
          absenden.
        </p>
        <p>Sie tragen die unmittelbaren Kosten der Rücksendung der Waren.</p>
        <p>
          Sie müssen für einen etwaigen Wertverlust der Waren nur aufkommen, wenn dieser
          Wertverlust auf einen zur Prüfung der Beschaffenheit, Eigenschaften und Funktionsweise
          der Waren nicht notwendigen Umgang mit ihnen zurückzuführen ist.
        </p>
        <h3>Ausschluss des Widerrufsrechts</h3>
        <p>Das Widerrufsrecht besteht nicht bei Verträgen</p>
        <ul>
          <li>
            zur Lieferung von Waren, die nicht vorgefertigt sind und für deren Herstellung eine
            individuelle Auswahl oder Bestimmung durch den Verbraucher maßgeblich ist oder die
            eindeutig auf die persönlichen Bedürfnisse des Verbrauchers zugeschnitten sind — z. B.
            nach Ihrem Farbcode oder Ihrer Vorlage angemischte Lacke („Wunschfarbe“).
          </li>
        </ul>
        <p>
          <em>Hinweis (kein Teil der Belehrung): Eine Ware, die Sie zur Prüfung geöffnet haben,
          können Sie trotzdem widerrufen. Bei Einbauteilen gilt: Ein bereits eingebautes Teil ist
          kein Widerrufsausschluss, kann aber Wertersatz auslösen.</em>
        </p>

        <h2>B. Widerrufsbelehrung für Mitgliedschaft und Produkt-Abo (Dienstleistungen)</h2>
        <h3>Widerrufsrecht</h3>
        <p>
          Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu
          widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.
        </p>
        <p>
          Um Ihr Widerrufsrecht auszuüben, müssen Sie uns ({anschrift}) mittels einer eindeutigen
          Erklärung (z. B. ein mit der Post versandter Brief oder eine E-Mail) über Ihren
          Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte
          Muster-Widerrufsformular oder die Funktion „Vertrag widerrufen“ auf dieser Seite
          verwenden; das Formular ist jedoch nicht vorgeschrieben. Zur Wahrung der Widerrufsfrist
          reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf
          der Widerrufsfrist absenden.
        </p>
        <h3>Folgen des Widerrufs</h3>
        <p>
          Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen
          erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag
          zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns
          eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie
          bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde
          ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser
          Rückzahlung Entgelte berechnet.
        </p>
        <p>
          Haben Sie verlangt, dass die Dienstleistungen während der Widerrufsfrist beginnen sollen,
          so haben Sie uns einen angemessenen Betrag zu zahlen, der dem Anteil der bis zu dem
          Zeitpunkt, zu dem Sie uns von der Ausübung des Widerrufsrechts hinsichtlich dieses
          Vertrags unterrichten, bereits erbrachten Dienstleistungen im Vergleich zum
          Gesamtumfang der im Vertrag vorgesehenen Dienstleistungen entspricht.
        </p>

        <h2>Muster-Widerrufsformular</h2>
        <p>
          (Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und
          senden Sie es zurück.)
        </p>
        <ul>
          <li>An: Alex Autoshop, Inhaber {SHOP_INFO.owner}, {SHOP_INFO.street}, {SHOP_INFO.zip} {SHOP_INFO.city}, E-Mail: {SHOP_INFO.email}</li>
          <li>Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*)/die Erbringung der folgenden Dienstleistung (*)</li>
          <li>Bestellt am (*)/erhalten am (*)</li>
          <li>Name des/der Verbraucher(s)</li>
          <li>Anschrift des/der Verbraucher(s)</li>
          <li>Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)</li>
          <li>Datum</li>
        </ul>
        <p>(*) Unzutreffendes streichen.</p>
      </article>
    </div>
  );
}
