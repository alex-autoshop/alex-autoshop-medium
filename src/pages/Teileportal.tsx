import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Car, Phone, MessageCircle, Loader2, Package } from "lucide-react";
import { Seo } from "@/components/Seo";
import { SHOP_INFO, whatsappLink } from "@/data/shopInfo";
import { cn } from "@/lib/utils";

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
}

async function tecdoc(payload: Record<string, unknown>) {
  const res = await fetch("/api/tecdoc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`API-Fehler ${res.status}`);
  return res.json();
}

// TecAlliance VRM liefert verschachtelte Strukturen — defensiv die wichtigsten Felder ziehen
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
  return articles.slice(0, 30).map((a: any, i: number) => ({
    id: a.legacyArticleId ?? a.articleId ?? i,
    name: a.genericArticleDescription ?? a.articleText ?? a.genericArticles?.[0]?.genericArticleDescription ?? "Artikel",
    brand: a.mfrName ?? a.brandName ?? "",
    articleNumber: a.articleNumber ?? a.articleNo ?? "",
    imageUrl: a.images?.[0]?.imageURL200 ?? a.images?.[0]?.imageURL100 ?? undefined,
  }));
}

type SearchMode = "plate" | "vin" | "kba";

const MODES: { id: SearchMode; label: string }[] = [
  { id: "plate", label: "Kennzeichen" },
  { id: "vin", label: "VIN / FIN" },
  { id: "kba", label: "Schlüsselnummer" },
];

