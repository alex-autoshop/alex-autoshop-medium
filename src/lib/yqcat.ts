/**
 * YQ Service OEM-Katalog — Client für /api/yqcat
 *
 * Original-Herstellerdaten: VIN-Suche, Baugruppen und echte Explosions-
 * zeichnungen mit anklickbaren Bildbereichen.
 *
 * Der Dienst ist TOKEN-basiert: jede Antwort liefert `links` (und
 * `navigationLinks`) mit `action` + `token` für den jeweils nächsten Aufruf.
 * Man hangelt sich also durch — nicht raten, immer den mitgelieferten Token
 * verwenden. `filterValues`/`currentFilterState` wirken wie Cookies innerhalb
 * eines Fahrzeugs und müssen bei Folgeaufrufen mitgegeben werden.
 *
 * Zugangsdaten liegen ausschließlich serverseitig (Vercel-Env), niemals hier.
 */

const API = "/api/yqcat";

/* ─────────────────────────── Typen ─────────────────────────── */

export interface YqLink {
  action: string;
  label?: string;
  token: string;
  operationName?: string;
  code?: string;
}

export interface YqField {
  type: "input" | "select" | "checkbox" | string;
  name: string;
  label?: string;
  value?: string;
  selected?: boolean;
  pattern?: string;
  options?: Array<{ value: string; label?: string }>;
  examples?: Array<{ description?: string; value: string }>;
}

export interface YqForm {
  label?: string;
  action?: string;
  updateFormAction?: string;
  operationName?: string;
  token: string;
  fields?: YqField[];
}

export interface YqAttr {
  key?: string;
  name?: string;
  value?: string;
  /** Echte API: code ("amount", "note"), label und values[] statt value. */
  code?: string;
  label?: string;
  values?: string[];
  type?: string;
}

export interface YqCatalog {
  token: string;
  name: string;
  brand?: string;
  archived?: boolean;
  links?: YqLink[];
}

export interface YqVehicle {
  token?: string;
  type?: "UNDEFINED" | "PASSENGER" | "COMMERCIAL" | "MOTO" | string;
  brand?: string;
  model?: string;
  name?: string;
  description?: string;
  attributes?: YqAttr[];
  links?: YqLink[];
  navigationLinks?: YqLink[];
}

export interface YqNode {
  code?: string;
  name?: string;
  token?: string;
  links?: YqLink[];
  childs?: YqNode[];
  children?: YqNode[];
}

export interface YqUnitShort {
  code?: string;
  name?: string;
  description?: string;
  token?: string;
  imageNames?: string[];
  links?: YqLink[];
}

/** Ein anklickbarer Bereich auf der Explosionszeichnung. */
export interface YqImageArea {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Positionsnummer in der Zeichnung — Bindeglied zur Teileliste. */
  areaCode?: string;
  links?: YqLink[];
}

export interface YqImageMap {
  imageName: string;
  areas?: YqImageArea[];
}

export interface YqUnit {
  code?: string;
  name?: string;
  description?: string;
  token?: string;
  links?: YqLink[];
  imageMaps?: YqImageMap[];
  attributes?: YqAttr[];
}

/** Menge mit Einheit (MeasuredValue im YQ-Schema). */
export interface YqMeasured {
  value?: string | number;
  unit?: string;
  name?: string;
}

/**
 * Ein Teil aus getUnitParts / getGroupParts / getPartApplicability.
 *
 * ACHTUNG — die Feldnamen kommen genau so aus PartV2Dto. Insbesondere heißt
 * die Positionsnummer in der Zeichnung `areaCode` (NICHT positionNumber) und
 * ist der Schlüssel zu ImageMapArea.areaCode. `matched` markiert das Teil,
 * das die Suche getroffen hat — damit lässt sich die Zeile wie bei Partslink
 * gelb hervorheben.
 */
export interface YqPart {
  partNumber?: string;
  partName?: string;
  partNumberFormatted?: string;
  displayName?: string;
  qty?: YqMeasured;
  /** Positionsnummer in der Zeichnung — passt zu ImageMapArea.areaCode. */
  areaCode?: string;
  /** true, wenn dieses Teil der Suchtreffer ist. */
  matched?: boolean;
  attributes?: YqAttr[];
  refs?: YqLink[];
  related?: YqPartSection;
  links?: YqLink[];
}

