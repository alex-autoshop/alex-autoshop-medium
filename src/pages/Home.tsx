import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Phone, MapPin, Clock, Paintbrush, Wrench, BadgePercent } from "lucide-react";
import { Seo } from "@/components/Seo";
import { BrandMarquee } from "@/components/BrandMarquee";
import { MembershipCards } from "@/components/MembershipCards";
import { ProductGrid } from "@/components/ProductGrid";
import { useProducts } from "@/hooks/useProducts";
import { collections } from "@/lib/categories";
import { SHOP_INFO } from "@/data/shopInfo";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5 },
};

const USPS = [
  {
    icon: Paintbrush,
    title: "Profi-Lackierprodukte",
    text: "Standox, Mipa, Glasurit, SATA & Co. — das volle Sortiment für Lackierer und Karosseriebetriebe.",
    badge: "Neues Sortiment",
  },
  {
    icon: Wrench,
    title: "Teile per Kennzeichen",
    text: "Kennzeichen eingeben, Fahrzeug erkannt, passende Teile finden — im Teileportal.",
    badge: "Neu · in Beta",
  },
  {
    icon: BadgePercent,
    title: "B2B-Rabatte bis 40%",
    text: "Drei Mitgliedschaftsstufen für Werkstätten — monatlich kündbar, sofort sparen.",
    badge: "Neu · 10 Spots erhältlich",
  },
];

export default function Home() {
  const { products, isLoading, error } = useProducts({ pageSize: 8 });

  return (
    <div>
      <Seo
        title="Autolack, Autoteile & Werkstattbedarf"
        description="Alex Autoshop Wuppertal: Lackierprodukte, Autoteile und Werkstattbedarf mit B2B-Rabatten bis 40%. Heute bestellt, schnell abholbereit."
      />

      {/* Hero — dunkel mit hellem Brand-Gold */}
      <section className="section-dark relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 70% 30%, #f1eb5b 0%, transparent 45%)",
          }}
        />
        <div className="container py-20 sm:py-28 relative">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="text-gold-accent font-semibold tracking-wide uppercase text-sm mb-4">
              B2B-Distributor in Wuppertal
            </p>
            <h1 className="text-4xl sm:text-6xl max-w-3xl leading-[1.05]">
              Alles für Lack, Karosserie <span className="text-gold-accent">&amp; Werkstatt.</span>
            </h1>
            <p className="text-white/65 text-lg max-w-xl mt-6 leading-relaxed">
              Profi-Lackierprodukte, Autoteile und Werkstattmaterial — von Lackierern für Lackierer.
              Heute bestellt, schnell abholbereit in Wuppertal.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link to="/shop" className="btn-gold-bright text-lg px-8">
                Zum Shop <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/mitgliedschaft" className="btn bg-white/10 text-white hover:bg-white/20 text-lg px-8">
                Bis 40% Rabatt sichern
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* USPs */}
      <section className="container py-14 sm:py-20">
        <div className="grid sm:grid-cols-3 gap-5">
          {USPS.map((usp, i) => (
            <motion.div key={usp.title} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.1 }} className="card-tilt p-6 relative">
              <span className="absolute top-4 right-4 inline-flex items-center rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1 border border-primary/20">
                {usp.badge}
              </span>
              <usp.icon className="w-10 h-10 text-primary mb-4" />
              <h2 className="text-lg mb-2">{usp.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{usp.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Kategorien */}
      <section className="container pb-14 sm:pb-20">
        <motion.div {...fadeUp}>
          <h2 className="text-2xl sm:text-3xl mb-6">Kategorien</h2>
        </motion.div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {collections.map((col, i) => (
            <motion.div key={col.slug} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.05 }}>
              <Link to={`/shop/${col.slug}`} className="card-tilt overflow-hidden group block">
                <div className="aspect-[4/3] overflow-hidden bg-secondary">
                  <img
                    src={col.image}
                    alt={col.label}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4 flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm sm:text-base leading-tight">{col.label}</span>
                  <ArrowRight className="w-5 h-5 text-primary shrink-0" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <BrandMarquee />

      {/* Bestseller */}
      <section className="container py-14 sm:py-20">
        <motion.div {...fadeUp} className="flex items-end justify-between mb-6">
          <h2 className="text-2xl sm:text-3xl">Beliebte Produkte</h2>
          <Link to="/shop" className="text-primary font-semibold text-sm hover:underline flex items-center gap-1 min-h-[44px]">
            Alle ansehen <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
        <ProductGrid products={products} isLoading={isLoading} error={error} />
      </section>

      {/* Mitgliedschaft */}
      <section className="bg-secondary/60 py-14 sm:py-20">
        <div className="container">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl mb-3">Ein Lieferant für deine ganze Werkstatt.</h2>
            <p className="text-muted-foreground">
              Lack, Teile und Werkstattbedarf aus einer Hand — mit bis zu 40% Mitglieder-Rabatt.
              Monatlich kündbar, keine Mindestabnahme.
            </p>
          </motion.div>
          <MembershipCards compact />
        </div>
      </section>

      {/* Laden-Info */}
      <section className="container py-14 sm:py-20">
        <div className="section-dark rounded-3xl p-8 sm:p-12 grid sm:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-2xl sm:text-3xl mb-4">
              Besuch uns im Laden <span className="text-gold-accent">in Wuppertal</span>
            </h2>
            <ul className="space-y-3 text-white/75">
              <li className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gold-accent shrink-0" />
                {SHOP_INFO.street}, {SHOP_INFO.zip} {SHOP_INFO.city}
              </li>
              <li className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gold-accent shrink-0" />
                Mo–Fr 9–17:30 · Sa 9–14
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gold-accent shrink-0" />
                {SHOP_INFO.phone}
              </li>
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <a href={`tel:${SHOP_INFO.phoneIntl}`} className="btn-gold-bright text-lg">
              <Phone className="w-5 h-5" /> Jetzt anrufen
            </a>
            <Link to="/laden" className="btn bg-white/10 text-white hover:bg-white/20 text-lg">
              Anfahrt & Infos <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
