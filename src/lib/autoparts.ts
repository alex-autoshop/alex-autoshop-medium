/**
 * AutoPartsAPI Client (apiprofile.com — TecDoc-Datensatz)
 * Läuft über den Vercel-Proxy /api/autoparts (Key bleibt serverseitig).
 * Liefert Fahrzeuge (KBA/VIN) und Artikel MIT Produktbildern.
 */

const LANG = 1;      // Deutsch
const COUNTRY = 63;  // Deutschland
const TYPE_PC = 1;   // Passenger Car

export interface ApVehicle {
  vehicleId?: number;
  manufacturer?: string;
  model?: string;
  typeName?: string;
  power?: string;       // kW
  ps?: string;
  ccm?: string;
  fuel?: string;
  bodyType?: string;
  buildFrom?: string;   // z.B. 2006-11-01
  buildTo?: string;
  engineCodes?: string; // z.B. "9HZ (DV6TED4)"
  raw?: Record<string, unknown>;
}

export interface ApArticle {
  id: string | number;
  name: string;
  brand: string;
  articleNumber: string;
  imageUrl?: string;
  category?: string;
  oeNumbers?: string[];
  specs?: { name: string; value: string }[];
}

/** Ein Motor-/Typ-Kandidat aus der VIN-Auflösung (inkl. Modellreihe zur Auswahl). */
export interface ApVinCandidate extends ApVehicle {
  modelName?: string;
}

export interface ApVinResult {
  manufacturer: string;
  model: string;
  /** true, wenn per nativem TecDoc-VIN-Check exakt bestimmt (nur eine Variante). */
  exact?: boolean;
  candidates: ApVinCandidate[];
}

// ─── Fetch über Proxy ───────────────────────────────────────