/** Anzeigename eines Teils, egal welches Feld der Katalog befüllt. */
export function partLabel(p: YqPart): string {
  return p.displayName || p.partName || p.partNumberFormatted || p.partNumber || "";
}

/**
 * Stückzahl eines Teils. Die echte API legt sie NICHT in `qty` ab, sondern als
 * Attribut mit `code: "amount"` — `qty` bleibt nur als Fallback.
 */
export function partQty(p: YqPart): string {
  const a = (p.attributes ?? []).find(
    (x) => x.code === "amount" || /menge|amount|quantity/i.test(x.label || x.name || "")
  );
  const v = a?.values?.[0] ?? a?.value;
  if (v != null && String(v).trim()) return String(v).trim();
  return p.qty?.value != null ? String(p.qty.value) : "";
}

/** Freitext-Anmerkungen des Herstellers zu einem Teil (Motorvariante, Baujahr …). */
export function partNotes(p: YqPart): string[] {
  return (p.attributes ?? [])
    .filter((x) => x.code === "note" || /anmerkung|note/i.test(x.label || x.name || ""))
    .flatMap((x) => x.values ?? (x.value ? [x.value] : []))
    .filter(Boolean);
}

/** Teilenummer eines Teils in der Schreibweise des Herstellers. */
export function partNo(p: YqPart): string {
  return (p.partNumberFormatted || p.partNumber || "").trim();
}

export interface YqPartSection {
  title?: string;
  parts?: YqPart[];
}

export interface YqPartShort {
  partNumber?: string;
  partName?: string;
}

/** Eine Baugruppe, in der ein gesuchtes Teil vorkommt. */
export interface YqPartUnitHit {
  unit?: YqUnitShort;
  partSections?: YqPartSection[];
}

export interface YqPartCategory {
  category?: { name?: string; code?: string };
  units?: YqPartUnitHit[];
}

export interface YqError {
  code?: string;
  message?: string;
}

interface YqEnvelope<T> {
  error?: YqError;
  data?: T;
  currentFilterState?: string;
  forms?: YqForm[];
  links?: YqLink[];
  navigationLinks?: YqLink[];
}

export class YqApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "YqApiError";
  }
}

/* ─────────────────────────── Kern ─────────────────────────── */

type Body = {
  token?: string;
  formValues?: Array<{ name: string; value: string }>;
  filterValues?: Array<{ name: string; value: string }>;
  currentFilterState?: string;
};

