import { yqCatalogs, linkTo, type YqVehicle, type YqAttr, type YqLink } from "@/lib/yqcat";

/**
 * Das Fahrzeug aus der FIN — von der Quelle, die es wirklich weiß.
 *
 * Bisher lief die Fahrzeugbestimmung über den Zubehörkatalog: FIN an einen
 * Fahrzeugregister-Decoder, daraus Marke und Modell raten, dann im Teilekatalog
 * nach Namen suchen und die Motorvariante über Leistung und Baujahr eingrenzen.
 * Wenn der Decoder wenig lieferte, blieben vierzig Varianten über dreißig
 * Jahrgänge übrig — genau das war das Problem mit dem Ford Transit.
 *
 * Der Hersteller-Katalog weiß es besser. Eine Anfrage, keine Marke nötig, und
 * zurück kommt das exakte Fahrzeug samt Baujahr, Hubraum, Leistung und
 * Motorcode. Das sind keine Schätzwerte, das steht so beim Hersteller.
 *
 * Zwei Dinge fallen damit ab:
 *   1. harte Belege für die Variantenbestimmung im Zubehörkatalog
 *   2. der Fahrzeug-Token für Baugruppen und Explosionszeichnungen —
 *      ohne die FIN ein zweites Mal aufzulösen
 *
 * Belegt am 16.09.2026 gegen die echte API mit Porsche, BMW, Jaguar, Citroën,
 * Fiat und Opel.
 */

export interface YqIdent {
  /** Rohfahrzeug — trägt die Verknüpfungen zu Baugruppen und Zeichnungen. */
  vehicle: YqVehicle;
  /** Fahrzeug-Token für getPartApplicability, getGroups, getNavigationTree. */
  token: string;
  brand: string;
  model: string;
  label: string;
  baujahr?: number;
  ccm?: number;
  kw?: number;
  ps?: number;
  /** Herstellereigener Motorcode, z.B. "B57P" oder "DYHA". */
  motorcode?: string;
  /**
   * Alle Motorkennungen, die der Hersteller nennt — für den Abgleich mit den
   * Motorcodes im Zubehörkatalog ("Z12XEP" ↔ "Z 12 XEP", "651.930" ↔ "OM 651.930").
   */
  motorcodes?: string[];
  /** Mercedes-Modellcode, z.B. "117.303" — steht im Zubehörkatalog im Typnamen. */
  modellcode?: string;
  /** Baureihen-/Fahrgestellcodes, z.B. "F74", "117" — stehen dort im Modellnamen "(C117)". */
  baureihen?: string[];
  /** Aufbau laut Hersteller, z.B. "4-TUERIGES COUPE", "Gran Coupé". */
  aufbau?: string;
}

const speicher = new Map<string, Promise<YqIdent | null>>();

const text = (a: YqAttr) => (a.values?.length ? a.values.join(" ") : a.value ?? "");

function attrMap(v: YqVehicle) {
  const nachCode = new Map<string, string>();
  const alle: Array<{ label: string; wert: string }> = [];
  for (const a of v.attributes ?? []) {
    const w = String(text(a) ?? "").trim();
    if (!w) continue;
    if (a.code) nachCode.set(a.code, w);
    alle.push({ label: String(a.label || a.name || a.code || ""), wert: w });
  }
  return { nachCode, alle };
}

/** Erste vierstellige Jahreszahl in einem Datumsfeld — die Schreibweise wechselt je Marke. */
function jahrAus(s?: string): number | undefined {
  if (!s) return undefined;
  const treffer = String(s).match(/(19|20)\d{2}/);
  const j = treffer ? parseInt(treffer[0], 10) : 0;
  return j >= 1900 && j <= new Date().getFullYear() + 2 ? j : undefined;
}

function zahl(s: string | undefined, muster: RegExp): number | undefined {
  if (!s) return undefined;
  const m = s.match(muster);
  const n = m ? parseInt(m[1], 10) : 0;
  return n > 0 ? n : undefined;
}

