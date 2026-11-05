import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { useAuth } from "@/context/AuthContext";
import { ADMIN_EMAILS } from "@/lib/inbox";
import { useVollerKatalog } from "@/hooks/useVollerKatalog";
import { gefahrstoffVonKnoten, gefahrstoffUnvollstaendig, sdbVeraltet } from "../../shared/gefahrstoff.js";

function heute() {
  return new Date().toISOString().slice(0, 10);
}

export default function GefahrstoffBericht() {
  const { user, loading } = useAuth();
  const erlaubt = !!user?.email && ADMIN_EMAILS.includes(user.email);
  const { products, isLoading } = useVollerKatalog("");
  const tag = heute();

  if (loading) return <div className="container py-16 text-muted-foreground">Lädt …</div>;
  if (!erlaubt) {
    return (
      <div className="container py-16 max-w-lg">
        <Seo title="Gefahrstoffe" description="Interner Bericht." noindex />
        <h1 className="text-2xl mb-3">Diese Seite ist nur für das Shop-Konto.</h1>
        <Link to="/konto" className="text-primary font-semibold underline">Anmelden</Link>
      </div>
    );
  }

  const zeilen = products.map((p) => ({ p, g: gefahrstoffVonKnoten(p.node) })).filter((z) => z.g.ist);
  const luecken = zeilen.filter((z) => gefahrstoffUnvollstaendig(z.g));
  const alt = zeilen.filter((z) => sdbVeraltet(z.g.sdbStand, tag));
  const ohneVersand = zeilen.filter((z) => !z.g.versandHinweis);

  const block = (titel: string, liste: typeof zeilen, grund: (g: (typeof zeilen)[0]["g"]) => string) => (
    <section className="space-y-2">
      <h2 className="text-xl">{titel} ({liste.length})</h2>
      {liste.length === 0 ? <p className="text-sm text-muted-foreground">Nichts offen.</p> : (
        <ul className="text-sm space-y-1">
          {liste.map(({ p, g }) => (
            <li key={p.node.id}>
              <Link to={`/produkt/${p.node.handle}`} className="font-semibold text-primary underline">{p.node.title}</Link>
              <span className="text-muted-foreground"> — {grund(g)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div className="container py-10 max-w-3xl space-y-8">
      <Seo title="Gefahrstoff-Bericht" description="Interne Liste unvollständiger Gefahrstoff-Angaben." noindex />
      <h1 className="text-3xl">Gefahrstoff-Bericht</h1>
      <p className="text-sm text-muted-foreground">
        Stand {tag}. Nur Produkte mit gesetztem Kennzeichen. Unvollständige Angaben sind im Shop nicht käuflich.
      </p>
      {isLoading && <p className="text-sm text-muted-foreground">Katalog wird gelesen …</p>}
      {block("Unvollständig (nicht käuflich)", luecken, (g) => {
        const fehlt = [!g.hSaetze.length && "H-Sätze", !g.piktogramme.length && "Piktogramme", !g.signalwort && "Signalwort"].filter(Boolean);
        return fehlt.join(", ") || "Angaben fehlen";
      })}
      {block("Sicherheitsdatenblatt älter als 3 Jahre", alt, (g) => g.sdbStand || "ohne Datum")}
      {block("Ohne Versandhinweis", ohneVersand, () => "versand_hinweis leer")}
    </div>
  );
}
