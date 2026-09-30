import { useEffect } from "react";
import { Link } from "react-router-dom";
import { X, Scale, Phone, Trophy } from "lucide-react";
import { FAHRZEUGE } from "@/data/fahrzeuge";
import { euro, km, preisText, tuevAbgelaufen, hatMerkmal, type Fahrzeug } from "@/lib/fahrzeugFilter";
import { SHOP_INFO } from "@/data/shopInfo";
import { cn } from "@/lib/utils";

export const VERGLEICH_MAX = 3;

type Richtung = "klein" | "gross" | "keine";

/** Eine Zeile der Vergleichstabelle. `besser` markiert den günstigeren Wert. */
const ZEILEN: { label: string; wert: (f: Fahrzeug) => string; zahl?: (f: Fahrzeug) => number | null; besser?: Richtung }[] = [
  { label: "Preis", wert: preisText, zahl: (f) => f.preis, besser: "klein" },
  { label: "Kilometer", wert: (f) => km(f.km), zahl: (f) => (f.km > 0 ? f.km : null), besser: "klein" },
  { label: "Erstzulassung", wert: (f) => f.erstzulassung, zahl: (f) => Number(/(\d{4})/.exec(f.erstzulassung)?.[1] ?? 0) || null, besser: "gross" },
  { label: "Leistung", wert: (f) => (f.ps ? `${f.ps} PS` : "—"), zahl: (f) => f.ps ?? null, besser: "gross" },
  { label: "Kraftstoff", wert: (f) => f.kraftstoff },
  { label: "Getriebe", wert: (f) => f.getriebe },
  { label: "Karosserie", wert: (f) => f.bauart },
  { label: "Türen", wert: (f) => String(f.tueren) },
  { label: "Sitzplätze", wert: (f) => String(f.sitze), zahl: (f) => f.sitze, besser: "gross" },
  { label: "Hubraum", wert: (f) => (f.hubraum ? `${f.hubraum.toLocaleString("de-DE")} cm³` : "—") },
  { label: "Umweltplakette", wert: (f) => f.plakette ?? "—" },
  { label: "TÜV / HU", wert: (f) => (tuevAbgelaufen(f.tuev) ? "abgelaufen" : f.tuev) },
  { label: "Garantie", wert: (f) => (f.garantieMonate ? `${f.garantieMonate} Monate` : "—") },
  { label: "Allradantrieb", wert: (f) => (hatMerkmal(f, "allrad") ? "ja" : "—") },
  { label: "Navigation", wert: (f) => (hatMerkmal(f, "navi") ? "ja" : "—") },
  { label: "Klimaautomatik", wert: (f) => (hatMerkmal(f, "klimaautomatik") ? "ja" : "—") },
  { label: "Einparkhilfe", wert: (f) => (hatMerkmal(f, "pdc") ? "ja" : "—") },
  { label: "Anhängerkupplung", wert: (f) => (hatMerkmal(f, "ahk") ? "ja" : "—") },
];