/** Merkmale des Herstellers in die Größen übersetzen, die der Zubehörkatalog kennt. */
export function yqMerkmale(v: YqVehicle) {
  const { nachCode, alle } = attrMap(v);
  const info = nachCode.get("engine_info") || "";

  let ccm = zahl(info, /(\d{3,5})\s*cc/i);
  if (!ccm) {
    // Fiat schreibt den Hubraum in ein eigenes Feld ("1242-1248 (CC1.2)"),
    // andere Marken benennen es wieder anders — deshalb über das Label.
    const h = alle.find((a) => /hubraum|capacity|displacement|cylinder/i.test(a.label));
    ccm = zahl(h?.wert, /(\d{3,5})/);
  }
  if (!ccm) {
    // Bei Jaguar und Citroën steht der Hubraum im Motorfeld: "3.0 Litre turbo
    // diesel", "1.6 VTi 16v 120 (EP6C)". Eine fuehrende Dezimalzahl ist dort
    // praktisch immer der Hubraum in Litern.
    const motor = `${nachCode.get("engine") || ""} ${info}`;
    const liter = motor.match(/(?:^|[\s(])(\d[.,]\d)(?=\s|$|[^\d])/);
    if (liter) {
      const l = parseFloat(liter[1].replace(",", "."));
      if (l >= 0.6 && l <= 8.5) ccm = Math.round(l * 1000);
    }
  }

  // Motorkennungen: Motorfeld ("Z12XEP", "B38N (115kW)") und bei Mercedes die
  // Aggregate ("… (651.930 M651 D22, R4-DIESELMOTOR OM651 D 22)").
  const motorcodes = new Set<string>();
  const motorFeld = (nachCode.get("engine") || "").replace(/\(.*?\)/g, " ").trim();
  for (const w of motorFeld.split(/[\s,;/]+/)) if (/^[A-Z0-9]{3,}$/i.test(w) && /\d/.test(w) && /[A-Z]/i.test(w)) motorcodes.add(w.toUpperCase());
  const aggregate = nachCode.get("aggregates") || "";
  const motorTeil = aggregate.match(/Motor:[^;]*/i)?.[0] || "";
  for (const m of motorTeil.matchAll(/\b(\d{3}\.\d{3})\b/g)) motorcodes.add(m[1]);

  // Mercedes-Modellcode "117.303" (Feld "model" bzw. Label "Modellcode")
  const mcRoh = nachCode.get("model") || alle.find((a) => /modellcode|model code/i.test(a.label))?.wert || "";
  const modellcode = /^\d{3}\.\d{3}$/.test(mcRoh.trim()) ? mcRoh.trim() : undefined;

  const baureihen = new Set<string>();
  const serie = (nachCode.get("series_code") || "").trim().toUpperCase();
  if (/^[A-Z]{0,2}\d{2,3}[A-Z]?$/.test(serie)) baureihen.add(serie);
  if (modellcode) baureihen.add(modellcode.slice(0, 3));

  const aufbau =
    alle.find((a) => /aufbau|karosserie|body/i.test(a.label))?.wert ||
    (/coupe|coupé|limousine|kombi|t-modell|cabrio|roadster|shooting|kastenwagen|pritsche/i.test(nachCode.get("description") || "")
      ? nachCode.get("description") : undefined);

  return {
    baujahr:
      jahrAus(nachCode.get("manufactured")) ??
      jahrAus(nachCode.get("date")) ??
      jahrAus(nachCode.get("production_date")) ??
      jahrAus(nachCode.get("prodrange")),
    ccm,
    kw: zahl(info, /(\d{2,4})\s*kw/i) ?? zahl(nachCode.get("engine"), /(\d{2,4})\s*kw/i),
    ps: zahl(info, /(\d{2,4})\s*(?:hp|ps)/i),
    motorcode: nachCode.get("engine") || undefined,
    motorcodes: [...motorcodes],
    modellcode,
    baureihen: [...baureihen],
    aufbau: aufbau || undefined,
  };
}

/** Katalog vorübergehend nicht erreichbar/überlastet — kein Urteil über die FIN. */
class YqStoerung extends Error {}

const pause = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

async function bestimmen(vin: string): Promise<YqIdent | null> {
  const clean = vin.trim().toUpperCase();
  if (clean.length < 11) return null;
  // Das FIN-Formular hängt an der Katalogliste selbst — markenübergreifend.
  // Der Umweg über "erst Marke raten, dann deren Katalogformular holen" ist
  // damit überflüssig, und Marken, die wir nicht erraten hätten, gehen auch.
  let forms;
  try {
    forms = (await yqCatalogs()).forms;
  } catch {
    throw new YqStoerung("Katalogliste nicht erreichbar");
  }
  const form = (forms ?? []).find((f) => f.action === "findVehicle");
  if (!form?.token) return null;

  // "Too many requests" (429) oder Serverfehler: einmal kurz warten, dann
  // nochmal. Bleibt es dabei, ist das eine Störung — und KEIN "unbekannt".
  let r: Response | null = null;
  for (let versuch = 0; versuch < 2; versuch++) {
    try {
      r = await fetch(`/api/yqcat?action=findVehicle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: form.token, formValues: [{ name: "IdentString", value: clean }] }),
      });
    } catch {
      r = null;
    }
    if (r && r.ok) break;
    if (r && r.status < 500 && r.status !== 429) break; // echte Absage
    if (versuch === 0) await pause(1200);
  }
  if (!r || r.status === 429 || r.status >= 500) throw new YqStoerung(`Katalog ${r?.status ?? "offline"}`);
  if (!r.ok) return null;
  {
    const j = (await r.json().catch(() => null)) as { data?: { vehicles?: YqVehicle[] } } | null;
    const v = j?.data?.vehicles?.[0];
    if (!v?.token) return null;

    const brand = String(v.brand || "").trim();
    const model = String(v.model || v.name || v.description || "").trim();
    return {
      vehicle: v,
      token: v.token,
      brand,
      model,
      label: [brand, model].filter(Boolean).join(" ").trim(),
      ...yqMerkmale(v),
    };
  }
}

/** Fahrzeug zur FIN — pro Sitzung gemerkt, auch die Fehlschläge. */
export function yqIdentify(vin: string): Promise<YqIdent | null> {
  const key = (vin || "").trim().toUpperCase();
  if (!key) return Promise.resolve(null);
  let p = speicher.get(key);
  if (!p) {
    // Gemerkt wird nur ein echtes Ergebnis ("dieses Auto" oder "unbekannt").
    // Eine Störung wird vergessen — beim nächsten Suchen wird neu gefragt.
    p = bestimmen(key).catch(() => {
      speicher.delete(key);
      return null;
    });
    speicher.set(key, p);
  }
  return p;
}

/** Baugruppen-Einstieg des Fahrzeugs — für den Original-Katalog. */
export function yqGruppenLink(ident: YqIdent): YqLink | undefined {
  return linkTo(ident.vehicle, "getGroups") || linkTo(ident.vehicle, "getNavigationTree");
}
