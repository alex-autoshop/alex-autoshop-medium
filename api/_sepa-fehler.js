// Fehler der SEPA-Schnittstelle: ins Log, nie an den Kunden.
// Der Access-Token und andere Geheimnisse gehören nicht ins Log.

export const SEPA_KUNDENTEXT =
  "SEPA-Lastschrift ist gerade nicht verfügbar. Bitte wähle Karte oder versuche es später erneut.";

const SUCHBEGRIFF = "[sepa-checkout]";
const GEHEIM = /\b(?:live|sandbox|sk|rk|whsec)_[A-Za-z0-9_-]{8,}\b|Bearer\s+\S+/gi;

export function sepaBereinigen(text) {
  return String(text ?? "").replace(GEHEIM, "[entfernt]");
}

function header(res, name) {
  try {
    return sepaBereinigen(res?.headers?.get?.(name) || "").slice(0, 180);
  } catch {
    return "";
  }
}

function fehlerObjekt(daten) {
  const roh = daten?.error;
  if (typeof roh === "string") return { message: roh };
  if (roh && typeof roh === "object") return roh;
  return {};
}

function adresse(wert) {
  const roh = String(wert || "");
  if (!roh) return "";
  try {
    const u = new URL(roh);
    return `${u.origin}${u.pathname}`.slice(0, 200);
  } catch {
    return "";
  }
}

function istHtml(contentType, text) {
  if (/text\/html/i.test(String(contentType || ""))) return true;
  const anfang = String(text || "").trimStart().slice(0, 24).toLowerCase();
  return anfang.startsWith("<!doctype") || anfang.startsWith("<html");
}

function sepaLog(res, stelle, daten, sicher, ziel) {
  const error = fehlerObjekt(daten);
  const liste = Array.isArray(error.errors) ? error.errors : [];
  const requestId = error.request_id || header(res, "x-request-id") || null;
  const angefragt = adresse(ziel);
  const ort = adresse(header(res, "location"));
  const typ = header(res, "content-type");
  const bereinigt = sepaBereinigen(sicher);
  console.error(SUCHBEGRIFF, JSON.stringify({
    stelle: String(stelle || "").slice(0, 80),
    status: res?.status ?? null,
    type: error.type ?? null,
    code: error.code ?? null,
    message: error.message == null ? null : sepaBereinigen(error.message).slice(0, 300),
    errors: liste.map((e) => ({
      reason: e?.reason == null ? null : sepaBereinigen(e.reason).slice(0, 120),
      field: e?.field == null ? null : sepaBereinigen(e.field).slice(0, 120),
    })),
    request_id: requestId,
    ...(angefragt ? { ziel: angefragt } : {}),
    gelandet: sepaBereinigen(res?.url || "").slice(0, 300),
    ...(ort ? { ort } : {}),
    html: istHtml(typ, bereinigt),
    headers: {
      "x-request-id": header(res, "x-request-id"),
      "cf-ray": header(res, "cf-ray"),
      "content-type": typ,
      server: header(res, "server"),
      "content-length": header(res, "content-length"),
      "www-authenticate": header(res, "www-authenticate"),
    },
    auszug: bereinigt.slice(0, 300),
    roh: bereinigt.slice(0, 500),
  }));
}

async function lesen(res) {
  let roh = "";
  try { roh = await res.text(); } catch { roh = ""; }
  const sicher = sepaBereinigen(roh);
  let daten = null;
  if (sicher) {
    try { daten = JSON.parse(sicher); } catch { daten = null; }
  }
  return { daten, sicher };
}

/** Erfolg: JSON der Antwort. Fehler: Log und Abbruch mit dem Kundentext. */
export async function sepaJson(res, stelle, ziel) {
  const gelesen = await lesen(res);
  if (!res.ok) {
    sepaLog(res, stelle, gelesen.daten, gelesen.sicher, ziel);
    throw new Error(SEPA_KUNDENTEXT);
  }
  return gelesen.daten;
}

/** Nebenaufruf: Fehler nur ins Log, der Checkout läuft weiter. */
export async function sepaNurLog(res, stelle, ziel) {
  if (res.ok) return;
  const gelesen = await lesen(res);
  sepaLog(res, stelle, gelesen.daten, gelesen.sicher, ziel);
}

export function sepaNetzLog(stelle, e) {
  console.error(SUCHBEGRIFF, JSON.stringify({
    stelle: String(stelle || "").slice(0, 80),
    netz: sepaBereinigen(e?.message || e).slice(0, 300),
  }));
}

export function sepaWeiterwerfen(stelle, e) {
  if (e instanceof Error && e.message === SEPA_KUNDENTEXT) throw e;
  sepaNetzLog(stelle, e);
  throw new Error(SEPA_KUNDENTEXT);
}
