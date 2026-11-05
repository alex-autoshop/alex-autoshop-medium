import { useState } from "react";
import { Phone, MessageCircle, ChevronDown } from "lucide-react";
import { Seo } from "@/components/Seo";
import { MembershipCards } from "@/components/MembershipCards";
import { MembershipCalculator } from "@/components/MembershipCalculator";
import { ProduktAbo } from "@/components/ProduktAbo";
import { DIENSTLEISTUNG_BUCHBAR } from "../../shared/mitgliedspreise.js";
import { Wrench, PackageSearch } from "lucide-react";
import { SHOP_INFO, whatsappLink } from "@/data/shopInfo";
import { cn } from "@/lib/utils";

type AboArt = "dienstleistung" | "produkt";

const ABOS: { id: AboArt; titel: string; text: string; icon: typeof Wrench }[] = [
  {
    id: "dienstleistung",
    titel: "Dienstleistungs-Mitgliedschaft",
    text: "Rabatt im Shop, dazu Lieferung, Gratis-Farbe, Farbfehlerschutz und Aufbereitung. Nicht in der Teilebörse.",
    icon: Wrench,
  },
  {
    id: "produkt",
    titel: "Produkt-Abo",
    text: "Nur Shop, keine Dienstleistungen: du zahlst pro Produkt und bekommst genau darauf deinen Rabatt.",
    icon: PackageSearch,
  },
];

const FAQ = [
  {
    q: "Gilt die Mitgliedschaft nur in Wuppertal?",
    a: "Nein — deutschlandweit. Jeder kann Mitglied werden: Werkstätten, Aufbereiter, Selbstständige und auch Privatkunden. Die Mitgliedschaft gilt im Shop: dort ist der Versand mit aktiver bezahlter Mitgliedschaft (Level 1–3) kostenlos. In der Teilebörse gilt ein Preis für alle, und DHL kostet 7,49 €, frei ab 150 € Warenwert — auch für Mitglieder.",
  },
  {
    q: "Wie werde ich Mitglied?",
    a: "Ruf uns an (0202 82690), schreib per WhatsApp oder komm direkt im Laden vorbei. Die Anmeldung dauert 5 Minuten — der Rabatt gilt sofort.",
  },
  {
    q: "Kann ich monatlich kündigen?",
    a: "Ja, die Mitgliedschaft ist monatlich kündbar. Keine Mindestlaufzeit, kein Risiko.",
  },
  {
    q: "Gilt der Rabatt auf alles?",
    a: "Der Rabatt gilt im Shop auf Lack und Werkstattbedarf. In der Teilebörse gibt es keine Mitgliedspreise und keinen Mitglieds-Versand: dort zahlt jeder denselben Preis, DHL 7,49 €, frei ab 150 €.",
  },
  {
    q: "Kann ich den Rabatt später ändern?",
    a: "Jederzeit zum Monatswechsel — hoch oder runter, je nachdem wie viel dein Betrieb gerade braucht.",
  },
  {
    q: "Für wen lohnt sich welcher Rabatt?",
    a: "Faustregel: 15 % lohnen sich ab ca. 330 € Material-Einkauf pro Monat, 28 % ab ca. 900 € — je mehr du einkaufst, desto stärker ziehen 40 %. Am genausten siehst du es im Rechner oben.",
  },
];