export default function Teileportal() {
  // Default: Suche per Schlüsselnummer (HSN/TSN). Button bleibt rechts in der Reihenfolge.
  const [mode, setMode] = useState<SearchMode>("kba");
  const [plate, setPlate] = useState("");
  const [vin, setVin] = useState("");
  const [hsn, setHsn] = useState("");
  const [tsn, setTsn] = useState("");
  const [vehicle, setVehicle] = useState<VehicleInfo | null>(null);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [vehicleError, setVehicleError] = useState<string | null>(null);

  const [partQuery, setPartQuery] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [partsLoading, setPartsLoading] = useState(false);
  const [partsError, setPartsError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const lookupVehicle = async (e: React.FormEvent) => {
    e.preventDefault();

    let payload: Record<string, unknown> | null = null;
    if (mode === "plate") {
      if (!plate.trim()) return;
      payload = { action: "plate", plate: plate.trim().toUpperCase().replace(/\s|-/g, "") };
    } else if (mode === "vin") {
      if (!vin.trim()) return;
      payload = { action: "vin", vin: vin.trim().toUpperCase().replace(/\s/g, "") };
    } else {
      if (!hsn.trim()) return;
      payload = { action: "kba", hsn: hsn.trim(), tsn: tsn.trim() };
    }

    setVehicleLoading(true);
    setVehicleError(null);
    setVehicle(null);
    try {
      const data = await tecdoc(payload);
      // Handle WMI/NHTSA decoded VIN response
      if (data?.source === 'vin_decoded' && data?.vinBrand) {
        const brand = String(data.vinBrand);
        const year = data.vinYear ? String(data.vinYear) : undefined;
        setVehicle({
          manufacturer: brand,
          model: undefined,
          typeName: year ? `${brand} · ${year}` : brand,
          raw: data,
        });
        setVehicleLoading(false);
        return;
      }
      const info = parseVehicle(data);
      if (info) setVehicle(info);
      else setVehicleError("Fahrzeug nicht gefunden. Prüfe deine Eingabe oder ruf uns an — wir finden es.");
    } catch {
      setVehicleError("Abfrage fehlgeschlagen. Versuch es später erneut oder ruf uns an.");
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
    try {
      const data = await tecdoc({ action: "search", query: partQuery.trim() });
      setArticles(parseArticles(data));
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
        title="Teileportal – Teile per Kennzeichen finden"
        description="Kennzeichen eingeben, Fahrzeug erkennen, passende Autoteile finden. Anfrage direkt per WhatsApp oder Telefon an Alex Autoshop Wuppertal."
      />

      <div className="max-w-2xl">
        <h1 className="text-3xl sm:text-4xl mb-3">Teileportal</h1>
        <p className="text-muted-foreground mb-8">
          Kennzeichen eingeben → Fahrzeug erkennen → Teil anfragen. Wir prüfen Verfügbarkeit
          und Preis und melden uns sofort — meist ist das Teil am selben Tag da.
        </p>
      </div>

      {/* Schritt 1: Kennzeichen */}
      <div className="card-tilt p-6 sm:p-8 hover:translate-y-0 max-w-2xl">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm">1</span>
          <h2 className="text-xl">Fahrzeug finden</h2>
        </div>

        {/* Umschalter: Kennzeichen / VIN / Schlüsselnummer */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setMode(m.id);
                setVehicle(null);
                setVehicleError(null);
              }}
              className={cn(
                "px-4 min-h-[44px] rounded-lg border font-medium text-sm transition-colors",
                mode === m.id ? "bg-night text-white border-night" : "bg-card border-border hover:border-primary"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <form onSubmit={lookupVehicle} className="flex flex-col sm:flex-row gap-3">
          {mode === "plate" && (
            <div className="flex-1 flex items-center rounded-lg border-2 border-night overflow-hidden bg-white">
              <span className="bg-blue-700 text-white font-bold px-3 self-stretch flex items-center text-sm">D</span>
              <input
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="W-AB 1234"
                className="flex-1 px-4 min-h-[52px] text-lg font-bold tracking-widest uppercase focus:outline-none"
                aria-label="Kennzeichen"
              />
            </div>
          )}

          {mode === "vin" && (
            <input
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              placeholder="Fahrgestellnummer (17 Zeichen)"
              maxLength={17}
              className="input-base flex-1 uppercase tracking-wider"
              aria-label="VIN / Fahrgestellnummer"
            />
          )}

          {mode === "kba" && (
            <div className="flex-1 flex gap-3">
              <input
                value={hsn}
                onChange={(e) => setHsn(e.target.value)}
                placeholder="HSN (2.1)"
                maxLength={4}
                className="input-base w-32 uppercase tracking-wider"
                aria-label="HSN — Herstellerschlüsselnummer"
              />
              <input
                value={tsn}
                onChange={(e) => setTsn(e.target.value)}
                placeholder="TSN (2.2)"
                maxLength={3}
                className="input-base flex-1 uppercase tracking-wider"
                aria-label="TSN — Typschlüsselnummer"
              />
            </div>
          )}

          <button type="submit" disabled={vehicleLoading} className="btn-primary sm:px-8">
            {vehicleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            Fahrzeug finden
          </button>
        </form>

        {mode === "kba" && (
          <p className="text-xs text-muted-foreground mt-2">
            Die Schlüsselnummern stehen im Fahrzeugschein (Zulassungsbescheinigung Teil I):
            HSN unter Feld 2.1, TSN unter Feld 2.2.
          </p>
        )}
        {vehicleError && <p className="text-destructive text-sm mt-3">{vehicleError}</p>}
        {vehicle && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-xl bg-secondary p-4 flex items-start gap-3"
          >
            <Car className="w-6 h-6 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">{vehicleLabel || "Fahrzeug erkannt"}</p>
              <p className="text-sm text-muted-foreground">
                {[vehicle.power && `${vehicle.power} kW`, vehicle.fuel, vehicle.firstRegistration && `EZ ${vehicle.firstRegistration}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Schritt 2: Teil suchen */}
      <div className="card-tilt p-6 sm:p-8 hover:translate-y-0 max-w-2xl mt-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm">2</span>
          <h2 className="text-xl">Teil suchen</h2>
        </div>
        <form onSubmit={searchParts} className="flex flex-col sm:flex-row gap-3">
          <input
            value={partQuery}
            onChange={(e) => setPartQuery(e.target.value)}
            placeholder="z.B. Bremsscheibe, Ölfilter, Stoßdämpfer …"
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
          {articles.length > 0 ? (
            <>
              <h2 className="text-xl mb-4">{articles.length} Teile gefunden</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {articles.map((a) => (
                  <div key={a.id} className="card-tilt p-4 flex gap-4">
                    <div className="w-20 h-20 rounded-lg bg-secondary shrink-0 overflow-hidden flex items-center justify-center">
                      {a.imageUrl ? (
                        <img src={a.imageUrl} alt={a.name} loading="lazy" className="w-full h-full object-contain" />
                      ) : (
                        <Package className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex flex-col">
                      <p className="font-semibold text-sm leading-tight">{a.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {a.brand} {a.articleNumber && `· ${a.articleNumber}`}
                      </p>
                      <a
                        href={inquiry(a)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-auto pt-2 text-primary font-semibold text-sm inline-flex items-center gap-1 min-h-[44px]"
                      >
                        <MessageCircle className="w-4 h-4" /> Preis anfragen
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">Keine Teile gefunden — frag uns direkt, wir finden es.</p>
          )}
        </div>
      )}

      {/* Anfrage-CTA */}
      <div className="section-dark rounded-3xl p-8 sm:p-10 mt-10 max-w-2xl">
        <h2 className="text-xl sm:text-2xl mb-2">
          Lieber direkt <span className="text-gold-accent">anfragen?</span>
        </h2>
        <p className="text-white/65 mb-6 text-sm leading-relaxed">
          Schick uns Kennzeichen + Teilewunsch — wir prüfen Preis und Verfügbarkeit und melden uns sofort.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a href={inquiry()} target="_blank" rel="noopener noreferrer" className="btn-gold-bright flex-1">
            <MessageCircle className="w-5 h-5" /> Per WhatsApp anfragen
          </a>
          <a href={`tel:${SHOP_INFO.phoneIntl}`} className="btn bg-white/10 text-white hover:bg-white/20 flex-1">
            <Phone className="w-5 h-5" /> {SHOP_INFO.phone}
          </a>
        </div>
      </div>
    </div>
  );
}
