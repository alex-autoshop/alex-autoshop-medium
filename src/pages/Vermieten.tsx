import { motion } from "framer-motion";
import { Phone, MessageCircle, CheckCircle, ShieldCheck, Wrench, Euro, Users, AlertTriangle } from "lucide-react";
import { Seo } from "@/components/Seo";
import { SHOP_INFO, whatsappLink } from "@/data/shopInfo";
import { FahrzeugbNav, BereichsHero } from "@/components/FahrzeugbNav";

const auf = { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" } };

const FUER_WEN = [
  { icon: Users, titel: "Zweitwagen, der steht", text: "Das Auto der Kinder, der Wagen vom Opa, das Wohnmobil im Winter — steht mehr als es fährt und kostet trotzdem Steuer und Versicherung." },
  { icon: Wrench, titel: "Firmenfahrzeuge ohne Auslastung", text: "Der Transporter, den du nur zweimal im Monat brauchst. Den Rest der Zeit kann er Geld verdienen statt Platz." },
  { icon: Euro, titel: "Händler & Werkstätten", text: "Fahrzeuge aus dem Bestand, die gerade nicht verkauft werden — bis der Käufer kommt, laufen sie in der Vermietung." },
];

const ABLAUF = [
  { nr: "01", titel: "Fahrzeug anmelden", text: "Ruf an und sag, was du hast: Typ, Baujahr, Zustand, ab wann." },
  { nr: "02", titel: "Wir schauen es an", text: "Kurzer Check bei uns — Technik, Reifen, Papiere. Wir sagen ehrlich, ob es sich lohnt." },
  { nr: "03", titel: "Wir vermieten es", text: "Läuft über unsere gewerbliche Vermietung: versichert, Mieter geprüft, Übergabe bei uns." },
  { nr: "04", titel: "Du bekommst deinen Anteil", text: "Abrechnung nach Miettagen. Was hängen bleibt, besprechen wir vorher — nicht hinterher." },
];

export default function Vermieten() {
  const anfrage = "Hallo, ich möchte mein Fahrzeug über Alex Autoshop vermieten lassen. Fahrzeug: ...";
  return (
    <div>
      <Seo
        title="Auto vermieten lassen – Mietbörse Wuppertal | Alex Autoshop"
        description="Dein Auto steht nur herum? Wir vermieten es für dich: versichert als Selbstfahrervermietfahrzeug, geprüfte Mieter, Übergabe und Werkstatt bei uns in Wuppertal."
      />
      <FahrzeugbNav />
      <BereichsHero
        augenbraue="Alex Autoshop · Fahrzeugbörse"
        titel="Dein Auto steht nur rum?"
        akzent="Lass es arbeiten."
        text="Du gibst das Fahrzeug bei uns ab, wir kümmern uns um Mieter, Versicherung, Übergabe und Technik. Du bekommst deinen Anteil an jedem Miettag — ohne dich um irgendetwas zu kümmern."
      >
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href={`tel:${SHOP_INFO.phoneIntl}`} className="btn-gold-bright text-lg px-8">
            <Phone className="w-5 h-5" /> {SHOP_INFO.phone}
          </a>
          <a href={whatsappLink(anfrage)} target="_blank" rel="noopener noreferrer"
            className="btn bg-night/55 border border-white/25 backdrop-blur-sm text-white hover:bg-night/75 text-lg px-8">
            <MessageCircle className="w-5 h-5" /> Fahrzeug vermieten
          </a>
        </div>
      </BereichsHero>

      <section className="container py-14 sm:py-20">
        <motion.h2 {...auf} className="text-2xl sm:text-3xl mb-3">Für wen sich das lohnt</motion.h2>
        <motion.p {...auf} className="text-muted-foreground mb-8 max-w-2xl">
          Ein Auto, das steht, wird nicht billiger — Versicherung, Steuer und Wertverlust laufen weiter.
        </motion.p>
        <div className="grid sm:grid-cols-3 gap-5">
          {FUER_WEN.map((f, i) => (
            <motion.div key={f.titel} {...auf} transition={{ delay: i * 0.08 }} className="card-tilt p-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg mb-2">{f.titel}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-secondary/60 py-14 sm:py-20">
        <div className="container">
          <motion.div {...auf} className="text-center mb-12 max-w-2xl mx-auto">
            <p className="text-primary font-semibold uppercase tracking-wide text-sm mb-2">So läuft es</p>
            <h2 className="text-2xl sm:text-3xl">Vom Anruf bis zur Abrechnung</h2>
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

      <section className="container py-14 sm:py-20">
        <motion.div {...auf} className="card-tilt hover:translate-y-0 p-8 sm:p-10">
          <span className="inline-flex items-center gap-2 text-primary font-semibold text-sm mb-4">
            <ShieldCheck className="w-4 h-4" /> Warum über uns und nicht privat
          </span>
          <h2 className="text-2xl mb-4 leading-tight">
            Privat verliehen heißt im Schadensfall: <span className="text-primary">du zahlst</span>
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Wer sein Auto gegen Geld verleiht, betreibt gewerbliche Vermietung. Eine normale
                Kfz-Versicherung deckt das nicht — passiert etwas, steht der Halter allein da.
                Über uns läuft das Fahrzeug als <strong>Selbstfahrervermietfahrzeug</strong>: richtig
                versichert, Mieter geprüft, Vertrag sauber.
              </p>
              <div className="flex items-start gap-2.5 rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 text-sm">
                <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Das ist der eigentliche Grund, warum sich das über einen Betrieb lohnt — nicht der Papierkram, sondern die Haftung.</span>
              </div>
            </div>
            <div className="space-y-3">
              {[
                "Versicherung für Selbstfahrervermietfahrzeuge liegt vor",
                "Mieter werden vor der Übergabe geprüft",
                "Übergabe und Rücknahme mit Protokoll",
                "Wartung und Reparatur in unserer eigenen Werkstatt",
                "Reinigung und Aufbereitung zwischen den Mieten",
                "Du entscheidest, wann dein Fahrzeug verfügbar ist",
              ].map((f) => (
                <div key={f} className="flex items-start gap-2.5 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {f}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <a href={`tel:${SHOP_INFO.phoneIntl}`} className="btn-primary">
              <Phone className="w-5 h-5" /> {SHOP_INFO.phone}
            </a>
            <a href={whatsappLink(anfrage)} target="_blank" rel="noopener noreferrer" className="btn-outline">
              <MessageCircle className="w-5 h-5" /> Fahrzeug vermieten
            </a>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
