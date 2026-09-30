import { Link } from "react-router-dom";
import { Gauge, Calendar, Fuel, Cog, Heart, ArrowRight, AlertTriangle, Scale, Check } from "lucide-react";
import { euro, km, preisText, tuevAbgelaufen, tuevLang, hatMerkmal, type Fahrzeug } from "@/lib/fahrzeugFilter";
import { cn } from "@/lib/utils";

function Merkmal({ icon: Icon, children }: { icon: typeof Gauge; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
      <Icon className="w-3.5 h-3.5 text-primary/70 shrink-0" />
      {children}
    </span>
  );
}

function Abzeichen({ text, ton = "hell" }: { text: string; ton?: "hell" | "gold" }) {
  return (
    <span
      className={cn(
        "rounded-md px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide backdrop-blur-sm",
        ton === "gold" ? "bg-gold-bright text-night" : "bg-night/70 text-white border border-white/20"
      )}
    >
      {text}
    </span>
  );
}

/** Die drei wichtigsten Verkaufsargumente — mehr würde die Karte zumüllen. */
function abzeichenFuer(f: Fahrzeug): { text: string; ton?: "hell" | "gold" }[] {
  const a: { text: string; ton?: "hell" | "gold" }[] = [];
  if (f.ersteHand) a.push({ text: "1. Hand", ton: "gold" });
  if (/neu/i.test(f.tuev)) a.push({ text: "TÜV neu", ton: "gold" });
  else if (tuevLang(f)) a.push({ text: "TÜV lange" });
  if (f.sitze >= 7) a.push({ text: `${f.sitze} Sitze` });
  if (a.length < 3 && hatMerkmal(f, "allrad")) a.push({ text: "Allrad" });
  if (a.length < 3 && f.km > 0 && f.km < 100000) a.push({ text: "unter 100 tkm" });
  return a.slice(0, 3);
}

export function FahrzeugKarte({
  f, gemerkt, aufMerken, imVergleich, aufVergleich, vergleichVoll,
}: {
  f: Fahrzeug;
  gemerkt?: boolean;
  aufMerken?: (slug: string) => void;
  imVergleich?: boolean;
  aufVergleich?: (slug: string) => void;
  vergleichVoll?: boolean;
}) {
  const tuevWeg = tuevAbgelaufen(f.tuev);
  const abzeichen = abzeichenFuer(f);

  return (
    <article className="card-tilt overflow-hidden flex flex-col group relative">
      <Link to={`/fahrzeugboerse/${f.slug}`} className="block relative bg-night overflow-hidden">
        <img
          src={f.bild}
          alt={f.titel}
          loading="lazy"
          width={880}
          height={428}
          className="w-full h-auto block transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[70%]">
          {abzeichen.map((b) => <Abzeichen key={b.text} text={b.text} ton={b.ton} />)}
        </div>
      </Link>

      {/* Merken — außerhalb des Links, sonst springt die Seite beim Klick */}
      {aufMerken && (
        <button
          type="button"
          onClick={() => aufMerken(f.slug)}
          aria-pressed={gemerkt}
          aria-label={gemerkt ? `${f.titel} nicht mehr merken` : `${f.titel} merken`}
          title={gemerkt ? "Aus der Merkliste entfernen" : "Fahrzeug merken"}
          className={cn(
            "absolute top-2.5 right-2.5 w-11 h-11 rounded-full flex items-center justify-center transition-all",
            "bg-night/60 backdrop-blur-sm border border-white/20 hover:bg-night/85 active:scale-95",
            gemerkt && "bg-gold-bright border-gold-bright hover:bg-gold-bright"
          )}
        >
          <Heart className={cn("w-5 h-5", gemerkt ? "fill-night text-night" : "text-white")} />
        </button>
      )}

      <div className="p-5 flex flex-col flex-1">
        <Link to={`/fahrzeugboerse/${f.slug}`} className="block">
          <h3 className="text-lg leading-tight mb-1 group-hover:text-primary transition-colors">{f.titel}</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {f.bauart}{f.ps ? ` · ${f.ps} PS` : ""}
          </p>
        </Link>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4">
          {f.km > 0 && <Merkmal icon={Gauge}>{km(f.km)}</Merkmal>}
          <Merkmal icon={Calendar}>EZ {f.erstzulassung}</Merkmal>
          <Merkmal icon={Fuel}>{f.kraftstoff}</Merkmal>
          <Merkmal icon={Cog}>{f.getriebe === "Automatik" ? "Automatik" : "Schaltung"}</Merkmal>
        </div>

        <div className="mt-auto pt-3 border-t border-border">
          <p className="text-xl font-display font-bold text-primary leading-none whitespace-nowrap">
            {preisText(f)}
          </p>
          <div className="flex items-center justify-between gap-3 mt-1.5">
            <p className="text-[11px] text-muted-foreground min-w-0">
              {f.festpreis && <span className="font-semibold text-foreground">Festpreis · </span>}
              {tuevWeg ? (
                <span className="inline-flex items-center gap-1 text-destructive font-semibold">
                  <AlertTriangle className="w-3 h-3" /> TÜV abgelaufen
                </span>
              ) : (
                <>TÜV {f.tuev}{f.garantieMonate ? ` · ${f.garantieMonate} Mon. Garantie` : ""}</>
              )}
            </p>
            <Link
              to={`/fahrzeugboerse/${f.slug}`}
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary shrink-0"
            >
              Details <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {aufVergleich && (
            <button
              type="button"
              onClick={() => aufVergleich(f.slug)}
              disabled={!imVergleich && vergleichVoll}
              className={cn(
                "mt-3 w-full inline-flex items-center justify-center gap-2 min-h-[40px] rounded-lg border text-sm font-medium transition-colors",
                imVergleich
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary hover:text-primary",
                !imVergleich && vergleichVoll && "opacity-40 cursor-not-allowed hover:border-border hover:text-muted-foreground"
              )}
              title={!imVergleich && vergleichVoll ? "Es lassen sich höchstens 3 Fahrzeuge vergleichen" : undefined}
            >
              {imVergleich ? <Check className="w-4 h-4" /> : <Scale className="w-4 h-4" />}
              {imVergleich ? "Im Vergleich" : "Vergleichen"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export { euro, km, preisText };
