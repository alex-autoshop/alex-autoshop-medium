import { motion } from "framer-motion";
import { Phone, MessageCircle, MapPin, CheckCircle, ShieldCheck, Car, Truck, Package, Sparkles } from "lucide-react";
import { Seo } from "@/components/Seo";
import { SHOP_INFO, whatsappLink } from "@/data/shopInfo";
import { FahrzeugbNav, BereichsHero } from "@/components/FahrzeugbNav";

const auf = { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" } };

const KLASSEN = [
  { icon: Car, titel: "Kleinwagen & Kompakt", text: "Für die Stadt, den Termin auswärts oder als Ersatz, solange dein Auto bei uns in der Werkstatt steht." },
  { icon: Package, titel: "Kombi & Van", text: "Wenn Platz gebraucht wird: Urlaub, Familie, Möbel vom Händler abholen." },
  { icon: Truck, titel: "Transporter", text: "Umzug, Lieferung, Baustelle. Hochdachkombi bis Kastenwagen." },
  { icon: Sparkles, titel: "Besondere Fahrzeuge", text: "Cabrio fürs Wochenende, etwas Größeres für den besonderen Anlass — frag einfach." },
];

const SCHRITTE = [
  { nr: "01", titel: "Anrufen oder schreiben", text: "Sag uns, wann und wofür du ein Fahrzeug brauchst." },
  { nr: "02", titel: "Fahrzeug reservieren", text: "Wir sagen dir sofort, was frei ist und was es kostet." },
  { nr: "03", titel: "Papiere mitbringen", text: "Gültiger Führerschein und Personalausweis, mehr nicht." },
  { nr: "04", titel: "Losfahren", text: "Übergabe bei uns in der Handelstraße, vollgetankt und geprüft." },
];

export default function Mieten() {
  const anfrage = "Hallo, ich möchte ein Fahrzeug mieten. Zeitraum: ... , Fahrzeugtyp: ...";
  return (
    <div>
      <Seo
        title="Auto mieten in Wuppertal – Kleinwagen, Kombi, Transporter | Alex Autoshop"
        description="Fahrzeug mieten in Wuppertal: Kleinwagen, Kombi, Van und Transporter. Versichert als Selbstfahrervermietfahrzeug, Übergabe direkt beim Händler. Preise auf Anfrage."
      />
      <FahrzeugbNav />
      <BereichsHero
        augenbraue="Alex Autoshop · Fahrzeugbörse"
        titel="Auto mieten."
        akzent="Ohne Theater."
        text="Vom Kleinwagen bis zum Transporter — Übergabe bei uns in Wuppertal, ohne Warteschlange am Flughafenschalter und ohne Kleingedrucktes, das erst beim Zurückgeben auffällt."
      >
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href={`tel:${SHOP_INFO.phoneIntl}`} className="btn-gold-bright text-lg px-8">
            <Phone className="w-5 h-5" /> {SHOP_INFO.phone}
          </a>
          <a href={whatsappLink(anfrage)} target="_blank" rel="noopener noreferrer"
            className="btn bg-night/55 border border-white/25 backdrop-blur-sm text-white hover:bg-night/75 text-lg px-8">
            <MessageCircle className="w-5 h-5" /> Per WhatsApp anfragen
          </a>
        </div>
      </BereichsHero>

      <section className="container py-14 sm:py-20">
        <motion.h2 {...auf} className="text-2xl sm:text-3xl mb-8">Was du bei uns mieten kannst</motion.h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {KLASSEN.map((k, i) => (
            <motion.div key={k.titel} {...auf} transition={{ delay: i * 0.07 }} className="card-tilt p-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <k.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg mb-2">{k.titel}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{k.text}</p>
            </motion.div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-6">
          Welche Fahrzeuge gerade frei sind, wechselt täglich — deshalb steht hier keine Liste, sondern
          eine Telefonnummer. Ein Anruf, und du weißt in zwei Minuten, was verfügbar ist und was es kostet.
        </p>
      </section>

      <section className="bg-secondary/60 py-14 sm:py-20">
        <div className="container">
          <motion.div {...auf} className="text-center mb-12 max-w-2xl mx-auto">
            <p className="text-primary font-semibold uppercase tracking-wide text-sm mb-2">So läuft es</p>
            <h2 className="text-2xl sm:text-3xl">In vier Schritten unterwegs</h2>
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

      <section className="container py-14 sm:py-20">
        <motion.div {...auf} className="card-tilt hover:translate-y-0 p-8 sm:p-10 grid md:grid-cols-[1fr_auto] gap-8 items-start">
          <div>
            <span className="inline-flex items-center gap-2 text-primary font-semibold text-sm mb-4">
              <ShieldCheck className="w-4 h-4" /> Richtig versichert
            </span>
            <h2 className="text-2xl mb-4 leading-tight">
              Unsere Mietfahrzeuge sind als <span className="text-primary">Selbstfahrervermietfahrzeuge</span> versichert
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Das ist kein Detail für Versicherungsleute, sondern der Unterschied zwischen „ist versichert"
              und „zahlt im Schadensfall niemand". Wer privat sein Auto verleiht, hat diesen Schutz nicht.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {["Vollständig versicherte Mietfahrzeuge","Fahrzeuge aus eigener Werkstatt gewartet","Übergabe und Rücknahme persönlich","Kurze Wege — alles in Wuppertal"].map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary shrink-0" /> {f}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 w-full md:w-56 shrink-0">
            <a href={`tel:${SHOP_INFO.phoneIntl}`} className="btn-primary w-full">
              <Phone className="w-5 h-5" /> Anrufen
            </a>
            <a href={whatsappLink(anfrage)} target="_blank" rel="noopener noreferrer" className="btn-outline w-full">
              <MessageCircle className="w-5 h-5" /> WhatsApp
            </a>
            <p className="text-xs text-muted-foreground flex items-start gap-2 mt-1">
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              {SHOP_INFO.street}, {SHOP_INFO.zip} {SHOP_INFO.city}
            </p>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
