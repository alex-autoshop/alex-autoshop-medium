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
}

export interface YqCatalog {
  token: string;
  name: string;
  brand?: string;
  archived?: boolean;
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

export interface YqPart {
  /** Positionsnummer in der Zeichnung (passt zu areaCode). */
  positionNumber?: string;
  code?: string;
  name?: string;
  description?: string;
  /** OEM-Teilenummer. */
  number?: string;
  oem?: string;
  quantity?: string;
  attributes?: YqAttr[];
  links?: YqLink[];
}

export interface YqPartSection {
  name?: string;
  code?: string;
  parts?: YqPart[];
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
  const r = await call<{ catalogs?: YqCatalog[] }>("catalogs", {});
  return { catalogs: r.data?.catalogs ?? [], forms: r.forms };
}

/**
 * Fahrzeug per VIN bestimmen.
 * Ohne `catalogToken` sucht der Dienst markenübergreifend — das ist der
 * Normalfall, weil die VIN die Marke selbst mitbringt.
 */
export async function yqFindByVin(
  vin: string,
  catalogToken?: string
): Promise<{ vehicles: YqVehicle[]; envelope: YqEnvelope<{ vehicles?: YqVehicle[] }> }> {
  const r = await call<{ vehicles?: YqVehicle[] }>("findVehicle", {
    token: catalogToken,
    formValues: [{ name: "IdentString", value: vin.trim().toUpperCase() }],
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
  const r = await call<{ sections?: YqPartSection[]; parts?: YqPart[] }>("getUnitParts", {
    token,
    currentFilterState: filterState,
  });
  const sections = r.data?.sections ?? (r.data?.parts ? [{ parts: r.data.parts }] : []);
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
  for (const s of sections) {
    for (const p of s.parts ?? []) {
      const pos = (p.positionNumber || p.code || "").trim();
      if (pos) byPosition.set(pos, p);
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
