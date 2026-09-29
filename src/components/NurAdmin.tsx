import { Link } from "react-router-dom";
import { Lock, Phone } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ADMIN_EMAILS } from "@/lib/inbox";
import { SHOP_INFO } from "@/data/shopInfo";
import { Seo } from "@/components/Seo";

/**
 * Die Fahrzeugbörse ist noch nicht öffentlich — sichtbar nur für das
 * Admin-Konto. Alle anderen sehen einen Hinweis statt der Fahrzeuge.
 * Zum Freischalten für alle: in App.tsx <NurAdmin> um die Routen entfernen.
 */
export function NurAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const istAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email);

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">Lädt …</div>;
  }
  if (istAdmin) return <>{children}</>;

  return (
    <div className="container py-20 sm:py-28">
      <Seo title="Fahrzeugbörse – in Vorbereitung" description="Die Fahrzeugbörse von Alex Autoshop ist noch in Vorbereitung." noindex />
      <div className="max-w-lg mx-auto text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl sm:text-3xl mb-4">Fahrzeugbörse — noch nicht offen</h1>
        <p className="text-muted-foreground leading-relaxed mb-8">
          Wir bauen den Bereich gerade auf. Wenn du ein bestimmtes Fahrzeug suchst,
          ruf einfach an — wir haben eine ganze Halle voll.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href={`tel:${SHOP_INFO.phoneIntl}`} className="btn-primary">
            <Phone className="w-5 h-5" /> {SHOP_INFO.phone}
          </a>
          <Link to="/" className="btn-outline">Zur Startseite</Link>
        </div>
      </div>
    </div>
  );
}
