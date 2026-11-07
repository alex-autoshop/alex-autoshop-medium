/**
 * Gefahrstoff-Angaben aus dem Shopify-Namensraum "gefahrstoff".
 * Fehlt ein Feld, bleibt das Produkt ein normales Produkt.
 * Gefahrgut (UN-Nummer, Versand) ist hier nur ein Hinweis, keine Kennzeichnung.
 */

const H_SAETZE = {
  H200: "Instabil, explosiv.",
  H201: "Explosiv, Gefahr der Massenexplosion.",
  H202: "Explosiv; große Gefahr durch Splitter, Spreng- und Wurfstücke.",
  H203: "Explosiv; Gefahr durch Feuer, Luftdruck oder Splitter, Spreng- und Wurfstücke.",
  H204: "Gefahr durch Feuer oder Splitter, Spreng- und Wurfstücke.",
  H205: "Gefahr der Massenexplosion bei Feuer.",
  H220: "Extrem entzündbares Gas.",
  H221: "Entzündbares Gas.",
  H222: "Extrem entzündbares Aerosol.",
  H223: "Entzündbares Aerosol.",
  H224: "Flüssigkeit und Dampf extrem entzündbar.",
  H225: "Flüssigkeit und Dampf leicht entzündbar.",
  H226: "Flüssigkeit und Dampf entzündbar.",
  H228: "Entzündbarer Feststoff.",
  H229: "Behälter steht unter Druck: kann bei Erwärmung bersten.",
  H240: "Erwärmung kann Explosion verursachen.",
  H241: "Erwärmung kann Brand oder Explosion verursachen.",
  H242: "Erwärmung kann Brand verursachen.",
  H250: "Entzündet sich in Berührung mit Luft von selbst.",
  H251: "Selbsterhitzungsfähig; kann in Brand geraten.",
  H252: "In großen Mengen selbsterhitzungsfähig; kann in Brand geraten.",
  H260: "In Berührung mit Wasser entstehen entzündbare Gase, die sich spontan entzünden können.",
  H261: "In Berührung mit Wasser entstehen entzündbare Gase.",
  H270: "Kann Brand verursachen oder verstärken; Oxidationsmittel.",
  H271: "Kann Brand oder Explosion verursachen; starkes Oxidationsmittel.",
  H272: "Kann Brand verstärken; Oxidationsmittel.",
  H280: "Enthält Gas unter Druck; kann bei Erwärmung explodieren.",
  H281: "Enthält tiefgekühltes Gas; kann Kälteverbrennungen oder -verletzungen verursachen.",
  H290: "Kann gegenüber Metallen korrosiv sein.",
  H300: "Lebensgefahr bei Verschlucken.",
  H301: "Giftig bei Verschlucken.",
  H302: "Gesundheitsschädlich bei Verschlucken.",
  H304: "Kann bei Verschlucken und Eindringen in die Atemwege tödlich sein.",
  H310: "Lebensgefahr bei Hautkontakt.",
  H311: "Giftig bei Hautkontakt.",
  H312: "Gesundheitsschädlich bei Hautkontakt.",
  H314: "Verursacht schwere Verätzungen der Haut und schwere Augenschäden.",
  H315: "Verursacht Hautreizungen.",
  H317: "Kann allergische Hautreaktionen verursachen.",
  H318: "Verursacht schwere Augenschäden.",
  H319: "Verursacht schwere Augenreizung.",
  H330: "Lebensgefahr bei Einatmen.",
  H331: "Giftig bei Einatmen.",
  H332: "Gesundheitsschädlich bei Einatmen.",
  H334: "Kann bei Einatmen Allergie, asthmaartige Symptome oder Atembeschwerden verursachen.",
  H335: "Kann die Atemwege reizen.",
  H336: "Kann Schläfrigkeit und Benommenheit verursachen.",
  H340: "Kann genetische Defekte verursachen.",
  H341: "Kann vermutlich genetische Defekte verursachen.",
  H350: "Kann Krebs erzeugen.",
  H351: "Kann vermutlich Krebs erzeugen.",
  H360: "Kann die Fruchtbarkeit beeinträchtigen oder das Kind im Mutterleib schädigen.",
  H361: "Kann vermutlich die Fruchtbarkeit beeinträchtigen oder das Kind im Mutterleib schädigen.",
  H362: "Kann Säuglinge über die Muttermilch schädigen.",
  H370: "Schädigt die Organe.",
  H371: "Kann die Organe schädigen.",
  H372: "Schädigt die Organe bei längerer oder wiederholter Exposition.",
  H373: "Kann die Organe schädigen bei längerer oder wiederholter Exposition.",
  H400: "Sehr giftig für Wasserorganismen.",
  H410: "Sehr giftig für Wasserorganismen mit langfristiger Wirkung.",
  H411: "Giftig für Wasserorganismen mit langfristiger Wirkung.",
  H412: "Schädlich für Wasserorganismen mit langfristiger Wirkung.",
  H413: "Kann für Wasserorganismen schädlich sein, mit langfristiger Wirkung.",
  H420: "Schädigt die öffentliche Gesundheit und die Umwelt durch Ozonabbau in der äußeren Atmosphäre.",
  EUH066: "Wiederholter Kontakt kann zu spröder oder rissiger Haut führen.",
  EUH204: "Enthält Isocyanate. Kann allergische Reaktionen hervorrufen.",
  EUH208: "Enthält einen sensibilisierenden Stoff. Kann allergische Reaktionen hervorrufen.",
  EUH211: "Achtung! Beim Sprühen können gefährliche lungengängige Tröpfchen entstehen. Aerosol oder Nebel nicht einatmen.",
  EUH212: "Achtung! Bei der Verwendung kann gefährlicher lungengängiger Staub entstehen. Staub nicht einatmen.",
};

