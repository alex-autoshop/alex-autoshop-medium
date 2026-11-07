import { grundpreisText } from "../../shared/grundpreis.js";
import { cn } from "@/lib/utils";

export function Grundpreis({
  variant,
  className,
}: {
  variant?: Parameters<typeof grundpreisText>[0];
  className?: string;
}) {
  const text = grundpreisText(variant);
  if (!text) return null;
  return <p className={cn("text-[11px] leading-tight text-muted-foreground tabular-nums", className)}>{text}</p>;
}
