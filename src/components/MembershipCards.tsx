import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { MEMBERSHIP_LEVELS } from "@/data/memberships";
import { cn } from "@/lib/utils";

export function MembershipCards({ compact = false }: { compact?: boolean }) {
  return (
    <div className="grid sm:grid-cols-3 gap-5">
      {MEMBERSHIP_LEVELS.map((m) => (
        <div
          key={m.level}
          className={cn(
            "card-tilt p-6 flex flex-col relative",
            m.highlight && "border-primary ring-2 ring-primary/30"
          )}
        >
          {m.highlight && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
              Beliebteste Wahl
            </span>
          )}
          <h3 className="text-xl">{m.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">{m.tagline}</p>
          <p className="mt-4">
            <span className="text-4xl font-display font-bold">{m.discountPercent}%</span>
            <span className="text-muted-foreground font-medium"> Rabatt</span>
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {m.pricePerMonth} € / Monat · monatlich kündbar
          </p>
          {!compact && (
            <ul className="space-y-2 mb-6 flex-1">
              {m.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/mitgliedschaft"
            className={cn("mt-auto", m.highlight ? "btn-primary" : "btn-outline")}
          >
            Mehr erfahren
          </Link>
        </div>
      ))}
    </div>
  );
}
