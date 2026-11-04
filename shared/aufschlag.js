// ─────────────────────────────────────────────────────────────────────────────
// Verkaufspreis aus dem Inter-Cars-Einkauf.
//
// Standard (ohne Umgebung):
//   Warengruppen-Faktor aus STANDARD_GRUPPEN, sonst Basis 2,0
//   Streuung ±5 % je SKU · UVP-Deckel an · Mindestpreis an
//
// Mindestpreis: Der Mitgliedsrabatt (bis 40 %) geht auf den VOLLEN Preis
// (api/parts-checkout.js, src/components/TeileportalPricing.tsx). Damit auch
// ein 40-%-Mitglied nicht unter Einkauf + Kosten kauft, liegt der Gastpreis
// nie unter (EK × (1 + MIN_MARGE) + FIXKOSTEN) / (1 − MAX_RABATT).
//
// Vercel-Env (alle optional, überschreiben die Standards):
//   PRICE_MARKUP          Basis für Teile ohne Gruppe (sonst 2,0)
//   PRICE_SPANNE          Streuung, 0.05 = ±5 %, 0 = aus
//   PRICE_MARKUP_GROUPS   JSON {"oelfilter":1.85,…} ersetzt STANDARD_GRUPPEN
//                         komplett; "aus" oder "{}" schaltet Gruppen ab.
//                         Verglichen wird nur die Warengruppe vorn im Namen
//                         (Text vor „passt zu“), nicht die Fahrzeugliste.
//   PRICE_MARKET_CAP      Standard an: höchstens die UVP (listPriceGross), aber
//                         nie unter den Mindestpreis. "0" schaltet ab.
//   PRICE_FLOOR           "0" schaltet den Mindestpreis ab (nicht empfohlen)
//   PRICE_FLOOR_MARGE     Mindestmarge über EK für das höchste Mitglied (0.04)
//   PRICE_FLOOR_FIX       Fixkosten je Position in € (Zahlung, Verpackung) (1.5)
//   PRICE_FLOOR_RABATT    höchster Mitgliedsrabatt (0.40)
// ─────────────────────────────────────────────────────────────────────────────

export const STANDARD_BASIS = 2;
export const STANDARD_SPANNE = 0.05;

/**
 * Warengruppen-Faktoren (Gastpreis = EK × Faktor). Gewählt am 04.11.2026:
 * Mit 40 % Mitgliedsrabatt auf den vollen Preis bleibt ab Faktor ≈ 1,75
 * überhaupt erst Marge beim Level-3-Mitglied. Darum liegen alle Gruppen
 * zwischen 1,78 und 2,0: niedrig, wo der Preisvergleich hart ist und der EK
 * hoch (Bremsen, Batterien, Fahrwerk), höher bei kleinen, billigen Teilen,
 * wo Fixkosten den Ausschlag geben. Schlüssel ohne Umlaute (ä→ae usw.).
 */
export const STANDARD_GRUPPEN = Object.freeze({
  // Bremse — höchster Preisdruck, hoher EK
  "bremsscheibe": 1.78,
  "bremsbelag": 1.78,
  "bremstrommel": 1.8,
  "bremsbacke": 1.8,
  "bremssattel": 1.8,
  "bremsschlauch": 1.9,
  "verschleisswarnkontakt": 2.0,
  // Batterie — schwer, Versand für Mitglieder frei
  "batterie": 1.82,
  // Filter — Topseller im Vergleich, aber kleiner EK
  "oelfilter": 1.85,
  "luftfilter": 1.85,
  "innenraum": 1.85,
  "kraftstofffilter": 1.85,
  "filtersatz": 1.82,
  // Wischer
  "wischer": 1.85,
  // Zündung/Glühen
  "zuendkerze": 1.95,
  "gluehkerze": 1.92,
  "zuendspule": 1.85,
  // Motor/Antrieb — hoher EK
  "zahnriemen": 1.8,
  "keilrippenriemen": 1.85,
  "wasserpumpe": 1.8,
  "kupplung": 1.78,
  "schwungrad": 1.78,
  "turbolader": 1.78,
  "anlasser": 1.8,
  "generator": 1.8,
  // Fahrwerk/Lenkung
  "stossdaempfer": 1.8,
  "feder": 1.85,
  "querlenker": 1.82,
  "spurstange": 1.85,
  "koppelstange": 1.9,
  "radlager": 1.82,
  // Flüssigkeiten (Grundpreis und Altöl-Hinweis beachten)
  "motoroel": 1.8,
  "getriebeoel": 1.85,
  "kuehlmittel": 1.9,
  "frostschutz": 1.9,
  "bremsfluessigkeit": 1.9,
  // Beleuchtung
  "gluehlampe": 2.0,
  "scheinwerfer": 1.8,
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

/** Gastpreis, unter dem selbst das höchste Mitglied noch Einkauf + Kosten deckt. */
export function mindestpreis(ek, env) {
  const e = env || {};
  if (/^(0|aus|false|nein)$/i.test(String(e.PRICE_FLOOR || "").trim())) return 0;
  const marge = zahl(e.PRICE_FLOOR_MARGE, 0, 1, 0.04);
  const fix = zahl(e.PRICE_FLOOR_FIX, 0, 50, 1.5);
  const rabatt = zahl(e.PRICE_FLOOR_RABATT, 0, 0.9, 0.4);
  const x = Number(ek) || 0;
  if (!(x > 0)) return 0;
  return Math.ceil(((x * (1 + marge) + fix) / (1 - rabatt)) * 100) / 100;
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
