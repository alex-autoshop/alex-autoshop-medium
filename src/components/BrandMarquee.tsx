import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// Endlos-Band. Eine Markenbreite alle 1,5 s, ohne Pause zwischen den Schritten.
// 19 Marken × 1,5 s = 28,5 s für einen kompletten Durchlauf.
// Hover und Tastaturfokus halten das Band an. prefers-reduced-motion: kein Lauf,
// die Kacheln bleiben in derselben Größe und lassen sich von Hand schieben.
const SCHRITT_S = 1.5;

const FEATURED = [
  { name: "Standox", src: "/images/brands/standox.png", tagline: "Premium Lacksystem", href: "/marken/standox" },
  { name: "3M", src: "/images/brands/3m.png", tagline: "Schleif & Politur", href: "/marken/3m" },
  { name: "Sonax", src: "/images/brands/sonax.png", tagline: "Fahrzeugpflege", href: "/marken/sonax" },
  { name: "Liqui Moly", src: "/images/brands/liqui-moly.png", tagline: "Öle & Additive", href: "/marken/liqui-moly" },
  { name: "Castrol", src: "/images/brands/castrol.png", tagline: "Motorenöl", href: "/marken/castrol" },
  { name: "Mipa", src: "/images/brands/mipa.png", tagline: "Lackierbedarf", href: "/marken/mipa" },
  { name: "Glasurit", src: "/images/brands/glasurit.svg", tagline: "Profi-Lacksysteme", href: "/marken/glasurit" },
  { name: "RM", src: "/images/brands/rm.svg", tagline: "Profi-Lacksystem", href: "/shop?marke=rm" },
  { name: "MANN-FILTER", src: "/images/brands/mann-filter.svg", tagline: "Filter", href: "/marken/mann-filter" },
  { name: "Cromax", src: "/images/brands/cromax.png", tagline: "Lacksystem", href: "/shop?marke=cromax" },
  { name: "Colad", src: "/images/brands/colad-mark.png", tagline: "Abdeckbedarf", href: "/marken/colad" },
  { name: "Sikkens", src: "/images/brands/sikkens.svg", tagline: "Profi-Lacksystem", href: "/marken/sikkens" },
  { name: "Indasa", src: "/images/brands/indasa-wordmark.png", tagline: "Schleifmittel", href: "/marken/indasa" },
  { name: "Spies Hecker", src: "/images/brands/spies-hecker-mark.png", tagline: "Profi-Lacksystem", href: "/marken/spies-hecker" },
  { name: "PPG", src: "/images/brands/ppg-mark.svg", tagline: "Lacksystem", href: "/shop?marke=ppg" },
  { name: "Anest Iwata", src: "/images/brands/anest-iwata.png", tagline: "Lackierpistolen", href: "/shop?marke=anest-iwata" },
  { name: "Spray Max", src: "/images/brands/spraymax.png", tagline: "Spraydosen", href: "/marken/spray-max" },
  { name: "Novol", src: "/images/brands/novol-wordmark.svg", tagline: "Spachtel & Füller", href: "/marken/novol" },
  { name: "FLEX", src: "/images/brands/flex.svg", tagline: "Schleifmaschinen", href: "/shop?marke=flex" },
];

// Nur Marken mit mehreren Katalogprodukten, die nicht schon in den Kacheln stehen.
// SATA führen wir nicht. Bosch, Menzerna und Koch-Chemie haben keine Produkte.
const MORE = [
  { name: "Rupes", href: "/marken/rupes" },
  { name: "Troton", href: "/marken/troton" },
  { name: "Baslac", href: "/shop?marke=baslac" },
  { name: "Mirka", href: "/marken/mirka" },
  { name: "Caramba", href: "/shop?marke=caramba" },
];

const GOLD = "#f1eb5b";
const DAUER_S = FEATURED.length * SCHRITT_S;

function useRuhigeBewegung() {
  const [ruhig, setRuhig] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setRuhig(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return ruhig;
}

function Kachel({
  brand,
  eager,
}: {
  brand: (typeof FEATURED)[0];
  eager?: boolean;
}) {
  return (
    <Link
      to={brand.href}
      aria-label={`${brand.name} im Shop`}
      data-marke={brand.name}
      title={brand.tagline}
      className="aa-marken-kachel block min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f1eb5b] rounded-md"
    >
      <span
        className="flex items-center justify-center rounded-md w-full"
        style={{
          background: "rgba(255,255,255,0.9)",
          height: 100,
          padding: "14px 20px",
          boxShadow: "0 2px 16px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.07)",
        }}
      >
        <img
          src={brand.src}
          alt=""
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          style={{
            maxWidth: "100%",
            maxHeight: 58,
            width: "auto",
            height: "auto",
            objectFit: "contain",
            display: "block",
          }}
        />
      </span>
    </Link>
  );
}

function Gruppe({ hidden }: { hidden?: boolean }) {
  return (
    <div className="aa-marken-gruppe" aria-hidden={hidden || undefined}>
      {FEATURED.map((brand) => (
        <Kachel key={brand.name} brand={brand} eager={!hidden} />
      ))}
    </div>
  );
}

export function BrandMarquee() {
  const ruhig = useRuhigeBewegung();
  const [sprung, setSprung] = useState(0);

  const zuMarke = (name: string) => {
    const index = FEATURED.findIndex((brand) => brand.name === name);
    if (index < 0) return;
    setSprung(index);
    if (!ruhig) return;
    document.querySelector(`.aa-marken [data-marke="${CSS.escape(name)}"]`)
      ?.scrollIntoView({ inline: "start", block: "nearest", behavior: "auto" });
  };

  return (
    <section className="section-dark py-20 sm:py-28 relative">
      <div className="container max-w-5xl">
        <div className="text-center mb-14 sm:mb-16">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-3 text-gold-accent">
            Unsere Partner
          </p>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">
            Diese <span className="text-gold-accent">Marken.</span>
            <br />
            <span className="text-white/40 text-2xl md:text-3xl font-semibold">Alle bei uns erhältlich.</span>
          </h2>
        </div>

        <div
          className={`aa-marken mb-8 ${ruhig ? "overflow-x-auto" : "overflow-hidden"}`}
          style={{ minHeight: 110 }}
        >
          {ruhig ? (
            <div className="aa-marken-gruppe">
              {FEATURED.map((brand) => (
                <Kachel key={brand.name} brand={brand} eager />
              ))}
            </div>
          ) : (
            <div
              key={sprung}
              className="aa-marken-lauf"
              style={{
                ["--marken-dauer" as string]: `${DAUER_S}s`,
                animationDelay: `-${sprung * SCHRITT_S}s`,
              }}
            >
              <Gruppe />
              <Gruppe hidden />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {FEATURED.map((brand, i) => (
            <button
              key={brand.name}
              type="button"
              aria-label={brand.name}
              aria-current={ruhig && sprung === i ? "true" : undefined}
              onClick={() => zuMarke(brand.name)}
              className="rounded-full"
              style={{
                width: ruhig && sprung === i ? 24 : 6,
                height: 6,
                background: ruhig && sprung === i ? GOLD : "rgba(255,255,255,0.4)",
              }}
            />
          ))}
        </div>

        <p className="text-center text-xs mt-6 text-white/30">
          +{" "}
          {MORE.map((brand, i) => (
            <span key={brand.name}>
              {i > 0 ? " · " : ""}
              <Link to={brand.href} className="hover:text-white/60">
                {brand.name}
              </Link>
            </span>
          ))}
          {" "}und viele mehr
        </p>
      </div>
    </section>
  );
}
