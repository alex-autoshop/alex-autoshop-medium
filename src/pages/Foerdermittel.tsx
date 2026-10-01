import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Phone, MessageCircle, ArrowRight, ChevronDown, CheckCircle, Lock,
  FileSearch, Layers, ClipboardCheck, Lightbulb, Cpu, Handshake,
  Building2, MonitorSmartphone, Leaf, BadgeEuro, Banknote, PiggyBank,
  ShieldCheck, Globe, MapPin, Factory, Rocket, TrendingUp, HelpCircle, Zap, Gauge,
} from "lucide-react";
import { Seo } from "@/components/Seo";
import { FinanzierungsAnfrage } from "@/components/FinanzierungsAnfrage";
import { UmsatzRechner } from "@/components/UmsatzRechner";
import { SHOP_INFO, whatsappLink } from "@/data/shopInfo";
import { FahrzeugbNav, BereichsHero } from "@/components/FahrzeugbNav";
import { cn } from "@/lib/utils";

const auf = { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" } };

/* ------------------------------------------------------------------ *
 *  Inhalte
 * ------------------------------------------------------------------ */

const LEISTUNG = [
  {
    icon: FileSearch,
    titel: "Fördermittel-Analyse",
    text: "Wir prüfen dein Vorhaben gegen die Programme von Bund, Land NRW, EU und KfW. Du bekommst keine Programmliste zum Selberlesen, sondern die zwei oder drei, die bei dir wirklich greifen.",
  },
  {
    icon: Layers,
    titel: "Finanzierungsstruktur",
    text: "Zuschuss, Förderkredit, Beteiligung, Bürgschaft, Hausbankanteil — wie das zusammengesetzt wird, entscheidet über die Kosten der nächsten zehn Jahre. Wir rechnen die Varianten durch.",
  },
  {
    icon: ClipboardCheck,
    titel: "Klarheit & Entscheidungsgrundlage",
    text: "Am Ende steht ein Papier, mit dem du zur Bank, zum Steuerberater oder zu deinen Mitgesellschaftern gehen kannst. Mit Zahlen, Fristen und dem, was dagegen spricht.",
  },
];

const ZIELGRUPPEN = [
  {
    icon: Factory,
    titel: "Bestandsunternehmen",
    kennzahl: "ab ca. 250.000 € Jahresumsatz",
    text: "Werkstatt, Lackierbetrieb, Autohaus, Karosseriebau, Handel — eingeführt, mit Zahlen, die man vorlegen kann. Hier geht es meist um Erweiterung, Ersatzinvestition und Effizienz.",
  },
  {
    icon: Rocket,
    titel: "Gründer & junge Unternehmen",
    kennzahl: "erste drei bis fünf Jahre",
    text: "Erste eigene Werkstatt, Übernahme eines Betriebs, Nachfolge, Ausgründung. Gründungsprogramme, Bürgschaften und Eigenkapitalersatz sind hier der Hebel, nicht der klassische Bankkredit.",
  },
  {
    icon: TrendingUp,
    titel: "Wachstumsunternehmen",
    kennzahl: "Investition steht konkret an",
    text: "Zweiter Standort, neue Halle, Maschinenpark, Digitalisierung. Wenn investiert wird, entscheidet die Förderung oft nicht über das Ob, sondern über das Tempo.",
  },
];

const ABLAUF = [
  { nr: "01", titel: "Erstgespräch", text: "Kostenlos, zwanzig bis dreißig Minuten. Vorhaben, Summe, Zeitplan — danach wissen wir beide, ob es sich lohnt." },
  { nr: "02", titel: "Vorhaben schärfen", text: "Was genau wird gemacht, was kostet es, was davon ist förderfähig und was nicht. Die meisten Vorhaben werden hier konkreter als vorher." },
  { nr: "03", titel: "Förder-Check", text: "Abgleich gegen Bund, Länder, EU, KfW und die regionalen Töpfe. Du bekommst die passenden Programme mit Quote, Frist und Bedingungen." },
  { nr: "04", titel: "Struktur bauen", text: "Zuschuss, Förderkredit, Eigenkapital, Bürgschaft und Hausbankanteil werden zu einem Paket zusammengesetzt, das trägt." },
  { nr: "05", titel: "Unterlagen vorbereiten", text: "Konzept, Zahlen, Anlagen. Hier scheitern die meisten Anträge — am Papier, nicht am Programm." },
  { nr: "06", titel: "Antrag stellen", text: "Vor Vorhabenbeginn. Wer vorher bestellt oder unterschreibt, verliert den Zuschuss — das ist der häufigste und teuerste Fehler." },
  { nr: "07", titel: "Bescheid, Abruf & Nachweis", text: "Mittelabruf, Verwendungsnachweis, Fristen. Auf Wunsch begleiten wir das bis zur Schlussabrechnung." },
];

interface Bereich {
  icon: typeof Lightbulb;
  titel: string;
  anreisser: string;
  vorhaben: string[];
  kosten: string[];
}

const BEREICHE: Bereich[] = [
  {
    icon: Lightbulb,
    titel: "Innovation & Entwicklung",
    anreisser: "Wenn etwas entsteht, das es im Betrieb vorher nicht gab.",
    vorhaben: [
      "Neue Verfahren in Aufbereitung, Lackierung oder Instandsetzung",
      "Entwicklung eigener Produkte, Werkzeuge oder Mischsysteme",
      "Prototypen, Versuchsreihen, Prüfaufbauten",
      "Entwicklungskooperation mit Hochschule oder Institut",
    ],
    kosten: [
      "Personalkosten der am Vorhaben beteiligten Mitarbeiter",
      "Aufträge an externe Entwickler, Institute, Labore",
      "Material und Verbrauch für Versuche",
      "Schutzrechte, Patent- und Anmeldekosten",
    ],
  },
  {
    icon: Cpu,
    titel: "KI & Automatisierung",
    anreisser: "Der Bereich mit den derzeit höchsten Quoten — und dem größten Antragsaufwand.",
    vorhaben: [
      "Teile- und Schadenerkennung per Bild",
      "Automatische Kalkulation und Angebotserstellung",
      "Lager- und Kommissionierautomatisierung",
      "Preis-, Dispositions- und Prognosesysteme",
    ],
    kosten: [
      "Softwareentwicklung, intern und extern",
      "Lizenzen für die Dauer des Vorhabens",
      "Datenaufbereitung, Annotation, Training",
      "Qualifizierung der Mitarbeiter am neuen System",
    ],
  },
  {
    icon: Handshake,
    titel: "Beteiligungskapital & Wachstum",
    anreisser: "Wenn die Sicherheiten ausgereizt sind, aber das Geschäft trägt.",
    vorhaben: [
      "Expansion, zweiter Standort, Filialisierung",
      "Betriebsübernahme und Nachfolgelösung",
      "Aufbau einer eigenen Marke oder eines eigenen Vertriebs",
      "Stärkung der Eigenkapitalquote vor einer großen Finanzierung",
    ],
    kosten: [
      "Stille und offene Beteiligungen",
      "Mezzanine- und Nachrangdarlehen",
      "Eigenkapitalersatz für Gründer und Übernehmer",
      "Typisch ab sechsstelligem Finanzierungsbedarf",
    ],
  },
  {
    icon: Building2,
    titel: "Gewerbliche Immobilien & Standortentwicklung",
    anreisser: "Der größte Posten in der Kfz-Branche — und der mit den längsten Vorlaufzeiten.",
    vorhaben: [
      "Kauf, Neubau oder Erweiterung von Halle und Werkstatt",
      "Umbau, Hebebühnen, Lackier- und Trockenkabine",
      "Grundstück, Hof, Stellfläche, Außenanlagen",
      "Ladeinfrastruktur und Umstellung auf E-Mobilität",
    ],
    kosten: [
      "Grundstück und Gebäude",
      "Bau- und Baunebenkosten, Planung, Genehmigung",
      "Energetische Maßnahmen an der Gebäudehülle",
      "Fest eingebaute Betriebsvorrichtungen",
    ],
  },
  {
    icon: MonitorSmartphone,
    titel: "Digitalisierung & Industrie 4.0",
    anreisser: "Der Einstieg mit dem besten Verhältnis von Aufwand zu Quote.",
    vorhaben: [
      "Warenwirtschaft, Werkstattsoftware, Kassensystem",
      "Onlineshop, Kundenportal, digitale Auftragsannahme",
      "Schnittstellen zu Lieferanten und Teilekatalogen",
      "IT-Sicherheit, Backup, Datenschutzstruktur",
    ],
    kosten: [
      "Software, Lizenzen und Einrichtung",
      "Implementierung und externe Beratung",
      "Hardware im Projektzusammenhang",
      "Schulung der Mitarbeiter",
    ],
  },
  {
    icon: Leaf,
    titel: "Energie & Effizienz",
    anreisser: "Für Lackier- und Werkstattbetriebe oft der schnellste Zuschuss.",
    vorhaben: [
      "Absauganlage, Druckluft, Trocknung erneuern",
      "Hallenheizung, Dämmung, LED-Umstellung",
      "Photovoltaik mit Eigenverbrauch, Speicher",
      "Energieberatung und Messkonzept als Vorstufe",
    ],
    kosten: [
      "Anlagen und Einbau",
      "Energieberatung und Fachplanung",
      "Mess-, Steuer- und Regeltechnik",
      "Nachweis der Einsparung nach Umsetzung",
    ],
  },
];

const FOERDERARTEN = [
  {
    icon: BadgeEuro,
    titel: "Zuschüsse",
    text: "Geld, das nicht zurückgezahlt wird. Dafür mit Auflagen, Fristen und Nachweispflicht. Die Quote hängt an Programm, Betriebsgröße und Standort.",
  },
  {
    icon: Banknote,
    titel: "Förderkredite",
    text: "Darlehen mit Zinsvorteil, langen Laufzeiten und oft tilgungsfreien Anfangsjahren. Laufen in der Regel über deine Hausbank, nicht direkt.",
  },
  {
    icon: PiggyBank,
    titel: "Beteiligungskapital",
    text: "Eigenkapital von außen, ohne klassische Sicherheiten. Stärkt die Bilanz — und damit auch die Kreditlinie, die du danach bekommst.",
  },
  {
    icon: ShieldCheck,
    titel: "Haftungsfreistellung & Bürgschaften",
    text: "Wenn die Sicherheiten fehlen, übernimmt eine Bürgschaftsbank einen Teil des Risikos. Oft genau das Stück, das die Finanzierung möglich macht.",
  },
  {
    icon: Globe,
    titel: "EU-Programme",
    text: "Größere Vorhaben, Forschung, Kooperationen über Grenzen. Aufwendiger im Antrag, dafür deutlich höhere Volumina.",
  },
  {
    icon: MapPin,
    titel: "Regionalförderung",
    text: "NRW hat eigene Programme, dazu kommen Kreis und Stadt. Für Wuppertal und das Bergische Land ist das oft der kürzeste Weg zum Geld.",
  },
];

const SCHNELLWEGE = [
  {
    icon: Zap,
    titel: "Schnell und überschaubar",
    summe: "ab 1.000 €",
    dauer: "oft in zwei bis drei Werktagen auf dem Konto",
    text: "Für den Betrag, der kurzfristig fehlt: ein Fahrzeug für den Hof, eine Reparatur, eine Rechnung, die vorfinanziert werden muss.",
    punkte: [
      "Anfrage online, keine Papierberge",
      "Kontoumsätze statt Businessplan",
      "Entscheidung meist am selben oder nächsten Werktag",
    ],
  },
  {
    icon: Gauge,
    titel: "Größere Summen für laufende Betriebe",
    summe: "ab ca. 250.000 € Jahresumsatz",
    dauer: "in der Regel rund zwei Wochen bis zur Auszahlung",
    text: "Wenn der Betrieb Zahlen vorlegen kann, wird die Spanne deutlich größer. Dafür der vollständige Weg mit Unterlagen und Prüfung.",
    punkte: [
      "Vollständige Prüfung mit Jahresabschluss und BWA",
      "Auszahlung auf das Geschäftskonto des Betriebs",
      "Kombinierbar mit einem Förderprogramm",
    ],
  },
];

const KLARTEXT = [
  ["Nur für Gewerbe", "Unternehmen, Selbstständige und Freiberufler. Für Privatpersonen gibt es dieses Produkt nicht."],
  ["Keine Zusage im Voraus", "Über Angebot, Summe und Konditionen entscheidet der Finanzierungspartner nach Prüfung — nicht wir. Wer dir vorher eine Zusage gibt, verkauft dir etwas."],
];

const UMSETZUNG = [
  "Antragsunterlagen und Vorhabenkonzept erstellen",
  "Kommunikation mit Förderstelle, Bürgschaftsbank und Hausbank",
  "Mittelabruf und Verwendungsnachweis",
  "Fristen- und Auflagenkontrolle über die Laufzeit",
  "Schlussabrechnung und Vorbereitung auf die Prüfung",
];

const FRAGEN = [
  {
    frage: "Was kostet die Beratung?",
    antwort: "Erstgespräch und Förder-Check kosten nichts. Was danach kommt, sagen wir dir vorher und nicht hinterher — abhängig von Vorhaben und Aufwand. In einigen Programmen ist ein Teil der Beratungskosten selbst förderfähig.",
  },
  {
    frage: "Wie lange dauert das?",
    antwort: "Vom Erstgespräch bis zum fertigen Antrag je nach Vorhaben zwei bis sechs Wochen — der Löwenanteil davon sind deine Unterlagen. Bis zum Bescheid dann meist zwei bis vier Monate, bei EU-Programmen länger.",
  },
  {
    frage: "Kann ich Fördermittel auch nachträglich beantragen?",
    antwort: "In der Regel nicht. Fast alle Programme verlangen den Antrag vor Vorhabenbeginn, und als Beginn zählt schon eine Bestellung, ein unterschriebener Kaufvertrag oder ein Bauauftrag. Wenn du investieren willst: vorher anrufen, nicht nachher.",
  },
  {
    frage: "Gibt es eine Garantie, dass die Förderung kommt?",
    antwort: "Nein — und wer dir eine verspricht, meint es nicht ernst. Über die Bewilligung entscheidet die Förderstelle. Beeinflussen lassen sich die Wahl des Programms und die Qualität des Antrags, und das ist in der Praxis schon der halbe Unterschied.",
  },
  {
    frage: "Muss ich ein Gewerbe haben?",
    antwort: "Ja. Fördermittel für betriebliche Investitionen gehen an Unternehmen, Selbstständige, Freiberufler und Gründer — nicht an Privatpersonen. Für den privaten Autokauf gibt es bei uns die Kfz-Finanzierung.",
  },
];

/* ------------------------------------------------------------------ *
 *  Seite
 * ------------------------------------------------------------------ */

export default function Foerdermittel() {
  const [offen, setOffen] = useState<number | null>(0);
  const [frageOffen, setFrageOffen] = useState<number | null>(null);
  const anfrage =
    "Hallo, ich interessiere mich für den Förder-Check. Betrieb: ... , Vorhaben: ... , geplante Investitionssumme: ...";

  return (
    <div>
      <Seo
        title="Fördermittelberatung & Finanzierung für Betriebe – Wuppertal"
        description="Fördermittelberatung für Werkstätten, Autohäuser, Lackier- und Karosseriebetriebe: Zuschüsse, Förderkredite, Beteiligungskapital und Bürgschaften. Kostenloser Förder-Check, ein Ansprechpartner von der Anfrage bis zur Auszahlung."
        noindex
      />
      <FahrzeugbNav />

      <BereichsHero
        augenbraue="Alex Autoshop · Fördermittel"
        titel="Fördermittelberatung"
        akzent="& Finanzierung."
        text="Strategisch denken, Fördermittel intelligent nutzen. In Deutschland gibt es über 2.000 Förderprogramme — die meisten Betriebe kennen keine drei davon. Wir sortieren, welche zu deinem Vorhaben passen, und bauen die Finanzierung darum herum."
      >
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="#check" className="btn-gold-bright text-lg px-8">
            <FileSearch className="w-5 h-5" /> Kostenlosen Förder-Check starten
          </a>
          <a
            href={`tel:${SHOP_INFO.phoneIntl}`}
            className="btn bg-night/55 border border-white/25 backdrop-blur-sm text-white hover:bg-night/75 text-lg px-8"
          >
            <Phone className="w-5 h-5" /> Kostenloses Erstgespräch
          </a>
        </div>

        <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/70">
          {[
            "Über 2.000 Förderprogramme",
            "Ein Ansprechpartner, kein Callcenter",
            "Deutschlandweit",
            "Schnellfinanzierung ohne Förderprogramm",
          ].map((t) => (
            <li key={t} className="inline-flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-gold-accent shrink-0" /> {t}
            </li>
          ))}
        </ul>
      </BereichsHero>

      {/* Wer berät — ehrliche Zuordnung, bevor irgendeine Leistung versprochen wird */}
      <section className="container pt-10 sm:pt-14">
        <motion.div {...auf} className="card-tilt hover:translate-y-0 p-6 sm:p-7 border-primary/40 bg-primary/5">
          <span className="inline-flex items-center gap-2 text-primary font-semibold text-sm mb-3">
            <Handshake className="w-4 h-4" /> Wer hier berät
          </span>
          <p className="text-[15px] leading-relaxed">
            Du sprichst direkt mit uns — <strong>nicht mit einer Hotline, die dich weiterreicht</strong>.
            Wir nehmen dein Vorhaben auf, prüfen, was dazu passt, und bleiben bis zur Auszahlung dran.
          </p>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            Die Anträge arbeiten wir zusammen mit einem Fachberater aus, der nichts anderes macht als
            Förderprogramme. Für dich bleibt es trotzdem ein Ansprechpartner — du musst dich nicht
            zweimal erklären.
          </p>
        </motion.div>
      </section>

      {/* Was du bekommst */}
      <section className="container py-14 sm:py-20">
        <motion.div {...auf} className="max-w-2xl mb-10">
          <p className="text-primary font-semibold uppercase tracking-wide text-sm mb-2">Leistung</p>
          <h2 className="text-2xl sm:text-3xl mb-3">Was du hier bekommst</h2>
          <p className="text-muted-foreground leading-relaxed">
            Keine Programmdatenbank zum Durchklicken, sondern eine Entscheidung, die du treffen kannst.
          </p>
        </motion.div>
        <div className="grid sm:grid-cols-3 gap-5">
          {LEISTUNG.map((l, i) => (
            <motion.div key={l.titel} {...auf} transition={{ delay: i * 0.07 }} className="card-tilt p-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <l.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg mb-2">{l.titel}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{l.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Für wen */}
      <section className="bg-secondary/60 py-14 sm:py-20">
        <div className="container">
          <motion.div {...auf} className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-primary font-semibold uppercase tracking-wide text-sm mb-2">Zielgruppe</p>
            <h2 className="text-2xl sm:text-3xl mb-3">Für wen ist das geeignet?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Fördermittel sind kein Rettungsinstrument. Sie greifen dort, wo ohnehin investiert wird.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-3 gap-5">
            {ZIELGRUPPEN.map((z, i) => (
              <motion.div key={z.titel} {...auf} transition={{ delay: i * 0.07 }} className="card-tilt hover:translate-y-0 p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <z.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg mb-1">{z.titel}</h3>
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">{z.kennzahl}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{z.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Ablauf */}
      <section className="container py-14 sm:py-20">
        <motion.div {...auf} className="max-w-2xl mb-10">
          <p className="text-primary font-semibold uppercase tracking-wide text-sm mb-2">Ablauf</p>
          <h2 className="text-2xl sm:text-3xl mb-3">So läuft die Fördermittelberatung ab</h2>
          <p className="text-muted-foreground leading-relaxed">
            Sieben Schritte. Die ersten drei kosten dich nichts außer einem Telefonat.
          </p>
        </motion.div>

        <ol className="relative border-l border-border ml-5 sm:ml-6 space-y-8">
          {ABLAUF.map((s, i) => (
            <motion.li key={s.nr} {...auf} transition={{ delay: i * 0.05 }} className="pl-7 sm:pl-9">
              <span className="absolute -left-[21px] sm:-left-[25px] w-[42px] h-[42px] sm:w-[50px] sm:h-[50px] rounded-full bg-primary/10 border-2 border-background flex items-center justify-center font-display font-bold text-primary text-sm sm:text-base">
                {s.nr}
              </span>
              <h3 className="text-lg mb-1.5">{s.titel}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{s.text}</p>
            </motion.li>
          ))}
        </ol>
      </section>

      {/* Förderbereiche — Akkordeon */}
      <section className="bg-secondary/60 py-14 sm:py-20">
        <div className="container">
          <motion.div {...auf} className="max-w-2xl mb-10">
            <p className="text-primary font-semibold uppercase tracking-wide text-sm mb-2">Förderbereiche</p>
            <h2 className="text-2xl sm:text-3xl mb-3">Förderbereiche im Detail</h2>
            <p className="text-muted-foreground leading-relaxed">
              Aufklappen und nachsehen, was in deinem Bereich förderfähig ist — und was erfahrungsgemäß nicht.
            </p>
          </motion.div>

          <div className="space-y-3 max-w-4xl">
            {BEREICHE.map((b, i) => {
              const istOffen = offen === i;
              return (
                <motion.div
                  key={b.titel}
                  {...auf}
                  transition={{ delay: i * 0.04 }}
                  className={cn(
                    "rounded-2xl border bg-card overflow-hidden transition-colors",
                    istOffen ? "border-primary/50" : "border-border"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setOffen(istOffen ? null : i)}
                    aria-expanded={istOffen}
                    className="w-full flex items-center gap-4 text-left p-5 min-h-[64px] hover:bg-primary/5 transition-colors"
                  >
                    <span className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <b.icon className="w-5 h-5 text-primary" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-display font-bold text-base sm:text-lg leading-snug">{b.titel}</span>
                      <span className="block text-sm text-muted-foreground mt-0.5">{b.anreisser}</span>
                    </span>
                    <ChevronDown
                      className={cn("w-5 h-5 text-primary shrink-0 transition-transform", istOffen && "rotate-180")}
                    />
                  </button>

                  {istOffen && (
                    <div className="px-5 pb-5 pt-0 border-t border-border/70">
                      <div className="grid sm:grid-cols-2 gap-6 pt-5">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-primary mb-3">
                            Typische Vorhaben
                          </h4>
                          <ul className="space-y-2">
                            {b.vorhaben.map((v) => (
                              <li key={v} className="flex items-start gap-2.5 text-sm leading-relaxed">
                                <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {v}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-primary mb-3">
                            Förderfähige Kosten
                          </h4>
                          <ul className="space-y-2">
                            {b.kosten.map((k) => (
                              <li key={k} className="flex items-start gap-2.5 text-sm leading-relaxed">
                                <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {k}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <a
                        href="#check"
                        className="inline-flex items-center gap-1.5 text-primary font-semibold text-sm hover:underline mt-5"
                      >
                        Passt das auf dein Vorhaben? Förder-Check starten <ArrowRight className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Förderarten */}
      <section className="container py-14 sm:py-20">
        <motion.div {...auf} className="max-w-2xl mb-10">
          <p className="text-primary font-semibold uppercase tracking-wide text-sm mb-2">Instrumente</p>
          <h2 className="text-2xl sm:text-3xl mb-3">Förderarten im Überblick</h2>
          <p className="text-muted-foreground leading-relaxed">
            In der Praxis wird selten nur eines davon genutzt. Die Kunst ist die Kombination.
          </p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FOERDERARTEN.map((f, i) => (
            <motion.div key={f.titel} {...auf} transition={{ delay: i * 0.05 }} className="card-tilt p-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg mb-2">{f.titel}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Schnellfinanzierung — anderes Produkt als Foerdermittel, klar getrennt */}
      <section id="schnellfinanzierung" className="container py-14 sm:py-20 scroll-mt-40">
        <motion.div {...auf} className="max-w-2xl mb-10">
          <p className="text-primary font-semibold uppercase tracking-wide text-sm mb-2">Ohne Förderprogramm</p>
          <h2 className="text-2xl sm:text-3xl mb-3">Wenn es schneller gehen muss</h2>
          <p className="text-muted-foreground leading-relaxed">
            Fördermittel sind das günstigste Geld, das es gibt — aber sie brauchen Vorlauf. Antrag vor
            Vorhabenbeginn, dann Wochen bis zum Bescheid. Wenn das Geld vorher da sein muss, gibt es einen
            zweiten Weg: eine Finanzierung über unseren Finanzierungspartner, die sich am Umsatz deines
            Betriebs orientiert statt an Sicherheiten.
          </p>
        </motion.div>

        {/* Rechner — gibt eine Hausnummer, bevor jemand ein Formular ausfüllt */}
        <div className="mb-14">
          <UmsatzRechner />
        </div>

        <div className="grid lg:grid-cols-2 gap-5 mb-10">
          {SCHNELLWEGE.map((w, i) => (
            <motion.div key={w.titel} {...auf} transition={{ delay: i * 0.07 }} className="card-tilt hover:translate-y-0 p-7">
              <div className="flex items-start gap-4 mb-4">
                <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <w.icon className="w-6 h-6 text-primary" />
                </span>
                <div>
                  <h3 className="text-lg leading-snug">{w.titel}</h3>
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide mt-1">{w.summe}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{w.text}</p>
              <p className="text-sm font-semibold mb-4">{w.dauer}</p>
              <div className="space-y-2">
                {w.punkte.map((pk) => (
                  <div key={pk} className="flex items-start gap-2.5 text-sm leading-relaxed">
                    <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {pk}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div {...auf} className="grid sm:grid-cols-2 gap-x-8 gap-y-6 mb-12 max-w-4xl">
          {KLARTEXT.map(([t, x]) => (
            <div key={t}>
              <h3 className="text-base mb-1.5">{t}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{x}</p>
            </div>
          ))}
        </motion.div>

        <motion.div {...auf} id="schnellfinanzierung-formular" className="max-w-3xl scroll-mt-40">
          <FinanzierungsAnfrage />
        </motion.div>

        <p className="text-sm text-muted-foreground leading-relaxed mt-6 max-w-3xl">
          Zeitangaben sind Erfahrungswerte und keine Zusage: wie schnell es geht, hängt davon ab, wie
          vollständig deine Unterlagen sind und wie schnell die Bank die Kontoumsätze freigibt.
        </p>
      </section>

      {/* Umsetzung */}
      <section className="bg-secondary/60 py-14 sm:py-20">
        <div className="container grid lg:grid-cols-2 gap-8 items-start">
          <motion.div {...auf}>
            <p className="text-primary font-semibold uppercase tracking-wide text-sm mb-2">Optional</p>
            <h2 className="text-2xl sm:text-3xl mb-4">Umsetzung &amp; Fördermanagement</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Mit dem Bescheid ist die Arbeit nicht zu Ende — da fängt sie für viele erst an. Mittelabruf,
              Nachweise, Auflagen, Fristen. Wer das liegen lässt, zahlt Fördergeld zurück.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Du musst das nicht abnehmen. Bei kleinen Zuschüssen macht man das selbst. Bei mehrjährigen
              Vorhaben mit Nachweispflicht lohnt sich die Begleitung fast immer.
            </p>
          </motion.div>
          <motion.div {...auf} transition={{ delay: 0.08 }} className="card-tilt hover:translate-y-0 p-7">
            <h3 className="text-lg mb-4">Was die Begleitung übernimmt</h3>
            <div className="space-y-2.5">
              {UMSETZUNG.map((u) => (
                <div key={u} className="flex items-start gap-2.5 text-sm leading-relaxed">
                  <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {u}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA-Band */}
      <section id="check" className="section-dark scroll-mt-40">
        <div className="container py-14 sm:py-20 text-center max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-4xl leading-tight mb-4">
            Welche Fördermittel passen wirklich zu{" "}
            <span className="text-gold-accent">deinem Vorhaben?</span>
          </h2>
          <p className="text-white/70 text-lg leading-relaxed mb-8">
            Sag uns in zwei Sätzen, was du vorhast und was es kostet. Wir sagen dir, ob ein Programm
            dazu passt — und wenn nicht, auch das.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href={`tel:${SHOP_INFO.phoneIntl}`} className="btn-gold-bright text-lg px-8">
              <Phone className="w-5 h-5" /> {SHOP_INFO.phone}
            </a>
            <a
              href={whatsappLink(anfrage)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn bg-night/55 border border-white/25 backdrop-blur-sm text-white hover:bg-night/75 text-lg px-8"
            >
              <MessageCircle className="w-5 h-5" /> Per WhatsApp anfragen
            </a>
          </div>
          <p className="inline-flex items-start gap-2 text-sm text-white/55 mt-6 text-left max-w-xl">
            <Lock className="w-4 h-4 text-gold-accent shrink-0 mt-0.5" />
            Nur für Gewerbetreibende, Unternehmen, Freiberufler und Gründer. Erstgespräch und
            Förder-Check sind kostenlos und unverbindlich.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="container py-14 sm:py-20">
        <motion.div {...auf} className="max-w-2xl mb-10">
          <p className="text-primary font-semibold uppercase tracking-wide text-sm mb-2">FAQ</p>
          <h2 className="text-2xl sm:text-3xl">Häufige Fragen</h2>
        </motion.div>
        <div className="space-y-3 max-w-3xl">
          {FRAGEN.map((f, i) => {
            const istOffen = frageOffen === i;
            return (
              <motion.div
                key={f.frage}
                {...auf}
                transition={{ delay: i * 0.04 }}
                className={cn(
                  "rounded-2xl border bg-card overflow-hidden transition-colors",
                  istOffen ? "border-primary/50" : "border-border"
                )}
              >
                <button
                  type="button"
                  onClick={() => setFrageOffen(istOffen ? null : i)}
                  aria-expanded={istOffen}
                  className="w-full flex items-center gap-3 text-left p-5 min-h-[60px] hover:bg-primary/5 transition-colors"
                >
                  <HelpCircle className="w-5 h-5 text-primary shrink-0" />
                  <span className="flex-1 font-semibold">{f.frage}</span>
                  <ChevronDown className={cn("w-5 h-5 text-primary shrink-0 transition-transform", istOffen && "rotate-180")} />
                </button>
                {istOffen && (
                  <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border/70 pt-4">
                    {f.antwort}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Weitere Wege + Rechtshinweis */}
      <section className="container pb-14 sm:pb-20">
        <motion.div {...auf} className="grid sm:grid-cols-2 gap-5">
          <Link to="/kreditvermittlung" className="card-tilt p-6 block">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg mb-2">Gewerbliche Kreditvermittlung</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Ohne Förderprogramm, dafür schneller: Fahrzeugkauf, Händlerbestand, Betriebsmittel.
            </p>
            <span className="inline-flex items-center gap-1.5 text-primary font-semibold text-sm">
              Zur Kreditvermittlung <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
          <Link to="/finanzierung" className="card-tilt p-6 block">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Banknote className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg mb-2">Kfz-Finanzierung</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Für den Fahrzeugkauf aus unserer Fahrzeugbörse — privat und gewerblich.
            </p>
            <span className="inline-flex items-center gap-1.5 text-primary font-semibold text-sm">
              Zur Kfz-Finanzierung <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </motion.div>

        <p className="text-xs text-muted-foreground leading-relaxed mt-8 max-w-3xl">
          Hinweis: Angaben zu unserer Vermittlungstätigkeit und der zuständigen Behörde stehen im{" "}
          <Link to="/impressum" className="underline underline-offset-2 hover:text-foreground">Impressum</Link>.
          Diese Seite ist keine Rechts-, Steuer- oder
          Anlageberatung. Über die Bewilligung von Fördermitteln entscheidet allein die jeweilige
          Förderstelle. Angaben zu Quoten, Fristen und Programmen können sich ändern — maßgeblich sind
          immer die aktuellen Programmrichtlinien.
        </p>
      </section>
    </div>
  );
}
