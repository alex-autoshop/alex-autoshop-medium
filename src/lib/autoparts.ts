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
  power?: string;
  fuel?: string;
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
      value: String(first(c?.formattedValue, c?.value, c?.specificationValue, c?.attrValue) ?? ''),
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
  return {
    vehicleId,
    manufacturer: manufacturer ? String(manufacturer) : undefined,
    model: model ? String(model) : undefined,
    typeName: typeName ? String(typeName) : undefined,
    power: first(v.powerKw, v.kw) ? String(Math.round(parseFloat(String(first(v.powerKw, v.kw))))) : undefined,
    fuel: first(v.fuelType, v.fuel) ? String(first(v.fuelType, v.fuel)) : undefined,
    raw: v,
  };
}

// ─── Public API ─────────────────────────────────────────────

/**
 * KBA-/VIN-Antworten enthalten KEINE vehicleId — über die (edge-gecachte)
 * Kaskade Marke → Modell → Motorvariante nachschlagen.
 */
async function resolveVehicleId(v: ApVehicle): Promise<number | undefined> {
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
      cand.find((t: any) => wantStart && String(t.constructionIntervalStart) === wantStart) ||
      cand[0] || tArr[0];
    return exact ? Number(exact.vehicleId) || undefined : undefined;
  } catch {
    return undefined;
  }
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
  if (veh && !veh.vehicleId) veh.vehicleId = await resolveVehicleId(veh);
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
    if (veh && !veh.vehicleId && veh.manufacturer) veh.vehicleId = await resolveVehicleId(veh);
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

/** Kategorie-IDs per Textsuche (z.B. "Bremsscheibe" → Kategorie-Baum-Treffer). */
async function apCategoryIds(query: string): Promise<number[]> {
  try {
    const tree = await ap(
      `/category/search-for-the-commodity-group-tree-by-description/type-id/${TYPE_PC}/lang-id/${LANG}/search-text/${encodeURIComponent(query)}`
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
    return [...new Set(hits.map((h) => h.id))].slice(0, 3);
  } catch {
    return [];
  }
}

/** Alle passenden Artikel für Fahrzeug + Suchbegriff — mit Bildern, alle Marken. */
export async function apArticlesForVehicle(vehicleId: number, query: string): Promise<ApArticle[]> {
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
  // Relevanz: Produktname muss zum Suchbegriff passen (Kategorie-Baum ist teils unscharf)
  const clean = (x: string) => x.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
  const q = clean(query);
  const stem = q.length > 5 ? q.slice(0, q.length - 2) : q;
  const relevant = all.filter((a) => {
    const n = clean(`${a.name} ${a.category || ''}`);
    return n.includes(q) || n.includes(stem) || q.includes(clean(a.name).slice(0, 6));
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
      value: String(first(c?.formattedValue, c?.value, c?.specificationValue, c?.rawValue) ?? ''),
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
