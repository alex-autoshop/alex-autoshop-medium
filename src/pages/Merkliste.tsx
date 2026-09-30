import { Seo } from "@/components/Seo";
import { FahrzeugbNav, BereichsHero } from "@/components/FahrzeugbNav";
import { FahrzeugBestand } from "@/components/FahrzeugBestand";
import { SHOP_INFO, whatsappLink } from "@/data/shopInfo";
import { Phone, MessageCircle } from "lucide-react";
import { useMerkliste } from "@/hooks/useMerkliste";

export default function Merkliste() {
  const { liste } = useMerkliste();
  const anfrage =
    liste.length > 0
      ? `Hallo, ich interessiere mich für ${liste.length} Fahrzeuge aus Ihrer Fahrzeugbörse. Können wir einen Termin machen?`
      : "Hallo, ich suche ein Fahrzeug. Können Sie mir weiterhelfen?";

  return (
    <div>
      <Seo title="Meine Merkliste" description="Deine gemerkten Fahrzeuge bei Alex Autoshop." noindex />
      <FahrzeugbNav />
      <BereichsHero
        augenbraue="Alex Autoshop · Fahrzeugbörse"
        titel="Deine Merkliste."
        akzent={liste.length > 0 ? `${liste.length} Fahrzeuge.` : undefined}
        text="Die Fahrzeuge, die du dir gemerkt hast. Ruf durch, dann stellen wir sie für deinen Besuch nebeneinander."
      >
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
            <MessageCircle className="w-5 h-5" /> Termin anfragen
          </a>
        </div>
      </BereichsHero>

      <FahrzeugBestand nurGemerkt />
    </div>
  );
}
