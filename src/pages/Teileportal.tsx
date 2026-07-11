import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Car, Phone, MessageCircle, Loader2, Package } from "lucide-react";
import { Seo } from "@/components/Seo";
import { SHOP_INFO, whatsappLink } from "@/data/shopInfo";
import { cn } from "@/lib/utils";
import { apVehicleByKba, apVehicleByVin, apArticlesForVehicle, apArticlesByNumber, type ApArticle } from "@/lib/autoparts";

// ─── Brand-Logo-Fallback (Clearbit CDN, kostenlos) ───────────────────────────
const BRAND_DOMAINS: Record<string, string> = {
  'BOSCH': 'bosch.com',
  'BREMBO': 'brembo.com',
  'ZIMMERMANN': 'zimmermann-brake.com',
  'ATE': 'ate.eu',
  'MEYLE': 'meyle.com',
  'TRW': 'zf.com',
  'JURID': 'jurid.com',
  'TEXTAR': 'textar.com',
  'MANN-FILTER': 'mann-hummel.com',
  'MANN': 'mann-hummel.com',
  'NGK': 'ngk.com',
  'BILSTEIN': 'bilstein.de',
  'LUK': 'schaeffler.com',
  'GATES': 'gates.com',
  'DOLZ': 'dolz.com',
  'FEBI': 'febi.com',
  'SKF': 'skf.com',
  'FAG': 'schaeffler.com',
  'INA': 'schaeffler.com',
  'SACHS': 'zf.com',
  'HELLA': 'hella.com',
  'VALEO': 'valeo.com',
  'DENSO': 'denso.com',
  'CONTINENTAL': 'continental.com',
  'MAHLE': 'mahle.com',
  'OPTIMAL': 'optimal.de',
  'SWAG': 'swag.eu',
  'TOPRAN': 'topran.de',
  'LEMFORDER': 'zf.com',
  'RIDEX': 'ridex.eu',
  'MAPCO': 'mapco.com',
  'NK': 'nk.eu',
  'DELPHI': 'delphi.com',
  'VEMO': 'vemo.com',
  'HERTH+BUSS': 'herth-buss.de',
  'NISSENS': 'nissens.com',
  'NTK': 'ngk.com',
  'CHAMPION': 'championautoparts.com',
};
function getBrandLogo(brand: string): string | undefined {
  const domain = BRAND_DOMAINS[(brand || '').toUpperCase().trim()];
  return domain ? `https://logo.clearbit.com/${domain}` : undefined;
}

interface VehicleInfo {
  manufacturer?: string;
  model?: string;
  typeName?: string;
  power?: string;
  fuel?: string;
  firstRegistration?: string;
  raw?: Record<string, unknown>;
}

interface Article {
  id: string | number;
  name: string;
  brand: string;
  articleNumber: string;
  imageUrl?: string;
  category?: string;
  oeNumbers?: string[];
  specs?: { name: string; value: string }[];
  mountingInfo?: string;
  // Intercars live data
  price?: number;
  priceOriginal?: number;
  availability?: string;
  deliveryDays?: number;
  source?: "intercars" | "static";
}

