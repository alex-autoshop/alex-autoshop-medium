import { useEffect, useRef, useState, type ReactNode } from "react";
import { Truck, Package } from "lucide-react";
import { PRODUKT_ABO_PREISE } from "../../shared/produktabo.js";
import { useTeileboerseSichtbar } from "@/lib/teileboerseSichtbar";

const euro = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

/** Katalogpreise vom 5.11.2026, dieselben Artikel wie in der Produktliste. */
const BEISPIEL = {
  name: "Schleifpaste Perfect Heavy Cut",
  menge: "1 × 750 g",
  normal: 33,
  rabatt: 40,
};
const mitglied = Math.round(BEISPIEL.normal * (1 - BEISPIEL.rabatt / 100) * 100) / 100;
const ersparnis = Math.round((BEISPIEL.normal - mitglied) * 100) / 100;
const netto = Math.round((ersparnis - PRODUKT_ABO_PREISE[40]) * 100) / 100;

const KARTEN = [
  { name: "Schleifpaste, 750 g", preis: 33 },
  { name: "Unterbodenschutz, 500 ml", preis: 9 },
  { name: "Hochglanz-Politur, 250 g", preis: 13.95 },
];

const STUFEN = [15, 28, 40] as const;
const MONATE = ["Jan", "Feb", "Mär", "Apr"];
const CHIPS = ["Monatlich kündbar", "Keine Mindestabnahme", "Produkte jederzeit austauschbar"];

function smooth(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function useReduced() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const kurz = () => window.innerHeight < 520;
    const apply = () => setReduced(mq.matches || kurz());
    apply();
    mq.addEventListener("change", apply);
    window.addEventListener("resize", apply);
    return () => {
      mq.removeEventListener("change", apply);
      window.removeEventListener("resize", apply);
    };
  }, []);
  return reduced;
}

function useFortschritt(n: number, ruhig: boolean) {
  const refs = useRef<(HTMLElement | null)[]>([]);
  const [stand, setStand] = useState<number[]>(() => Array(n).fill(ruhig ? 1 : 0));

  useEffect(() => {
    if (ruhig) {
      setStand(Array(n).fill(1));
      return;
    }
    let rahmen = 0;
    const messen = () => {
      rahmen = 0;
      const neu = refs.current.map((el) => {
        if (!el) return 0;
        const r = el.getBoundingClientRect();
        const sicht = window.innerHeight;
        const anfang = sicht * 0.22;
        const weg = Math.max(r.height - sicht * 0.7, 1);
        return Math.min(1, Math.max(0, (anfang - r.top) / weg));
      });
      setStand((alt) => (alt.every((v, i) => Math.abs(v - neu[i]) < 0.02) ? alt : neu));
    };
    const aufScroll = () => {
      if (!rahmen) rahmen = requestAnimationFrame(messen);
    };
    messen();
    window.addEventListener("scroll", aufScroll, { passive: true });
    window.addEventListener("resize", aufScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rahmen);
      window.removeEventListener("scroll", aufScroll);
      window.removeEventListener("resize", aufScroll);
    };
  }, [n, ruhig]);

  return {
    setzen: (i: number, el: HTMLElement | null) => { refs.current[i] = el; },
    stand,
  };
}

