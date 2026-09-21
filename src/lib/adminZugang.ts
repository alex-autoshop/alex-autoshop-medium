/**
 * Admin-Zugang im Browser — liefert die zwei Schlüssel für api/_admin.js:
 * die Supabase-Sitzung (hat Alex ohnehin) und den Admin-PIN.
 *
 * Der PIN wird einmal pro Gerät eingetippt und bleibt auf DIESEM Gerät
 * (Laden-PC). Er allein nützt niemandem: der Server verlangt zusätzlich die
 * Sitzung eines Admin-Kontos. Umgekehrt nützt die Sitzung ohne PIN nichts.
 *
 * Wichtig für die Theke: Hier kommt der Einkaufspreis NUR an, wenn der Server
 * beide Schlüssel akzeptiert. Im JS-Bundle steht kein einziger EK.
 */
import { supabase } from "@/lib/supabase";

const PIN_KEY = "tp:admin-pin";

export function adminPinLesen(): string {
  try { return localStorage.getItem(PIN_KEY) || ""; } catch { return ""; }
}

export function adminPinSetzen(pin: string) {
  try {
    if (pin) localStorage.setItem(PIN_KEY, pin);
    else localStorage.removeItem(PIN_KEY);
  } catch { /* privater Modus — dann eben jedes Mal eintippen */ }
}

export async function adminKopf(): Promise<Record<string, string>> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
  const pin = adminPinLesen();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(pin ? { "x-admin-pin": pin } : {}),
  };
}

export type AdminFehlerArt = "pin" | "keinPin" | "keinAdmin" | "abgemeldet" | "netz" | "sonst";
export interface AdminFehler { art: AdminFehlerArt; text: string }

/** Server-Antwort → verständlicher Hinweis. Falscher PIN löscht den gemerkten. */
export function adminFehlerAus(status: number, d: { error?: string; pinFalsch?: boolean } | null): AdminFehler {
  if (status === 503) return { art: "keinPin", text: "ADMIN_PIN ist in Vercel noch nicht gesetzt." };
  if (d?.pinFalsch) { adminPinSetzen(""); return { art: "pin", text: "PIN stimmt nicht." }; }
  if (status === 401) return { art: "abgemeldet", text: "Sitzung abgelaufen — bitte neu anmelden." };
  if (status === 403) return { art: "keinAdmin", text: "Kein Admin-Zugang." };
  return { art: "sonst", text: d?.error || `Fehler ${status}` };
}

export interface EkPreis {
  sku: string;
  gefunden: boolean;
  ekBrutto: number;
  ekNetto: number;
  listeBrutto: number;
  listeNetto: number;
  mwst: number;
  /** Verkaufspreis, den die Liste zeigt (EK × Aufschlag) */
  vk: number;
  /** Kein EK von Inter Cars → Liste rechnet mit UVP × Aufschlag */
  ohneEk: boolean;
}

export async function adminPreiseHolen(
  skus: string[],
): Promise<{ preise: EkPreis[]; aufschlag: number } | { fehler: AdminFehler }> {
  if (!adminPinLesen()) return { fehler: { art: "pin", text: "Admin-PIN eingeben" } };
  const liste = [...new Set(skus.filter(Boolean))];
  if (liste.length === 0) return { preise: [], aufschlag: 2 };
  try {
    const r = await fetch("/api/intercars", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await adminKopf()) },
      body: JSON.stringify({ action: "adminPreise", skus: liste }),
    });
    const d = await r.json().catch(() => null);
    if (r.ok && Array.isArray(d?.preise)) return { preise: d.preise as EkPreis[], aufschlag: Number(d.aufschlag) || 2 };
    return { fehler: adminFehlerAus(r.status, d) };
  } catch {
    return { fehler: { art: "netz", text: "Keine Verbindung — nochmal versuchen." } };
  }
}