const PIKTO = new Set(["GHS01", "GHS02", "GHS03", "GHS04", "GHS05", "GHS06", "GHS07", "GHS08", "GHS09"]);
const SIGNALE = new Set(["Gefahr", "Achtung"]);

function wahr(wert) {
  return wert === true || String(wert || "").trim().toLowerCase() === "true";
}

function alsListe(wert) {
  if (wert == null || wert === "") return [];
  if (Array.isArray(wert)) return wert.map((x) => String(x).trim()).filter(Boolean);
  const text = String(wert).trim();
  if (text.startsWith("[")) {
    try {
      const json = JSON.parse(text);
      if (Array.isArray(json)) return json.map((x) => String(x).trim()).filter(Boolean);
    } catch { /* weiter als Text */ }
  }
  return text.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
}

function zahl(wert) {
  const n = Number(String(wert || "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

/** @param {Array<{key?: string, value?: string}> | null | undefined} felder */
export function gefahrstoffLesen(felder) {
  const roh = {};
  for (const feld of felder || []) {
    if (feld && feld.key) roh[feld.key] = feld.value;
  }
  const ist = wahr(roh.ist_gefahrstoff);
  const hSaetze = alsListe(roh.h_saetze).map((c) => c.toUpperCase().replace(/\s+/g, ""));
  const pSaetze = alsListe(roh.p_saetze);
  const piktogramme = [...new Set(alsListe(roh.piktogramme).map((c) => c.toUpperCase()))].filter((c) => PIKTO.has(c));
  const signal = String(roh.signalwort || "").trim();
  const signalwort = SIGNALE.has(signal) ? signal : "";
  const sdbUrl = /^https:\/\/\S+$/i.test(String(roh.sdb_url || "").trim()) ? String(roh.sdb_url).trim() : "";
  const tdsUrl = /^https:\/\/\S+$/i.test(String(roh.tds_url || "").trim()) ? String(roh.tds_url).trim() : "";
  const sdbStand = /^\d{4}-\d{2}-\d{2}$/.test(String(roh.sdb_stand || "").trim()) ? String(roh.sdb_stand).trim() : "";
  const un = String(roh.gefahrgut_un_nr || "").trim();
  return {
    ist,
    hSaetze,
    pSaetze,
    piktogramme,
    signalwort,
    sdbUrl,
    tdsUrl,
    sdbStand,
    unNr: un,
    mindestalter: zahl(roh.mindestalter),
    versandHinweis: String(roh.versand_hinweis || "").trim().slice(0, 400),
  };
}

const P_SAETZE = {
  P101: "Ist ärztlicher Rat erforderlich, Verpackung oder Kennzeichnungsetikett bereithalten.",
  P102: "Darf nicht in die Hände von Kindern gelangen.",
  P103: "Vor Gebrauch Kennzeichnungsetikett lesen.",
  P210: "Von Hitze, heißen Oberflächen, Funken, offenen Flammen und anderen Zündquellen fernhalten. Nicht rauchen.",
  P211: "Nicht gegen offene Flamme oder andere Zündquelle sprühen.",
  P251: "Nicht durchstechen oder verbrennen, auch nicht nach Gebrauch.",
  P260: "Staub, Rauch, Gas, Nebel, Dampf, Aerosol nicht einatmen.",
  P261: "Einatmen von Staub, Rauch, Gas, Nebel, Dampf, Aerosol vermeiden.",
  P271: "Nur im Freien oder in gut belüfteten Räumen verwenden.",
  P280: "Schutzhandschuhe, Schutzkleidung, Augenschutz, Gesichtsschutz tragen.",
  "P301+P310": "BEI VERSCHLUCKEN: Sofort GIFTINFORMATIONSZENTRUM oder Arzt anrufen.",
  "P302+P352": "BEI BERÜHRUNG MIT DER HAUT: Mit viel Wasser waschen.",
  "P304+P340": "BEI EINATMEN: Die Person an die frische Luft bringen und für ungehinderte Atmung sorgen.",
  "P305+P351+P338": "BEI KONTAKT MIT DEN AUGEN: Einige Minuten lang behutsam mit Wasser ausspülen. Eventuell vorhandene Kontaktlinsen nach Möglichkeit entfernen. Weiter ausspülen.",
  P312: "Bei Unwohlsein GIFTINFORMATIONSZENTRUM oder Arzt anrufen.",
  "P332+P313": "Bei Hautreizung: Ärztlichen Rat einholen.",
  "P337+P313": "Bei anhaltender Augenreizung: Ärztlichen Rat einholen.",
  P403: "An einem gut belüfteten Ort aufbewahren.",
  P405: "Unter Verschluss aufbewahren.",
  "P410+P412": "Vor Sonnenbestrahlung schützen und nicht Temperaturen über 50 °C aussetzen.",
  P501: "Inhalt und Behälter der Problemabfallentsorgung zuführen.",
};

export function pSatzText(code) {
  const rein = String(code || "").toUpperCase().replace(/\s+/g, "");
  return P_SAETZE[rein] || "";
}

export function hSatzText(code) {
  const rein = String(code || "").toUpperCase().replace(/\s+/g, "");
  if (H_SAETZE[rein]) return H_SAETZE[rein];
  const basis = rein.replace(/[A-Z]+$/i, (ende) => (rein.startsWith("EUH") ? ende : ""));
  const stamm = rein.match(/^(H\d{3}|EUH\d{3})/);
  if (stamm && H_SAETZE[stamm[1]]) return H_SAETZE[stamm[1]];
  return basis && H_SAETZE[basis] ? H_SAETZE[basis] : "";
}

/** Kennzeichnung unvollständig: nicht verkaufen. */
export function gefahrstoffUnvollstaendig(g) {
  if (!g || !g.ist) return false;
  return !g.hSaetze.length || !g.piktogramme.length || !g.signalwort;
}

/** true, wenn der Stand älter als drei Jahre vor `heute` (ISO-Datum) ist. */
export function sdbVeraltet(stand, heute) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(stand || "")) || !/^\d{4}-\d{2}-\d{2}$/.test(String(heute || ""))) return false;
  const a = new Date(`${stand}T00:00:00Z`);
  const b = new Date(`${heute}T00:00:00Z`);
  b.setUTCFullYear(b.getUTCFullYear() - 3);
  return a < b;
}

export function gefahrstoffVonKnoten(knoten) {
  return gefahrstoffLesen(knoten && knoten.gefahrstoffMetafelder);
}

export function kaufGesperrt(g) {
  return gefahrstoffUnvollstaendig(g);
}
