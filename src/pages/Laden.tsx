import { motion } from "framer-motion";
import { MapPin, Phone, Clock, MessageCircle, Zap, Shield, Users, Navigation } from "lucide-react";
import { Seo } from "@/components/Seo";
import { BrandMarquee } from "@/components/BrandMarquee";
import { SHOP_INFO, whatsappLink } from "@/data/shopInfo";

const VALUES = [
  {
    icon: Zap,
    title: "Schnell & verfügbar",
    text: "Die wichtigsten Lackmaterialien sofort verfügbar — Same-Day für die Region Wuppertal.",
  },
  {
    icon: Shield,
    title: "Nur Qualität",
    text: "Standox, Mipa, Glasurit, 3M, SATA — ausschließlich Marken, denen Profis vertrauen.",
  },
  {
    icon: Users,
    title: "B2B-Partner",
    text: "Für Lackierbetriebe, Karosseriewerkstätten und Aufbereiter — mit Mitgliedschaft bis 38% Rabatt.",
  },
];

export default function Laden() {
  return (
    <div>
      <Seo
        title="Laden & Kontakt – Handelstraße 64, Wuppertal"
        description="Alex Autoshop in Wuppertal: Handelstraße 64, 42277 Wuppertal. Mo–Fr 9–17:30, Sa 9–14. Tel 0202 82690. Lack & Teile aus einer Hand."
      />

      <section className="container py-12 sm:py-16 text-center max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="text-primary font-semibold uppercase tracking-wide text-sm mb-3">Seit 2023 in Wuppertal</p>
          <h1 className="text-3xl sm:text-5xl leading-tight mb-5">
            Alex Autoshop — <span className="text-primary">Lack & Teile</span> aus einer Hand
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Wir liefern professionelle Lackierprodukte, Kfz-Teile und Werkzeuge direkt an Werkstätten,
            Aufbereiter und Privatpersonen in Wuppertal und der gesamten Region.
          </p>
        </motion.div>
      </section>

      {/* Kontakt-Karte + Map */}
      <section className="container pb-12">
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card-tilt hover:translate-y-0 p-6 sm:p-8 flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-bold mb-1">Adresse</p>
                <p className="text-muted-foreground">
                  {SHOP_INFO.street}<br />{SHOP_INFO.zip} {SHOP_INFO.city}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-bold mb-1">Öffnungszeiten</p>
                {SHOP_INFO.hours.map((h) => (
                  <p key={h.days} className="text-muted-foreground">
                    {h.days}: {h.time}
                  </p>
                ))}
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Phone className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-bold mb-1">Telefon</p>
                <a href={`tel:${SHOP_INFO.phoneIntl}`} className="text-primary font-bold text-xl hover:underline">
                  {SHOP_INFO.phone}
                </a>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-auto">
              <a href={`tel:${SHOP_INFO.phoneIntl}`} className="btn-primary flex-1">
                <Phone className="w-5 h-5" /> Anrufen
              </a>
              <a
                href={whatsappLink("Hallo Alex Autoshop!")}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-dark flex-1"
              >
                <MessageCircle className="w-5 h-5" /> WhatsApp
              </a>
              <a
                href={SHOP_INFO.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline flex-1"
              >
                <Navigation className="w-5 h-5" /> Route
              </a>
            </div>
          </div>

          <div className="card-tilt hover:translate-y-0 overflow-hidden min-h-[320px]">
            <iframe
              src={SHOP_INFO.mapsEmbedUrl}
              title="Alex Autoshop auf Google Maps"
              className="w-full h-full min-h-[320px] border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      {/* Werte */}
      <section className="container pb-12">
        <div className="grid sm:grid-cols-3 gap-5">
          {VALUES.map((item) => (
            <div key={item.title} className="card-tilt p-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-lg mb-2">{item.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Marken-Karussell */}
      <BrandMarquee />
    </div>
  );
}