async function call<T>(action: string, body?: Body): Promise<YqEnvelope<T>> {
  const res = await fetch(`${API}?action=${encodeURIComponent(action)}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as (YqEnvelope<T> & { error?: unknown }) | null;
  if (!json) throw new YqApiError("Keine Antwort vom OEM-Katalog", res.status);
  if (!res.ok) {
    const msg =
      (typeof json.error === "object" && json.error && "message" in json.error
        ? String((json.error as YqError).message)
        : typeof json.error === "string"
        ? json.error
        : null) || `OEM-Katalog antwortet mit ${res.status}`;
    throw new YqApiError(msg, res.status);
  }
  if (json.error?.message) throw new YqApiError(json.error.message, res.status);
  return json;
}

/** Sucht in einer Antwort den Link zu einer bestimmten Folge-Aktion. */
export function linkTo(
  source: { links?: YqLink[]; navigationLinks?: YqLink[] } | undefined,
  action: string
): YqLink | undefined {
  return (
    source?.links?.find((l) => l.action === action) ||
    source?.navigationLinks?.find((l) => l.action === action)
  );
}

/** Thumbnail-/Größenvariante einer Bild-URL (`%size%`-Platzhalter). */
export function yqImage(url: string, size: "" | "source" | "small" | "medium" = ""): string {
  return url.replace("%size%", size);
}

/* ─────────────────────── Funktionen ─────────────────────── */

export async function yqWhoAmI() {
  const r = await call<Record<string, unknown>>("whoAreMeInfo");
  return r.data ?? {};
}

/** Alle freigeschalteten Marken-Kataloge. */
export async function yqCatalogs(): Promise<{ catalogs: YqCatalog[]; forms?: YqForm[] }> {
  const r = await call<{ catalogs?: YqCatalog[]; forms?: YqForm[] }>("catalogs", {});
  // ACHTUNG: forms/links liegen bei dieser API UNTER `data`, nicht daneben.
  return { catalogs: r.data?.catalogs ?? [], forms: r.data?.forms ?? r.forms };
}

/**
 * Katalog-Detail einer Marke — liefert vor allem die Suchformulare samt der
 * Token, die `findVehicle` und `findApplicableVehicles` zwingend brauchen.
 */
export async function yqCatalogInfo(catalogToken: string) {
  const r = await call<{ forms?: YqForm[]; token?: string; name?: string; brand?: string }>(
    "getCatalogInfo",
    { token: catalogToken }
  );
  return { info: r.data, forms: r.data?.forms ?? [] };
}

/** Katalog einer Marke heraussuchen (tolerant gegenüber Schreibweisen). */
export function matchCatalog(catalogs: YqCatalog[], brand: string): YqCatalog | undefined {
  const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, "");
  const b = norm(brand);
  if (!b) return undefined;
  return (
    catalogs.find((c) => norm(c.brand || "") === b || norm(c.name || "") === b) ||
    catalogs.find((c) => {
      const n = norm(c.name || c.brand || "");
      return n.length > 2 && (n.includes(b) || b.includes(n));
    })
  );
}

/**
 * Fahrzeug per VIN bestimmen.
 * Ohne `catalogToken` sucht der Dienst markenübergreifend — das ist der
 * Normalfall, weil die VIN die Marke selbst mitbringt.
 */
export async function yqFindByVin(
  vin: string,
  brand?: string
): Promise<{ vehicles: YqVehicle[]; envelope: YqEnvelope<{ vehicles?: YqVehicle[] }> }> {
  const clean = vin.trim().toUpperCase();
  const { catalogs } = await yqCatalogs();
  if (!catalogs.length) throw new YqApiError("Der OEM-Katalog liefert keine Marken.");

  const hit = brand ? matchCatalog(catalogs, brand) : undefined;
  if (!hit) {
    throw new YqApiError(
      brand
        ? `Für „${brand}" gibt es im Original-Katalog keine Freischaltung.`
        : "Ohne Marke kann der Original-Katalog die FIN nicht zuordnen."
    );
  }

  const catLink = linkTo(hit, "getCatalogInfo");
  const { forms } = await yqCatalogInfo(catLink?.token || hit.token);
  const form = forms.find((f) => f.action === "findVehicle");
  if (!form) throw new YqApiError(`${hit.name}: keine FIN-Suche im Katalog hinterlegt.`);

  // WICHTIG: findVehicle braucht den Token DES FORMULARS, nicht den des
  // Katalogs — mit Katalog-Token antwortet der Dienst mit einer leeren Liste.
  const r = await call<{ vehicles?: YqVehicle[] }>("findVehicle", {
    token: form.token,
    formValues: [{ name: "IdentString", value: clean }],
  });
  return { vehicles: r.data?.vehicles ?? [], envelope: r };
}

/** Fahrzeug per Kennzeichen (Länderkürzel + Nummer). */
export async function yqFindByPlate(countryCode: string, plate: string, catalogToken?: string) {
  const r = await call<{ vehicles?: YqVehicle[] }>("findByPlateNumber", {
    token: catalogToken,
    formValues: [
      { name: "CountryCode", value: countryCode },
      { name: "PlateNumber", value: plate.trim().toUpperCase() },
    ],
  });
  return { vehicles: r.data?.vehicles ?? [], envelope: r };
}

/** Einstieg in die Baugruppen-Navigation eines Fahrzeugs. */
export async function yqNavigationTree(token: string, filterState?: string) {
  const r = await call<YqNode>("getNavigationTree", { token, currentFilterState: filterState });
  return r;
}

export async function yqGroups(token: string, filterState?: string) {
  const r = await call<YqNode>("getGroups", { token, currentFilterState: filterState });
  return r;
}

