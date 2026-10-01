import { NavLink } from "react-router-dom";
import { useMerkliste } from "@/hooks/useMerkliste";
import { Car, Key, BadgeEuro, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

/** Unter-Navigation der Fahrzeugbörse — auf allen vier Bereichsseiten gleich. */
export const BEREICHE = [
  { to: "/fahrzeugboerse", label: "Fahrzeuge", icon: Car, ende: true },
  { to: "/mieten", label: "Mietbörse", icon: Key, ende: false },
  { to: "/foerdermittel", label: "Fördermittel", icon: BadgeEuro, ende: false },
];

export function FahrzeugbNav() {
  const { liste } = useMerkliste();
  return (
    <nav
      aria-label="Fahrzeugbörse"
      className="sticky top-20 sm:top-24 z-30 bg-night/95 backdrop-blur-md border-b border-white/10"
    >
      <div className="container flex gap-1 overflow-x-auto py-2 -mx-0">
        {BEREICHE.map((b) => (
          <NavLink
            key={b.to}
            to={b.to}
            end={b.ende}
            className={({ isActive }) =>
              cn(
                "shrink-0 inline-flex items-center gap-2 px-4 min-h-[44px] rounded-lg text-sm font-semibold transition-colors whitespace-nowrap",
                isActive ? "bg-gold-bright text-night" : "text-white/70 hover:text-white hover:bg-white/10"
              )
            }
          >
            <b.icon className="w-4 h-4" /> {b.label}
          </NavLink>
        ))}

        {/* Merkliste ganz rechts — der Zähler zeigt, dass etwas drin liegt */}
        <NavLink
          to="/merkliste"
          className={({ isActive }) =>
            cn(
              "ml-auto shrink-0 inline-flex items-center gap-2 px-4 min-h-[44px] rounded-lg text-sm font-semibold transition-colors whitespace-nowrap",
              isActive ? "bg-gold-bright text-night" : "text-white/70 hover:text-white hover:bg-white/10"
            )
          }
        >
          {({ isActive }) => (
            <>
              <Heart className={cn("w-4 h-4", liste.length > 0 && !isActive && "fill-gold-bright text-gold-bright")} />
              <span className="hidden sm:inline">Merkliste</span>
              {liste.length > 0 && (
                <span
                  className={cn(
                    "rounded-full text-[11px] font-bold tabular-nums min-w-[20px] h-5 px-1 inline-flex items-center justify-center",
                    isActive ? "bg-night/15 text-night" : "bg-gold-bright text-night"
                  )}
                >
                  {liste.length}
                </span>
              )}
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}

/** Kopf einer Bereichsseite — dunkel, mit dem Hallenbild im Hintergrund. */
export function BereichsHero({
  augenbraue, titel, akzent, text, children,
}: {
  augenbraue: string;
  titel: string;
  akzent?: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="section-dark relative overflow-hidden">
      <picture aria-hidden="true">
        <source media="(min-width: 640px)" srcSet="/images/fahrzeugmarkt-hero.jpg" />
        <img src="/images/fahrzeugmarkt-hero-handy.jpg" alt=""
          className="absolute inset-0 w-full h-full object-cover" loading="eager" />
      </picture>
      <div className="absolute inset-0 bg-gradient-to-b from-night/85 via-night/80 to-night" aria-hidden="true" />
      <div className="container py-14 sm:py-20 relative text-center max-w-3xl mx-auto">
        <span className="inline-block text-gold-accent font-semibold uppercase tracking-wide text-sm mb-4">
          {augenbraue}
        </span>
        <h1 className="text-3xl sm:text-5xl leading-[1.08] mb-5">
          {titel} {akzent && <span className="text-gold-accent">{akzent}</span>}
        </h1>
        <p className="text-white/70 text-lg leading-relaxed">{text}</p>
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