async function ap(path: string, params?: Record<string, string | number>): Promise<any> {
  const qs = new URLSearchParams({ p: path });
  if (params) for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(`/api/autoparts?${qs}`, { signal: ctrl.signal });
    clearTimeout(timer);
    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { /* kein JSON */ }
    if (!res.ok) throw new Error(data?.error || data?.message || `Katalog-API ${res.status}`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Tolerante Extraktion (Response-Shapes variieren) ───────

function first(...vals: any[]): any {
  for (const v of vals) if (v !== undefined && v !== null && v !== '') return v;
  return undefined;
}

function pickArray(obj: any, ...keys: string[]): any[] {
  if (Array.isArray(obj)) return obj;
  if (!obj || typeof obj !== 'object') return [];
  for (const k of keys) if (Array.isArray(obj[k])) return obj[k];
  if (Array.isArray(obj.data)) return obj.data;
  for (const v of Object.values(obj)) {
    if (Array.isArray(v) && v.length && typeof v[0] === 'object') return v as any[];
  }
  return [];
}

function pickImage(a: any): string | undefined {
  const direct = first(a?.s3image, a?.imageUrl, a?.imageLink, a?.imgUrl, a?.image, a?.pictureUrl, a?.s3ImageLink, a?.mediaUrl);
  if (typeof direct === 'string' && /^https?:/.test(direct)) return direct;
  for (const key of ['images', 'allMedia', 'media', 'pictures']) {
    const arr = a?.[key];
    if (Array.isArray(arr) && arr.length) {
      const m = arr[0];
      const u = typeof m === 'string' ? m : first(m?.imageURL400, m?.imageURL200, m?.imageUrl, m?.url, m?.normalUrl, m?.bigUrl, m?.link);
      if (typeof u === 'string' && /^https?:/.test(u)) return u;
    }
  }
  return undefined;
}

function toApArticle(a: any, i: number): ApArticle | null {
  if (!a || typeof a !== 'object') return null;
  const articleNumber = String(first(a.articleNumber, a.articleNo, a.artNr, a.number, a.dataSupplierArticleNumber) || '');
  const name = String(first(a.description, a.articleProductName, a.productName, a.genericArticleDescription, a.articleName, a.name) || 'Artikel');
  const brand = String(first(a.brandName, a.supplierName, a.mfrName, a.brand, a.dataSupplierName) || '');
  const oemRaw = first(a.oemNumbers, a.oemNo, a.oeNumbers, a.oem) || [];
  const oeNumbers = (Array.isArray(oemRaw) ? oemRaw : [oemRaw])
    .map((o: any) => (typeof o === 'string' ? o : first(o?.oemDisplayNo, o?.oemNumber, o?.articleNumber, o?.number, o?.oeNumber)))
    .filter(Boolean)
    .slice(0, 5)
    .map(String);
  const critRaw = first(a.articleCriteria, a.allSpecifications, a.specifications, a.criteria, a.attributes) || [];
  const specs = (Array.isArray(critRaw) ? critRaw : [])
    .map((c: any) => ({
      name: String(first(c?.criteriaName, c?.name, c?.specificationName, c?.attrName) || ''),
      value: String(first(c?.formattedValue, c?.value, c?.criteriaValue, c?.specificationValue, c?.attrValue) ?? ''),
    }))
    .filter((s) => s.name && s.value)
    .slice(0, 6);
  return {
    id: first(a.articleId, a.legacyArticleId, a.id) ?? `ap-${i}`,
    name,
    brand,
    articleNumber,
    imageUrl: pickImage(a),
    category: first(a.productGroupName, a.categoryName, a.assemblyGroupName),
    oeNumbers,
    specs,
  };
}

function toApVehicle(v: any): ApVehicle | null {
  if (!v || typeof v !== 'object') return null;
  const vehicleId = Number(first(v.vehicleId, v.carId, v.id, v.ktype)) || undefined;
  const manufacturer = first(v.manufacturerName, v.manuName, v.brand, v.make);
  const model = first(v.modelName, v.modelSeriesName, v.model);
  const typeName = first(v.typeEngineName, v.typeName, v.vehicleName, v.description, v.commercialName);
  if (!vehicleId && !manufacturer && !model) return null;
  const num = (x: any) => (x !== undefined && x !== null && x !== '' && !isNaN(parseFloat(String(x)))) ? String(Math.round(parseFloat(String(x)))) : undefined;
  return {
    vehicleId,
    manufacturer: manufacturer ? String(manufacturer) : undefined,
    model: model ? String(model) : undefined,
    typeName: typeName ? String(typeName) : undefined,
    power: num(first(v.powerKw, v.kw)),
    ps: num(v.powerPs),
    ccm: num(first(v.capacityTech, v.capacityCC, v.cylinderCapacity)),
    fuel: first(v.fuelType, v.fuel) ? String(first(v.fuelType, v.fuel)) : undefined,
    bodyType: v.bodyType ? String(v.bodyType) : undefined,
    buildFrom: v.constructionIntervalStart ? String(v.constructionIntervalStart) : undefined,
    buildTo: v.constructionIntervalEnd ? String(v.constructionIntervalEnd) : undefined,
    engineCodes: v.engineCodes ? String(v.engineCodes) : undefined,
    raw: v,
  };
}

// ─── Public API ─────────────────────────────────────────────

/**
 * KBA-/VIN-Antworten enthalten KEINE vehicleId — über die (edge-gecachte)
 * Kaskade Marke → Modell → Motorvariante nachschlagen.
 */
async function resolveVehicleType(v: ApVehicle): Promise<any | undefined> {
  try {
    if (!v.manufacturer || !v.model) return undefined;
    const manus = await ap(`/manufacturers/list/type-id/${TYPE_PC}`);
    const mArr = pickArray(manus, 'manufacturers');
    const manu = mArr.find((m: any) => String(m.manufacturerName).toUpperCase() === String(v.manufacturer).toUpperCase());
    if (!manu) return undefined;
    const models = await ap(`/models/list/type-id/${TYPE_PC}/manufacturer-id/${manu.manufacturerId}/lang-id/${LANG}/country-filter-id/${COUNTRY}`);
    const modArr = pickArray(models, 'models');
    const model =
      modArr.find((m: any) => String(m.modelName) === v.model) ||
      modArr.find((m: any) => String(m.modelName).split(' (')[0] === String(v.model).split(' (')[0]);
    if (!model) return undefined;
    const types = await ap(`/types/type-id/${TYPE_PC}/list-vehicles-types/${model.modelId}/lang-id/${LANG}/country-filter-id/${COUNTRY}`);
    const tArr = pickArray(types, 'modelTypes', 'types');
    const raw: any = v.raw || {};
    const wantEngine = String(raw.typeEngineName || v.typeName || '');
    const wantPs = Math.round(parseFloat(String(raw.powerPs || ''))) || 0;
    const wantStart = String(raw.constructionIntervalStart || '');
    const cand = tArr.filter((t: any) =>
      (!wantEngine || String(t.typeEngineName) === wantEngine) &&
      (!wantPs || Math.round(parseFloat(String(t.powerPs))) === wantPs)
    );
    const exact =
      // Bekannte vehicleId hat IMMER Vorrang (sonst droht falsche Motorvariante!)
      (v.vehicleId ? tArr.find((t: any) => Number(t.vehicleId) === Number(v.vehicleId)) : undefined) ||
      cand.find((t: any) => wantStart && String(t.constructionIntervalStart) === wantStart) ||
      cand[0] || tArr[0];
    return exact || undefined;
  } catch {
    return undefined;
  }
}

/** Details des aufgelösten Typ-Eintrags (Baujahr, ccm, PS, Motorcodes …) ins Fahrzeug mergen. */
function mergeTypeDetails(veh: ApVehicle, typeEntry: any): void {
  const d = toApVehicle(typeEntry);
  if (!d) return;
  veh.vehicleId = veh.vehicleId ?? d.vehicleId;
  veh.typeName = veh.typeName || d.typeName;
  veh.power = d.power || veh.power;
  veh.ps = d.ps || veh.ps;
  veh.ccm = d.ccm || veh.ccm;
  veh.fuel = d.fuel || veh.fuel;
  veh.bodyType = d.bodyType || veh.bodyType;
  veh.buildFrom = d.buildFrom || veh.buildFrom;
  veh.buildTo = d.buildTo || veh.buildTo;
  veh.engineCodes = d.engineCodes || veh.engineCodes;
}

/** Fehlende Detaildaten (Baujahr, ccm, Motorcodes …) nachladen — edge-gecachte Calls. */
export async function apEnrichVehicle(v: ApVehicle): Promise<ApVehicle> {
  try {
    if (!v.buildFrom || !v.engineCodes) {
      const t = await resolveVehicleType(v);
      if (t) mergeTypeDetails(v, t);
    }
  } catch { /* optional */ }
  return v;
}

/** Fahrzeug per deutscher Schlüsselnummer (HSN 2.1 + TSN 2.2). */
export async function apVehicleByKba(hsn: string, tsn: string): Promise<ApVehicle | null> {
  const kba = `${hsn.trim()}${tsn.trim()}`.toUpperCase();
  if (kba.length < 5) return null;
  const r = await ap(
    `/types/searching-the-passenger-car-by-ltn-number/lang-id/${LANG}/country-filter-id/${COUNTRY}/ltn-number/${encodeURIComponent(kba)}/number-type/1`
  );
  const arr = pickArray(r, 'modelTypes', 'vehicles', 'types', 'cars');
  const veh = toApVehicle(arr[0]);
  if (veh && (!veh.vehicleId || !veh.buildFrom)) {
    const t = await resolveVehicleType(veh);
    if (t) mergeTypeDetails(veh, t);
  }
  return veh;
}

/** Fahrzeug per VIN (TecDoc-VIN-Check, Fallback strukturierter Decoder). */
export async function apVehicleByVin(vin: string): Promise<ApVehicle | null> {
  const v = vin.trim().toUpperCase();
  if (v.length !== 17) return null;
  try {
    const r = await ap(`/vin/tecdoc-vin-check/${encodeURIComponent(v)}`);
    const arr = pickArray(r, 'vehicles', 'matchedVehicles');
    const veh = toApVehicle(arr[0] || r?.vehicle || r);
    if (veh && (!veh.vehicleId || !veh.buildFrom) && veh.manufacturer) {
      const t = await resolveVehicleType(veh);
      if (t) mergeTypeDetails(veh, t);
    }
    if (veh && (veh.vehicleId || veh.manufacturer)) return veh;
  } catch { /* Fallback */ }
  try {
    const r2 = await ap(`/vin/decoder-v2/${encodeURIComponent(v)}`);
    const d = r2?.data || r2 || {};
    const brand = first(d.make, d.manufacturer, d.brand);
    if (!brand) return null;
    return { manufacturer: String(brand), model: d.model ? String(d.model) : undefined, typeName: first(d.year, d.modelYear) ? String(first(d.year, d.modelYear)) : undefined, raw: d };
  } catch {
    return null;
  }
}

/**
 * VIN → Fahrzeug-Auflösung mit Motorvarianten zur Auswahl.
 * 1) Nativer TecDoc-VIN-Check (exakt) — greift nur wenn serverseitig VIN_API_KEY gesetzt ist.
 * 2) Fallback decoder-v3 (Fahrzeugregister): Marke + Modell (+ Hubraum/Kraftstoff),
 *    dann Marke→Modellreihe→Motorvarianten auflösen. Der Nutzer wählt die exakte Variante.
 */
export async function apResolveVin(vin: string): Promise<ApVinResult | null> {
  const v = vin.trim().toUpperCase();
  if (v.length !== 17) return null;

  // decoder-v3 (Fahrzeugregister) → Marke/Modell/Hubraum/Kraftstoff.
  // (Der native tecdoc-vin-check bräuchte einen separaten VIN_API_KEY am Server
  //  und läuft sonst 10s ins Timeout — daher hier bewusst nicht vorgeschaltet.)
  let make = '', model = '', ccm = 0, fuel = '';
  try {
    const r3 = await ap(`/vin/decoder-v3/${encodeURIComponent(v)}`);
    const info: Record<string, string> = {};
    if (Array.isArray(r3)) for (const sec of r3) if (sec && sec.information) Object.assign(info, sec.information);
    make = String(info['Make'] || '');
    model = String(info['Model'] || '');
    const dsi = String(info['Displacement SI'] || info['Displacement'] || '');
    const cm = dsi.match(/\d{3,4}/); if (cm) ccm = parseInt(cm[0], 10);
    const ft = String(info['Fuel type'] || '').toLowerCase();
    if (/diesel/.test(ft)) fuel = 'diesel';
    else if (/gas|petrol|benz/.test(ft)) fuel = 'benzin';
  } catch { /* decoder nicht erreichbar */ }
  if (!make || !model) return null;

  // Lokale Normalisierung (bewusst NICHT die modulweite normCat — die kann beim
  // Vite-Code-Splitting im Route-Chunk fehlen → "normCat is not defined").
  const norm = (x: string) => String(x).toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');

  // Marke → Modellreihe(n) → Motorvarianten. Robust: jeder Fehler liefert Teilergebnis
  // (mind. manufacturer/model), damit NIE in den alten Fallback gefallen wird.
  try {
    const manus = pickArray(await ap(`/manufacturers/list/type-id/${TYPE_PC}`), 'manufacturers');
    const MK = make.toUpperCase();
    const manu = manus.find((x: any) => String(x.manufacturerName).toUpperCase() === MK)
              || manus.find((x: any) => String(x.manufacturerName).toUpperCase().includes(MK));
    if (!manu) return { manufacturer: make, model, candidates: [] };

    const models = pickArray(
      await ap(`/models/list/type-id/${TYPE_PC}/manufacturer-id/${manu.manufacturerId}/lang-id/${LANG}/country-filter-id/${COUNTRY}`),
      'models'
    );
    const nModel = norm(model);
    let matched = models.filter((m: any) => norm(String(m.modelName)).includes(nModel));
    if (matched.length === 0) matched = models.filter((m: any) => nModel.includes(norm(String(m.modelName))));
    if (matched.length === 0) return { manufacturer: make, model, candidates: [] };
    matched = matched.slice(0, 6);

    const cands: ApVinCandidate[] = [];
    const seen = new Set<number>();
    for (const mdl of matched) {
      let types: any[] = [];
      try {
        types = pickArray(
          await ap(`/types/type-id/${TYPE_PC}/list-vehicles-types/${mdl.modelId}/lang-id/${LANG}/country-filter-id/${COUNTRY}`),
          'modelTypes', 'types'
        );
      } catch { continue; }
      for (const t of types) {
        const veh = toApVehicle(t) as ApVinCandidate | null;
        if (!veh || !veh.vehicleId || seen.has(veh.vehicleId)) continue;
        if (fuel) {
          const tf = String(veh.fuel || '').toLowerCase();
          if (fuel === 'diesel' && tf && !/diesel/.test(tf)) continue;
          if (fuel === 'benzin' && /diesel/.test(tf)) continue;
        }
        seen.add(veh.vehicleId);
        veh.modelName = String(mdl.modelName);
        cands.push(veh);
      }
    }
    if (ccm) {
      cands.sort((a, b) => Math.abs(parseInt(a.ccm || '0', 10) - ccm) - Math.abs(parseInt(b.ccm || '0', 10) - ccm));
    } else {
      cands.sort((a, b) => (a.modelName || '').localeCompare(b.modelName || '') || (a.typeName || '').localeCompare(b.typeName || ''));
    }
    return { manufacturer: make, model, candidates: cands.slice(0, 60) };
  } catch {
    // Auflösung fehlgeschlagen — trotzdem Marke/Modell melden (kein alter Fallback)
    return { manufacturer: make, model, candidates: [] };
  }
}

// ─── Umgangssprache → TecDoc-Kategoriebegriff ───────────────────────────────
// Werkstätten verwenden oft vereinfachte Begriffe die nicht 1:1 im TecDoc-Baum stehen.
const QUERY_SYNONYMS: Record<string, string> = {
  'ventilgummi': 'Ventilschaftdichtung',
  'ventilschaft': 'Ventilschaftdichtung',
  'ventilschaftdichtring': 'Ventilschaftdichtung',
  'ventildeckeldichtung': 'Zylinderkopfhaubendichtung',
  'kopfhaubendichtung': 'Zylinderkopfhaubendichtung',
  'antriebsgummi': 'Gelenkwellenmanschette',
  'achsmanschette': 'Gelenkwellenmanschette',
  'faltenbalg antrieb': 'Gelenkwellenmanschette',
  'domlager': 'Federbeinlager',
  'stabilager': 'Stabilisatorlager',
  'stabibuchse': 'Stabilisatorlager',
  'koppelstange': 'Koppelstange',
  'pendelstütze': 'Koppelstange',
  'pendelstuetze': 'Koppelstange',
  'lima': 'Lichtmaschine',
  'kat': 'Katalysator',
  'dpf': 'Dieselpartikelfilter',
  'agr': 'AGR-Ventil',
  'gluehkerze': 'Glühkerze',
  'zahnriemensatz': 'Zahnriemen',
  'steuerriemen': 'Zahnriemen',
  'keilriemen': 'Keilrippenriemen',
  'riemenspanner': 'Spannrolle',
  'umlenkrolle': 'Umlenker',
  'kurbelwellendichtring': 'Kurbelwellendichtung',
  'simmerring': 'Wellendichtring',
  'gummi': 'Lagerung',
  'buchse': 'Lagerung',
};

function normalizeSearchQuery(query: string): string {
  const q = query.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .trim();
  // Exakter Treffer im Synonym-Map
  if (QUERY_SYNONYMS[q]) return QUERY_SYNONYMS[q];
  // Teilstring-Treffer (z.B. "ventilgummi satz" → "Ventilschaftdichtung")
  for (const [key, val] of Object.entries(QUERY_SYNONYMS)) {
    if (q.includes(key) || key.includes(q)) return val;
  }
  return query; // kein Synonym → Original
}

/** Kategorie-IDs per Textsuche (z.B. "Bremsscheibe" → Kategorie-Baum-Treffer).
 *  Probiert zuerst den normalisierten TecDoc-Begriff (z.B. "Ventilschaftdichtung" für "ventilgummi"),
 *  dann den Original-Query falls nichts gefunden. */
async function apCategoryIds(query: string): Promise<number[]> {
  const normalizedQuery = normalizeSearchQuery(query);
  const searchTerms = normalizedQuery !== query ? [normalizedQuery, query] : [query];

  for (const term of searchTerms) {
    try {
      const tree = await ap(
        `/category/search-for-the-commodity-group-tree-by-description/type-id/${TYPE_PC}/lang-id/${LANG}/search-text/${encodeURIComponent(term)}`
      );
      // Baum: { "Name": { categoryId, categoryName, level, productId, children: { "Name": {...} } } }
      const hits: Array<{ id: number; level: number; leaf: boolean }> = [];
      const walk = (node: any) => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) return node.forEach(walk);
        const id = Number(node.categoryId);
        const children = node.children;
        const childVals = children && typeof children === 'object' ? Object.values(children) : [];
        if (id) hits.push({ id, level: Number(node.level) || 0, leaf: childVals.length === 0 });
        if (childVals.length) childVals.forEach(walk);
        if (node.categoryId === undefined && !children) {
          for (const v of Object.values(node)) { if (v && typeof v === 'object') walk(v); }
        }
      };
      walk(tree);
      // Tiefste Knoten zuerst (spezifischste Produktgruppen), Blätter bevorzugt
      hits.sort((a, b) => (Number(b.leaf) - Number(a.leaf)) || (b.level - a.level));
      const ids = [...new Set(hits.map((h) => h.id))].slice(0, 3);
      if (ids.length > 0) return ids; // gefunden → zurückgeben, sonst nächsten Begriff versuchen
    } catch {
      // Nächsten Begriff probieren
    }
  }
  return [];
}

