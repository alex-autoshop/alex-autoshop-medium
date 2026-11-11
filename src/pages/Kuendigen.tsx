import { Seo } from "@/components/Seo";
import { VertragsErklaerung } from "@/components/VertragsErklaerung";

/** Kündigungsbutton nach § 312k BGB — für Mitgliedschaft und Produkt-Abo. */
export default function Kuendigen() {
  return (
    <div>
      <Seo title="Verträge hier kündigen" description="Mitgliedschaft oder Produkt-Abo bei Alex Autoshop online kündigen." />
      <article className="prose-legal">
        <h1>Verträge hier kündigen</h1>
        <p>
          Hier kündigen Sie Ihre Mitgliedschaft oder Ihr Produkt-Abo bei Alex Autoshop. Sie müssen
          sich dafür nicht anmelden. Nach dem Klick auf „Jetzt kündigen“ sehen Sie sofort eine
          Bestätigung mit Datum und Uhrzeit und erhalten sie zusätzlich per E-Mail.
          Das Produkt-Abo hat eine Mindestlaufzeit von 3 Monaten. Kündigen Sie vorher, berechnen
          wir die offenen Monate zum höchsten bisherigen Monatsbeitrag. Danach endet das Abo zum Monatsende.
        </p>
        <VertragsErklaerung typ="kuendigung" />
        <p><em>Sie können auch formlos per E-Mail an info@alex-autoshop.de oder per Brief kündigen.</em></p>
      </article>
    </div>
  );
}