/** Baugruppen (= Explosionszeichnungen) einer Gruppe. */
export async function yqUnits(token: string, filterState?: string) {
  const r = await call<{ units?: YqUnitShort[] }>("getUnits", {
    token,
    currentFilterState: filterState,
  });
  return { units: r.data?.units ?? [], filterState: r.currentFilterState, envelope: r };
}

/** Die Zeichnung selbst inkl. anklickbarer Bereiche. */
export async function yqUnitInfo(token: string, filterState?: string) {
  const r = await call<YqUnit>("getUnitInfo", { token, currentFilterState: filterState });
  return { unit: r.data, filterState: r.currentFilterState, envelope: r };
}

/** Teileliste einer Baugruppe — Positionsnummern passen zu den Bildbereichen. */
export async function yqUnitParts(token: string, filterState?: string) {
  const r = await call<{ partSections?: YqPartSection[]; sections?: YqPartSection[]; parts?: YqPart[] }>(
    "getUnitParts",
    { token, currentFilterState: filterState }
  );
  // Echte API liefert `partSections`. `sections`/`parts` bleiben als Fallback.
  const sections =
    r.data?.partSections ?? r.data?.sections ?? (r.data?.parts ? [{ parts: r.data.parts }] : []);
  return { sections, filterState: r.currentFilterState, envelope: r };
}

/** OEM-Querverweise zu einer Teilenummer. */
export async function yqPartReferences(oem: string) {
  const r = await call<{ references?: unknown[] }>("findPartReferences", {
    formValues: [{ name: "OEM", value: oem.trim() }],
  });
  return r;
}

/**
 * Baut aus Teileliste + Bildbereichen die Verknüpfung für die UI:
 * Positionsnummer → Teil, damit Klick im Bild die Zeile markiert und umgekehrt.
 */
export function mapAreasToParts(unit: YqUnit | undefined, sections: YqPartSection[]) {
  const byPosition = new Map<string, YqPart>();
  for (const sec of sections) {
    for (const p of sec.parts ?? []) {
      const pos = (p.areaCode || "").trim();
      if (pos && !byPosition.has(pos)) byPosition.set(pos, p);
    }
  }
  const areas = (unit?.imageMaps ?? []).flatMap((m) =>
    (m.areas ?? []).map((a) => ({
      ...a,
      image: m.imageName,
      part: a.areaCode ? byPosition.get(a.areaCode.trim()) : undefined,
    }))
  );
  return { areas, byPosition };
}

/**
 * ALLE Teile eines Fahrzeugs auf einmal (im PDF nicht dokumentiert, aber in
 * der offiziellen YQ-Bibliothek enthalten: RequestFactory::getAllParts).
 * Grundlage für die Sofortsuche innerhalb eines Fahrzeugs, ohne sich durch
 * den Baugruppenbaum klicken zu müssen.
 */
export async function yqAllParts(vehicleToken: string, withNames = true) {
  const r = await call<{ parts?: YqPartShort[] }>("getAllParts", {
    token: vehicleToken,
    formValues: [{ name: "WithNames", value: withNames ? "true" : "false" }],
  });
  return { parts: r.data?.parts ?? [], filterState: r.currentFilterState, envelope: r };
}

/**
 * Kernstück für „zeig mir die Explosionszeichnung zu DIESEM Teil":
 * Teilenummer + Fahrzeug -> in welchen Baugruppen sitzt das Teil.
 *
 * Je Kategorie kommen die Baugruppen samt Zeichnungs-URL (`imageNames`) und
 * den Links `getUnitInfo` (anklickbare Bildbereiche) und `getUnitParts`
 * (komplette Teilereihe) zurück — alles, was Trefferliste und Zeichnung
 * daneben brauchen.
 */
export async function yqPartApplicability(
  vehicleToken: string,
  partNumber: string,
  includeReplacements = true
) {
  const r = await call<{ categories?: YqPartCategory[] }>("getPartApplicability", {
    token: vehicleToken,
    formValues: [
      { name: "PartNumber", value: partNumber.trim() },
      { name: "IncludeReplacements", value: includeReplacements ? "true" : "false" },
    ],
  });
  return { categories: r.data?.categories ?? [], filterState: r.currentFilterState, envelope: r };
}
