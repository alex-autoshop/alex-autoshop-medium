import { empfehlungLesen } from "@/lib/empfehlung";
import { aboZahlungErgebnis } from "../../shared/abo-kasse.js";
import { empfehlungOffen } from "../../shared/empfehlung.js";

export type Zahlweg = "gocardless" | "stripe";

type Ergebnis =
  | { art: "weiter"; url: string }
  | { art: "fehler"; text: string };

/** Produkt-Abo nur über die Bezahlseite. Ohne URL bleibt es ein Fehler, keine Anfrage. */
export async function aboAbschliessen(opts: {
  email: string;
  zahlweg: Zahlweg;
  produkte: unknown[];
  price: number;
  waren?: unknown[];
  einmalig?: number;
}): Promise<Ergebnis> {
  const auswahl = {
    aboTyp: "produkt" as const,
    email: opts.email,
    produkte: opts.produkte,
    price: opts.price,
    waren: opts.waren,
    einmalig: opts.einmalig,
    ref: empfehlungOffen() ? empfehlungLesen() || undefined : undefined,
  };
  const co = await fetch("/api/membership-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...auswahl, method: opts.zahlweg }),
  });
  const coData = await co.json().catch(() => ({}));
  return aboZahlungErgebnis(co.status, coData);
}
