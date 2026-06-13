import { Link } from "react-router-dom";
import { Phone, MapPin, Clock, MessageCircle } from "lucide-react";
import { SHOP_INFO, whatsappLink } from "@/data/shopInfo";

export function Footer() {
  return (
    <footer className="section-dark mt-16">
      <div className="container py-12 sm:py-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <img src="/images/logo.png" alt="Alex Autoshop" className="h-12 w-auto mb-4" />
          <p className="text-sm text-white/60 leading-relaxed">
            Autolack, Lackierprodukte, Autoteile und Werkstattbedarf — B2B-Distributor in Wuppertal seit 2023.
          </p>
        </div>

        <div>
          <h3 className="text-gold-accent font-display text-base mb-4">Kontakt</h3>
          <ul className="space-y-3 text-sm text-white/75">
            <li className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{SHOP_INFO.street}<br />{SHOP_INFO.zip} {SHOP_INFO.city}</span>
            </li>
            <li>
              <a href={`tel:${SHOP_INFO.phoneIntl}`} className="flex items-center gap-2 hover:text-white">
                <Phone className="w-4 h-4" /> {SHOP_INFO.phone}
              </a>
            </li>
            <li>
              <a
                href={whatsappLink("Hallo Alex Autoshop, ich habe eine Frage.")}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-white"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-gold-accent font-display text-base mb-4">Öffnungszeiten</h3>
          <ul className="space-y-2 text-sm text-white/75">
            {SHOP_INFO.hours.map((h) => (
              <li key={h.days} className="flex items-start gap-2">
                <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{h.days}: {h.time}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-gold-accent font-display text-base mb-4">Rechtliches</h3>
          <ul className="space-y-2 text-sm text-white/75">
            <li><Link to="/impressum" className="hover:text-white">Impressum</Link></li>
            <li><Link to="/datenschutz" className="hover:text-white">Datenschutz</Link></li>
            <li><Link to="/agb" className="hover:text-white">AGB</Link></li>
            <li><Link to="/versand" className="hover:text-white">Versand & Abholung</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container py-5 text-xs text-white/40 flex flex-col sm:flex-row justify-between gap-2">
          <span>© {new Date().getFullYear()} Alex Autoshop — {SHOP_INFO.owner}</span>
          <span>{SHOP_INFO.street}, {SHOP_INFO.zip} {SHOP_INFO.city}</span>
        </div>
      </div>
    </footer>
  );
}
