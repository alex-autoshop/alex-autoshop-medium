import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Phone, MessageCircle, MapPin, CheckCircle, AlertTriangle, Heart,
  Gauge, Calendar, Fuel, Cog, Zap, Leaf, ShieldCheck, Car,
} from "lucide-react";
import { Seo } from "@/components/Seo";
import { SHOP_INFO, whatsappLink } from "@/data/shopInfo";
import { fahrzeugNachSlug, tuevAbgelaufen, FAHRZEUGE } from "@/data/fahrzeuge";
import { FahrzeugKarte } from "@/components/FahrzeugKarte";
import { euro, km, preisText } from "@/lib/fahrzeugFilter";
import { useMerkliste } from "@/hooks/useMerkliste";
import { cn } from "@/lib/utils";
import { FahrzeugbNav } from "@/components/FahrzeugbNav";

function Kachel({ icon: Icon, label, wert }: { icon: typeof Gauge; label: string; wert: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
        <Icon className="w-3.5 h-3.5 text-primary" /> {label}
      </div>
      <p className="font-semibold leading-tight">{wert}</p>
    </div>
  );
}

function Zeile({ label, wert }: { label: string; wert?: string | number }) {
  if (wert === undefined || wert === null || wert === "") return null;
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-border last:border-0 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{wert}</span>
    </div>
  );
}