export default function Mitgliedschaft() {
  const [abo, setAbo] = useState<AboArt>(DIENSTLEISTUNG_BUCHBAR ? "dienstleistung" : "produkt");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div>
      <Seo
        title="Mitgliedschaft – bis 40% Rabatt, deutschlandweit"
        description="Mitgliedschaft im Shop: Rabatt auf Lack und Werkstattbedarf, kostenloser Versand für Mitglieder. Die Teilebörse hat einen Preis für alle. Monatlich kündbar."
      />

      <section className="section-dark py-16 sm:py-20">
        <div className="container text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full bg-gold-bright/15 border border-gold-bright/30 text-gold-accent text-xs font-bold uppercase tracking-wide px-4 py-1.5 mb-5">
            🔥 Brandneu · Mitgliedschaft
          </span>
          <h1 className="text-3xl sm:text-5xl mb-4">
            Dein Betrieb. <span className="text-gold-accent">Deine Konditionen.</span>
          </h1>
          <p className="text-white/65 text-lg">
            Die Mitgliedschaft gilt im Shop: Rabatt auf Lack und Werkstattbedarf,
            und kostenloser Versand für Mitglieder. Die Teilebörse hat einen Preis für alle.
            Monatlich kündbar, keine Mindestabnahme.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {["🇩🇪 Deutschlandweit verfügbar", "Für jeden abschließbar — Werkstatt wie privat", "Lieferung direkt zu dir"].map((t) => (
              <span key={t} className="rounded-full bg-white/5 border border-white/15 px-4 py-1.5 text-sm font-semibold text-white/85">
                {t}
              </span>
            ))}
          </div>
          <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white/80">
            <span className="font-bold text-gold-accent">Nur 10 Gründungs-Plätze</span>
            zu diesen Konditionen — danach werden die Beiträge angehoben.
          </div>
        </div>
      </section>

      {/* ── Zwei Mitgliedschaften zur Auswahl ───────────────────────────── */}
      <section className="container py-12 sm:py-16 -mt-8">
        <div className={cn(
          "grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto mb-10",
          !DIENSTLEISTUNG_BUCHBAR && "hidden"
        )} role="tablist" aria-label="Mitgliedschaft wählen">
          {ABOS.map((a) => {
            const aktiv = abo === a.id;
            return (
              <button
                key={a.id}
                type="button"
                role="tab"
                aria-selected={aktiv}
                onClick={() => setAbo(a.id)}
                className={cn(
                  "rounded-2xl border-2 p-5 sm:p-6 text-left transition-all duration-200",
                  aktiv
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
                )}
              >
                <span className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center mb-3",
                  aktiv ? "bg-primary/20" : "bg-primary/10"
                )}>
                  <a.icon className="w-5 h-5 text-primary" />
                </span>
                <span className="block font-display font-bold text-lg leading-snug">{a.titel}</span>
                <span className="block text-sm text-muted-foreground mt-1 leading-relaxed">{a.text}</span>
                <span className={cn(
                  "inline-block text-xs font-semibold mt-3",
                  aktiv ? "text-primary" : "text-muted-foreground"
                )}>
                  {aktiv ? "ausgewählt" : "auswählen"}
                </span>
              </button>
            );
          })}
        </div>

        {DIENSTLEISTUNG_BUCHBAR && abo === "dienstleistung" ? <MembershipCards /> : <ProduktAbo />}
      </section>

      {/* Spar-Rechner — gehört zur Dienstleistungs-Mitgliedschaft */}
      {DIENSTLEISTUNG_BUCHBAR && abo === "dienstleistung" && (
        <section className="container pb-12 sm:pb-16">
          <MembershipCalculator />
        </section>
      )}

      {/* FAQ */}
      <section className="container pb-12 sm:pb-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl mb-6">Häufige Fragen</h2>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <div key={item.q} className="card-tilt hover:translate-y-0 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-3 p-5 text-left font-semibold min-h-[56px]"
                  aria-expanded={openFaq === i}
                >
                  {item.q}
                  <ChevronDown
                    className={cn("w-5 h-5 shrink-0 transition-transform", openFaq === i && "rotate-180")}
                  />
                </button>
                {openFaq === i && (
                  <p className="px-5 pb-5 text-muted-foreground leading-relaxed animate-fade-up">{item.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-16">
        <div className="section-dark rounded-3xl p-8 sm:p-12 text-center max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl mb-3">
            In 5 Minuten <span className="text-gold-accent">Mitglied</span>
          </h2>
          <p className="text-white/65 mb-8">
            Anruf oder WhatsApp genügt — der Rabatt gilt ab dem ersten Einkauf.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href={`tel:${SHOP_INFO.phoneIntl}`} className="btn-gold-bright text-lg px-8">
              <Phone className="w-5 h-5" /> {SHOP_INFO.phone}
            </a>
            <a
              href={whatsappLink("Hallo, ich interessiere mich für eine Mitgliedschaft bei Alex Autoshop.")}
              target="_blank"
              rel="noopener noreferrer"
              className="btn bg-white/10 text-white hover:bg-white/20 text-lg px-8"
            >
              <MessageCircle className="w-5 h-5" /> Per WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
