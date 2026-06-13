import { useState } from "react";
import { Phone, MessageCircle, ChevronDown } from "lucide-react";
import { Seo } from "@/components/Seo";
import { MembershipCards } from "@/components/MembershipCards";
import { MEMBERSHIP_LEVELS } from "@/data/memberships";
import { SHOP_INFO, whatsappLink } from "@/data/shopInfo";
import { cn } from "@/lib/utils";

const FAQ = [
  {
    q: "Wie werde ich Mitglied?",
    a: "Ruf uns an (0202 82690), schreib per WhatsApp oder komm direkt im Laden vorbei. Die Anmeldung dauert 5 Minuten — der Rabatt gilt sofort.",
  },
  {
    q: "Kann ich monatlich kündigen?",
    a: "Ja, alle Stufen sind monatlich kündbar. Keine Mindestlaufzeit, kein Risiko.",
  },
  {
    q: "Gilt der Rabatt auf alles?",
    a: "Der Rabatt gilt auf das gesamte Lager-Sortiment. Bei Sonderbestellungen und Teilen sprechen wir individuelle Konditionen ab.",
  },
  {
    q: "Kann ich die Stufe wechseln?",
    a: "Jederzeit zum Monatswechsel — hoch oder runter, je nachdem wie viel dein Betrieb gerade braucht.",
  },
  {
    q: "Für wen lohnt sich welche Stufe?",
    a: "Faustregel: ab ca. 330 € Material-Einkauf pro Monat lohnt sich Level 1, ab ca. 500 € Level 2, ab ca. 925 € Level 3. Nutze den Rechner oben.",
  },
];

export default function Mitgliedschaft() {
  const [monthlySpend, setMonthlySpend] = useState(800);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div>
      <Seo
        title="Mitgliedschaft – bis 46% B2B-Rabatt"
        description="B2B-Mitgliedschaften bei Alex Autoshop Wuppertal: 15%, 33% oder 46% Rabatt auf Lackierprodukte und Werkstattbedarf. Monatlich kündbar."
      />

      <section className="section-dark py-16 sm:py-20">
        <div className="container text-center max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-5xl mb-4">
            Dein Betrieb. <span className="text-gold-accent">Deine Konditionen.</span>
          </h1>
          <p className="text-white/65 text-lg">
            Drei Stufen, bis zu 46% Rabatt auf das gesamte Sortiment — monatlich kündbar.
          </p>
        </div>
      </section>

      <section className="container py-12 sm:py-16 -mt-8">
        <MembershipCards />
      </section>

      {/* Spar-Rechner */}
      <section className="container pb-12 sm:pb-16">
        <div className="card-tilt hover:translate-y-0 p-6 sm:p-10 max-w-3xl mx-auto">
          <h2 className="text-2xl mb-2">Lohnt sich das für mich?</h2>
          <p className="text-muted-foreground mb-6">
            Wie viel gibst du monatlich für Material aus?
          </p>
          <div className="flex items-center gap-4 mb-2">
            <input
              type="range"
              min={100}
              max={5000}
              step={50}
              value={monthlySpend}
              onChange={(e) => setMonthlySpend(Number(e.target.value))}
              className="flex-1 accent-[#B8860B] h-12"
              aria-label="Monatlicher Materialeinkauf"
            />
            <span className="font-display font-bold text-2xl w-32 text-right">
              {monthlySpend.toLocaleString("de-DE")} €
            </span>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 mt-6">
            {MEMBERSHIP_LEVELS.map((m) => {
              const saved = monthlySpend * (m.discountPercent / 100);
              const net = saved - m.pricePerMonth;
              const worth = net > 0;
              return (
                <div
                  key={m.level}
                  className={cn(
                    "rounded-xl border p-4",
                    worth ? "border-primary bg-primary/5" : "border-border bg-secondary/50"
                  )}
                >
                  <p className="font-bold">{m.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Du sparst {saved.toLocaleString("de-DE", { maximumFractionDigits: 0 })} € − {m.pricePerMonth} € Beitrag
                  </p>
                  <p className={cn("font-display font-bold text-xl mt-1", worth ? "text-primary" : "text-muted-foreground")}>
                    {worth ? "+" : ""}
                    {net.toLocaleString("de-DE", { maximumFractionDigits: 0 })} € / Monat
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

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
