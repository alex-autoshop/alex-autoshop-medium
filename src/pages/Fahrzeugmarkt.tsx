import { motion } from "framer-motion";
import {
  Car,
  Shield,
  Zap,
  Euro,
  MapPin,
  CheckCircle,
  Users,
  Key,
  Truck,
  Star,
  ExternalLink,
  ArrowRight,
  Phone,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { SHOP_INFO, whatsappLink } from "@/data/shopInfo";

const MARKET_APP = "https://alex-autoshop.github.io/alex-autoshop";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
};

const USP = [
  { icon: Shield, title: "Sicherer Kauf", text: "Verifizierte Inserenten — keine Fake-Angebote. Du weißt immer, mit wem du sprichst." },
  { icon: Zap, title: "Schnellerer Verkauf", text: "Direktkontakt zwischen Käufer und Verkäufer — kein Umweg über teure Plattformen." },
  { icon: Euro, title: "100% kostenlos", text: "Inserieren ist gratis — für Privat und Gewerbe. Keine versteckten Gebühren, keine Provision." },
  { icon: MapPin, title: "Lokal in der Region", text: "Fahrzeuge aus Wuppertal und Umgebung — kurze Wege, persönliche Übergabe." },
];

const STEPS = [
  { num: "01", title: "Kostenlos registrieren", text: "E-Mail reicht — in 60 Sekunden fertig." },
  { num: "02", title: "Fahrzeug inserieren", text: "Fotos, Beschreibung, Preis. Einfach wie eine WhatsApp." },
  { num: "03", title: "Käufer melden sich", text: "Direktkontakt — kein Vermittler dazwischen." },
  { num: "04", title: "Sicher abwickeln", text: "Übergabe beim Händler oder vor Ort — deine Wahl." },
];

const RENT_CATEGORIES = [
  { emoji: "🏎️", label: "Sportwagen", text: "Porsche, BMW M, Mercedes AMG — für das besondere Erlebnis.", examples: ["Porsche 911", "BMW M4", "Mercedes AMG GT"] },
  { emoji: "🚗", label: "Normalfahrzeuge", text: "Kompakt, Mittelklasse, SUV — für Alltag und Reisen.", examples: ["VW Golf", "BMW 3er", "Mercedes C-Klasse"] },
  { emoji: "🚚", label: "Transporter & Vans", text: "Sprinter, Crafter, Ducato — für Umzug, Lieferung, Handwerk.", examples: ["Mercedes Sprinter", "VW Crafter", "Ford Transit"] },
];

