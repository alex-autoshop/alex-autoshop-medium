// ─────────────────────────────────────────────────────────────────────────────
// Verkaufspreis aus dem Inter-Cars-Einkauf.
//
// Standard (ohne Umgebung):
//   Warengruppen-Faktor aus STANDARD_GRUPPEN, sonst Basis 1,35
//   keine Streuung · UVP-Deckel an · Mindestpreis an
//
// Die Teilebörse hat einen Preis für alle. Die Mitgliedschaft gilt im
// Shopify-Shop, nicht hier. Der Mindestpreis deckt Einkauf plus 2,50 € und
// die Zahlungsgebühr: (EK + 2,50 + 0,25) / (1 − 0,015).
//
// Vercel-Env (alle optional, überschreiben die Standards):
//   PRICE_MARKUP          Basis für Teile ohne Gruppe (sonst 1,35)
//   PRICE_SPANNE          Streuung, 0 = aus (Standard), 0.05 = ±5 %
//   PRICE_MARKUP_GROUPS   JSON {"oelfilter":1.25,…} ersetzt STANDARD_GRUPPEN
//                         komplett; "aus" oder "{}" schaltet Gruppen ab.
//                         Verglichen wird nur die Warengruppe vorn im Namen
//                         (Text vor „passt zu“), nicht die Fahrzeugliste.
//   PRICE_MARKET_CAP      Standard an: höchstens die UVP (listPriceGross), aber
//                         nie unter den Mindestpreis. "0" schaltet ab.
//   PRICE_FLOOR           "0" schaltet den Mindestpreis ab (nicht empfohlen)
//   PRICE_FLOOR_MARGE     Aufschlag auf den EK im Mindestpreis (Standard 0)
//   PRICE_FLOOR_FIX       Fixbetrag je Position in € (Standard 2,75 = 2,50 + 0,25)
//   PRICE_FLOOR_RABATT    Abzug für die Zahlungsgebühr (Standard 0,015)
// ─────────────────────────────────────────────────────────────────────────────

export const STANDARD_BASIS = 1.35;
export const STANDARD_SPANNE = 0;

/**
 * Warengruppen-Faktoren (Verkaufspreis = EK × Faktor), ein Preis für alle.
 * Schlüssel ohne Umlaute (ä→ae usw.). Kleinteile ohne Gruppe: STANDARD_BASIS.
 */
export const STANDARD_GRUPPEN = Object.freeze({
  // 1,15 — Bremse (Scheibe, Belag, Trommel, Backe, Sattel, Schlauch), Kupplung, Schwungrad
  "bremsscheibe": 1.15,
  "bremsbelag": 1.15,
  "bremstrommel": 1.15,
  "bremsbacke": 1.15,
  "bremssattel": 1.15,
  "bremsschlauch": 1.15,
  "kupplung": 1.15,
  "schwungrad": 1.15,
  // 1,12 — Batterien
  "batterie": 1.12,
  // 1,18 — Turbo, Anlasser, Lichtmaschine, Dämpfer, Querlenker, Radlager, Zahnriemen, Wasserpumpe, Scheinwerfer
  "turbolader": 1.18,
  "anlasser": 1.18,
  "generator": 1.18,
  "lichtmaschine": 1.18,
  "stossdaempfer": 1.18,
  "querlenker": 1.18,
  "radlager": 1.18,
  "zahnriemen": 1.18,
  "wasserpumpe": 1.18,
  "scheinwerfer": 1.18,
  // 1,25 — Filter, Wischer, Spulen, Riemen, Federn, Spurstangen, Koppelstangen, Öle, Kerzen
  "oelfilter": 1.25,
  "luftfilter": 1.25,
  "innenraum": 1.25,
  "pollenfilter": 1.25,
  "kraftstofffilter": 1.25,
  "filtersatz": 1.25,
  "wischer": 1.25,
  "zuendspule": 1.25,
  "keilrippenriemen": 1.25,
  "feder": 1.25,
  "spurstange": 1.25,
  "koppelstange": 1.25,
  "motoroel": 1.25,
  "getriebeoel": 1.25,
  "kuehlmittel": 1.25,
  "frostschutz": 1.25,
  "bremsfluessigkeit": 1.25,
  "zuendkerze": 1.25,
  "gluehkerze": 1.25,
  // 1,35 — Kleinteile
  "gluehlampe": 1.35,
  "verschleisswarnkontakt": 1.35,
});

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

function gruppenTabelle(env) {
  const roh = String((env || {}).PRICE_MARKUP_GROUPS || "").trim();
  if (!roh) return STANDARD_GRUPPEN;
  if (/^(aus|0|false|nein)$/i.test(roh)) return null;
  try {
    const map = JSON.parse(roh);
    if (!map || typeof map !== "object" || Array.isArray(map)) return STANDARD_GRUPPEN;
    return map;
  } catch {
    return STANDARD_GRUPPEN; // kaputtes JSON → lieber die geprüften Standards
  }
}

/** Nur die Warengruppe vorn im Namen: „Ölfilter passt zu: AUDI …“ → „ölfilter“. */
export function warengruppenText(name) {
  const s = String(name || "");
  const stopp = s.search(/\bpasst zu\b|[,:(]/i);
  return (stopp > 0 ? s.slice(0, stopp) : s).trim();
}

/** Längster passender Warengruppen-Faktor, sonst null (dann gilt die Basis). */
export function gruppenFaktor(name, env) {
  const map = gruppenTabelle(env);
  if (!map) return null;
  const n = norm(warengruppenText(name));
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

/** Untergrenze: (EK × (1 + Marge) + Fix) / (1 − Gebühr). Standard deckt EK + 2,50 € plus 0,25 € und 1,5 % Zahlungsgebühr. */
export function mindestpreis(ek, env) {
  const e = env || {};
  if (/^(0|aus|false|nein)$/i.test(String(e.PRICE_FLOOR || "").trim())) return 0;
  const marge = zahl(e.PRICE_FLOOR_MARGE, 0, 1, 0);
  const fix = zahl(e.PRICE_FLOOR_FIX, 0, 50, 2.75);
  const gebuehr = zahl(e.PRICE_FLOOR_RABATT, 0, 0.9, 0.015);
  const x = Number(ek) || 0;
  if (!(x > 0)) return 0;
  return Math.ceil(((x * (1 + marge) + fix) / (1 - gebuehr)) * 100) / 100;
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
  // Deckel standardmäßig AN (über der UVP verkauft niemand), "0" schaltet ab
  const deckelAn = !/^(0|false|nein|aus)$/i.test(String(env.PRICE_MARKET_CAP ?? "").trim());
  const liste = Number(arg && arg.listenpreis) || 0;
  if (deckelAn && liste > 0 && vk > liste) vk = Math.ceil(liste * 100) / 100;
  const boden = mindestpreis(ek, env);
  if (boden > vk) vk = boden;
  return vk;
}
