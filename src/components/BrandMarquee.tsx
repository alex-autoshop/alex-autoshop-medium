import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, AnimatePresence } from "framer-motion";

// Spotlight-Karussell. Auf Desktop bleiben 7 Kacheln in der bisherigen Größe,
// auf dem Handy 3. Weitere Marken kommen seitenweise, Punkte und Autoplay
// laufen über die ganze Liste.
//
// Reihenfolge der Ergänzungen: Produktzahl im veröffentlichten Katalog
// (Marke aus Titel/Handle, sonst Vendor). Lieferanten und Marken ohne
// mehrere Produkte sind nicht dabei.
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
// Standox ist im Slider. Bosch, SATA, Menzerna und Koch-Chemie haben keine eigenen Produkte.
const MORE = [
  { name: "Rupes", href: "/marken/rupes" },
  { name: "Troton", href: "/marken/troton" },
  { name: "Baslac", href: "/shop?marke=baslac" },
  { name: "Mirka", href: "/marken/mirka" },
  { name: "Caramba", href: "/shop?marke=caramba" },
];

const GOLD = "#f1eb5b";
const DESKTOP_QUERY = "(min-width: 768px)";

function useDesktop() {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(DESKTOP_QUERY).matches : true,
  );
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const apply = () => setDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return desktop;
}

/** Volle Seite ab dem aktiven Index, letzte Seite bleibt voll (gleiche Kachelbreite). */
function windowStart(active: number, total: number, count: number) {
  if (total <= count) return 0;
  const page = Math.floor(active / count) * count;
  return Math.min(page, total - count);
}

function BrandCard({
  brand,
  index,
  isActive,
  onHover,
  onLeave,
  revealed,
  intro,
}: {
  brand: (typeof FEATURED)[0];
  index: number;
  isActive: boolean;
  onHover: () => void;
  onLeave: () => void;
  revealed: boolean;
  intro: boolean;
}) {
  return (
    <motion.div
      initial={intro ? { opacity: 0, y: 40, scale: 0.92 } : false}
      animate={revealed ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 40, scale: 0.92 }}
      transition={{ duration: intro ? 0.65 : 0.35, delay: intro ? index * 0.08 : 0, ease: [0.16, 1, 0.3, 1] }}
      onHoverStart={onHover}
      onHoverEnd={onLeave}
      className="relative flex flex-col items-center justify-center"
    >
      <motion.div
        animate={
          isActive
            ? {
                scale: 1.06,
                boxShadow:
                  "0 0 40px rgba(241,235,91,0.25), 0 16px 48px rgba(0,0,0,0.5), 0 0 0 1.5px rgba(241,235,91,0.4)",
              }
            : { scale: 1, boxShadow: "0 2px 16px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.07)" }
        }
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className="w-full flex items-center justify-center rounded-md"
        style={{
          background: isActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.85)",
          height: 100,
          padding: "14px 20px",
        }}
      >
        <img
          src={brand.src}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          style={{
            maxWidth: "100%",
            maxHeight: 58,
            width: "auto",
            height: "auto",
            objectFit: "contain",
            filter: isActive ? "none" : "grayscale(15%) brightness(0.92)",
            transition: "filter 0.35s ease",
            display: "block",
          }}
        />
      </motion.div>

      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="absolute -bottom-10 flex flex-col items-center pointer-events-none"
          >
            <p className="text-[13px] font-bold text-white leading-none">{brand.name}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(241,235,91,0.65)" }}>{brand.tagline}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full"
        animate={isActive ? { width: 32, opacity: 1 } : { width: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{ height: 2, background: GOLD, boxShadow: `0 0 8px ${GOLD}` }}
      />
    </motion.div>
  );
}

export function BrandMarquee() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-100px" });
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [autoIndex, setAutoIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const isUserHovering = useRef(false);
  const intro = useRef(true);
  const desktop = useDesktop();
  const visibleCount = desktop ? 7 : 3;
  const gap = desktop ? 20 : 12;

  useEffect(() => {
    if (inView) {
      const t = setTimeout(() => setRevealed(true), 100);
      return () => clearTimeout(t);
    }
  }, [inView]);

  useEffect(() => {
    if (!revealed) return;
    const t = setTimeout(() => {
      intro.current = false;
    }, 1200);
    return () => clearTimeout(t);
  }, [revealed]);

  useEffect(() => {
    if (!revealed) return;
    const interval = setInterval(() => {
      if (!isUserHovering.current) setAutoIndex((i) => (i + 1) % FEATURED.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [revealed]);

  const currentActive = activeIndex !== null ? activeIndex : autoIndex;
  const start = windowStart(autoIndex, FEATURED.length, visibleCount);
  const visible = FEATURED.slice(start, start + visibleCount);

  return (
    <section ref={sectionRef} className="section-dark py-20 sm:py-28 relative">
      <div className="container max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-14 sm:mb-16"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-3 text-gold-accent">
            Unsere Partner
          </p>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">
            Diese <span className="text-gold-accent">Marken.</span>
            <br />
            <span className="text-white/40 text-2xl md:text-3xl font-semibold">Alle bei uns erhältlich.</span>
          </h2>
        </motion.div>

        <div
          className="flex items-center mb-14 overflow-hidden"
          style={{ minHeight: 110, gap }}
        >
          {visible.map((brand, position) => {
            const index = start + position;
            return (
              <div
                key={brand.name}
                style={{ flex: `0 0 calc((100% - ${(visibleCount - 1) * gap}px) / ${visibleCount})` }}
                className="min-w-0"
              >
                <Link
                  to={brand.href}
                  aria-label={`${brand.name} im Shop`}
                  className="block w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f1eb5b] rounded-md"
                  onMouseEnter={() => {
                    isUserHovering.current = true;
                    setActiveIndex(index);
                  }}
                  onMouseLeave={() => {
                    isUserHovering.current = false;
                    setActiveIndex(null);
                  }}
                  onFocus={() => {
                    isUserHovering.current = true;
                    setActiveIndex(index);
                  }}
                  onBlur={() => {
                    isUserHovering.current = false;
                    setActiveIndex(null);
                  }}
                >
                  <BrandCard
                    brand={brand}
                    index={position}
                    isActive={currentActive === index}
                    revealed={revealed}
                    intro={intro.current}
                    onHover={() => {
                      isUserHovering.current = true;
                      setActiveIndex(index);
                    }}
                    onLeave={() => {
                      isUserHovering.current = false;
                      setActiveIndex(null);
                    }}
                  />
                </Link>
              </div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={revealed ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-wrap items-center justify-center gap-2.5 mt-16"
        >
          {FEATURED.map((brand, i) => (
            <motion.button
              key={brand.name}
              type="button"
              aria-label={brand.name}
              aria-current={currentActive === i ? "true" : undefined}
              onClick={() => {
                setAutoIndex(i);
                setActiveIndex(i);
                setTimeout(() => setActiveIndex(null), 1000);
              }}
              animate={currentActive === i ? { opacity: 1 } : { opacity: 0.3 }}
              className="rounded-full"
              style={{
                width: currentActive === i ? 24 : 6,
                height: 6,
                background: currentActive === i ? GOLD : "rgba(255,255,255,0.4)",
                transition: "width 0.3s ease",
              }}
            />
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={revealed ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 1 }}
          className="text-center text-xs mt-6 text-white/30"
        >
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
        </motion.p>
      </div>
    </section>
  );
}
