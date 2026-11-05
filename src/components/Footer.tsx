import { Link } from "react-router-dom";
import { einwilligungZuruecksetzen } from "@/lib/tracking";
import { RotateCcw, ArrowUpRight } from "lucide-react";
import { SHOP_INFO } from "@/data/shopInfo";
import { useTeileboerseSichtbar } from "@/lib/teileboerseSichtbar";

const PRODUKTE = [
  { label: "Alle Produkte", to: "/shop" },
  { label: "Lackierbedarf", to: "/shop/lackierbedarf-alle" },
  { label: "Karosserie & Reparatur", to: "/shop/karosserie-reparatur" },
  { label: "Autopflege & Detailing", to: "/shop/autopflege-detailing" },
  { label: "Öle, Flüssigkeiten & Filter", to: "/shop/oele-fluessigkeiten-filter" },
  { label: "Winter", to: "/shop/winter" },
  { label: "Sets & Sonstiges", to: "/shop/sets-sonstiges" },
];

const SERVICE = [
  { label: "Teilebörse", to: "/teileboerse" },
  { label: "Materialplaner", to: "/dashboard" },
  { label: "Mitgliedschaften", to: "/mitgliedschaft" },
  { label: "Über uns", to: "/laden" },
];

const RECHTLICHES = [
  { label: "Impressum", to: "/impressum" },
  { label: "Datenschutz", to: "/datenschutz" },
  { label: "AGB", to: "/agb" },
  { label: "Versand", to: "/versand" },
  { label: "Widerrufsrecht", to: "/widerruf" },
  { label: "Verträge hier kündigen", to: "/kuendigen" },
];

export function Footer() {
  const { sichtbar: teileSichtbar } = useTeileboerseSichtbar();
  const service = teileSichtbar ? SERVICE : SERVICE.filter((eintrag) => eintrag.to !== "/teileboerse");
  return (
    <footer className="section-dark mt-16">
      <div className="container py-14 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Marke */}
          <div>
            <img src="/images/logo-cropped.png" alt="Alex Autoshop" width={168} height={48} className="h-12 w-auto mb-4" />
            <p className="text-sm text-white/60 leading-relaxed">
              Autolack, Lackierprodukte, Autoteile und Werkstattbedarf — Fachgroßhandel in Wuppertal seit 2021.
            </p>
            <p className="text-sm text-white/60 mt-4">
              {SHOP_INFO.street}<br />{SHOP_INFO.zip} {SHOP_INFO.city}<br />
              <a href={`tel:${SHOP_INFO.phoneIntl}`} className="hover:text-white">{SHOP_INFO.phone}</a>
            </p>
          </div>

          <FooterCol title="Produkte" items={PRODUKTE} />
          <FooterCol title="Service" items={service} />

          <div>
            <h3 className="text-gold-accent font-display text-xs uppercase tracking-[0.2em] mb-4">Rechtliches</h3>
            <ul className="space-y-2.5 text-sm text-white/70">
              {RECHTLICHES.map((i) => (
                <li key={i.to}>
                  <Link to={i.to} className="hover:text-white transition-colors">{i.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* untere Leiste */}
      <div className="border-t border-white/10">
        <div className="container py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
          <span>© {new Date().getFullYear()} Alex Autoshop — {SHOP_INFO.owner}. Alle Rechte vorbehalten.</span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              to="/widerruf#vertrag-widerrufen"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gold-bright/90 text-night font-semibold hover:bg-gold-bright transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Vertrag widerrufen
            </Link>
            <Link
              to="/kuendigen"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/30 text-white font-semibold hover:bg-white/10 transition-colors"
            >
              Verträge hier kündigen
            </Link>
            <button type="button" onClick={einwilligungZuruecksetzen} className="underline hover:text-white">
              Cookie-Einstellungen
            </button>
          </div>
          <span>Wuppertal · NRW · Deutschland</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: { label: string; to: string }[] }) {
  return (
    <div>
      <h3 className="text-gold-accent font-display text-xs uppercase tracking-[0.2em] mb-4">{title}</h3>
      <ul className="space-y-2.5 text-sm text-white/70">
        {items.map((i) => (
          <li key={i.to + i.label}>
            <Link to={i.to} className="hover:text-white transition-colors">{i.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
