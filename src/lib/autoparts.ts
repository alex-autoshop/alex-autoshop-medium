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

/** Fahrzeug per deutscher Schlüsselnummer (HSN 2.1 + TSN 2.2). */
export async function apVehicleByKba(hsn: string, tsn: string): Promise<ApVehicle | null> {
  const kba = `${hsn.trim()}${tsn.trim()}`.toUpperCase();
  if (kba.length < 5) return null;
  const r = await ap(
    `/types/searching-the-passenger-car-by-ltn-number/lang-id/${LANG}/country-filter-id/${COUNTRY}/ltn-number/${encodeURIComponent(kba)}/number-type/1`
  );
  const arr = pickArray(r, 'modelTypes', 'vehicles', 'types', 'cars');
  return toApVehicle(arr[0]);
}

/** Fahrzeug per VIN (TecDoc-VIN-Check, Fallback strukturierter Decoder). */
export async function apVehicleByVin(vin: string): Promise<ApVehicle | null> {
  const v = vin.trim().toUpperCase();
  if (v.length !== 17) return null;
  try {
    const r = await ap(`/vin/tecdoc-vin-check/${encodeURIComponent(v)}`);
    const arr = pickArray(r, 'vehicles', 'matchedVehicles');
    const veh = toApVehicle(arr[0] || r?.vehicle || r);
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
  return relevant.length > 0 ? relevant : all;
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