/** Untere Leiste, sobald mindestens ein Fahrzeug im Vergleich liegt. */
export function VergleichsLeiste({
  slugs, entfernen, leeren, oeffnen,
}: {
  slugs: string[]; entfernen: (slug: string) => void; leeren: () => void; oeffnen: () => void;
}) {
  if (slugs.length === 0) return null;
  const autos = slugs.map((s) => FAHRZEUGE.find((f) => f.slug === s)).filter(Boolean) as Fahrzeug[];

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-night/95 backdrop-blur-md border-t border-white/10 text-white animate-fade-up">
      <div className="container py-3 flex items-center gap-3 sm:gap-4">
        <div className="flex gap-2 flex-1 min-w-0 overflow-x-auto">
          {autos.map((f) => (
            <div key={f.slug} className="relative shrink-0">
              <img src={f.bild} alt={f.titel} className="w-24 sm:w-28 h-auto rounded-lg border border-white/15" />
              <button
                type="button"
                onClick={() => entfernen(f.slug)}
                aria-label={`${f.titel} aus dem Vergleich nehmen`}
                className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white text-night flex items-center justify-center shadow"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {Array.from({ length: VERGLEICH_MAX - autos.length }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 w-24 sm:w-28 h-[46px] sm:h-[54px] rounded-lg border border-dashed border-white/20 flex items-center justify-center text-[10px] text-white/40 text-center px-1"
            >
              noch frei
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={leeren} className="hidden sm:inline-flex text-sm text-white/60 hover:text-white min-h-[44px] px-2">
            leeren
          </button>
          <button
            type="button"
            onClick={oeffnen}
            disabled={autos.length < 2}
            className={cn(
              "btn-gold-bright px-4 sm:px-6",
              autos.length < 2 && "opacity-45 cursor-not-allowed"
            )}
          >
            <Scale className="w-5 h-5" />
            <span className="hidden sm:inline">Vergleichen</span>
            <span className="sm:hidden">{autos.length}/{VERGLEICH_MAX}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function VergleichsAnsicht({
  slugs, schliessen, entfernen,
}: {
  slugs: string[]; schliessen: () => void; entfernen: (slug: string) => void;
}) {
  const autos = slugs.map((s) => FAHRZEUGE.find((f) => f.slug === s)).filter(Boolean) as Fahrzeug[];

  // Hintergrund nicht mitscrollen lassen, Escape schließt
  useEffect(() => {
    const vorher = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const taste = (e: KeyboardEvent) => e.key === "Escape" && schliessen();
    window.addEventListener("keydown", taste);
    return () => {
      document.body.style.overflow = vorher;
      window.removeEventListener("keydown", taste);
    };
  }, [schliessen]);

  if (autos.length < 2) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-y-auto" role="dialog" aria-label="Fahrzeugvergleich">
      <div className="sticky top-0 z-10 bg-night text-white border-b border-white/10">
        <div className="container py-3 flex items-center justify-between gap-4">
          <h2 className="text-lg sm:text-xl flex items-center gap-2">
            <Scale className="w-5 h-5 text-gold-accent" /> Fahrzeugvergleich
          </h2>
          <button
            type="button"
            onClick={schliessen}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" /> Schließen
          </button>
        </div>
      </div>

      <div className="container py-6 pb-16">
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr>
                <th className="w-32 sm:w-44 text-left align-bottom p-2" />
                {autos.map((f) => (
                  <th key={f.slug} className="p-2 align-bottom" style={{ width: `${70 / autos.length}%` }}>
                    <div className="relative">
                      <img src={f.bild} alt={f.titel} className="w-full h-auto rounded-xl border border-border bg-night" />
                      <button
                        type="button"
                        onClick={() => entfernen(f.slug)}
                        aria-label={`${f.titel} entfernen`}
                        className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center shadow hover:border-primary"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <Link to={`/fahrzeugboerse/${f.slug}`} className="block mt-2 text-sm sm:text-base font-semibold text-left hover:text-primary leading-tight">
                      {f.titel}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ZEILEN.map((z) => {
                const zahlen = z.zahl ? autos.map(z.zahl) : [];
                let bester = -1;
                if (z.besser && z.besser !== "keine" && zahlen.some((n) => n !== null)) {
                  const gueltig = zahlen.map((n, i) => ({ n, i })).filter((x) => x.n !== null) as { n: number; i: number }[];
                  const ziel = z.besser === "klein"
                    ? gueltig.reduce((a, b) => (b.n < a.n ? b : a))
                    : gueltig.reduce((a, b) => (b.n > a.n ? b : a));
                  // nur markieren, wenn es wirklich einen Unterschied gibt
                  if (gueltig.some((x) => x.n !== ziel.n)) bester = ziel.i;
                }
                return (
                  <tr key={z.label} className="border-t border-border">
                    <th scope="row" className="text-left text-sm text-muted-foreground font-medium p-3 align-top">
                      {z.label}
                    </th>
                    {autos.map((f, i) => (
                      <td
                        key={f.slug}
                        className={cn(
                          "p-3 text-sm align-top",
                          i === bester && "text-primary font-semibold"
                        )}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {z.wert(f)}
                          {i === bester && <Trophy className="w-3.5 h-3.5 shrink-0" aria-label="bester Wert" />}
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              })}
              <tr className="border-t border-border">
                <th scope="row" className="text-left text-sm text-muted-foreground font-medium p-3 align-top">Anfragen</th>
                {autos.map((f) => (
                  <td key={f.slug} className="p-3 align-top">
                    <a href={`tel:${SHOP_INFO.phoneIntl}`} className="btn-primary w-full text-sm px-3">
                      <Phone className="w-4 h-4" /> Anrufen
                    </a>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Der Pokal markiert den jeweils besseren Wert. Angaben nach bestem Wissen —
          maßgeblich ist die Besichtigung vor Ort.
        </p>
      </div>
    </div>
  );
}
