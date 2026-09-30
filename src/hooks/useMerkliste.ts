import { useCallback, useEffect, useState } from "react";

const SCHLUESSEL = "alex-merkliste-v1";

function lesen(): string[] {
  try {
    const roh = localStorage.getItem(SCHLUESSEL);
    return roh ? (JSON.parse(roh) as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * Gemerkte Fahrzeuge liegen im Browser des Besuchers — kein Konto nötig.
 * Mehrere Komponenten auf einer Seite bleiben über ein eigenes Ereignis synchron.
 */
export function useMerkliste() {
  const [liste, setListe] = useState<string[]>(() => (typeof window === "undefined" ? [] : lesen()));

  useEffect(() => {
    const auffrischen = () => setListe(lesen());
    window.addEventListener("merkliste", auffrischen);
    window.addEventListener("storage", auffrischen);
    return () => {
      window.removeEventListener("merkliste", auffrischen);
      window.removeEventListener("storage", auffrischen);
    };
  }, []);

  const umschalten = useCallback((slug: string) => {
    const neu = lesen().includes(slug) ? lesen().filter((s) => s !== slug) : [...lesen(), slug];
    try {
      localStorage.setItem(SCHLUESSEL, JSON.stringify(neu));
    } catch {
      /* privates Fenster o. ä. — dann bleibt die Merkliste eben nur für diese Sitzung */
    }
    setListe(neu);
    window.dispatchEvent(new Event("merkliste"));
  }, []);

  const leeren = useCallback(() => {
    try {
      localStorage.removeItem(SCHLUESSEL);
    } catch { /* egal */ }
    setListe([]);
    window.dispatchEvent(new Event("merkliste"));
  }, []);

  return { liste, umschalten, leeren, gemerkt: (slug: string) => liste.includes(slug) };
}
