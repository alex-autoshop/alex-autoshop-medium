import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { aboAktivMerken } from "@/lib/aboListe";
import { Phone, MessageCircle, ChevronDown, Wrench, PackageSearch } from "lucide-react";
import { Seo } from "@/components/Seo";
import { MembershipCards } from "@/components/MembershipCards";
import { MembershipCalculator } from "@/components/MembershipCalculator";
import { ProduktAbo } from "@/components/ProduktAbo";
import { MitgliedsGeschichte } from "@/components/MitgliedsGeschichte";
import { useAuth } from "@/context/AuthContext";
import { DIENSTLEISTUNG_BUCHBAR } from "../../shared/mitgliedspreise.js";
import { PRODUKT_ABO_PREISE } from "../../shared/produktabo.js";
import { SHOP_INFO, whatsappLink } from "@/data/shopInfo";
import { cn } from "@/lib/utils";
import { useTeileboerseSichtbar } from "@/lib/teileboerseSichtbar";

const GESCHICHTE = "alex-mitglied-geschichte";
let geschichteMontiert = 0;

function geschichteGesehen() {
  try { return localStorage.getItem(GESCHICHTE) === "1"; } catch { return false; }
}

function geschichteMerken() {
  try { localStorage.setItem(GESCHICHTE, "1"); } catch { /* privat */ }
}

const euro = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

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
    a: `Pro Produkt und Monat: ${euro(PRODUKT_ABO_PREISE[15])} bei 15 %, ${euro(PRODUKT_ABO_PREISE[28])} bei 28 %, ${euro(PRODUKT_ABO_PREISE[40])} bei 40 %. Die Stufe lohnt sich, sobald der Rabatt auf den Einkauf dieses Produkts den Beitrag übersteigt.`,
  },
];

export default function Mitgliedschaft() {
  const { user, profile, loading } = useAuth();
  const [suchParams] = useSearchParams();
  const mitglied = !!user && (profile.membership_level ?? 0) >= 1;
  useEffect(() => {
    if (suchParams.get("status") === "success") aboAktivMerken();
  }, [suchParams]);
  const [wieder, setWieder] = useState(false);
  const zeigen = wieder || (!loading && !mitglied && !geschichteGesehen());

  useEffect(() => {
    if (!zeigen) return;
    geschichteMontiert += 1;
    const weg = () => geschichteMerken();
    window.addEventListener("pagehide", weg);
    return () => {
      geschichteMontiert -= 1;
      window.removeEventListener("pagehide", weg);
      window.setTimeout(() => {
        if (geschichteMontiert === 0) weg();
      }, 0);
    };
  }, [zeigen]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [abo, setAbo] = useState<AboArt>(DIENSTLEISTUNG_BUCHBAR ? "dienstleistung" : "produkt");
  const { sichtbar: teileSichtbar } = useTeileboerseSichtbar();
  const faq = FAQ.map((eintrag) => {
    if (teileSichtbar) return eintrag;
    if (eintrag.q === "Gilt die Mitgliedschaft nur in Wuppertal?") {
      return { ...eintrag, a: "Nein — deutschlandweit. Jeder kann Mitglied werden: Werkstätten, Aufbereiter, Selbstständige und auch Privatkunden. Die Mitgliedschaft gilt im Shop: dort ist der Versand mit aktiver bezahlter Mitgliedschaft (Level 1–3) kostenlos." };
    }
    if (eintrag.q === "Gilt der Rabatt auf alles?") {
      return { ...eintrag, a: "Der Rabatt gilt im Shop auf Lack und Werkstattbedarf." };
    }
    return eintrag;
  });

  return (
    <div>
      <Seo
        title="Mitgliedschaft – bis 40% Rabatt, deutschlandweit"
        description={teileSichtbar
          ? "Mitgliedschaft im Shop: Rabatt auf Lack und Werkstattbedarf, kostenloser Versand für Mitglieder. Die Teilebörse hat einen Preis für alle. Monatlich kündbar."
          : "Mitgliedschaft im Shop: Rabatt auf Lack und Werkstattbedarf, kostenloser Versand für Mitglieder. Monatlich kündbar."}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "OfferCatalog",
          name: "Produkt-Abo",
          itemListElement: ([15, 28, 40] as const).map((stufe) => ({
            "@type": "Offer",
            name: `Produkt-Abo ${stufe} %`,
            priceCurrency: "EUR",
            price: PRODUKT_ABO_PREISE[stufe].toFixed(2),
            description: `${stufe} % Rabatt, ${euro(PRODUKT_ABO_PREISE[stufe])} pro Produkt im Monat`,
          })),
        }}
      />

      <section className="section-dark py-12 sm:py-16">
        <div className="container text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full bg-gold-bright/15 border border-gold-bright/30 text-gold-accent text-xs font-bold uppercase tracking-wide px-4 py-1.5 mb-5">
            🔥 Brandneu · Mitgliedschaft
          </span>
          <h1 className="text-3xl sm:text-5xl mb-4">
            Dein Rabatt. <span className="text-gold-accent">Auf genau das, was du brauchst.</span>
          </h1>
          <p className="text-white/65 text-base sm:text-lg">
            Du wählst für jedes Produkt selbst, wie viel Rabatt du willst. Ab {euro(PRODUKT_ABO_PREISE[15])} pro Produkt im Monat, bis zu 40 % auf genau diese Produkte. Plus kostenloser Versand im Shop.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {["🇩🇪 Deutschlandweit verfügbar", "Für jeden abschließbar — Werkstatt wie privat", "Lieferung direkt zu dir"].map((t) => (
              <span key={t} className="rounded-full bg-white/5 border border-white/15 px-4 py-1.5 text-sm font-semibold text-white/85">
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {zeigen ? (
        <MitgliedsGeschichte onDurch={geschichteMerken} />
      ) : (
        <>
          <div className="container pt-6 flex justify-center">
            <button
              type="button"
              onClick={() => setWieder(true)}
              className="text-sm font-semibold text-primary underline underline-offset-2 min-h-11"
            >
              So funktioniert's ansehen
            </button>
          </div>
          <MitgliedsGeschichte seo />
        </>
      )}

      {/* ── Zwei Mitgliedschaften zur Auswahl ───────────────────────────── */}
      <section className="container pt-6 pb-12 sm:pb-16">
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
                <span className="block text-sm text-muted-foreground mt-1 leading-relaxed">
                  {teileSichtbar ? a.text : a.text.replace(" Nicht in der Teilebörse.", "")}
                </span>
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
            {faq.map((item, i) => (
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
