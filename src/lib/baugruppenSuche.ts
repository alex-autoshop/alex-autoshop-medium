/**
 * Baugruppen-Suche im Hersteller-Katalog.
 *
 * WARUM ES DAS BRAUCHT (nachgemessen am echten Opel-Baum, 309 Knoten, 4 Ebenen):
 * Die alte Suche verglich nur die OBERSTE Ebene — "Karosserie", "Motor",
 * "Filter" … "Ölfilter" steht aber zwei Ebenen tiefer (Motor › Schmierung ›
 * Ölfilter und Filter › Ölfilter), "Starter" unter Elektrik › Startanlage.
 * Deshalb kam bei "ölfilter", "zündkerzen" und "anlasser" immer: nichts.
 *
 * Diese Suche läuft über den GANZEN Baum und versteht, wie Werkstätten tippen:
 *   - Umlaute egal:            ölfilter = oelfilter = OELFILTER
 *   - Mehrzahl egal:           zündkerzen → Zündkerze, bremsbeläge → Bremsbelag
 *   - Werkstatt-Wörter:        anlasser → Starter, querlenker → Lenker (Quer-, …),
 *                              pollenfilter → Innenraumfilter, turbo → Lader …
 *   - Mehrere Wörter:          "motor ölfilter" grenzt über den Pfad ein
 *
 * Und sie vermeidet, was vorher wie ein Treffer aussah, aber keiner war:
 * "lima" steckt in "Klimaanlage", "lader" in "Laderaum". Kurze Wörter und
 * kurze Synonyme zählen deshalb nur als ganzes Wort bzw. am Wortanfang.
 *
 * Reine Funktionen ohne React und ohne Netz — der Baum ist beim Öffnen des
 * Fahrzeugs ohnehin schon komplett geladen.
 */

export interface BaugruppenTreffer<N> {
  node: N;
  /** Namen von der obersten Gruppe bis zum Treffer, z.B. ["Motor","Schmierung","Ölfilter"]. */
  pfad: string[];
  score: number;
}

/** Kleinschreibung, Umlaute gefaltet, Satzzeichen weg — beide Seiten gleich behandelt. */
export function normalisiere(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/ä|ae/g, "a")
    .replace(/ö|oe/g, "o")
    .replace(/ü|ue/g, "u")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Grobe deutsche Endungen ab, damit Einzahl und Mehrzahl zusammenfinden. */
export function stamm(wort: string): string {
  let w = wort;
  if (w.length < 5) return w;
  for (const end of ["ern", "en", "er", "es", "e", "n", "s"]) {
    if (w.endsWith(end) && w.length - end.length >= 4) {
      w = w.slice(0, -end.length);
      break;
    }
  }
  return w;
}

/**
 * Werkstatt-Sprache → Katalog-Sprache. Nur echte Synonyme — nichts, was ein
 * falsches Teil liefern könnte (Zündkerze ≠ Glühkerze, auch wenn beide
 * "Kerze" heißen). Schlüssel sind Wortstämme; beide Seiten werden beim Laden
 * genauso normalisiert wie die Suche selbst, sonst passt "quer" (→ "qur")
 * nicht mehr zusammen.
 */
