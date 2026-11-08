import { supabase } from "@/lib/supabase";
import { empfehlungLesen } from "@/lib/empfehlung";
import { empfehlungOffen } from "../../shared/empfehlung.js";

export type Zahlweg = "gocardless" | "stripe";

type Ergebnis =
  | { art: "weiter"; url: string }
  | { art: "anfrage" }
  | { art: "anmelden" }
  | { art: "fehler"; text: string };

async function kontoKopf(): Promise<Record<string, string>> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Gleicher Abschluss wie auf der Mitgliedschaftsseite. Ohne Zahlungs-Keys bleibt es eine Anfrage. */
export async function aboAbschliessen(opts: {
  email: string;
  zahlweg: Zahlweg;
  produkte: unknown[];
  price: number;
  waren?: unknown[];
  einmalig?: number;
}): Promise<Ergebnis> {
  const kopf = await kontoKopf();
  if (!kopf.Authorization) return { art: "anmelden" };
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
    headers: { "Content-Type": "application/json", ...kopf },
    body: JSON.stringify({ ...auswahl, method: opts.zahlweg }),
  });
  const coData = await co.json().catch(() => ({}));
  if (co.status === 401) return { art: "anmelden" };
  if (co.ok && coData.url) return { art: "weiter", url: coData.url };
  if (co.status === 409 || co.status === 400) {
    return { art: "fehler", text: coData.error || "Buchung nicht möglich — bitte die Seite neu laden." };
  }
  if (opts.waren && (coData.fallback || !co.ok)) {
    return { art: "fehler", text: "Die Kartenzahlung ist noch nicht freigeschaltet. Bitte ruf uns an: 0202 82690." };
  }
  if (!(co.ok && coData.fallback) && !co.ok) {
    return { art: "fehler", text: coData.error || "Der Abschluss ist gerade nicht erreichbar." };
  }
  const res = await fetch("/api/membership-email", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...kopf },
    body: JSON.stringify(auswahl),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) return { art: "anmelden" };
  if (!res.ok) return { art: "fehler", text: data.error || "Die Anfrage konnte nicht gesendet werden." };
  return { art: "anfrage" };
}
