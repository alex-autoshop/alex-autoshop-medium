import { motion } from "framer-motion";
import { Phone, MessageCircle, CheckCircle, FileCheck, Building2, Car, ScrollText } from "lucide-react";
import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { SHOP_INFO, whatsappLink } from "@/data/shopInfo";
import { FahrzeugbNav, BereichsHero } from "@/components/FahrzeugbNav";
import { FAHRZEUGE } from "@/data/fahrzeuge";

const auf = { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" } };

const ABLAUF = [
  { nr: "01", titel: "Fahrzeug aussuchen", text: "Aus unserem Bestand — oder ein Fahrzeug, das du woanders gefunden hast." },
  { nr: "02", titel: "Rate nennen", text: "Sag uns, was monatlich passt und wie viel du anzahlen kannst." },
  { nr: "03", titel: "Wir holen die Angebote", text: "Wir fragen für dich an und legen dir vor, was dabei herauskommt." },
  { nr: "04", titel: "Du entscheidest", text: "Passt es, wird unterschrieben. Passt es nicht, hat es dich nichts gekostet." },
];

const UNTERLAGEN = [
  "Personalausweis",
  "Einkommensnachweise der letzten Monate",
  "Bei Selbstständigen: BWA oder Steuerbescheid",
  "Bei Gewerbe: Gewerbeanmeldung oder Handelsregisterauszug",
];

export default function Finanzierung() {
  const anfrage = "Hallo, ich interessiere mich für eine Finanzierung. Fahrzeug: ... , gewünschte Rate: ...";
  const guenstigstes = Math.min(...FAHRZEUGE.map((f) => f.preis));
  return (
    <div>
      <Seo
        title="Autofinanzierung & Leasing in Wuppertal | Alex Autoshop"
        description="Fahrzeugfinanzierung über Alex Autoshop in Wuppertal: für Fahrzeuge aus unserem Bestand und von außerhalb, für Privat und Gewerbe. Erlaubnis nach § 34c GewO."
      />
      <FahrzeugbNav />
      <BereichsHero
        augenbraue="Alex Autoshop · Fahrzeugbörse"
        titel="Finanzierung."
        akzent="Ohne Bankdeutsch."
        text="Du sagst uns, welches Auto und welche Rate — wir holen die Angebote ein und legen sie dir auf den Tisch. Für Fahrzeuge aus unserem Bestand genauso wie für eines, das du woanders gefunden hast."
      >
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href={`tel:${SHOP_INFO.phoneIntl}`} className="btn-gold-bright text-lg px-8">
            <Phone className="w-5 h-5" /> {SHOP_INFO.phone}
          </a>
          <a href={whatsappLink(anfrage)} target="_blank" rel="noopener noreferrer"
            className="btn bg-night/55 border border-white/25 backdrop-blur-sm text-white hover:bg-night/75 text-lg px-8">
            <MessageCircle className="w-5 h-5" /> Anfrage schicken
          </a>
        </div>
      </BereichsHero>

      <section className="container py-14 sm:py-20">
        <div className="grid md:grid-cols-2 gap-5">
          <motion.div {...auf} className="card-tilt p-7">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Car className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl mb-2">Für Privatkunden</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Das passende Auto steht da, nur das Geld liegt nicht auf einmal bereit. Genau dafür ist
              die Finanzierung da — wir klären, was monatlich machbar ist, und suchen dazu das Angebot.
            </p>
            <Link to="/fahrzeugboerse" className="text-primary font-semibold text-sm hover:underline">
              Fahrzeuge ab {guenstigstes.toLocaleString("de-DE")} € ansehen →
            </Link>
          </motion.div>

          <motion.div {...auf} transition={{ delay: 0.08 }} className="card-tilt p-7">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl mb-2">Für Werkstätten & Gewerbe</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Ersatzfahrzeug, Transporter, Firmenwagen — finanziert oder geleast, ohne dass dir die
              Liquidität für Material und Löhne fehlt. Als Mitglied bekommst du Fahrzeug, Teile und
              Lack aus einer Hand.
            </p>
            <Link to="/mitgliedschaft" className="text-primary font-semibold text-sm hover:underline">
              Mitgliedschaft ansehen →
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="bg-secondary/60 py-14 sm:py-20">
        <div className="container">
          <motion.div {...auf} className="text-center mb-12 max-w-2xl mx-auto">
            <p className="text-primary font-semibold uppercase tracking-wide text-sm mb-2">So läuft es</p>
            <h2 className="text-2xl sm:text-3xl">Vier Schritte, keine Warteschleife</h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {ABLAUF.map((s, i) => (
              <motion.div key={s.nr} {...auf} transition={{ delay: i * 0.07 }} className="text-center">
                <div className="text-4xl font-display font-bold text-primary/40 mb-3">{s.nr}</div>
                <h3 className="font-bold mb-2">{s.titel}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-14 sm:py-20 grid md:grid-cols-2 gap-6">
        <motion.div {...auf} className="card-tilt hover:translate-y-0 p-7">
          <span className="inline-flex items-center gap-2 text-primary font-semibold text-sm mb-4">
            <FileCheck className="w-4 h-4" /> Was du mitbringst
          </span>
          <h2 className="text-xl mb-4">Unterlagen</h2>
          <div className="space-y-2.5">
            {UNTERLAGEN.map((u) => (
              <div key={u} className="flex items-start gap-2.5 text-sm">
                <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {u}
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-5 leading-relaxed">
            Was genau gebraucht wird, hängt vom Angebot ab — ruf vorher an, dann packst du nur einmal.
          </p>
        </motion.div>

        <motion.div {...auf} transition={{ delay: 0.08 }} className="card-tilt hover:translate-y-0 p-7 flex flex-col">
          <span className="inline-flex items-center gap-2 text-primary font-semibold text-sm mb-4">
            <ScrollText className="w-4 h-4" /> Klartext
          </span>
          <h2 className="text-xl mb-4">Was wir nicht machen</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Wir nennen dir hier keine Zinssätze und keine Monatsraten. Beides hängt von Laufzeit,
            Anzahlung und deiner Situation ab — jede Zahl auf einer Internetseite wäre geraten und
            am Ende für dich teurer als gedacht. Du bekommst eine konkrete Zahl, sobald wir
            angefragt haben, und vorher unterschreibst du nichts.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Vermittlung von Darlehen mit Erlaubnis nach § 34c Gewerbeordnung.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-auto">
            <a href={`tel:${SHOP_INFO.phoneIntl}`} className="btn-primary flex-1">
              <Phone className="w-5 h-5" /> Anrufen
            </a>
            <a href={whatsappLink(anfrage)} target="_blank" rel="noopener noreferrer" className="btn-outline flex-1">
              <MessageCircle className="w-5 h-5" /> WhatsApp
            </a>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
