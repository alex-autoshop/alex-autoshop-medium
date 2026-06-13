import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";

// Spotlight-Karussell der Marken — Animation übernommen von der Profi-Seite,
// angepasst an die Medium-Site (dunkle Sektion, weiße Karten, Gold-Akzent).
const FEATURED = [
  { name: "Standox", src: "/images/brands/standox.png", tagline: "Premium Lacksystem" },
  { name: "3M", src: "/images/brands/3m.png", tagline: "Schleif & Politur" },
  { name: "Sonax", src: "/images/brands/sonax.png", tagline: "Fahrzeugpflege" },
  { name: "Liqui Moly", src: "/images/brands/liqui-moly.png", tagline: "Öle & Additive" },
  { name: "Castrol", src: "/images/brands/castrol.png", tagline: "Motorenöl" },
  { name: "Mipa", src: "/images/brands/mipa.png", tagline: "Lackierbedarf" },
  { name: "Glasurit", src: "/images/brands/glasurit.svg", tagline: "Profi-Lacksysteme" },
];

const GOLD = "#f1eb5b";

function BrandCard({
  brand,
  index,
  isActive,
  onHover,
  onLeave,
  revealed,
}: {
  brand: (typeof FEATURED)[0];
  index: number;
  isActive: boolean;
  onHover: () => void;
  onLeave: () => void;
  revealed: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.92 }}
      animate={revealed ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 40, scale: 0.92 }}
      transition={{ duration: 0.65, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      onHoverStart={onHover}
      onHoverEnd={onLeave}
      className="relative flex flex-col items-center justify-center cursor-default"
      style={{ flex: "1 1 0", minWidth: 0 }}
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
          alt={brand.name}
          loading="lazy"
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
            className="absolute -bottom-10 flex flex-col items-center"
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

  useEffect(() => {
    if (inView) {
      const t = setTimeout(() => setRevealed(true), 100);
      return () => clearTimeout(t);
    }
  }, [inView]);

  useEffect(() => {
    if (!revealed) return;
    const interval = setInterval(() => {
      if (!isUserHovering.current) setAutoIndex((i) => (i + 1) % FEATURED.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [revealed]);

  const currentActive = activeIndex !== null ? activeIndex : autoIndex;

  return (
    <section ref={sectionRef} className="section-dark py-20 sm:py-28 relative">
      <div className="container max-w-5xl">
        {/* Header */}
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
            Die besten <span className="text-gold-accent">Marken.</span>
            <br />
            <span className="text-white/40 text-2xl md:text-3xl font-semibold">Alle bei uns erhältlich.</span>
          </h2>
        </motion.div>

        {/* Karten */}
        <div className="flex items-center gap-3 md:gap-5 mb-14 overflow-hidden" style={{ minHeight: 110 }}>
          {FEATURED.map((brand, i) => {
            const distance = Math.abs(i - currentActive);
            const mobileVisible = distance <= 1;
            return (
              <div
                key={brand.name}
                className={`md:flex-1 transition-all duration-500 ${
                  mobileVisible
                    ? "flex-1"
                    : "w-0 opacity-0 pointer-events-none md:opacity-100 md:w-auto md:pointer-events-auto"
                }`}
              >
                <BrandCard
                  brand={brand}
                  index={i}
                  isActive={currentActive === i}
                  revealed={revealed}
                  onHover={() => {
                    isUserHovering.current = true;
                    setActiveIndex(i);
                  }}
                  onLeave={() => {
                    isUserHovering.current = false;
                    setActiveIndex(null);
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Punkte */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={revealed ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.8 }}
          className="flex items-center justify-center gap-2.5 mt-16"
        >
          {FEATURED.map((_, i) => (
            <motion.button
              key={i}
              aria-label={`Marke ${i + 1}`}
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

        {/* Bottom-Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={revealed ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 1 }}
          className="text-center text-xs mt-6 text-white/30"
        >
          + Standox · Bosch · Rupes · SATA · Menzerna · Koch-Chemie und viele mehr
        </motion.p>
      </div>
    </section>
  );
}
