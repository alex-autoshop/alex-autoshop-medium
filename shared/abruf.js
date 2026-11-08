/**
 * Wiederholungen fürs Laden: Timeouts, kurze Netzfehler, fehlende Chunks.
 * Keine Kundentexte.
 */

export function istChunkFehler(fehler) {
  const name = fehler && typeof fehler === "object" && "name" in fehler ? String(fehler.name) : "";
  const message = fehler && typeof fehler === "object" && "message" in fehler ? String(fehler.message) : String(fehler ?? "");
  return /ChunkLoadError|chunk-timeout|dynamically imported module|Importing a module script failed|error loading dynamically imported module|Failed to fetch dynamically imported module|Unable to preload CSS|module script failed/i.test(`${name} ${message}`);
}

/** Höchstens ein Neuladen alle 15 Sekunden, damit eine kaputte Datei nicht kreist. */
export function seiteNeuLaden() {
  if (typeof window === "undefined") return false;
  const schluessel = "aa-chunk-neu";
  try {
    const zuletzt = Number(sessionStorage.getItem(schluessel) || 0);
    if (Number.isFinite(zuletzt) && Date.now() - zuletzt < 15000) return false;
    sessionStorage.setItem(schluessel, String(Date.now()));
  } catch {
    /* privater Modus */
  }
  window.location.reload();
  return true;
}

/**
 * @param {(signal: AbortSignal, versuch: number) => Promise<unknown>} arbeit
 * @param {{ versuche?: number, pauseMs?: number, timeoutMs?: number }} [optionen]
 */
export async function wiederholen(arbeit, optionen = {}) {
  const versuche = optionen.versuche ?? 3;
  const pauseMs = optionen.pauseMs ?? 250;
  const timeoutMs = optionen.timeoutMs ?? 8000;
  let letzter;
  for (let i = 0; i < versuche; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await arbeit(controller.signal, i);
    } catch (fehler) {
      letzter = fehler;
      const status = Number(fehler && fehler.status);
      if (status >= 400 && status < 500 && status !== 408 && status !== 429) throw fehler;
      if (i === versuche - 1) break;
      await new Promise((resolve) => setTimeout(resolve, pauseMs * (i + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw letzter;
}