// ─── Fahrzeug-eigener Kategoriebaum als Suchindex ───────────────────────────
// Der globale "commodity group tree" liefert für "Antriebswelle" u.a. Werkzeuge
// ("Ausziehhülse") und Starter-Teile → die Artikel passen dann nicht und der
// Relevanzfilter wirft alles weg. Der FAHRZEUG-Baum enthält dagegen exakt die
// Kategorien dieses Autos mit klaren deutschen Namen ("Antriebswelle" = 100062).
const _vehTreeCache = new Map<number, Array<{ name: string; id: number }>>();

function cleanTerm(x: string): string {
  return String(x).toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
}

async function vehicleCategoryIds(vehicleId: number, query: string): Promise<number[]> {
  let flat = _vehTreeCache.get(vehicleId);
  if (!flat) {
    try {
      const tree = await apCategoryTree(vehicleId);
      const acc: Array<{ name: string; id: number }> = [];
      const walk = (nodes: ApCategoryNode[]) => {
        for (const n of nodes) {
          if (n.id) acc.push({ name: n.name, id: n.id });
          if (n.children?.length) walk(n.children);
        }
      };
      walk(tree);
      flat = acc;
      _vehTreeCache.set(vehicleId, acc);
    } catch {
      return [];
    }
  }
  if (!flat.length) return [];

  // Original UND Synonym prüfen (z.B. "ventilgummi" → "Ventilschaftdichtung")
  const terms = [...new Set([cleanTerm(query), cleanTerm(normalizeSearchQuery(query))])].filter(Boolean);
  const scored: Array<{ id: number; score: number }> = [];
  for (const { name, id } of flat) {
    const c = cleanTerm(name);
    if (!c) continue;
    let best = 0;
    for (const q of terms) {
      if (!q) continue;
      if (c === q) best = Math.max(best, 100);
      else if (c.startsWith(q)) best = Math.max(best, 80);
      else if (q.startsWith(c) && c.length >= 5) best = Math.max(best, 70);
      else if (c.includes(q) && q.length >= 4) best = Math.max(best, 60);
      else if (q.includes(c) && c.length >= 5) best = Math.max(best, 50);
    }
    if (best > 0) scored.push({ id, score: best });
  }
  scored.sort((a, b) => b.score - a.score);
  return [...new Set(scored.map((s) => s.id))].slice(0, 3);
}