export default function Fahrzeugmarkt() {
  return (
    <div>
      <Seo
        title="Fahrzeugmarkt – Autos kaufen, verkaufen & mieten"
        description="Der Fahrzeugmarkt von Alex Autoshop für Wuppertal & Region: kostenlos inserieren, verifizierte Käufer, Direktkontakt. Kaufen, verkaufen, mieten und vermieten."
      />

      {/* Hero */}
      <section className="section-dark relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 50% 20%, #f1eb5b 0%, transparent 50%)" }}
        />
        <div className="container py-20 sm:py-28 relative text-center max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 text-gold-accent font-semibold uppercase tracking-wide text-sm mb-5">
              <Car className="w-4 h-4" /> Alex Autoshop · Fahrzeugmarkt
            </span>
            <h1 className="text-4xl sm:text-6xl leading-[1.05] mb-6">
              Sicherer Kauf. <span className="text-gold-accent">Schnellerer Verkauf.</span>
            </h1>
            <p className="text-white/65 text-lg leading-relaxed mb-8">
              Der Fahrzeugmarkt für Wuppertal & die Region. Kostenlos inserieren,
              verifizierte Käufer, Direktkontakt — ohne teure Plattform-Gebühren.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href={MARKET_APP} target="_blank" rel="noopener noreferrer" className="btn-gold-bright text-lg px-8">
                <Car className="w-5 h-5" /> Kostenlos inserieren <ExternalLink className="w-4 h-4 opacity-60" />
              </a>
              <a href={MARKET_APP} target="_blank" rel="noopener noreferrer" className="btn bg-white/10 text-white hover:bg-white/20 text-lg px-8">
                Alle Fahrzeuge ansehen <ArrowRight className="w-5 h-5" />
              </a>
            </div>
            <div className="flex items-center justify-center gap-10 mt-10">
              {[
                { value: "100%", label: "Kostenlos" },
                { value: "24h", label: "Ø Reaktionszeit" },
                { value: "Lokal", label: "Wuppertal & Region" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-xl font-display font-bold text-gold-accent">{s.value}</p>
                  <p className="text-xs text-white/45 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* USPs */}
      <section className="container py-14 sm:py-20">
        <motion.div {...fadeUp} className="mb-8">
          <h2 className="text-2xl sm:text-3xl">Warum der Alex Fahrzeugmarkt?</h2>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {USP.map((item, i) => (
            <motion.div key={item.title} {...fadeUp} transition={{ delay: i * 0.08 }} className="card-tilt p-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* So funktioniert's */}
      <section className="bg-secondary/60 py-14 sm:py-20">
        <div className="container">
          <motion.div {...fadeUp} className="text-center mb-12 max-w-2xl mx-auto">
            <p className="text-primary font-semibold uppercase tracking-wide text-sm mb-2">So einfach</p>
            <h2 className="text-2xl sm:text-3xl">In 4 Schritten inseriert</h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <motion.div key={step.num} {...fadeUp} transition={{ delay: i * 0.08 }} className="text-center">
                <div className="text-4xl font-display font-bold text-primary/40 mb-3">{step.num}</div>
                <h3 className="font-bold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* B2B */}
      <section className="container py-14 sm:py-20">
        <motion.div {...fadeUp} className="card-tilt hover:translate-y-0 p-8 sm:p-12 flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1">
            <span className="inline-flex items-center gap-2 text-primary font-semibold text-sm mb-4">
              <Users className="w-4 h-4" /> Für Händler & Werkstätten
            </span>
            <h2 className="text-2xl sm:text-3xl mb-4 leading-tight">
              B2B-Händler inserieren <span className="text-primary">kostenlos & unbegrenzt</span>
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Als Alex Autoshop Mitglied kannst du unbegrenzt Fahrzeuge inserieren. Kein Abo, keine Provision.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                "Unbegrenzte Inserate für Mitglieder",
                "Händler-Badge auf deinem Profil",
                "Fahrzeuge mit Werkstatt-Zertifikat",
                "Direkte Anfragen von Privatkäufern",
              ].map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary shrink-0" /> {f}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 w-full md:w-56 shrink-0">
            <a href={MARKET_APP} target="_blank" rel="noopener noreferrer" className="btn-primary">
              <Car className="w-5 h-5" /> Fahrzeugmarkt öffnen
            </a>
            <Link to="/mitgliedschaft" className="btn-outline">Mitglied werden →</Link>
          </div>
        </motion.div>
      </section>

      {/* Mieten & Vermieten */}
      <section className="container pb-14 sm:pb-20">
        <motion.div {...fadeUp} className="mb-10">
          <span className="inline-flex items-center gap-2 text-primary font-semibold text-sm mb-3">
            <Key className="w-4 h-4" /> Neu · Fahrzeugvermietung
          </span>
          <h2 className="text-2xl sm:text-4xl leading-tight mb-3">
            Mieten statt kaufen. <span className="text-primary">Flexibel, sofort, günstig.</span>
          </h2>
          <p className="text-muted-foreground max-w-xl">
            Vom Sportwagen fürs Wochenende bis zum Transporter für den Umzug — private und
            gewerbliche Vermieter, direkt buchbar.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-5 mb-8">
          {RENT_CATEGORIES.map((cat, i) => (
            <motion.div key={cat.label} {...fadeUp} transition={{ delay: i * 0.1 }} className="card-tilt p-6">
              <div className="text-3xl mb-3">{cat.emoji}</div>
              <h3 className="text-lg mb-2">{cat.label}</h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{cat.text}</p>
              <div className="space-y-1.5">
                {cat.examples.map((ex) => (
                  <div key={ex} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" /> {ex}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div {...fadeUp} className="card-tilt hover:translate-y-0 p-6 sm:p-8 flex flex-col md:flex-row gap-8 items-start bg-primary/5 border-primary/30">
          <div className="flex-1">
            <h3 className="text-xl mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" /> Du vermietest ein Fahrzeug?
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                "Kostenlos inserieren",
                "Eigene Preise bestimmen",
                "Mieter werden verifiziert",
                "Direktkontakt mit Mietern",
                "Flexible Mietdauer",
                "Keine Provision",
              ].map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary shrink-0" /> {f}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 w-full md:w-52 shrink-0">
            <a href={MARKET_APP} target="_blank" rel="noopener noreferrer" className="btn-primary">
              <Key className="w-5 h-5" /> Fahrzeug vermieten
            </a>
            <a href={MARKET_APP} target="_blank" rel="noopener noreferrer" className="btn-outline">
              Fahrzeug mieten →
            </a>
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="container pb-16">
        <div className="section-dark rounded-3xl p-8 sm:p-12 text-center max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-4xl mb-3 leading-tight">
            Kaufen. Verkaufen. <span className="text-gold-accent">Mieten. Vermieten.</span>
          </h2>
          <p className="text-white/65 mb-8">Alles auf einem Marktplatz. Kostenlos. Sofort.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href={MARKET_APP} target="_blank" rel="noopener noreferrer" className="btn-gold-bright text-lg px-8">
              <Car className="w-5 h-5" /> Zum Fahrzeugmarkt <ExternalLink className="w-4 h-4 opacity-60" />
            </a>
            <a href={`tel:${SHOP_INFO.phoneIntl}`} className="btn bg-white/10 text-white hover:bg-white/20 text-lg px-8">
              <Phone className="w-5 h-5" /> {SHOP_INFO.phone}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
