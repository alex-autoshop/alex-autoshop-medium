// ─────────────────────────────────────────────────────────────────────────────
// Verkaufspreis aus dem Inter-Cars-Einkauf.
//
// Standard, solange nichts in der Umgebung steht:
//   Basis 2,0  ·  Streuung ±5 % je SKU  ·  kein Warengruppen-Faktor  ·  kein Deckel
//
// Optional, erst wenn Alex die Zahlen setzt (Vercel):
//   PRICE_MARKUP          Basis statt 2,0
//   PRICE_SPANNE          Streuung, 0.05 = ±5 %, 0 = aus
//   PRICE_MARKUP_GROUPS   JSON, z.B. {"ölfilter":1.35,"bremse":1.45}
//                         Der längste Schlüssel, der im Artikelnamen vorkommt,
//                         ersetzt die Basis. Ohne Treffer bleibt die Basis.
//   PRICE_MARKET_CAP      "1" deckelt den Verkaufspreis auf die UVP
//                         (listPriceGross), wenn eine UVP vorhanden ist.
//
// Ohne diese Variablen rechnet die Funktion exakt wie vorher.
// ─────────────────────────────────────────────────────────────────────────────

export const STANDARD_BASIS = 2;
export const STANDARD_SPANNE = 0.05;

function zahl(v, min, max, standard) {
  if (v === undefined || v === null || String(v).trim() === "") return standard;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : standard;
}

export function basisAusEnv(env) {
  const e = env || {};
  return zahl(e.PRICE_MARKUP, 0.01, 10, STANDARD_BASIS);
}

export function spanneAusEnv(env) {
  const e = env || {};
  if (e.PRICE_SPANNE === undefined || String(e.PRICE_SPANNE).trim() === "") return STANDARD_SPANNE;
  return zahl(e.PRICE_SPANNE, 0, 0.3, STANDARD_SPANNE);
}

/** Längster passender Warengruppen-Faktor, sonst null (dann gilt die Basis). */
export function gruppenFaktor(name, env) {
  const roh = String((env || {}).PRICE_MARKUP_GROUPS || "").trim();
  if (!roh) return null;
  let map;
  try { map = JSON.parse(roh); } catch { return null; }
  if (!map || typeof map !== "object" || Array.isArray(map)) return null;
  const n = norm(name);
  if (!n) return null;
  let best = null;
  let laenge = 0;
  for (const [key, wert] of Object.entries(map)) {
    const k = norm(key);
    const f = Number(wert);
    if (!k || !(f > 0) || f > 5) continue;
    if (n.includes(k) && k.length > laenge) { best = f; laenge = k.length; }
  }
  return best;
}

function norm(s) {
  return String(s || "").toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
}

/**
 * @param {{ ek: number, sku?: string, name?: string, listenpreis?: number, env?: Record<string, string>, streuung?: (sku: string) => number }} arg
 * streuung: 0..1 je SKU, fest. Fehlt sie, gibt es keine Streuung (Tests und Aufrufer ohne Geheimnis).
 */
export function verkaufspreis(arg) {
  const ek = Number(arg && arg.ek) || 0;
  if (!(ek > 0)) return 0;
  const env = (arg && arg.env) || {};
  const gruppe = gruppenFaktor(arg && arg.name, env);
  const basis = gruppe != null ? gruppe : basisAusEnv(env);
  const spanne = spanneAusEnv(env);
  const u = arg && typeof arg.streuung === "function" && arg.sku ? arg.streuung(arg.sku) : null;
  const faktor = u == null || !spanne ? basis : basis * (1 + spanne * (2 * u - 1));
  let vk = Math.ceil(ek * faktor * 100) / 100;
  const deckelAn = /^(1|true|ja|an)$/i.test(String(env.PRICE_MARKET_CAP || "").trim());
  const liste = Number(arg && arg.listenpreis) || 0;
  if (deckelAn && liste > 0 && vk > liste) vk = Math.ceil(liste * 100) / 100;
  return vk;
}
