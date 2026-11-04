import { Seo } from "@/components/Seo";
import { SHOP_INFO } from "@/data/shopInfo";

export default function Widerruf() {
  return (
    <div>
      <Seo title="Widerrufsrecht" description="Widerrufsbelehrung und Muster-Widerrufsformular von Alex Autoshop." />
      <article className="prose-legal">
        <h1>Widerrufsrecht</h1>

        <h2>Widerrufsbelehrung</h2>
        <p>
          Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu
          widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem Sie oder ein von
          Ihnen benannter Dritter, der nicht der Beförderer ist, die Waren in Besitz genommen haben
          bzw. hat.
        </p>
        <p>
          Um Ihr Widerrufsrecht auszuüben, müssen Sie uns
        </p>
        <p>
          <strong>Alex Autoshop</strong> — Inhaber: {SHOP_INFO.owner}<br />
          {SHOP_INFO.street}, {SHOP_INFO.zip} {SHOP_INFO.city}<br />
          Telefon: {SHOP_INFO.phone}<br />
          E-Mail: {SHOP_INFO.email}
        </p>
        <p>
          mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder eine
          E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür
          das beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.
        </p>
        <p>
          Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des
          Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.
        </p>

        <h2>Folgen des Widerrufs</h2>
        <p>
          Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen
          erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die
          sich daraus ergeben, dass Sie eine andere Art der Lieferung als die von uns angebotene,
          günstigste Standardlieferung gewählt haben), unverzüglich und spätestens binnen vierzehn
          Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags
          bei uns eingegangen ist.
        </p>

        <h2>Muster-Widerrufsformular</h2>
        <p>
          (Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und
          senden Sie es zurück.)
        </p>
        <ul>
          <li>An: Alex Autoshop, {SHOP_INFO.street}, {SHOP_INFO.zip} {SHOP_INFO.city}, {SHOP_INFO.email}</li>
          <li>Hiermit widerrufe(n) ich/wir den von mir/uns abgeschlossenen Vertrag über den Kauf der folgenden Waren:</li>
          <li>Bestellt am / erhalten am:</li>
          <li>Name des/der Verbraucher(s):</li>
          <li>Anschrift des/der Verbraucher(s):</li>
          <li>Datum:</li>
        </ul>

        <p><em>Den Widerruf kannst du auch direkt über den Button „Widerruf ausüben" im Seitenfuß per E-Mail senden.</em></p>
      </article>
    </div>
  );
}