const SYNONYME_ROH: Record<string, string[]> = {
  // Schlüssel = Wortstamm, wie ihn die Suche aus der Eingabe macht
  // ("anlasser" → "anlass"). Werte = ganze Katalogwörter.
  anlass: ["starter"],
  lima: ["generator", "lichtmaschine"],
  lichtmaschin: ["generator"],
  pollenfilt: ["innenraumfilter", "innenraumluftfilter"],
  bremsklotz: ["bremsbelag"],
  klotz: ["bremsbelag"],
  domlag: ["federbeinstützlager", "federbeinlager", "federbeinbefestigung"],
  koppelstang: ["pendelstütze"],
  querlenk: ["lenker"],
  dreieckslenk: ["lenker"],
  dämpf: ["stoßdämpfer"],
  turbo: ["lader"],
  turbolad: ["lader"],
  kat: ["katalysator"],
  dpf: ["partikelfilter"],
  rußpartikelfilt: ["partikelfilter"],
  agr: ["agr", "abgasrückführung"],
  agrventil: ["agr"],
  lambdasond: ["lambda", "lambdasonde"],
  keilriem: ["keilrippenriemen"],
  wisch: ["wischblatt", "wischer"],
  scheibenwisch: ["wischblatt", "wischer"],
  birn: ["glühlampe"],
  glühbirn: ["glühlampe"],
  lamp: ["glühlampe"],
  auspuff: ["schalldämpfer", "abgasanlage"],
  endtopf: ["schalldämpfer"],
  kupplungssatz: ["kupplung"],
  zahnriemensatz: ["zahnriemen"],
  kühlmittelpump: ["wasserpumpe"],
  // Kein Eintrag für "lüfter": der Stamm ("luft") ist derselbe wie bei
  // Luftfilter — der Lüfter wird ohnehin direkt gefunden.
  kühlerlüft: ["lüfter"],
  spurstangenkopf: ["spurstange"],
  traggelenk: ["führungsgelenk"],
  radlagersatz: ["radlager"],
  achsmanschett: ["manschette"],
};

// Beide Seiten in dieselbe Form bringen wie die Suche selbst — sonst passt
// z.B. "quer" (normalisiert "qur") nicht mehr zum Schlüssel.
const SYNONYME: Record<string, string[]> = Object.fromEntries(
  Object.entries(SYNONYME_ROH).map(([k, vs]) => [
    normalisiere(k).replace(/ /g, ""),
    vs.map((v) => stamm(normalisiere(v).replace(/ /g, ""))),
  ]),
);

interface Alternative { x: string; synonym: boolean }

function alternativen(token: string): Alternative[] {
  const s = stamm(token);
  const out: Alternative[] = [{ x: s, synonym: false }];
  for (const k of [token, s]) {
    for (const v of SYNONYME[k] ?? []) if (!out.some((o) => o.x === v)) out.push({ x: v, synonym: true });
  }
  return out.filter((o) => o.x.length >= 2);
}

/** 100 = ganzer Name, 80 = ganzes Wort, 70 = Wortanfang, 50 = im Wort, 0 = nein. */
function trifft(a: Alternative, nameN: string): number {
  const woerter = nameN.split(" ");
  if (nameN === a.x || (woerter.length === 1 && stamm(nameN) === a.x)) return 100;
  if (woerter.some((w) => w === a.x || stamm(w) === a.x)) return 80;
  // Kurze Suchwörter (≤ 4) nur am Wortanfang, kurze Synonyme (≤ 5) nur als
  // ganzes Wort — sonst steckt "lima" in "Klimaanlage" und "lader" in "Laderaum".
  if (a.synonym && a.x.length <= 5) return 0;
  if (woerter.some((w) => w.startsWith(a.x))) return 70;
  if (a.x.length <= 4) return 0;
  // Lange Wörter auch mitten im zusammengesetzten Wort:
  // "glühlampe" in "Hauptscheinwerferglühlampe".
  if (nameN.includes(a.x)) return 50;
  return 0;
}

