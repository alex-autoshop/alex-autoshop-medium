import { supabase } from "@/lib/supabase";
import { empfehlungLesen } from "@/lib/empfehlung";
import { empfehlungOffen } from "../../shared/empfehlung.js";

export type Zahlweg = "gocardless" | "stripe";

type Ergebnis =
  | { art: "weiter"; url: string }
  | { art: "anfrage" }
  | { art: "fehler"; text: string };

/** Gleicher Abschluss wie auf der Mitgliedschaftsseite. Ohne Zahlungs-Keys bleibt es eine Anfrage. */
export async function aboAbschliessen(opts: {
  email: string;
  zahlweg: Zahlweg;
  produkte: unknown[];
  price: number;
}): Promise<Ergebnis> {
  const auswahl = {
    aboTyp: "produkt" as const,
    email: opts.email,
    produkte: opts.produkte,
    price: opts.price,
    ref: empfehlungOffen() ? empfehlungLesen() || undefined : undefined,
  };
  const co = await fetch("/api/membership-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...auswahl, method: opts.zahlweg }),
  });
  const coData = await co.json().catch(() => ({}));
  if (co.ok && coData.url) return { art: "weiter", url: coData.url };
  if (co.status === 409 || co.status === 400) {
    return { art: "fehler", text: coData.error || "Buchung nicht möglich — bitte die Seite neu laden." };
  }
  if (!(co.ok && coData.fallback) && !co.ok) {
    return { art: "fehler", text: coData.error || "Der Abschluss ist gerade nicht erreichbar." };
  }
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
  const res = await fetch("/api/membership-email", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(auswahl),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { art: "fehler", text: data.error || "Die Anfrage konnte nicht gesendet werden." };
  return { art: "anfrage" };
}
