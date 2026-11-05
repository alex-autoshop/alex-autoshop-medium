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
        </p>
        <VertragsErklaerung typ="kuendigung" />
        <p><em>Sie können auch formlos per E-Mail an info@alex-autoshop.de oder per Brief kündigen.</em></p>
      </article>
    </div>
  );
}
