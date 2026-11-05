import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { useTeileboerseSichtbar } from "@/lib/teileboerseSichtbar";
import { TEILEBOERSE_HINWEIS } from "../../shared/teileboerse-schalter.js";

/** Hält die Börse aus dem Baum, solange der Schalter zu und niemand das Admin-Konto ist. */
export function TeileboerseTor({ children }: { children: ReactNode }) {
  const { sichtbar, loading } = useTeileboerseSichtbar();
  if (loading) return <div className="min-h-[50vh]" />;
  if (sichtbar) return <>{children}</>;
  return (
    <div className="container py-20 sm:py-28">
      <Seo title={TEILEBOERSE_HINWEIS} description={TEILEBOERSE_HINWEIS} noindex />
      <div className="max-w-lg mx-auto text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary mb-3">Alex Autoshop</p>
        <h1 className="text-2xl sm:text-3xl mb-4">{TEILEBOERSE_HINWEIS}</h1>
        <p className="text-muted-foreground leading-relaxed mb-8">
          Bis dahin findest du Lack und Werkstattbedarf im Shop.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="btn-primary">Zur Startseite</Link>
          <Link to="/shop" className="btn-outline">Zum Shop</Link>
        </div>
      </div>
    </div>
  );
}
