import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";

export default function Gefahrstoffe() {
  return (
    <div className="container py-12 sm:py-16 max-w-3xl">
      <Seo
        title="Gefahrstoffe und Sicherheitsdatenblätter"
        description="Gefahrenhinweise, Piktogramme und Sicherheitsdatenblätter bei Alex Autoshop."
      />
      <h1 className="text-3xl sm:text-4xl mb-6">Gefahrstoffe & Sicherheitsdatenblätter</h1>
      <div className="space-y-4 text-sm sm:text-base leading-relaxed text-muted-foreground">
        <p>
          Manche Lacke, Härter, Verdünnungen und Spraydosen sind Gefahrstoffe. Stehen die Angaben
          im Produkt, zeigen wir auf der Produktseite die Gefahrenpiktogramme, das Signalwort und
          die H-Sätze mit dem hinterlegten Wortlaut.
        </p>
        <p>
          Ein Sicherheitsdatenblatt liegt nicht auf jeder Seite. Wenn ein Link hinterlegt ist, kannst
          du es herunterladen. Sonst forderst du es auf der Produktseite an. Wir schicken es an die
          angegebene Adresse.
        </p>
        <p>
          Gefahrgut betrifft den Transport und ist etwas anderes als die Kennzeichnung als Gefahrstoff.
          Steht bei einem Produkt eine UN-Nummer oder ein Versandhinweis, zeigen wir das im Warenkorb.
          Ein Mindestalter bestätigst du dort ebenfalls, wenn es hinterlegt ist.
        </p>
        <p>
          Fehlen bei einem als Gefahrstoff markierten Produkt die H-Sätze, die Piktogramme oder das
          Signalwort, kannst du es noch nicht kaufen.
        </p>
        <p>
          <Link to="/shop" className="text-primary font-semibold underline">Zum Shop</Link>
        </p>
      </div>
    </div>
  );
}