async function postJson(url: string, payload: Record<string, unknown>, timeoutMs: number) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`API-Fehler ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Beide mit hartem Timeout — nie wieder Endlos-Spinner
async function tecdoc(payload: Record<string, unknown>) {
  return postJson("/api/tecdoc", payload, 12_000);
}

async function intercars(payload: Record<string, unknown>) {
  return postJson("/api/intercars", payload, 12_000);
}

const PRICE_MARKUP = 1.7;

function parseIntercarsArticles(data: any): Article[] {
  const items: any[] = data?.articles ?? data?.results ?? (Array.isArray(data) ? data : []);
  return items.map((ic: any) => {
    const ekPrice: number | undefined = ic.price;
    const sellPrice = ekPrice != null ? Math.ceil(ekPrice * PRICE_MARKUP * 100) / 100 : undefined;
    const imgRaw = ic.images?.[0];
    const imageUrl: string | undefined =
      typeof imgRaw === "string" ? imgRaw : imgRaw?.url ?? imgRaw?.imageURL ?? undefined;
    return {
      id: ic.id ?? ic._sku ?? Math.random(),
      name: ic.name ?? "Artikel",
      brand: ic.brand ?? "",
      articleNumber: ic._sku ?? ic._index ?? ic.id ?? "",
      imageUrl,
      category: undefined,
      oeNumbers: ic.oemNumbers ?? [],
      specs: ic.specs
        ? Object.entries(ic.specs).map(([name, value]) => ({ name, value: String(value) }))
        : [],
      mountingInfo: undefined,
      price: sellPrice,
      priceOriginal: undefined,
      availability: ic.availability,
      deliveryDays: ic.deliveryDays,
      source: "intercars" as const,
    };
  });
}

function apToArticle(a: ApArticle): Article {
  return {
    id: a.id,
    name: a.name,
    brand: a.brand,
    articleNumber: a.articleNumber,
    imageUrl: a.imageUrl,
    category: a.category,
    oeNumbers: a.oeNumbers,
    specs: a.specs,
    source: "static" as const,
  };
}

function parseVehicle(data: Record<string, unknown> | null): VehicleInfo | null {
  if (!data || data.error) return null;
  const candidates: Record<string, unknown>[] = [];
  const dig = (obj: unknown) => {
    if (Array.isArray(obj)) obj.forEach(dig);
    else if (obj && typeof obj === "object") {
      const o = obj as Record<string, unknown>;
      if (o.make || o.manufacturer || o.manufacturerName || o.vehicleDetails) candidates.push(o);
      Object.values(o).forEach(dig);
    }
  };
  dig(data);
  const v = candidates[0] ?? (data as Record<string, unknown>);
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const val = (v as Record<string, unknown>)[k];
      if (typeof val === "string" && val) return val;
      if (typeof val === "number") return String(val);
    }
    return undefined;
  };
  const info: VehicleInfo = {
    manufacturer: pick("make", "manufacturer", "manufacturerName", "mfrName"),
    model: pick("model", "modelName", "vehicleModelSeriesName"),
    typeName: pick("typeName", "type", "description", "fullName"),
    power: pick("powerKW", "powerKw", "power"),
    fuel: pick("fuelType", "fuel"),
    firstRegistration: pick("firstRegistrationDate", "firstRegistration", "registrationDate"),
    raw: data,
  };
  if (!info.manufacturer && !info.model && !info.typeName) return null;
  return info;
}

function parseArticles(data: Record<string, unknown> | null): Article[] {
  const articles =
    (data as any)?.articles ??
    (data as any)?.data?.array ??
    (data as any)?.LIST_ARTICLES_BY_QUICK_SEARCH?.articles ??
    [];
  if (!Array.isArray(articles)) return [];
  return articles.slice(0, 50).map((a: any, i: number) => ({
    id: a.legacyArticleId ?? a.articleId ?? i,
    name: a.genericArticles?.[0]?.genericArticleDescription ?? a.genericArticleDescription ?? a.articleText ?? "Artikel",
    brand: a.mfrName ?? a.brandName ?? "",
    articleNumber: a.articleNumber ?? a.articleNo ?? "",
    imageUrl: a.images?.[0]?.imageURL200 ?? a.images?.[0]?.imageURL100 ?? undefined,
    category: a.genericArticles?.[0]?.assemblyGroupDescription ?? undefined,
    oeNumbers: ((a.oeNumbers ?? []) as any[]).slice(0, 3).map((oe: any) => oe.oeNumber ?? String(oe)).filter(Boolean),
    specs: ((a.immediateAttributs ?? a.articleAttributes ?? []) as any[]).slice(0, 5).map((attr: any) => ({
      name: attr.attrName ?? attr.attributeName ?? "",
      value: `${attr.attrValue ?? attr.value ?? ""}${attr.attrUnit ?? attr.unit ?? ""}`,
    })).filter((s: { name: string; value: string }) => s.name && s.value),
    mountingInfo: a.immediateAttributs?.find((a: any) => a.attrName?.toLowerCase().includes("montage"))?.attrValue ?? undefined,
  }));
}

type SearchMode = "plate" | "vin" | "kba";

const MODES: { id: SearchMode; label: string }[] = [
  { id: "vin", label: "VIN / FIN" },
  { id: "kba", label: "Schlüsselnummer" },
];

export default function Teileportal() {
  const [mode, setMode] = useState<SearchMode>("kba");
  const [plate, setPlate] = useState("");
  const [vin, setVin] = useState("");
  const [hsn, setHsn] = useState("");
  const [tsn, setTsn] = useState("");
  const [vehicle, setVehicle] = useState<VehicleInfo | null>(null);
  const [vehicleKtype, setVehicleKtype] = useState<number | null>(null);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [vehicleError, setVehicleError] = useState<string | null>(null);

  const [partQuery, setPartQuery] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [partsLoading, setPartsLoading] = useState(false);
  const [partsError, setPartsError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [totalCount, setTotalCount] = useState(0);

  const lookupVehicle = async (e: React.FormEvent) => {
    e.preventDefault();

    let payload: Record<string, unknown> | null = null;
    if (mode === "plate") {
      if (!plate.trim()) return;
      payload = { action: "plate", plate: plate.trim().toUpperCase().replace(/\s|-/g, "") };
    } else if (mode === "vin") {
      if (!vin.trim()) return;
      payload = { action: "vin", vin: vin.trim().toUpperCase().replace(/\s/g, "").replace(/I/g,"1").replace(/O/g,"0").replace(/Q/g,"0") };
    } else {
      if (!hsn.trim()) return;
      payload = { action: "kba", hsn: hsn.trim().padStart(4,"0"), tsn: tsn.trim().padStart(3,"0") };
    }

    setVehicleLoading(true);
    setVehicleError(null);
    setVehicle(null);
    setVehicleKtype(null);
    try {
      // 1) Neuer Teilekatalog (AutoPartsAPI): Schluesselnummer + VIN
      try {
        const veh =
          mode === "kba" ? await apVehicleByKba(hsn.trim().padStart(4, "0"), tsn.trim().padStart(3, "0"))
          : mode === "vin" ? await apVehicleByVin(vin.trim().toUpperCase().replace(/\s/g, ""))
          : null;
        if (veh) {
          setVehicle({
            manufacturer: veh.manufacturer,
            model: veh.model,
            typeName: veh.typeName,
            power: veh.power,
            fuel: veh.fuel,
            raw: veh.raw,
          });
          setVehicleKtype(veh.vehicleId ?? null);
          setVehicleLoading(false);
          return;
        }
      } catch { /* Katalog nicht erreichbar -> alter Weg */ }

      // 2) Fallback: alter Proxy (lokaler VIN-Decode)
      const data = await tecdoc(payload);
      if (data?.source === 'vin_decoded' && data?.vinBrand) {
        const brand = String(data.vinBrand);
        const year = data.vinYear ? String(data.vinYear) : undefined;
        setVehicle({
          manufacturer: brand,
          model: undefined,
          typeName: year ? String(year) : undefined,
          raw: data,
        });
        setVehicleLoading(false);
        return;
      }
      const info = parseVehicle(data);
      if (info) {
        setVehicle(info);
      } else if (data?.error === 'kba_not_licensed') {
        setVehicleError(`Schlüsselnummer-Suche ist in dieser Version nicht freigeschaltet. Ruf uns an: 0202 82690 — wir finden das Fahrzeug für dich.`);
      } else if (data?.error && String(data.error).includes('unbekannt')) {
        setVehicleError(`VIN-Hersteller nicht erkannt. Prüfe die VIN oder ruf uns an: 0202 82690`);
      } else {
        setVehicleError("Fahrzeug nicht gefunden. Prüfe deine Eingabe oder ruf uns an: 0202 82690");
      }
    } catch {
      setVehicleError("Abfrage fehlgeschlagen. Versuch es später erneut oder ruf uns an: 0202 82690");
    } finally {
      setVehicleLoading(false);
    }
  };

  const searchParts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partQuery.trim()) return;
    setPartsLoading(true);
    setPartsError(null);
    setSearched(true);
    setSelectedBrands(new Set());
    try {
      let parsed: Article[] = [];
      let total = 0;
      const norm = (x: string) => (x || "").toLowerCase().replace(/[^a-z0-9]/g, "");

      // 1) Fahrzeug erkannt -> Katalog: ALLE passenden Teile (alle Marken, mit Bildern)
      if (vehicleKtype) {
        try {
          parsed = (await apArticlesForVehicle(vehicleKtype, partQuery.trim())).map(apToArticle);
          total = parsed.length;
        } catch { /* Katalog optional */ }
      }

      // 2) Inter Cars (Preise + Verfuegbarkeit) laden und per Artikelnummer mergen
      try {
        const icData = await intercars({ action: "search", query: partQuery.trim(), limit: 48 });
        const icArts = parseIntercarsArticles(icData);
        if (parsed.length === 0) {
          parsed = icArts;
          total = icData?.totalCount ?? icArts.length;
        } else if (icArts.length > 0) {
          const icMap = new Map(icArts.map((ic) => [norm(ic.articleNumber), ic]));
          parsed = parsed.map((a) => {
            const hit = icMap.get(norm(a.articleNumber));
            return hit
              ? { ...a, price: hit.price, availability: hit.availability, deliveryDays: hit.deliveryDays, imageUrl: a.imageUrl ?? hit.imageUrl, source: "intercars" as const }
              : a;
          });
          const known = new Set(parsed.map((a) => norm(a.articleNumber)));
          parsed = [...parsed, ...icArts.filter((ic) => !known.has(norm(ic.articleNumber)))];
          total = parsed.length;
        }
      } catch { /* IC optional */ }

      // 3) Noch nichts? Nummern-Suche im Katalog (Artikel-/OE-Nummer)
      if (parsed.length === 0 && /^[A-Za-z0-9._\-\/]{4,}$/.test(partQuery.trim())) {
        try {
          parsed = (await apArticlesByNumber(partQuery.trim())).map(apToArticle);
          total = parsed.length;
        } catch { /* weiter */ }
      }

      // 4) Letzter Fallback: alter tecdoc / statischer Katalog
      if (parsed.length === 0) {
        const tdData = await tecdoc({ action: "search", query: partQuery.trim() });
        parsed = parseArticles(tdData);
        total = (tdData as any)?.totalMatchingArticles ?? parsed.length;
      }

      setArticles(parsed);
      setTotalCount(total);
    } catch {
      setPartsError("Suche fehlgeschlagen. Versuch es später erneut.");
      setArticles([]);
    } finally {
      setPartsLoading(false);
    }
  };

  const vehicleLabel = vehicle
    ? [vehicle.manufacturer, vehicle.model, vehicle.typeName].filter(Boolean).join(" ")
    : "";

  const vehicleId =
    mode === "plate"
      ? plate && `Kennzeichen: ${plate}`
      : mode === "vin"
      ? vin && `VIN/FIN: ${vin}`
      : hsn && `Schlüsselnummer: HSN ${hsn}${tsn ? ` / TSN ${tsn}` : ""}`;

  const inquiry = (article?: Article) => {
    const lines = [
      "Hallo Alex Autoshop, ich brauche ein Teil:",
      article ? `Teil: ${article.brand} ${article.name} (Art.-Nr. ${article.articleNumber})` : `Teil: ${partQuery}`,
      vehicleLabel ? `Fahrzeug: ${vehicleLabel}` : vehicleId || "",
    ].filter(Boolean);
    return whatsappLink(lines.join("\n"));
  };

  return (
    <div className="container py-8 sm:py-12">
      <Seo
        title="Teileportal – Autoteile per Schlüsselnummer oder VIN finden"
        description="HSN/TSN oder VIN eingeben, Fahrzeug erkennen, alle passenden Autoteile mit Bild und Preis. Anfrage direkt per WhatsApp oder Telefon an Alex Autoshop Wuppertal."
      />

      <div className="max-w-2xl">
        <h1 className="text-3xl sm:text-4xl mb-3">Teileportal</h1>
        <p className="text-muted-foreground mb-8">
          Schlüsselnummer (HSN/TSN) oder VIN eingeben → Fahrzeug erkennen → alle passenden Teile
          mit Bild und Preis. Wir prüfen Verfügbarkeit und melden uns sofort — meist ist das Teil am selben Tag da.
        </p>
      </div>

      {/* Schritt 1: Kennzeichen */}
      <div className="card-tilt p-6 sm:p-8 hover:translate-y-0 max-w-2xl">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm">1</span>
          <h2 className="text-xl">Fahrzeug finden</h2>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2 mb-4">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); setVehicle(null); setVehicleError(null); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                mode === m.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <form onSubmit={lookupVehicle} className="flex flex-col gap-3">
          {mode === "plate" && (
            <input
              value={plate}
              onChange={e => setPlate(e.target.value)}
              placeholder="z. B. W-AA1234"
              className="input-base uppercase"
              aria-label="Kennzeichen"
            />
          )}
          {mode === "vin" && (
            <input
              value={vin}
              onChange={e => setVin(e.target.value)}
              placeholder="17-stellige VIN / FIN"
              className="input-base uppercase"
              maxLength={17}
              aria-label="VIN"
            />
          )}
          {mode === "kba" && (
            <div className="flex gap-2">
              <input
                value={hsn}
                onChange={e => setHsn(e.target.value)}
                placeholder="HSN (4-stellig)"
                className="input-base w-36"
                maxLength={4}
                aria-label="HSN"
              />
              <input
                value={tsn}
                onChange={e => setTsn(e.target.value)}
                placeholder="TSN (3-stellig)"
                className="input-base w-36"
                maxLength={3}
                aria-label="TSN"
              />
            </div>
          )}
          <button type="submit" disabled={vehicleLoading} className="btn-primary self-start gap-2">
            {vehicleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Car className="w-4 h-4" />}
            Fahrzeug suchen
          </button>
        </form>

        {vehicleError && (
          <p className="text-destructive text-sm mt-3">{vehicleError}</p>
        )}

        {vehicle && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-xl bg-primary/10 border border-primary/20 p-4"
          >
            <p className="font-bold text-primary text-sm mb-1">Fahrzeug erkannt</p>
            <p className="font-semibold">
              {[vehicle.manufacturer, vehicle.model, vehicle.typeName].filter(Boolean).join(" ")}
            </p>
            {(vehicle.power || vehicle.fuel || vehicle.firstRegistration) && (
              <p className="text-xs text-muted-foreground mt-1">
                {[
                  vehicle.power && `${vehicle.power} kW`,
                  vehicle.fuel,
                  vehicle.firstRegistration && `ab ${vehicle.firstRegistration}`,
                ].filter(Boolean).join(" · ")}
              </p>
            )}
          </motion.div>
        )}
      </div>

      {/* Schritt 2: Teil suchen */}
      <div className="card-tilt p-6 sm:p-8 hover:translate-y-0 max-w-2xl mt-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm">2</span>
          <h2 className="text-xl">Teil suchen</h2>
        </div>
        <form onSubmit={searchParts} className="flex gap-2">
          <input
            value={partQuery}
            onChange={e => setPartQuery(e.target.value)}
            placeholder="z. B. Bremsbeläge vorne, Ölfilter, Stoßdämpfer …"
            className="input-base flex-1"
            aria-label="Teilesuche"
          />
          <button type="submit" disabled={partsLoading} className="btn-dark sm:px-8">
            {partsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            Suchen
          </button>
        </form>
        {partsError && <p className="text-destructive text-sm mt-3">{partsError}</p>}
      </div>

      {/* Ergebnisse */}
      {searched && !partsLoading && (
        <div className="mt-8">
          {articles.length > 0 ? (() => {
            const allBrands = [...new Set(articles.map(a => a.brand).filter(Boolean))].sort();
            const filtered = selectedBrands.size > 0
              ? articles.filter(a => selectedBrands.has(a.brand))
              : articles;
            return (
              <div className="flex gap-6">
                {/* Sidebar */}
                <aside className="w-52 shrink-0 hidden lg:block">
                  <div className="border border-border rounded-xl p-4 sticky top-24">
                    <h3 className="font-bold text-sm mb-3 uppercase tracking-wide text-muted-foreground">Hersteller</h3>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {allBrands.map(brand => (
                        <label key={brand} className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-primary"
                            checked={selectedBrands.has(brand)}
                            onChange={() => {
                              const next = new Set(selectedBrands);
                              next.has(brand) ? next.delete(brand) : next.add(brand);
                              setSelectedBrands(next);
                            }}
                          />
                          <span className="text-sm group-hover:text-primary transition-colors">{brand}</span>
                          <span className="ml-auto text-xs text-muted-foreground">
                            ({articles.filter(a => a.brand === brand).length})
                          </span>
                        </label>
                      ))}
                    </div>
                    {selectedBrands.size > 0 && (
                      <button
                        onClick={() => setSelectedBrands(new Set())}
                        className="mt-3 text-xs text-primary hover:underline"
                      >
                        Filter zurücksetzen
                      </button>
                    )}
                  </div>
                </aside>

                {/* Hauptbereich */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                    <div>
                      <span className="font-bold text-lg">ALLE ({totalCount > articles.length ? totalCount : articles.length})</span>
                      {selectedBrands.size > 0 && (
                        <span className="ml-2 text-sm text-muted-foreground">— {filtered.length} gefiltert</span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground hidden sm:block">
                      {vehicleLabel && <span className="font-medium">📋 {vehicleLabel}</span>}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {filtered.map((a) => (
                      <div key={a.id} className="border border-border rounded-xl bg-card hover:border-primary/40 transition-colors overflow-hidden">
                        <div className="flex gap-4 p-4">
                          <div className="w-16 h-16 shrink-0 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
                            {a.imageUrl ? (
                              <img
                                src={a.imageUrl}
                                alt={a.name}
                                loading="lazy"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  const logo = getBrandLogo(a.brand);
                                  if (logo) { (e.target as HTMLImageElement).src = logo; (e.target as HTMLImageElement).className = "w-full h-full object-contain p-2"; }
                                  else (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : getBrandLogo(a.brand) ? (
                              <img
                                src={getBrandLogo(a.brand)!}
                                alt={a.brand}
                                loading="lazy"
                                className="w-full h-full object-contain p-2"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              <Package className="w-7 h-7 text-muted-foreground" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-bold text-sm text-primary truncate">{a.articleNumber}</p>
                                <p className="font-semibold text-sm leading-snug mt-0.5">{a.name}</p>
                                {a.brand && (
                                  <span className="inline-block mt-1 px-2 py-0.5 rounded bg-secondary text-xs font-bold tracking-wide uppercase">
                                    {a.brand}
                                  </span>
                                )}
                                {a.specs && a.specs.length > 0 && (
                                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    {a.specs.map(s => `${s.name}: ${s.value}`).join(" · ")}
                                  </p>
                                )}
                                {a.oeNumbers && a.oeNumbers.length > 0 && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    OE: {a.oeNumbers.join(", ")}
                                  </p>
                                )}
                              </div>

                              <div className="shrink-0 text-right flex flex-col items-end gap-2">
                                {a.price != null ? (
                                  <>
                                    <div className="text-right">
                                      <p className="font-bold text-lg leading-none">
                                        {a.price.toFixed(2).replace(".", ",")} €
                                      </p>
                                      {a.priceOriginal != null && a.priceOriginal > a.price && (
                                        <p className="text-xs text-muted-foreground line-through">
                                          {a.priceOriginal.toFixed(2).replace(".", ",")} €
                                        </p>
                                      )}
                                    </div>
                                    <span className={cn(
                                      "inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium",
                                      a.deliveryDays != null && a.deliveryDays <= 1
                                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                    )}>
                                      {a.availability ?? "Auf Anfrage"}
                                    </span>
                                    <a
                                      href={inquiry(a)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn-primary text-xs px-3 py-2 min-h-0 h-auto inline-flex items-center gap-1"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                      Bestellen
                                    </a>
                                  </>
                                ) : (
                                  <>
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                      Auf Anfrage
         