export default function FahrzeugDetail() {
  const { slug } = useParams();
  const f = fahrzeugNachSlug(slug);
  const { gemerkt, umschalten } = useMerkliste();

  if (!f) {
    return (
      <div className="container py-24 text-center">
        <Car className="w-10 h-10 text-primary mx-auto mb-4" />
        <h1 className="text-2xl mb-3">Fahrzeug nicht gefunden</h1>
        <p className="text-muted-foreground mb-6">
          Vielleicht ist es schon verkauft. Schau dir den aktuellen Bestand an.
        </p>
        <Link to="/fahrzeugboerse" className="btn-primary">Zum Fahrzeugmarkt</Link>
      </div>
    );
  }

  const tuevWeg = tuevAbgelaufen(f.tuev);
  const anfrage = `Hallo, ich interessiere mich für den ${f.titel} (${preisText(f)}) aus Ihrer Fahrzeugbörse. Ist er noch verfügbar?`;
  const aehnlich = FAHRZEUGE.filter((a) => a.slug !== f.slug)
    .sort((a, b) => Math.abs(a.preis - f.preis) - Math.abs(b.preis - f.preis))
    .slice(0, 3);

  return (
    <div>
      <Seo
        title={`${f.titel} – ${preisText(f)} | Alex Autoshop Wuppertal`}
        description={`${f.titel}, EZ ${f.erstzulassung}, ${km(f.km)}, ${f.kraftstoff}, ${f.getriebe}${f.ps ? `, ${f.ps} PS` : ""}. ${preisText(f)}${f.festpreis ? " Festpreis" : ""} — Alex Autoshop Wuppertal.`}
      />

      <FahrzeugbNav />

      <div className="container pt-6">
        <Link to="/fahrzeugboerse#bestand" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary min-h-[44px]">
          <ArrowLeft className="w-4 h-4" /> Alle Fahrzeuge
        </Link>
      </div>

      <div className="container pb-12 grid lg:grid-cols-[1.4fr_1fr] gap-8 items-start">
        {/* Bild + Daten */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="rounded-2xl overflow-hidden border border-border bg-night shadow-card">
            <img src={f.bild} alt={f.titel} width={880} height={458} className="w-full h-auto block" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
            {f.km > 0 && <Kachel icon={Gauge} label="Kilometer" wert={km(f.km)} />}
            <Kachel icon={Calendar} label="Erstzulassung" wert={f.erstzulassung} />
            <Kachel icon={Cog} label="Getriebe" wert={f.getriebe} />
            <Kachel icon={Fuel} label="Kraftstoff" wert={f.kraftstoff} />
            {(f.ps || f.kw) && (
              <Kachel icon={Zap} label="Leistung" wert={f.kw ? `${f.kw} kW (${f.ps} PS)` : `${f.ps} PS`} />
            )}
            {f.plakette && <Kachel icon={Leaf} label="Umweltplakette" wert={f.plakette} />}
          </div>

          <div className="grid sm:grid-cols-2 gap-6 mt-8">
            <div>
              <h2 className="text-lg mb-3">Fahrzeugdaten</h2>
              <div className="rounded-xl border border-border bg-card px-4 py-1">
                <Zeile label="Hersteller" wert={f.marke} />
                <Zeile label="Modell" wert={f.modell} />
                <Zeile label="Variante" wert={f.variante} />
                <Zeile label="Karosserie" wert={f.bauart} />
                <Zeile label="Hubraum" wert={f.hubraum ? `${f.hubraum.toLocaleString("de-DE")} cm³` : undefined} />
                <Zeile label="Zylinder" wert={f.zylinder} />
                <Zeile label="Türen" wert={f.tueren} />
                <Zeile label="Sitzplätze" wert={f.sitze} />
                <Zeile label="HU / AU" wert={tuevWeg ? "abgelaufen" : `gültig bis ${f.tuev}`} />
                {f.garantieMonate && <Zeile label="Garantie" wert={`${f.garantieMonate} Monate`} />}
              </div>
            </div>

            <div>
              <h2 className="text-lg mb-3">Ausstattung</h2>
              <ul className="rounded-xl border border-border bg-card p-4 space-y-2">
                {f.ausstattung.map((a) => (
                  <li key={a} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-lg mb-3">Zustand & Hinweise</h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {f.zustand.map((z) => (
                <div key={z} className="flex items-center gap-2 text-sm">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0" /> {z}
                </div>
              ))}
            </div>
            <p className="text-muted-foreground leading-relaxed mt-5">{f.beschreibung}</p>
            <p className="text-xs text-muted-foreground mt-4">
              Angaben nach bestem Wissen, Irrtümer und Zwischenverkauf vorbehalten. Kein Gewähr für
              Ausstattungsmerkmale — maßgeblich ist die Besichtigung vor Ort.
            </p>
          </div>
        </motion.div>

        {/* Preis & Kontakt */}
        <motion.aside
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="lg:sticky lg:top-28"
        >
          <div className="card-tilt hover:translate-y-0 p-6">
            <h1 className="text-2xl sm:text-3xl leading-tight mb-1">{f.titel}</h1>
            <p className="text-sm text-muted-foreground mb-5">
              {f.bauart} · EZ {f.erstzulassung}{f.km > 0 ? ` · ${km(f.km)}` : ""}
            </p>

            <p className="text-3xl sm:text-4xl font-display font-bold text-primary leading-tight">{preisText(f)}</p>
            <p className="text-sm text-muted-foreground mt-1 mb-5">{f.festpreis ? "Festpreis" : "Genauer Preis auf Anfrage — ruf kurz an."}</p>

            {tuevWeg && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2.5 mb-5 text-sm">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <span>TÜV ist abgelaufen — auf Wunsch machen wir ihn vor der Übergabe neu.</span>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <a href={`tel:${SHOP_INFO.phoneIntl}`} className="btn-primary w-full">
                <Phone className="w-5 h-5" /> {SHOP_INFO.phone}
              </a>
              <a href={whatsappLink(anfrage)} target="_blank" rel="noopener noreferrer" className="btn-outline w-full">
                <MessageCircle className="w-5 h-5" /> Per WhatsApp anfragen
              </a>
              <button
                type="button"
                onClick={() => umschalten(f.slug)}
                aria-pressed={gemerkt(f.slug)}
                className={cn("btn-outline w-full", gemerkt(f.slug) && "border-primary text-primary")}
              >
                <Heart className={cn("w-5 h-5", gemerkt(f.slug) && "fill-primary")} />
                {gemerkt(f.slug) ? "Gemerkt" : "Fahrzeug merken"}
              </button>
            </div>

            <div className="mt-6 pt-5 border-t border-border space-y-2 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                {SHOP_INFO.street}, {SHOP_INFO.zip} {SHOP_INFO.city}
              </p>
              {SHOP_INFO.hours.map((h) => (
                <p key={h.days} className="pl-6">{h.days}: {h.time}</p>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
              {["Probefahrt möglich", "Inzahlungnahme möglich", "Fairer Preis", "Gepflegtes Fahrzeug"].map((v) => (
                <span key={v} className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-2">
                  <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" /> {v}
                </span>
              ))}
            </div>
          </div>
        </motion.aside>
      </div>

      {/* Am Handy immer erreichbar: Preis und Anruf */}
      <div className="lg:hidden sticky bottom-0 z-30 bg-card/95 backdrop-blur-md border-t border-border">
        <div className="container py-3 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-lg font-display font-bold text-primary leading-none whitespace-nowrap">{preisText(f)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{f.titel}</p>
          </div>
          <button
            type="button"
            onClick={() => umschalten(f.slug)}
            aria-label={gemerkt(f.slug) ? "Nicht mehr merken" : "Fahrzeug merken"}
            className={cn(
              "w-12 h-12 shrink-0 rounded-lg border flex items-center justify-center transition-colors",
              gemerkt(f.slug) ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground"
            )}
          >
            <Heart className={cn("w-5 h-5", gemerkt(f.slug) && "fill-primary")} />
          </button>
          <a href={`tel:${SHOP_INFO.phoneIntl}`} className="btn-primary shrink-0 px-5">
            <Phone className="w-5 h-5" /> Anrufen
          </a>
        </div>
      </div>

      {aehnlich.length > 0 && (
        <section className="bg-secondary/60 py-14">
          <div className="container">
            <h2 className="text-2xl mb-6">Ähnliche Fahrzeuge</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {aehnlich.map((a) => (
                <FahrzeugKarte key={a.slug} f={a} gemerkt={gemerkt(a.slug)} aufMerken={umschalten} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
