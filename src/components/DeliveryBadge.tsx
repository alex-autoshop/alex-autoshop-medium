import { Truck } from "lucide-react";
import { deliveryFor, type DeliveryNode } from "@/lib/delivery";
import { cn } from "@/lib/utils";

interface DeliveryBadgeProps {
  node: DeliveryNode;
  /** false = Variante/Produkt nicht bestellbar */
  available?: boolean;
  /** "sm" = Produktkarte, "md" = Produktdetailseite */
  size?: "sm" | "md";
  className?: string;
}

/**
 * Einheitliche Lieferzeit-Angabe. Wird in allen Produktkarten und auf der
 * Produktseite verwendet, damit die Aussage ueberall identisch ist.
 */
export function DeliveryBadge({ node, available = true, size = "sm", className }: DeliveryBadgeProps) {
  const { label } = deliveryFor(node);

  if (!available) {
    return (
      <p
        className={cn(
          "flex items-center gap-1.5 text-muted-foreground",
          size === "sm" ? "text-[11px]" : "text-sm",
          className
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" aria-hidden />
        <span>Derzeit nicht auf Lager — Liefertermin auf Anfrage</span>
      </p>
    );
  }

  if (size === "md") {
    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-xl border border-border bg-secondary/50 px-4 py-3",
          className
        )}
      >
        <Truck className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden />
        <div className="text-sm leading-snug">
          <p className="font-semibold text-foreground">
            Lieferzeit {label}
          </p>
          <p className="text-muted-foreground text-xs mt-0.5">
            Versand innerhalb Deutschlands · Bestellungen bis 15 Uhr gehen am selben Werktag raus
          </p>
        </div>
      </div>
    );
  }

  return (
    <p
      className={cn("flex items-center gap-1.5 text-[11px] leading-tight", className)}
      title={`Voraussichtliche Lieferzeit: ${label}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden />
      <span className="font-semibold text-emerald-700 dark:text-emerald-400">Lieferzeit</span>
      <span className="text-muted-foreground">{label}</span>
    </p>
  );
}