/** Alle passenden Artikel für Fahrzeug + Suchbegriff — mit Bildern, alle Marken. */
export async function apArticlesForVehicle(vehicleId: number, query: string): Promise<ApArticle[]> {
  // 1) Fahrzeug-Baum (präzise) → Artikel sind per Konstruktion passend
  const vehCatIds = await vehicleCategoryIds(vehicleId, query);
  if (vehCatIds.length) {
    const settled = await Promise.allSettled(
      vehCatIds.map((cid) => ap(`/articles/list/type-id/${TYPE_PC}/vehicle-id/${vehicleId}/category-id/${cid}/lang-id/${LANG}`))
    );
    const raw: any[] = [];
    for (const s of settled) if (s.status === 'fulfilled') raw.push(...pickArray(s.value, 'articles'));
    const seen = new Set<string>();
    const out = raw
      .map(toApArticle)
      .filter((a): a is ApArticle => !!a && !!a.articleNumber)
      .filter((a) => {
        const k = `${a.brand.toLowerCase()}::${a.articleNumber.toLowerCase()}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    // KEIN Relevanzfilter: die Kategorie wurde bereits über den Namen gematcht.
    if (out.length) return out;
  }

  // 2) Fallback: globale Kategoriebaum-Suche (unscharf → Relevanzfilter nötig)
  const catIds = await apCategoryIds(query);
  if (!catIds.length) return [];
  const settled = await Promise.allSettled(
    catIds.map((cid) => ap(`/articles/list/type-id/${TYPE_PC}/vehicle-id/${vehicleId}/category-id/${cid}/lang-id/${LANG}`))
  );
  const raw: any[] = [];
  for (const s of settled) if (s.status === 'fulfilled') raw.push(...pickArray(s.value, 'articles'));
  const seen = new Set<string>();
  const all = raw
    .map(toApArticle)
    .filter((a): a is ApArticle => !!a && !!a.articleNumber)
    .filter((a) => {
      const k = `${a.brand.toLowerCase()}::${a.articleNumber.toLowerCase()}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  // Relevanz: Produktname muss zum Suchbegriff (oder normalisierten Synonym) passen
  const clean = (x: string) => x.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
  const q = clean(query);
  const qNorm = clean(normalizeSearchQuery(query));
  const stem = q.length > 5 ? q.slice(0, q.length - 2) : q;
  const stemNorm = qNorm.length > 5 ? qNorm.slice(0, qNorm.length - 2) : qNorm;
  const relevant = all.filter((a) => {
    const n = clean(`${a.name} ${a.category || ''}`);
    // Original-Query im Artikelnamen?
    if (n.includes(q) || n.includes(stem)) return true;
    // Normalisierter Begriff (z.B. "ventilschaftdichtung" für "ventilgummi") im Artikelnamen?
    if (n.includes(qNorm) || n.includes(stemNorm)) return true;
    // Erste 6 Zeichen des Artikelnamens im Query? (z.B. "ventil" in "ventilgummi")
    if (q.includes(clean(a.name).slice(0, 6))) return true;
    // Erste 6 Zeichen des normalisierten Queries im Artikelnamen?
    if (n.includes(qNorm.slice(0, 6))) return true;
    return false;
  });
  // KEIN Fallback auf `all`: lieber leer zurückgeben (loadParts probiert dann
  // Inter Cars / Nummernsuche) als unpassende Teile (z.B. Ölwannen bei "Bremse").
  return relevant;
}

/** Artikel-/OE-Nummern-Suche (ohne Fahrzeug). */
export async function apArticlesByNumber(articleNo: string): Promise<ApArticle[]> {
  const raw: any[] = [];
  try {
    const r = await ap('/articles/search-by-article-no', { articleNo, langId: LANG });
    raw.push(...pickArray(r, 'articles'));
  } catch { /* weiter */ }
  if (raw.length < 3) {
    try {
      const r = await ap('/articles-oem/search-by-article-oem-no', { articleOemNo: articleNo, langId: LANG });
      raw.push(...pickArray(r, 'articles'));
    } catch { /* optional */ }
  }
  return raw.map(toApArticle).filter((a): a is ApArticle => !!a && !!a.articleNumber);
}

// ─── ARTIKEL-ZUSATZDATEN (on-demand, für Aufklapp-Tabs) ─────

export interface ApAnalogPart { brand: string; articleNumber: string; }

/** Alle technischen Spezifikationen eines Artikels. */
export async function apArticleSpecs(articleId: string | number): Promise<{ name: string; value: string }[]> {
  try {
    const r = await ap(`/articles/selection-of-all-specifications-criterias-for-the-article/article-id/${articleId}/lang-id/${LANG}/country-filter-id/${COUNTRY}`);
    const arr = pickArray(r, 'criteria', 'specifications', 'articleCriteria');
    return arr.map((c: any) => ({
      name: String(first(c?.criteriaName, c?.name, c?.specificationName, c?.criteriaDescription) || ''),
      value: String(first(c?.formattedValue, c?.value, c?.criteriaValue, c?.specificationValue, c?.rawValue) ?? ''),
    })).filter((s) => s.name && s.value).slice(0, 20);
  } catch { return []; }
}

/** Ersatz / analoge Teile anderer Marken zu einer Artikelnummer. */
export async function apAnalogParts(articleNo: string): Promise<ApAnalogPart[]> {
  try {
    const r = await ap(`/artlookup/search-for-analog-spare-parts-by-the-articles-numbers/lang-id/${LANG}/articleNo/${encodeURIComponent(articleNo)}`);
    const arr = pickArray(r, 'articles', 'analogs', 'crossReferences');
    const seen = new Set<string>();
    return arr.map((a: any) => ({
      brand: String(first(a?.supplierName, a?.brandName, a?.mfrName, a?.brand) || ''),
      articleNumber: String(first(a?.articleNumber, a?.articleNo, a?.number) || ''),
    })).filter((x) => x.articleNumber && !seen.has(x.brand + x.articleNumber) && seen.add(x.brand + x.articleNumber)).slice(0, 30);
  } catch { return []; }
}

/** Passende Fahrzeuge je Hersteller (wie Inter Cars "Anwendungen": AUDI (78)…). */
export async function apCompatibleCars(articleNo: string): Promise<Array<{ brand: string; count: number; models: string[] }>> {
  try {
    const r = await ap('/articles/get-compatible-cars-by-article-number/type-id/1', { articleNo, langId: LANG, countryFilterId: COUNTRY });
    const arr = pickArray(r, 'vehicles', 'cars', 'compatibleCars');
    const groups = new Map<string, { count: number; models: Set<string> }>();
    for (const v of arr) {
      const brand = String(first(v?.manufacturerName, v?.manuName, v?.brand) || 'Sonstige');
      const model = String(first(v?.modelName, v?.model, v?.vehicleName) || '');
      const g = groups.get(brand) || { count: 0, models: new Set<string>() };
      g.count++; if (model) g.models.add(model);
      groups.set(brand, g);
    }
    return [...groups.entries()].map(([brand, g]) => ({ brand, count: g.count, models: [...g.models].slice(0, 12) }))
      .sort((a, b) => b.count - a.count).slice(0, 20);
  } catch { return []; }
}

// ─── FAHRZEUG-KATEGORIEBAUM (echte Unterkategorien wie Inter Cars) ─

export interface ApCategoryNode { id: number | null; name: string; children: ApCategoryNode[]; }

export async function apCategoryTree(vehicleId: number): Promise<ApCategoryNode[]> {
  const r = await ap(`/category/type-id/${TYPE_PC}/products-groups-variant-2/${vehicleId}/lang-id/${LANG}`);
  const walk = (obj: any): ApCategoryNode[] => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
    const out: ApCategoryNode[] = [];
    for (const [key, node] of Object.entries<any>(obj)) {
      if (!node || typeof node !== 'object') continue;
      // Wrapper-Objekte ohne categoryId (z.B. das äußere `{ categories: {...} }`)
      // sind keine echten Knoten → deren Inhalt direkt hochziehen.
      if (node.categoryId === undefined && !node.children) { out.push(...walk(node)); continue; }
      const name = key || String(node.categoryName || '');
      if (!name) continue;
      out.push({
        id: Number(node.categoryId) || null,
        name,
        children: node.children && typeof node.children === 'object' ? walk(node.children) : [],
      });
    }
    return out;
  };
  return walk(r);
}

/** Artikel einer konkreten Kategorie-ID (ohne Relevanzfilter — exakte Gruppe). */
export async function apArticlesByCategory(vehicleId: number, categoryId: number): Promise<ApArticle[]> {
  const r = await ap(`/articles/list/type-id/${TYPE_PC}/vehicle-id/${vehicleId}/category-id/${categoryId}/lang-id/${LANG}`);
  const seen = new Set<string>();
  return pickArray(r, 'articles').map(toApArticle)
    .filter((a): a is ApArticle => !!a && !!a.articleNumber)
    .filter((a) => { const k = `${a.brand}::${a.articleNumber}`.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
}