export function sucheBaugruppen<N>(
  wurzel: N,
  anfrage: string,
  zugriff: {
    kinder: (n: N) => N[];
    name: (n: N) => string;
    /** Hat der Knoten selbst Zeichnungen (getGroupParts/getUnits …)? */
    oeffenbar: (n: N) => boolean;
  },
  max = 12,
): BaugruppenTreffer<N>[] {
  const tokens = normalisiere(anfrage).split(" ").filter((t) => t.length >= 2);
  if (tokens.length === 0) return [];
  const alt = tokens.map(alternativen);
  const ganz = tokens.map(stamm).join(" ");

  const treffer: BaugruppenTreffer<N>[] = [];

  /** Wie gut trifft der Knoten? null = gar nicht. */
  const bewerte = (n: N, hier: string[]): number | null => {
    const nameN = normalisiere(zugriff.name(n) || "");
    if (!nameN) return null;
    const pfadN = normalisiere(hier.slice(0, -1).join(" "));
    let score = 0;
    let nameTrifft = false;
    for (const a of alt) {
      const best = Math.max(...a.map((x) => trifft(x, nameN)));
      if (best > 0) { score += best; nameTrifft = true; continue; }
      // Wort steht nur im Pfad ("motor ölfilter") — zählt wenig, aber zählt.
      if (a.some((x) => pfadN.length > 0 && trifft(x, pfadN) > 0)) { score += 15; continue; }
      return null; // jedes Wort muss irgendwo stehen
    }
    // Mindestens ein Wort muss den Namen selbst treffen — sonst wäre jeder
    // Unterknoten von "Motor" ein Treffer für "motor".
    if (!nameTrifft) return null;
    if (stamm(nameN.replace(/ /g, "")) === ganz.replace(/ /g, "")) score += 40;
    return score - hier.length; // bei Gleichstand der kürzere Weg
  };

  const lauf = (n: N, pfad: string[], erbe: number | null) => {
    const name = zugriff.name(n) || "";
    const hier = name ? [...pfad, name] : pfad;
    const eigen = name ? bewerte(n, hier) : null;
    const offen = zugriff.oeffenbar(n);

    if (offen && eigen != null) treffer.push({ node: n, pfad: hier, score: eigen + 10 });
    // Ein reiner Ordner (keine eigene Zeichnung) trifft — dann zählen seine
    // direkten Unterknoten, sonst führt der Treffer ins Leere.
    else if (offen && erbe != null) treffer.push({ node: n, pfad: hier, score: erbe - 20 });

    const weiterErbe = !offen && eigen != null ? eigen : null;
    for (const k of zugriff.kinder(n)) lauf(k, hier, weiterErbe);
  };
  // Die Wurzel ist nur der Fahrzeugtyp ("PKW") — gehört nicht in den Pfad.
  for (const k of zugriff.kinder(wurzel)) lauf(k, [], null);

  treffer.sort((a, b) => b.score - a.score || a.pfad.join(" ").localeCompare(b.pfad.join(" "), "de"));
  const gesehen = new Set<string>();
  return treffer
    .filter((t) => {
      const k = t.pfad.join("›");
      if (gesehen.has(k)) return false;
      gesehen.add(k);
      return true;
    })
    .slice(0, max);
}

/**
 * Nichts gefunden? Dann wenigstens Verwandtes zeigen — klar als "ähnlich"
 * gekennzeichnet, nie als Treffer. Typischer Fall: "Zündkerzen" bei einem
 * Diesel. Den Baugruppen-Baum gibt es nur mit Glühkerzen, und genau die
 * wollen wir dann anbieten, statt eine leere Liste.
 */
export function aehnlicheBaugruppen<N>(
  wurzel: N,
  anfrage: string,
  zugriff: { kinder: (n: N) => N[]; name: (n: N) => string; oeffenbar: (n: N) => boolean },
  max = 3,
): BaugruppenTreffer<N>[] {
  const lang = normalisiere(anfrage).split(" ").map(stamm).filter((t) => t.length >= 7);
  if (lang.length === 0) return [];
  const enden = lang.map((t) => t.slice(-4));
  const out: BaugruppenTreffer<N>[] = [];
  const lauf = (n: N, pfad: string[]) => {
    const name = zugriff.name(n) || "";
    const hier = name ? [...pfad, name] : pfad;
    const nameN = normalisiere(name);
    if (name && zugriff.oeffenbar(n) && enden.some((e) => nameN.includes(e))) {
      out.push({ node: n, pfad: hier, score: -hier.length });
    }
    for (const k of zugriff.kinder(n)) lauf(k, hier);
  };
  for (const k of zugriff.kinder(wurzel)) lauf(k, []);
  return out.sort((a, b) => b.score - a.score).slice(0, max);
}
