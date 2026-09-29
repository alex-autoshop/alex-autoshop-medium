import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, MessageCircle, CheckCircle, Building2, Lock, ScrollText, Truck, Wrench, Package, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { SHOP_INFO, whatsappLink } from "@/data/shopInfo";
import { FahrzeugbNav, BereichsHero } from "@/components/FahrzeugbNav";
import { cn } from "@/lib/utils";

const auf = { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" } };

const ZWECKE = [
  { icon: Truck, titel: "Fahrzeugkauf", text: "Einzelne Fahrzeuge für den Betrieb — Firmenwagen, Ersatzfahrzeug, Transporter." },
  { icon: Package, titel: "Händlerbestand", text: "Einkaufsfinanzierung: Fahrzeuge stehen auf dem Hof, das Geld ist gebunden. Genau dafür." },
  { icon: Wrench, titel: "Betriebsmittel", text: "Material, Werkzeug, Hebebühne, Lackierkabine — was der Betrieb zum Arbeiten braucht." },
  { icon: Building2, titel: "Gewerbliche Anschaffungen", text: "Weitere betriebliche Investitionen, soweit sie zulässig finanziert werden können." },
];

const SCHRITTE = [
  { nr: "01", titel: "Gewerbe nachweisen", text: "Gewerbeanmeldung oder Handelsregisterauszug — ohne das geht hier nichts weiter." },
  { nr: "02", titel: "Zahlen und Zweck", text: "Was soll finanziert werden, welche Summe, welche Laufzeit stellst du dir vor." },
  { nr: "03", titel: "Wir fragen an", text: "Wir gehen mit deiner Anfrage zu den Finanzierungspartnern, die zu deinem Fall passen." },
  { nr: "04", titel: "Du entscheidest", text: "Du bekommst die Angebote vorgelegt. Bis zur Unterschrift kostet dich das nichts." },
];

const UNTERLAGEN = [
  "Gewerbeanmeldung oder Handelsregisterauszug",
  "Betriebswirtschaftliche Auswertung (BWA)",
  "Jahresabschluss oder Einnahmenüberschussrechnung",
  "Ausweis des Inhabers oder Geschäftsführers",
];

export default function Kreditvermittlung() {
  // Privatkunden duerfen diesen Bereich nicht nutzen — deshalb liegen die
  // Kontaktwege hinter einer bewussten Bestaetigung, nicht offen herum.
  const [gewerblich, setGewerblich] = useState(false);
  const anfrage = "Hallo, ich bin gewerblicher Kunde und möchte eine Finanzierungsanfrage stellen. Betrieb: ... , Zweck: ... , Summe: ...";

  return (
    <div>
      <Seo
        title="Kreditvermittlung für Gewerbe & Händler – Wuppertal | Alex Autoshop"
        description="Finanzierungsanfragen für Autohändler, Werkstätten und Gewerbetreibende: Fahrzeugkauf, Händlerbestand, Betriebsmittel. Ausschließlich für gewerbliche Kunden. Erlaubnis nach § 34c GewO."
      />
      <FahrzeugbNav />
      <BereichsHero
        augenbraue="Alex Autoshop · Fahrzeugbörse"
        titel="Kreditvermittlung."
        akzent="Nur für Gewerbe."
        text="Für Autohändler, Werkstätten, Unternehmen und Selbstständige. Wir nehmen deine Anfrage auf und gehen damit zu den Finanzierungspartnern — für Fahrzeugkauf, Händlerbestand oder Betriebsmittel."
      >
        <div className="inline-flex items-start gap-2 rounded-xl bg-night/60 border border-gold-bright/30 px-4 py-3 text-left max-w-md">
          <Lock className="w-4 h-4 text-gold-accent shrink-0 mt-0.5" />
          <p className="text-sm text-white/80">
            Dieser Bereich richtet sich <strong className="text-white">ausschließlich an gewerbliche Kunden</strong>.
            Privatkunden können ihn nicht nutzen — für private Fahrzeugkäufe gibt es die{" "}
            <Link to="/finanzierung" className="text-gold-accent underline underline-offset-2">Kfz-Finanzierung</Link>.
          </p>
        </div>
      </BereichsHero>

      <section className="container py-14 sm:py-20">
        <motion.h2 {...auf} className="text-2xl sm:text-3xl mb-3">Wofür</motion.h2>
        <motion.p {...auf} className="text-muted-foreground mb-8 max-w-2xl">
          Der häufigste Fall bei Händlern: das Kapital steht als Fahrzeug auf dem Hof, während der
          nächste Einkauf schon ansteht.
        </motion.p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ZWECKE.map((z, i) => (
            <motion.div key={z.titel} {...auf} transition={{ delay: i * 0.07 }} className="card-tilt p-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <z.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg mb-2">{z.titel}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{z.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-secondary/60 py-14 sm:py-20">
        <div className="container">
          <motion.div {...auf} className="text-center mb-12 max-w-2xl mx-auto">
            <p className="text-primary font-semibold uppercase tracking-wide text-sm mb-2">So läuft es</p>
            <h2 className="text-2xl sm:text-3xl">Von der Anfrage zum Angebot</h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SCHRITTE.map((s, i) => (
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
            <ScrollText className="w-4 h-4" /> Was du mitbringst
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
            Was im Einzelfall verlangt wird, legt der Finanzierungspartner fest — nicht wir.
            Ruf vorher an, dann sammelst du nur einmal.
          </p>
        </motion.div>

        {/* Kontakt erst nach bewusster Bestätigung */}
        <motion.div {...auf} transition={{ delay: 0.08 }} className="card-tilt hover:translate-y-0 p-7 flex flex-col">
          <span className="inline-flex items-center gap-2 text-primary font-semibold text-sm mb-4">
            <Building2 className="w-4 h-4" /> Anfrage stellen
          </span>
          <h2 className="text-xl mb-4">Gewerblich? Dann los.</h2>

          <label className="flex items-start gap-3 rounded-xl border border-border bg-secondary/50 p-4 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={gewerblich}
              onChange={(e) => setGewerblich(e.target.checked)}
              className="mt-0.5 w-5 h-5 accent-primary shrink-0"
            />
            <span className="text-sm leading-relaxed">
              Ich bestätige, dass ich <strong>als Gewerbetreibender, Unternehmen oder Selbstständiger</strong> handele
              und die Finanzierung für betriebliche Zwecke benötige.
            </span>
          </label>

          <div className={cn("mt-5 transition-opacity", gewerblich ? "opacity-100" : "opacity-45 pointer-events-none")}>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href={`tel:${SHOP_INFO.phoneIntl}`} className="btn-primary flex-1" tabIndex={gewerblich ? 0 : -1}>
                <Phone className="w-5 h-5" /> {SHOP_INFO.phone}
              </a>
              <a
                href={whatsappLink(anfrage)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline flex-1"
                tabIndex={gewerblich ? 0 : -1}
              >
                <MessageCircle className="w-5 h-5" /> WhatsApp
              </a>
            </div>
            {!gewerblich && (
              <p className="flex items-start gap-2 text-xs text-muted-foreground mt-3">
                <AlertTriangle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                Setz den Haken, dann kannst du Kontakt aufnehmen.
              </p>
            )}
          </div>

          <p className="text-sm text-muted-foreground mt-auto pt-6 leading-relaxed">
            Den gewerblichen Status prüfen wir anhand deiner Unterlagen, bevor eine Anfrage
            weitergegeben wird. Vermittlung von Darlehen mit Erlaubnis nach § 34c Gewerbeordnung.
            Zinssätze und Raten nennen wir erst, wenn ein Angebot vorliegt — vorher wäre jede Zahl geraten.
          </p>
        </motion.div>
      </section>
    </div>
  );
}