function Szene({
  index, setzen, children,
}: {
  index: number;
  setzen: (i: number, el: HTMLElement | null) => void;
  children: ReactNode;
}) {
  return (
    <section
      ref={(el) => setzen(index, el)}
      className="story-szene relative h-[158vh] bg-night text-[#EDE9E3]"
      aria-label={`Schritt ${index + 1}`}
    >
      <div className="story-kleben sticky top-[4.25rem] z-10 flex items-center min-h-[calc(100dvh-4.25rem)] py-6 sm:py-8">
        <div className="container w-full">
          <div className="grid lg:grid-cols-2 gap-5 lg:gap-12 items-center max-w-5xl mx-auto">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

function Text({ schritt, titel, children }: { schritt: string; titel: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-gold-bright text-xs font-bold uppercase tracking-[0.18em] mb-2">{schritt}</p>
      <h2 className="text-2xl sm:text-3xl lg:text-4xl text-[#EDE9E3] leading-[1.12]">{titel}</h2>
      <div className="mt-3 text-sm sm:text-base text-white/70 leading-relaxed">{children}</div>
    </div>
  );
}

export function MitgliedsGeschichte({ onDurch, seo = false }: { onDurch?: () => void; seo?: boolean }) {
  const ruhig = useReduced() || seo;
  const { sichtbar: teileSichtbar } = useTeileboerseSichtbar();
  const { setzen, stand } = useFortschritt(7, ruhig);
  const p = stand.map(smooth);

  useEffect(() => {
    if (seo || !onDurch) return;
    if (stand[6] > 0.85) onDurch();
  }, [seo, onDurch, stand]);

  const preisJetzt = BEISPIEL.normal + (mitglied - BEISPIEL.normal) * p[3];
  const stufeAn = Math.min(2, Math.floor(p[2] * 2.999));

  return (
    <div className={seo ? "sr-only" : "mitglied-story"}>
      <Szene index={0} setzen={setzen}>
        <Text schritt="01" titel="Du kaufst jeden Monat dasselbe — und zahlst jedes Mal den vollen Preis.">
          <p>Dieselbe Tube, derselbe Preis. Monat für Monat.</p>
        </Text>
        <div className="rounded-2xl bg-[#FAF9F7] text-[#1a1a1a] p-4 sm:p-5 shadow-card" style={{ transform: "translateZ(0)" }}>
          <p className="text-[11px] font-bold uppercase tracking-wide text-primary">Beispiel</p>
          <p className="font-display font-bold mt-1">{BEISPIEL.name}</p>
          <p className="text-sm text-neutral-500">{BEISPIEL.menge}</p>
          <p className="text-2xl font-bold mt-2 tabular-nums">{euro(BEISPIEL.normal)}</p>
          <div className="mt-4 flex gap-2">
            {MONATE.map((m, i) => {
              const an = p[0] > (i + 0.35) / MONATE.length;
              return (
                <div key={m} className="flex-1 text-center">
                  <span
                    className="mx-auto mb-1 grid h-7 w-7 place-items-center rounded-full border text-[11px] font-bold transition-colors duration-300"
                    style={{
                      background: an ? "#B8860B" : "transparent",
                      color: an ? "#fff" : "#6b6b6b",
                      borderColor: an ? "#B8860B" : "#E5E2DB",
                      transform: `scale(${an ? 1 : 0.92})`,
                    }}
                  >
                    {an ? "✓" : i + 1}
                  </span>
                  <span className="block text-[10px] text-neutral-500">{m}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Szene>

      <Szene index={1} setzen={setzen}>
        <Text schritt="02" titel="Such dir raus, was du regelmäßig brauchst.">
          <p>Die Karten landen in deiner Abo-Liste. Nicht der ganze Shop — nur diese Produkte.</p>
        </Text>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-gold-bright mb-2">Beispiel · Abo-Liste</p>
          <div className="space-y-2">
            {KARTEN.map((k, i) => (
              <div
                key={k.name}
                className="flex items-center justify-between gap-3 rounded-xl bg-[#FAF9F7] text-[#1a1a1a] px-3 py-2.5"
                style={{
                  transform: `translate3d(${(1 - p[1]) * (i % 2 === 0 ? -28 : 28)}px, ${(1 - p[1]) * 10}px, 0)`,
                  opacity: 0.45 + 0.55 * p[1],
                }}
              >
                <span className="text-sm font-semibold leading-tight">{k.name}</span>
                <span className="text-sm tabular-nums shrink-0">{euro(k.preis)}</span>
              </div>
            ))}
          </div>
        </div>
      </Szene>

      <Szene index={2} setzen={setzen}>
        <Text schritt="03" titel="Du wählst für jedes Produkt selbst die Stufe.">
          <p>15, 28 oder 40 Prozent. Der Beitrag gilt pro Produkt im Monat, nicht für den ganzen Shop.</p>
        </Text>
        <div className="grid grid-cols-3 gap-2">
          {STUFEN.map((s, i) => {
            const an = i === stufeAn;
            return (
              <div
                key={s}
                className="rounded-2xl border-2 px-2 py-3 text-center transition-colors duration-300"
                style={{
                  borderColor: an ? "#f1eb5b" : "rgba(255,255,255,0.15)",
                  background: an ? "rgba(241,235,91,0.12)" : "rgba(255,255,255,0.04)",
                  transform: `translateZ(0) scale(${an ? 1 : 0.97})`,
                }}
              >
                <p className="font-display text-xl sm:text-2xl font-bold" style={{ color: an ? "#f1eb5b" : "#EDE9E3" }}>{s}%</p>
                <p className="text-[11px] sm:text-xs mt-1 text-white/70">{euro(PRODUKT_ABO_PREISE[s])}</p>
                <p className="text-[10px] text-white/50">pro Produkt / Monat</p>
              </div>
            );
          })}
        </div>
      </Szene>

      <Szene index={3} setzen={setzen}>
        <Text schritt="04" titel={`Beispiel: Unterm Strich ${euro(netto)} im Monat.`}>
          <p>
            {BEISPIEL.name}, {BEISPIEL.menge}, einmal im Monat. Normal {euro(BEISPIEL.normal)}, mit {BEISPIEL.rabatt} % {euro(mitglied)}. Der Beitrag für dieses eine Produkt: {euro(PRODUKT_ABO_PREISE[40])} im Monat.
          </p>
        </Text>
        <div className="rounded-2xl bg-[#FAF9F7] text-[#1a1a1a] p-5 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wide text-primary">Beispiel · {BEISPIEL.menge}</p>
          <p className="text-sm text-neutral-500 mt-1 line-through decoration-2" style={{ opacity: 0.35 + 0.65 * p[3] }}>{euro(BEISPIEL.normal)}</p>
          <p className="font-display text-4xl sm:text-5xl font-bold text-primary tabular-nums mt-1" aria-hidden="true">{euro(preisJetzt)}</p>
          <p className="sr-only">Von {euro(BEISPIEL.normal)} auf {euro(mitglied)}</p>
          <p className="mt-3 font-semibold text-red-600">Unterm Strich {euro(netto)} im Monat</p>
        </div>
      </Szene>

      <Szene index={4} setzen={setzen}>
        <Text schritt="05" titel="Versand kostenlos für Mitglieder im Shop.">
          <p>
            Mit bezahlter Mitgliedschaft.
            {teileSichtbar ? " In der Teilebörse gilt ein Preis für alle, dort bleibt der Versand wie für jeden anderen." : ""}
          </p>
        </Text>
        <div className="relative h-28 overflow-hidden rounded-2xl bg-white/5 border border-white/10">
          <div
            className="absolute inset-y-0 left-6 flex items-center gap-3"
            style={{ transform: `translate3d(${(1 - p[4]) * -72}px, 0, 0)` }}
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gold-bright text-night">
              <Truck className="w-7 h-7" aria-hidden="true" />
            </span>
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#FAF9F7] text-night">
              <Package className="w-6 h-6" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-gold-bright">0 € Versand</span>
          </div>
        </div>
      </Szene>

      <Szene index={5} setzen={setzen}>
        <Text schritt="06" titel="Du bleibst beweglich.">
          <p>Kein Jahresvertrag. Die Liste kannst du umbauen, wann du willst.</p>
        </Text>
        <ul className="flex flex-col gap-2">
          {CHIPS.map((c, i) => {
            const an = p[5] > i / CHIPS.length;
            return (
              <li
                key={c}
                className="rounded-full border border-gold-bright/40 bg-gold-bright/10 px-4 py-2 text-sm font-semibold text-gold-bright w-fit"
                style={{
                  opacity: an ? 1 : 0.35,
                  transform: `translate3d(0, ${(an ? 0 : 8)}px, 0)`,
                }}
              >
                {c}
              </li>
            );
          })}
        </ul>
      </Szene>

      <Szene index={6} setzen={setzen}>
        <Text schritt="07" titel="Monatlich kündbar.">
          <p>Keine Mindestlaufzeit. Eine Erhöhung des Beitrags kündigen wir vorher an. Sie gilt nur, wenn du zustimmst.</p>
        </Text>
        <div>
          <a href="#abo-stufen" className="btn-gold-bright text-base px-6 w-full sm:w-auto">
            Zum Produkt-Abo
          </a>
        </div>
      </Szene>
    </div>
  );
}
