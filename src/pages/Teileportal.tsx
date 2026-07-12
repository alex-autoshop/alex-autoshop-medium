import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Car, Phone, MessageCircle, Loader2, Package, ChevronRight, ArrowLeft,
  Filter, Settings, Disc, Zap, Wind, Thermometer, Battery, Radio, Fuel,
  Wrench, Navigation, Layers, Lightbulb, Truck, Circle, ShoppingBag
} from "lucide-react";
import { Seo } from "@/components/Seo";
import { SHOP_INFO, whatsappLink } from "@/data/shopInfo";
import { cn } from "@/lib/utils";
import { apVehicleByKba, apVehicleByVin, apArticlesForVehicle, apArticlesByNumber, apCategoryTree, apArticlesByCategory, apEnrichVehicle, type ApArticle, type ApCategoryNode } from "@/lib/autoparts";
import { STATIC_CAT_TREE } from "@/lib/catTreeStatic";
import { useGarage, usePartsCart, GarageList, PartDetailModal, PartsCartButton, PartsCartDrawer, type GarageVehicle, type DetailArticle } from "@/components/TeileportalExtras";
import { icPriceLookup } from "@/lib/intercarsGateway";
import { ArticleExpander, BrandFilter, SubCatList } from "@/components/TeileportalExtras";
import { MembershipSelect, useMembership, PriceBlock, DeliveryBadge, SpecStrip } from "@/components/TeileportalPricing";

const BRAND_DOMAINS: Record<string, string> = {
  'BOSCH': 'bosch.com', 'BREMBO': 'brembo.com', 'ZIMMERMANN': 'zimmermann-brake.com',
  'ATE': 'ate.eu', 'MEYLE': 'meyle.com', 'TRW': 'zf.com', 'JURID': 'jurid.com',
  'TEXTAR': 'textar.com', 'MANN-FILTER': 'mann-hummel.com', 'MANN': 'mann-hummel.com',
  'NGK': 'ngk.com', 'BILSTEIN': 'bilstein.de', 'LUK': 'schaeffler.com',
  'GATES': 'gates.com', 'DOLZ': 'dolz.com', 'FEBI': 'febi.com', 'SKF': 'skf.com',
  'FAG': 'schaeffler.com', 'INA': 'schaeffler.com', 'SACHS': 'zf.com',
  'HELLA': 'hella.com', 'VALEO': 'valeo.com', 'DENSO': 'denso.com',
  'CONTINENTAL': 'continental.com', 'MAHLE': 'mahle.com', 'OPTIMAL': 'optimal.de',
  'SWAG': 'swag.eu', 'TOPRAN': 'topran.de', 'LEMFORDER': 'zf.com', 'RIDEX': 'ridex.eu',
  'MAPCO': 'mapco.com', 'NK': 'nk.eu', 'DELPHI': 'delphi.com', 'VEMO': 'vemo.com',
  'NISSENS': 'nissens.com', 'NTK': 'ngk.com', 'CHAMPION': 'championautoparts.com',
  'AJUSA': 'ajusa.es', 'BLUE PRINT': 'blue-print.com', 'CORTECO': 'corteco.com',
  'ELRING': 'elring.de', 'HENGST': 'hengst.com', 'HENGST FILTER': 'hengst.com',
  'HERTH+BUSS': 'herthundbuss.com', 'HERTH+BUSS ELPARTS': 'herthundbuss.com', 'HERTH+BUSS JAKOPARTS': 'herthundbuss.com',
  'VICTOR REINZ': 'reinz.com', 'REINZ': 'reinz.com', 'VAICO': 'vaico.de', 'VDO': 'vdo.com',
  'PIERBURG': 'ms-motorservice.com', 'KOLBENSCHMIDT': 'ms-motorservice.com', 'MAGNETI MARELLI': 'magnetimarelli.com',
  'NRF': 'nrf.eu', 'KYB': 'kyb-europe.com', 'MONROE': 'monroe.com', 'KONI': 'koni.com', 'EIBACH': 'eibach.com',
  'VARTA': 'varta-automotive.com', 'EXIDE': 'exide.com', 'BANNER': 'bannerbatterien.com',
  'OSRAM': 'osram.de', 'PHILIPS': 'philips.de', 'LIQUI MOLY': 'liqui-moly.com', 'CASTROL': 'castrol.com',
  'MOTUL': 'motul.com', 'FUCHS': 'fuchs.com', 'MOBIL': 'mobil.com', 'DAYCO': 'dayco.com', 'CONTITECH': 'continental.com',
  'RUVILLE': 'ruville.de', 'GKN': 'gkn.com', 'SPIDAN': 'gkn.com', 'LÖBRO': 'gkn.com', 'LOBRO': 'gkn.com',
  'SNR': 'ntn-snr.com', 'NTN': 'ntn-snr.com', 'NSK': 'nsk.com', 'BOSAL': 'bosal.com', 'HJS': 'hjs.com',
  'EBERSPÄCHER': 'eberspaecher.com', 'EBERSPACHER': 'eberspaecher.com', 'JP GROUP': 'jpgroup.dk',
  'NIPPARTS': 'nipparts.com', 'ASHIKA': 'ashika.com', 'JAPANPARTS': 'japanparts.com',
  'MAXGEAR': 'maxgear.eu', 'KAMOKA': 'kamoka.eu', 'STELLOX': 'stellox.com', 'VAN WEZEL': 'vanwezel.com',
  'PRASCO': 'prasco.com', 'ALKAR': 'alkar.es', 'KLOKKERHOLM': 'klokkerholm.com', 'BERU': 'borgwarner.com',
  'STABILUS': 'stabilus.com', 'HANS PRIES': 'topran.de', 'SIDEM': 'sidem.be', 'TRISCAN': 'triscan.dk',
  'FERODO': 'ferodo.com', 'MINTEX': 'mintex.com', 'PAGID': 'pagid.com', 'FTE': 'fte.de',
  'UFI': 'ufifilters.com', 'FRAM': 'fram.com', 'WIX': 'wixfilters.com', 'FILTRON': 'filtron.eu',
  'KNECHT': 'mahle.com', 'AISIN': 'aisin.com', 'METZGER': 'metzger-autoteile.de', 'AL-KO': 'alko-tech.com',
  'LUCAS': 'lucaselectrical.com', 'LUCAS FILTERS': 'lucaselectrical.com', 'LYNXAUTO': 'lynxauto.com',
  'MANDO': 'mando.com', 'MASTER-SPORT': 'master-sport.de', 'MASTER-SPORT GERMANY': 'master-sport.de',
  'MEAT & DORIA': 'meat-doria.com', 'MEAT&DORIA': 'meat-doria.com', 'MECAFILTER': 'mecafilter.com',
  'MFILTER': 'mfilter.eu', 'M-FILTER': 'mfilter.eu', 'JC PREMIUM': 'jcpremium.eu',
  'PURFLUX': 'purflux.com', 'COMLINE': 'comline.uk.com', 'DENCKERMANN': 'denckermann.com',
  'JAPKO': 'japko.eu', 'ALCO FILTER': 'alcofilters.com', 'ALCO': 'alcofilters.com',
  'SCT': 'sct-germany.de', 'SCT GERMANY': 'sct-germany.de', 'SCT - MANNOL': 'sct-germany.de',
  'BORG & BECK': 'borgandbeck.com', 'FEBI BILSTEIN': 'febi.com', 'KAVO PARTS': 'kavoparts.com', 'KAVO': 'kavoparts.com',
  'BLUE PRINT ADL': 'blue-print.com', 'HELLA PAGID': 'hella.com', 'BOSCH AUTOMOTIVE': 'bosch.com',
  'MAGNETI MARELLI PARTS': 'magnetimarelli.com', 'A.B.S.': 'abs-allbrakesystems.com', 'ABS': 'abs-allbrakesystems.com',
  'STELLOX AUTOMOTIVE': 'stellox.com', 'PATRON': 'patron-parts.com', 'ZAFFO': 'zaffo.com',
  'MULLER FILTER': 'mullerfilter.com', 'MÜLLER FILTER': 'mullerfilter.com', 'SOFIMA': 'sofimafilter.com',
  'TECNOCAR': 'tecnocar.net', 'FIL FILTER': 'filfilter.com',
};
// Clearbit wurde abgeschaltet → Favicon-Dienste (keine API-Keys nötig).
// 'd' = DuckDuckGo für lange Listen (Sidebar-Filter), 'g' = Google für Karten —
// verteilt die Last, da beide Dienste bei ~60 parallelen Requests drosseln.
function getBrandLogo(brand: string, prov: 'g' | 'd' = 'g'): string | undefined {
  const domain = BRAND_DOMAINS[(brand || '').toUpperCase().trim()];
  if (!domain) return undefined;
  return prov === 'd'
    ? `https://icons.duckduckgo.com/ip3/${domain}.ico`
    : `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

const CAR_BRAND_DOMAINS: Record<string, string> = {
  'BMW': 'bmw.de', 'MERCEDES-BENZ': 'mercedes-benz.de', 'MERCEDES': 'mercedes-benz.de',
  'VOLKSWAGEN': 'volkswagen.de', 'VW': 'volkswagen.de', 'AUDI': 'audi.de',
  'PORSCHE': 'porsche.com', 'OPEL': 'opel.de', 'FORD': 'ford.de',
  'TOYOTA': 'toyota.de', 'HONDA': 'honda.de', 'NISSAN': 'nissan.de',
  'HYUNDAI': 'hyundai.de', 'KIA': 'kia.de', 'RENAULT': 'renault.de',
  'PEUGEOT': 'peugeot.de', 'CITROEN': 'citroen.de', 'FIAT': 'fiat.de',
  'SEAT': 'seat.de', 'SKODA': 'skoda.de', 'VOLVO': 'volvocars.de',
  'JAGUAR': 'jaguar.de', 'LAND ROVER': 'landrover.de', 'MINI': 'mini.de',
  'SMART': 'smart.com', 'ALFA ROMEO': 'alfaromeo.de', 'MAZDA': 'mazda.de',
  'MITSUBISHI': 'mitsubishi.de', 'SUBARU': 'subaru.de', 'SUZUKI': 'suzuki.de',
  'DAIHATSU': 'daihatsu.de', 'TESLA': 'tesla.com', 'LEXUS': 'lexus.de',
};
function getCarBrandLogo(brand: string): string | undefined {
  const key = (brand || '').toUpperCase().trim();
  const domain = CAR_BRAND_DOMAINS[key] || CAR_BRAND_DOMAINS[key.split(' ')[0]];
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : undefined;
}

const CATEGORIES = [
  { id: 'filter',    name: 'Filter',                         Icon: Filter,      color: 'from-blue-500/25 to-blue-600/10',     keywords: ['filter', 'oelfilter', 'luftfilter', 'kraftstofffilter', 'innenraumfilter'] },
  { id: 'motor',     name: 'Motor / Ausrüstung',             Icon: Settings,    color: 'from-orange-500/25 to-orange-600/10', keywords: ['motor', 'kolben', 'kurbelwelle', 'ventil', 'zylinderkopf'] },
  { id: 'radaufh',   name: 'Radaufhängung',                  Icon: Circle,      color: 'from-purple-500/25 to-purple-600/10', keywords: ['radaufhaengung', 'querlenker', 'spurstange', 'koppelstange'] },
  { id: 'schwing',   name: 'Fahrzeugschwingungsdämpfung',    Icon: Layers,      color: 'from-slate-500/25 to-slate-600/10',   keywords: ['stossdaempfer', 'federbein', 'feder', 'fahrwerk', 'daempfer'] },
  { id: 'zuendung',  name: 'Zündungs- / Glühkerzensystem',   Icon: Zap,         color: 'from-yellow-500/25 to-yellow-600/10', keywords: ['zuendkerze', 'zuendkabel', 'gluehkerze', 'zuendspule'] },
  { id: 'antrieb',   name: 'Antriebsübertragungssystem',     Icon: Wrench,      color: 'from-emerald-500/25 to-emerald-600/10', keywords: ['kupplung', 'getriebe', 'antriebswelle', 'gelenkwelle'] },
  { id: 'bremse',    name: 'Bremsanlage',                    Icon: Disc,        color: 'from-red-500/25 to-red-600/10',       keywords: ['bremse', 'bremsscheibe', 'bremsbelag', 'bremssattel'] },
  { id: 'lenkung',   name: 'Lenkungssystem',                 Icon: Navigation,  color: 'from-cyan-500/25 to-cyan-600/10',     keywords: ['lenkung', 'lenkgetriebe', 'servolenkung', 'lenksaeule'] },
  { id: 'kuehlung',  name: 'Kühlsystem',                     Icon: Thermometer, color: 'from-teal-500/25 to-teal-600/10',    keywords: ['kuehlung', 'kuehler', 'wasserpumpe', 'thermostat'] },
  { id: 'elektro',   name: 'Elektroanlage',                  Icon: Radio,       color: 'from-amber-500/25 to-amber-600/10',   keywords: ['lichtmaschine', 'anlasser', 'generator', 'sicherung', 'relais'] },
  { id: 'auspuff',   name: 'Auspuffanlage / Ansaugsystem',   Icon: Wind,        color: 'from-stone-500/25 to-stone-600/10',   keywords: ['auspuff', 'katalysator', 'auspuffrohr', 'schalldaempfer'] },
  { id: 'kraftstoff',name: 'Kraftstoffanlage',               Icon: Fuel,        color: 'from-green-500/25 to-green-600/10',   keywords: ['kraftstoff', 'einspritzung', 'kraftstoffpumpe', 'einspritzduese'] },
  { id: 'heizung',   name: 'Heizung / Klima / Lüftung',     Icon: Thermometer, color: 'from-sky-500/25 to-sky-600/10',      keywords: ['heizung', 'klimaanlage', 'geblaese', 'heizungskern'] },
  { id: 'aufbau',    name: 'Aufbau / Beleuchtung / Spiegel', Icon: Lightbulb,   color: 'from-violet-500/25 to-violet-600/10', keywords: ['scheinwerfer', 'ruecklicht', 'spiegel', 'scheibenwischer'] },
  { id: 'batterie',  name: 'Batterien und Fahrzeugstart',    Icon: Battery,     color: 'from-lime-500/25 to-lime-600/10',    keywords: ['batterie', 'starterbatterie', 'anlasser', 'fahrzeugstart'] },
  { id: 'reifen',    name: 'Reifen / Felgen / Zubehör',     Icon: Car,         color: 'from-neutral-500/25 to-neutral-600/10', keywords: ['reifen', 'felge', 'reifenventil', 'radmutter'] },
  { id: 'karosserie',name: 'Karosserie / Anbauteile',        Icon: Truck,       color: 'from-rose-500/25 to-rose-600/10',    keywords: ['karosserie', 'stossstange', 'kotfluegel', 'motorhaube'] },
  { id: 'innenraum', name: 'Innenausstattung / Zubehör',     Icon: ShoppingBag, color: 'from-pink-500/25 to-pink-600/10',    keywords: ['innenraum', 'sitz', 'fussmatten', 'innenausstattung'] },
];

// ─── Kategorie → echte TecDoc-Baumknoten (AutoPartsAPI, Namen normalisiert) ──
// L1-Namen der API: Abgasanlage, Achsantrieb, Achsaufhängung/Radführung/Räder,
// Bremsanlage, Elektrik, Federung/Dämpfung, Filter, Getriebe, Heizung/Lüftung,
// Karosserie, Klimaanlage, Kraftstoffaufbereitung, Kraftstoffförderanlage,
// Kühlung, Kupplung/-anbauteile, Lenkung, Motor, Innenausstattung, …
const CAT_ALIASES: Record<string, string[]> = {
  filter:     ['filter'],
  motor:      ['motor'],
  radaufh:    ['achsaufhaengung', 'radfuehrung', 'radaufhaengung'],
  schwing:    ['federung', 'daempfung', 'stossdaempfer'],
  zuendung:   ['zuendgluehanlage', 'zuendanlage', 'gluehanlage', 'zuendung'],
  antrieb:    ['kupplung', 'achsantrieb', 'getriebe', 'radantrieb'],
  bremse:     ['bremsanlage', 'bremse'],
  lenkung:    ['lenkung'],
  kuehlung:   ['kuehlung', 'kuehler'],
  elektro:    ['elektrik', 'elektroanlage', 'generator', 'anlasser'],
  auspuff:    ['abgasanlage', 'auspuff', 'ansaugsystem'],
  kraftstoff: ['kraftstofffoerderanlage', 'kraftstoffaufbereitung', 'kraftstoffanlage'],
  heizung:    ['heizung', 'klimaanlage', 'lueftung'],
  aufbau:     ['karosserie', 'scheibenreinigung', 'schliessanlage'],
  batterie:   ['starterbatterie', 'startanlage', 'batterie'],
  reifen:     ['raederreifen', 'raeder', 'reifen'],
  karosserie: ['karosserie'],
  innenraum:  ['innenausstattung', 'komfortsysteme', 'zubehoer'],
};

const normCat = (x: string) => x.toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .replace(/[^a-z0-9]/g, '');

/** Findet die best-passenden Baum-Knoten (erst L1, dann L2). Exakt/Präfix > enthält. */
function findCatNodes(tree: ApCategoryNode[], aliases: string[]): ApCategoryNode[] {
  const score = (n: ApCategoryNode) => {
    const nn = normCat(n.name);
    let best = 0;
    for (const a of aliases) {
      if (a.length < 4) continue;
      if (nn === a) best = Math.max(best, 3);
      else if (nn.startsWith(a)) best = Math.max(best, 2);
      else if (nn.includes(a)) best = Math.max(best, 1);
    }
    return best;
  };
  const pass = (nodes: ApCategoryNode[]) => {
    const hits = nodes.map(n => ({ n, s: score(n) })).filter(h => h.s > 0);
    const strong = hits.filter(h => h.s >= 2);
    return (strong.length ? strong : hits).map(h => h.n);
  };
  let res = pass(tree);
  if (res.length === 0) {
    // eine Ebene tiefer (z.B. "Batterie"/"Startanlage" unter "Elektrik")
    res = pass(tree.flatMap(t => t.children));
  }
  return res;
}

interface VehicleInfo {
  manufacturer?: string;
  model?: string;
  typeName?: string;
  power?: string;
  ps?: string;
  ccm?: string;
  fuel?: string;
  bodyType?: string;
  buildFrom?: string;
  buildTo?: string;
  engineCodes?: string;
  firstRegistration?: string;
  raw?: Record<string, unknown>;
}

/** "2006-11-01" → "2006/11" (IC-Format für Baujahr). */
const fmtBau = (d?: string) => (d ? d.slice(0, 7).replace('-', '/') : '');

/** Wikipedia-Suche nach einem ECHTEN Fahrzeugfoto — filtert Logos/Embleme (SVG) heraus. */
async function wikiCarThumb(q: string, lang: 'de' | 'en'): Promise<string | null> {
  try {
    const j = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=5&prop=pageimages&piprop=thumbnail&pithumbsize=480&format=json&origin=*`).then(r => r.json());
    const pages: any[] = Object.values(j?.query?.pages || {});
    pages.sort((a, b) => (a?.index ?? 9) - (b?.index ?? 9));
    const good = pages.find(p => p?.thumbnail?.source && !/\.svg|logo|badge|emblem|wordmark/i.test(String(p.thumbnail.source)));
    return good ? String(good.thumbnail.source) : null;
  } catch { return null; }
}

/** Echtes Fahrzeugfoto über die Wikipedia-API (kostenlos, keine Keys). Fallback: Markenlogo. */
function CarImage({ manufacturer, model, fallbackLogo }: { manufacturer?: string; model?: string; fallbackLogo?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    setSrc(null); setFailed(false);
    if (!manufacturer) { setFailed(true); return; }
    const q = [manufacturer, model].filter(Boolean).join(' ');
    (async () => {
      // Erst deutsche, dann englische Wikipedia (dort gibt es mehr Modell-Artikel mit Fotos)
      const u = (await wikiCarThumb(q, 'de')) || (await wikiCarThumb(q, 'en'));
      if (!alive) return;
      if (u) setSrc(u); else setFailed(true);
    })();
    return () => { alive = false; };
  }, [manufacturer, model]);
  if (src) return <img src={src} alt={[manufacturer, model].filter(Boolean).join(' ')} className="max-h-[150px] max-w-full object-contain drop-shadow-md" onError={() => { setSrc(null); setFailed(true); }} />;
  if (!failed) return <Car className="w-16 h-16 text-muted-foreground/20 animate-pulse" />;
  return fallbackLogo
    ? <img src={fallbackLogo} alt={manufacturer || ''} className="w-24 h-24 object-contain opacity-85" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
    : <Car className="w-20 h-20 text-muted-foreground/30" />;
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
  price?: number;
  priceOriginal?: number;
  availability?: string;
  deliveryDays?: number;
  source?: "intercars" | "static";
}

type Phase = 'search' | 'categories' | 'articles';
type SearchMode = 'vin' | 'kba';
const PRICE_MARKUP = 1.7;

async function postJson(url: string, payload: Record<string, unknown>, ms: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: ctrl.signal });
    if (!res.ok) throw new Error(`API-Fehler ${res.status}`);
    return await res.json();
  } finally { clearTimeout(t); }
}
const tecdoc = (p: Record<string, unknown>) => postJson("/api/tecdoc", p, 12_000);
const intercarsApi = (p: Record<string, unknown>) => postJson("/api/intercars", p, 12_000);

function parseIntercarsArticles(data: any): Article[] {
  const items: any[] = data?.articles ?? data?.results ?? (Array.isArray(data) ? data : []);
  return items.map((ic: any) => {
    const ekPrice: number | undefined = ic.price;
    const sellPrice = ekPrice != null ? Math.ceil(ekPrice * PRICE_MARKUP * 100) / 100 : undefined;
    const imgRaw = ic.images?.[0];
    const imageUrl: string | undefined = typeof imgRaw === "string" ? imgRaw : imgRaw?.url ?? imgRaw?.imageURL;
    return { id: ic.id ?? ic._sku ?? Math.random(), name: ic.name ?? "Artikel", brand: ic.brand ?? "",
      articleNumber: ic._sku ?? ic._index ?? ic.id ?? "", imageUrl, oeNumbers: ic.oemNumbers ?? [],
      specs: ic.specs ? Object.entries(ic.specs).map(([name, value]) => ({ name, value: String(value) })) : [],
      price: sellPrice, availability: ic.availability, deliveryDays: ic.deliveryDays, source: "intercars" as const };
  });
}

function apToArticle(a: ApArticle): Article {
  return { id: a.id, name: a.name, brand: a.brand, articleNumber: a.articleNumber,
    imageUrl: a.imageUrl, category: a.category, oeNumbers: a.oeNumbers, specs: a.specs, source: "static" as const };
}

function parseVehicle(data: Record<string, unknown> | null): VehicleInfo | null {
  if (!data || data.error) return null;
  const candidates: Record<string, unknown>[] = [];
  const dig = (obj: unknown) => {
    if (Array.isArray(obj)) obj.forEach(dig);
    else if (obj && typeof obj === "object") {
      const o = obj as Record<string, unknown>;
      if (o.make || o.manufacturer || o.manufacturerName) candidates.push(o);
      Object.values(o).forEach(dig);
    }
  };
  dig(data);
  const v = candidates[0] ?? data;
  const pick = (...keys: string[]) => { for (const k of keys) { const val = (v as any)[k]; if (typeof val === "string" && val) return val; if (typeof val === "number") return String(val); } return undefined; };
  const info: VehicleInfo = {
    manufacturer: pick("make", "manufacturer", "manufacturerName", "mfrName"),
    model: pick("model", "modelName"),
    typeName: pick("typeName", "type", "description"),
    power: pick("powerKW", "powerKw", "power"),
    fuel: pick("fuelType", "fuel"),
    firstRegistration: pick("firstRegistrationDate", "firstRegistration"),
    raw: data,
  };
  if (!info.manufacturer && !info.model && !info.typeName) return null;
  return info;
}

function parseArticles(data: Record<string, unknown> | null): Article[] {
  const arts = (data as any)?.articles ?? (data as any)?.data?.array ?? [];
  if (!Array.isArray(arts)) return [];
  return arts.slice(0, 50).map((a: any, i: number) => ({
    id: a.legacyArticleId ?? a.articleId ?? i,
    name: a.genericArticles?.[0]?.genericArticleDescription ?? a.articleText ?? "Artikel",
    brand: a.mfrName ?? "", articleNumber: a.articleNumber ?? "",
    imageUrl: a.images?.[0]?.imageURL200 ?? a.images?.[0]?.imageURL100,
    category: a.genericArticles?.[0]?.assemblyGroupDescription,
    oeNumbers: ((a.oeNumbers ?? []) as any[]).slice(0, 3).map((oe: any) => oe.oeNumber ?? String(oe)).filter(Boolean),
    specs: ((a.immediateAttributs ?? []) as any[]).slice(0, 5)
      .map((attr: any) => ({ name: attr.attrName ?? "", value: `${attr.attrValue ?? ""}${attr.attrUnit ?? ""}` }))
      .filter((s: any) => s.name && s.value),
  }));
}

export default function Teileportal() {
  const [phase, setPhase] = useState<Phase>('search');
  const [searchMode, setSearchMode] = useState<SearchMode>('kba');
  const [vin, setVin] = useState('');
  const [hsn, setHsn] = useState('');
  const [tsn, setTsn] = useState('');
  const tsnInputRef = useRef<HTMLInputElement>(null);
  const tsnMobileRef = useRef<HTMLInputElement>(null);
  const [vehicle, setVehicle] = useState<VehicleInfo | null>(null);
  const [vehicleKtype, setVehicleKtype] = useState<number | null>(null);
  const [vehicleVin, setVehicleVin] = useState('');
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [vehicleError, setVehicleError] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<typeof CATEGORIES[0] | null>(null);
  const [partQuery, setPartQuery] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [partsLoading, setPartsLoading] = useState(false);
  const [partsError, setPartsError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const { garage, add: addToGarage, remove: removeFromGarage } = useGarage();
  const [catTree, setCatTree] = useState<ApCategoryNode[] | null>(null);
  const [openCatId, setOpenCatId] = useState<string | null>(null);
  const [catNodes, setCatNodes] = useState<Record<string, ApCategoryNode[]>>({});
  const cart = usePartsCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [memberLevel, setMemberLevel] = useMembership();
  const [detailArticle, setDetailArticle] = useState<DetailArticle | null>(null);

  const activateGarageVehicle = (g: GarageVehicle) => {
    setVehicle({ manufacturer: g.manufacturer, model: g.model, typeName: g.typeName, power: g.power,
      ps: g.ps, ccm: g.ccm, fuel: g.fuel, bodyType: g.bodyType,
      buildFrom: g.buildFrom, buildTo: g.buildTo, engineCodes: g.engineCodes });
    // Ältere Garage-Einträge haben noch keine Detaildaten → nachladen (edge-gecacht)
    if (!g.buildFrom && g.manufacturer && g.model) {
      apEnrichVehicle({ manufacturer: g.manufacturer, model: g.model, typeName: g.typeName, vehicleId: g.ktype ?? undefined })
        .then(d => setVehicle(prev => prev && prev.model === g.model
          ? { ...prev, ps: prev.ps || d.ps, ccm: prev.ccm || d.ccm, bodyType: prev.bodyType || d.bodyType,
              buildFrom: d.buildFrom, buildTo: d.buildTo, engineCodes: d.engineCodes,
              power: prev.power || d.power, fuel: prev.fuel || d.fuel }
          : prev))
        .catch(() => {});
    }
    setVehicleKtype(g.ktype ?? null);
    setVehicleVin(g.vin || '');
    setCatTree(null); setCatNodes({}); setOpenCatId(null);
    setArticles([]); setActiveCat(null); setPhase('categories');
  };

  const openDetail = (a: DetailArticle) => {
    setDetailArticle(a);
    if (a.price == null) {
      icPriceLookup(a.articleNumber).then((live) => {
        if (!live) return;
        setDetailArticle((prev) => prev && prev.articleNumber === a.articleNumber
          ? { ...prev, price: live.price, availability: live.availability } : prev);
        setArticles((prev) => prev.map((x) => x.articleNumber === a.articleNumber
          ? { ...x, price: live.price, availability: live.availability, source: 'intercars' as const } : x));
      });
    }
  };

  const addArticleToCart = (a: { name: string; brand: string; articleNumber: string; imageUrl?: string; price?: number }) => {
    cart.add({ key: `${a.brand}::${a.articleNumber}`.toLowerCase(), name: a.name, brand: a.brand,
      articleNumber: a.articleNumber, imageUrl: a.imageUrl, price: a.price, vehicleLabel });
  };

  const vehicleLabel = vehicle ? [vehicle.manufacturer, vehicle.model, vehicle.typeName].filter(Boolean).join(' ') : '';

  const lookupVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setVehicleLoading(true);
    setVehicleError(null);
    setVehicle(null);
    setVehicleKtype(null);
    setCatTree(null); setCatNodes({}); setOpenCatId(null);
    setArticles([]);
    setActiveCat(null);
    const normVin = vin.trim().toUpperCase().replace(/\s/g,'').replace(/I/g,'1').replace(/O/g,'0').replace(/Q/g,'0');
    try {
      try {
        const veh = searchMode === 'kba'
          ? await apVehicleByKba(hsn.trim().padStart(4,'0'), tsn.trim().padStart(3,'0'))
          : await apVehicleByVin(normVin);
        if (veh) {
          setVehicle({ manufacturer: veh.manufacturer, model: veh.model, typeName: veh.typeName, power: veh.power,
            ps: veh.ps, ccm: veh.ccm, fuel: veh.fuel, bodyType: veh.bodyType,
            buildFrom: veh.buildFrom, buildTo: veh.buildTo, engineCodes: veh.engineCodes, raw: veh.raw });
          setVehicleKtype(veh.vehicleId ?? null);
          setVehicleVin(searchMode === 'vin' ? normVin : '');
          addToGarage({ label: [veh.manufacturer, veh.model, veh.typeName].filter(Boolean).join(' ').slice(0, 60),
            manufacturer: veh.manufacturer, model: veh.model, typeName: veh.typeName, power: veh.power,
            ps: veh.ps, ccm: veh.ccm, fuel: veh.fuel, bodyType: veh.bodyType,
            buildFrom: veh.buildFrom, buildTo: veh.buildTo, engineCodes: veh.engineCodes,
            vin: searchMode === 'vin' ? normVin : undefined, ktype: veh.vehicleId ?? null });
          setPhase('categories');
          setVehicleLoading(false);
          return;
        }
      } catch { /* weiter */ }
      const payload = searchMode === 'vin'
        ? { action: 'vin', vin: normVin }
        : { action: 'kba', hsn: hsn.trim().padStart(4,'0'), tsn: tsn.trim().padStart(3,'0') };
      const data = await tecdoc(payload);
      if (data?.source === 'vin_decoded' && data?.vinBrand) {
        setVehicle({ manufacturer: String(data.vinBrand), typeName: data.vinYear ? String(data.vinYear) : undefined, raw: data });
        setVehicleVin(normVin);
        setPhase('categories');
      } else {
        const info = parseVehicle(data);
        if (info) { setVehicle(info); setVehicleVin(searchMode === 'vin' ? normVin : ''); setPhase('categories'); }
        else setVehicleError(data?.error === 'kba_not_licensed'
          ? 'Schlüsselnummer-Suche nicht freigeschaltet. Ruf uns an: 0202 82690'
          : 'Fahrzeug nicht gefunden. Prüfe die Eingabe oder ruf uns an: 0202 82690');
      }
    } catch { setVehicleError('Abfrage fehlgeschlagen. Versuch es später oder ruf uns an: 0202 82690'); }
    finally { setVehicleLoading(false); }
  };

  const loadParts = async (query: string) => {
    setPartsLoading(true);
    setPartsError(null);
    setSelectedBrands(new Set());
    try {
      let parsed: Article[] = [];
      let total = 0;
      const norm = (x: string) => (x || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (vehicleKtype) {
        try { parsed = (await apArticlesForVehicle(vehicleKtype, query)).map(apToArticle); total = parsed.length; } catch {}
      }
      try {
        const icData = await intercarsApi({ action: 'search', query, limit: 48 });
        const icArts = parseIntercarsArticles(icData);
        if (parsed.length === 0) { parsed = icArts; total = icData?.totalCount ?? icArts.length; }
        else if (icArts.length > 0) {
          const icMap = new Map(icArts.map(ic => [norm(ic.articleNumber), ic]));
          parsed = parsed.map(a => { const hit = icMap.get(norm(a.articleNumber)); return hit ? { ...a, price: hit.price, availability: hit.availability, deliveryDays: hit.deliveryDays, imageUrl: a.imageUrl ?? hit.imageUrl, source: 'intercars' as const } : a; });
          const known = new Set(parsed.map(a => norm(a.articleNumber)));
          parsed = [...parsed, ...icArts.filter(ic => !known.has(norm(ic.articleNumber)))];
          total = parsed.length;
        }
      } catch {}
      if (parsed.length === 0) {
        try { parsed = (await apArticlesByNumber(query)).map(apToArticle); total = parsed.length; } catch {}
      }
      if (parsed.length === 0) {
        const tdData = await tecdoc({ action: 'search', query });
        parsed = parseArticles(tdData);
        total = (tdData as any)?.totalMatchingArticles ?? parsed.length;
      }
      parsed = sortKnownBrandsFirst(parsed);
      setArticles(parsed); setTotalCount(total);
      enrichTopWithIc(parsed);
    } catch { setPartsError('Suche fehlgeschlagen.'); }
    finally { setPartsLoading(false); }
  };

  /** Bekannte Marken (ATE, BOSCH, BREMBO …) nach oben — wie bei Inter Cars. */
  const sortKnownBrandsFirst = (arts: Article[]) =>
    [...arts].sort((a, b) => Number(!!getBrandLogo(b.brand)) - Number(!!getBrandLogo(a.brand)));

  /** Top-Artikel gestaffelt mit echten IC-Daten anreichern (UVP, Bestand, Lieferzeit). */
  const enrichTopWithIc = (arts: Article[]) => {
    arts.filter((a) => a.price == null && a.articleNumber).slice(0, 10).forEach((a, i) => {
      setTimeout(() => {
        icPriceLookup(a.articleNumber).then((live) => {
          if (!live) return;
          setArticles((prev) => prev.map((x) => x.articleNumber === a.articleNumber
            ? { ...x, price: live.price, availability: live.availability, deliveryDays: live.deliveryDays, source: 'intercars' as const }
            : x));
        }).catch(() => {});
      }, i * 400);
    });
  };

  const loadPartsByCategory = async (categoryId: number, catName: string) => {
    setPhase('articles'); setPartsLoading(true); setPartsError(null); setSelectedBrands(new Set());
    try {
      const parsed = sortKnownBrandsFirst((await apArticlesByCategory(vehicleKtype!, categoryId)).map(apToArticle));
      setArticles(parsed); setTotalCount(parsed.length);
      enrichTopWithIc(parsed);
    } catch { setPartsError('Suche fehlgeschlagen.'); }
    finally { setPartsLoading(false); }
  };

  /** Klick auf Kategorie: Unterkategorien inline auf-/zuklappen (wie Inter Cars). */
  const handleCategoryClick = async (cat: typeof CATEGORIES[0]) => {
    setPartQuery('');
    if (openCatId === cat.id) { setOpenCatId(null); return; }
    setActiveCat(cat);
    // Fahrzeugspezifischen Baum laden (falls Fahrzeug mit ktype), sonst statischen nutzen
    let tree = catTree;
    if (vehicleKtype && !tree) {
      setPartsLoading(true);
      try { tree = await apCategoryTree(vehicleKtype); if (tree.length > 0) setCatTree(tree); } catch { tree = null; }
      finally { setPartsLoading(false); }
    }
    if (!tree || tree.length === 0) tree = STATIC_CAT_TREE;
    const matches = findCatNodes(tree, CAT_ALIASES[cat.id] || []);
    const nodes = matches.length === 1 && matches[0].children.length > 0 ? matches[0].children : matches;
    if (nodes.length === 0) { setPhase('articles'); loadParts(cat.keywords[0]); return; }
    setCatNodes(prev => ({ ...prev, [cat.id]: nodes }));
    setOpenCatId(cat.id);
  };

  /** Klick auf Unterkategorie: mit Fahrzeug exakte Kategorie-Artikel, sonst Textsuche. */
  const pickSubCat = (n: ApCategoryNode) => {
    setOpenCatId(null);
    if (vehicleKtype && n.id) { loadPartsByCategory(n.id, n.name); return; }
    setPhase('articles');
    loadParts(n.name);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partQuery.trim()) return;
    setActiveCat(null); setPhase('articles');
    loadParts(partQuery.trim());
  };

  const allBrands = useMemo(() => [...new Set(articles.map(a => a.brand).filter(Boolean))].sort(), [articles]);
  const filtered = useMemo(() => selectedBrands.size > 0 ? articles.filter(a => selectedBrands.has(a.brand)) : articles, [articles, selectedBrands]);

  const inquiry = (article?: Article) => {
    const lines = ['Hallo Alex Autoshop, ich brauche ein Teil:',
      article ? `Teil: ${article.brand} ${article.name} (Art.-Nr. ${article.articleNumber})` : `Teil: ${partQuery || activeCat?.name}`,
      vehicleLabel ? `Fahrzeug: ${vehicleLabel}` : '', vehicleVin ? `FIN: ${vehicleVin}` : ''].filter(Boolean);
    return whatsappLink(lines.join('\n'));
  };

  return (
    <>
      <Seo title="Teileportal – Autoteile per Schlüsselnummer oder VIN finden"
        description="HSN/TSN oder VIN eingeben, Fahrzeug erkennen, alle passenden Autoteile mit Bild und Preis." />

      <div className="flex min-h-[calc(100vh-4rem)]">

        {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
        <aside className="w-72 shrink-0 border-r border-border bg-card/60 flex-col sticky top-0 h-screen overflow-y-auto hidden md:flex">
          <div className="p-5 border-b border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-0.5">Alex Autoshop</p>
            <h1 className="text-lg font-bold">Teileportal</h1>
          </div>

          <AnimatePresence mode="wait">
            {phase === 'search' ? (
              <motion.div key="sp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5 flex flex-col gap-4 flex-1">
                <div className="flex rounded-lg overflow-hidden border border-border">
                  {(['vin','kba'] as SearchMode[]).map(m => (
                    <button key={m} onClick={() => setSearchMode(m)}
                      className={cn('flex-1 py-2 text-xs font-semibold transition-colors', searchMode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary')}>
                      {m === 'vin' ? 'VIN / FIN' : 'Schlüsselnummer'}
                    </button>
                  ))}
                </div>
                <form onSubmit={lookupVehicle} className="flex flex-col gap-3">
                  {searchMode === 'vin' ? (
                    <div>
                      <label className="text-xs text-muted-foreground font-medium mb-1 block">VIN / Fahrgestellnummer</label>
                      <input value={vin} onChange={e => setVin(e.target.value)} placeholder="17 Zeichen" className="input-base w-full uppercase text-sm" maxLength={17} />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground font-medium mb-1 block">Herstellerschlüssel (HSN)</label>
                        <input value={hsn} onChange={e => { setHsn(e.target.value); if (e.target.value.length === 4) tsnInputRef.current?.focus(); }} placeholder="4-stellig" className="input-base w-full text-sm" maxLength={4} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground font-medium mb-1 block">Typschlüssel (TSN)</label>
                        <input ref={tsnInputRef} value={tsn} onChange={e => setTsn(e.target.value)} placeholder="3-stellig" className="input-base w-full text-sm" maxLength={3} />
                      </div>
                      <p className="text-xs text-muted-foreground">Seite 1 der Zulassungsbescheinigung</p>
                    </div>
                  )}
                  <button type="submit" disabled={vehicleLoading} className="btn-primary w-full gap-2">
                    {vehicleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Car className="w-4 h-4" />}
                    Fahrzeug suchen
                  </button>
                </form>
                {vehicleError && <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive">{vehicleError}</div>}
                <GarageList garage={garage} onPick={activateGarageVehicle} onRemove={removeFromGarage} />
                <div className="mt-auto pt-4 border-t border-border space-y-2">
                  <a href={`tel:${SHOP_INFO.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                    <Phone className="w-4 h-4" /> {SHOP_INFO.phone}
                  </a>
                  <a href={whatsappLink("Hallo, ich brauche Hilfe bei der Teilesuche.")} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                </div>
              </motion.div>
            ) : (
              <motion.div key="vp" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col flex-1">
                {/* Fahrzeugbild (echtes Foto via Wikipedia, Fallback Markenlogo) */}
                <div className="relative flex items-center justify-center bg-gradient-to-b from-secondary/60 to-secondary/20 p-3" style={{ height: 170 }}>
                  <CarImage manufacturer={vehicle?.manufacturer} model={vehicle?.model}
                    fallbackLogo={vehicle?.manufacturer ? getCarBrandLogo(vehicle.manufacturer) : undefined} />
                  <div className="absolute inset-0 bg-gradient-to-t from-card/40 to-transparent pointer-events-none" />
                </div>

                <div className="p-5 flex flex-col gap-4 flex-1">
                  <div className="divide-y divide-border/60">
                    {vehicle?.manufacturer && <p className="text-primary text-sm font-semibold flex items-center gap-0.5 cursor-default py-1.5">{vehicle.manufacturer} <ChevronRight className="w-3.5 h-3.5" /></p>}
                    {vehicle?.model && <p className="text-foreground font-bold text-base flex items-center gap-0.5 cursor-default py-1.5">{vehicle.model} <ChevronRight className="w-3.5 h-3.5" /></p>}
                    {vehicle?.typeName && (
                      <p className="text-sm flex items-center gap-0.5 cursor-default py-1.5 flex-wrap">
                        <span className="font-medium">{vehicle.typeName}</span>
                        {(vehicle.ccm || vehicle.power || vehicle.ps) && (
                          <span className="text-muted-foreground">
                            &nbsp;({[vehicle.ccm && `${vehicle.ccm} ccm`, vehicle.power && `${vehicle.power} kW`, vehicle.ps && `${vehicle.ps} PS`].filter(Boolean).join(' / ')})
                          </span>
                        )}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </p>
                    )}
                    {!vehicle && <p className="text-sm text-muted-foreground py-1.5">Kein Fahrzeug ausgewählt</p>}
                  </div>

                  <div className="rounded-lg bg-secondary/40 border border-border divide-y divide-border/60 text-xs overflow-hidden">
                    {(vehicle?.buildFrom || vehicle?.buildTo) && <div className="flex justify-between px-3 py-2"><span className="text-muted-foreground">Baujahr</span><span className="font-medium">{fmtBau(vehicle.buildFrom)} – {fmtBau(vehicle.buildTo) || 'heute'}</span></div>}
                    {!vehicle?.buildFrom && vehicle?.firstRegistration && <div className="flex justify-between px-3 py-2"><span className="text-muted-foreground">Baujahr</span><span className="font-medium">{vehicle.firstRegistration}</span></div>}
                    {vehicle?.engineCodes && <div className="flex justify-between gap-2 px-3 py-2"><span className="text-muted-foreground shrink-0">Maschinencodes</span><span className="font-medium text-right">{vehicle.engineCodes}</span></div>}
                    {vehicle?.bodyType && <div className="flex justify-between px-3 py-2"><span className="text-muted-foreground">Karosserie</span><span className="font-medium">{vehicle.bodyType}</span></div>}
                    {!vehicle?.ccm && vehicle?.power && <div className="flex justify-between px-3 py-2"><span className="text-muted-foreground">Leistung</span><span className="font-medium">{vehicle.power} kW</span></div>}
                    {vehicle?.fuel && <div className="flex justify-between px-3 py-2"><span className="text-muted-foreground">Kraftstoff</span><span className="font-medium">{vehicle.fuel}</span></div>}
                    {vehicleVin && <div className="flex justify-between px-3 py-2"><span className="text-muted-foreground">FIN</span><span className="font-mono font-medium text-[10px] truncate max-w-[130px]">{vehicleVin}</span></div>}
                  </div>

                  <div className="flex flex-col gap-2 mt-auto">
                    <button onClick={() => { setPhase('search'); setVehicle(null); setVehicleKtype(null); setCatTree(null); setCatNodes({}); setOpenCatId(null); setArticles([]); setActiveCat(null); }}
                      className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors">
                      {vehicle ? 'FAHRZEUG WECHSELN' : 'FAHRZEUG WÄHLEN'}
                    </button>
                    <a href={whatsappLink(`Fahrzeuganfrage: ${vehicleLabel}`)} target="_blank" rel="noopener noreferrer"
                      className="w-full py-2.5 rounded-lg border border-border text-sm font-medium text-center hover:bg-secondary transition-colors">
                      ZUM VOLLEN ANGEBOT
                    </a>
                  </div>

                  <div className="border-t border-border pt-3 flex gap-4">
                    <a href={`tel:${SHOP_INFO.phone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"><Phone className="w-3.5 h-3.5" /> Anruf</a>
                    <a href={whatsappLink('')} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>

        {/* ── HAUPTBEREICH ─────────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0">

          {/* Mobile Kopfzeile */}
          <div className="md:hidden border-b border-border p-4 bg-card/50 space-y-3">
            <form onSubmit={lookupVehicle} className="flex gap-2">
              {searchMode === 'vin' ? (
                <input value={vin} onChange={e => setVin(e.target.value)} placeholder="VIN eingeben" className="input-base flex-1 text-sm uppercase" maxLength={17} />
              ) : (
                <div className="flex gap-2 flex-1">
                  <input value={hsn} onChange={e => { setHsn(e.target.value); if (e.target.value.length === 4) tsnMobileRef.current?.focus(); }} placeholder="HSN" className="input-base w-20 text-sm" maxLength={4} />
                  <input ref={tsnMobileRef} value={tsn} onChange={e => setTsn(e.target.value)} placeholder="TSN" className="input-base w-20 text-sm" maxLength={3} />
                </div>
              )}
              <button type="submit" disabled={vehicleLoading} className="btn-primary px-3">
                {vehicleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Car className="w-4 h-4" />}
              </button>
            </form>
            <div className="flex gap-2">
              {(['vin','kba'] as SearchMode[]).map(m => (
                <button key={m} onClick={() => setSearchMode(m)} className={cn('px-3 py-1 rounded text-xs font-medium', searchMode === m ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground')}>
                  {m === 'vin' ? 'VIN' : 'HSN/TSN'}
                </button>
              ))}
            </div>
            {vehicle && <div className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm font-semibold text-primary">📋 {vehicleLabel}</div>}
            {vehicleError && <div className="px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">{vehicleError}</div>}
          </div>

          {/* ── CATEGORIES ───────────────────────────────────────────────── */}
          {phase === 'categories' && (
            <AnimatePresence mode="wait">
              <motion.div key="cat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-6">
                {/* Suchfeld */}
                <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-5">
                  <input value={partQuery} onChange={e => setPartQuery(e.target.value)} placeholder="Teilekategorie eingeben …" className="input-base flex-1" />
                  <button type="submit" disabled={partsLoading} className="btn-dark px-5 gap-2">
                    {partsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Suchen
                  </button>
                </form>
                {/* Tabs */}
                <div className="flex gap-0 mb-6 border-b border-border">
                  <button className="px-4 py-2.5 text-sm font-bold border-b-2 border-primary text-primary -mb-px">AFTERMARKET-TEILE</button>
                  <button disabled title="Original-Ersatzteilkatalog mit Explosionszeichnungen — kommt in Kürze"
                    className="px-4 py-2.5 text-sm font-bold text-muted-foreground/50 cursor-not-allowed inline-flex items-center gap-2 -mb-px">
                    ORIGINAL-KATALOG (OEM)
                    <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-bold">BALD</span>
                  </button>
                </div>
                {/* Kategorien mit inline aufklappbaren Unterkategorien (wie Inter Cars) */}
                <div className="md:columns-2 xl:columns-3 gap-3">
                  {CATEGORIES.map((cat, i) => {
                    const isOpen = openCatId === cat.id;
                    const nodes = catNodes[cat.id] ?? [];
                    return (
                      <motion.div key={cat.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }}
                        className="break-inside-avoid mb-3">
                        <div className={cn('rounded-xl border bg-card transition-all overflow-hidden',
                          isOpen ? 'border-primary/60 shadow-sm' : 'border-border hover:border-primary/50 hover:shadow-sm')}>
                          <button onClick={() => handleCategoryClick(cat)}
                            className="group w-full flex items-center gap-3 p-4 text-left">
                            <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 transition-transform group-hover:scale-105', cat.color)}>
                              <cat.Icon className="w-6 h-6 text-foreground/70" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold leading-tight line-clamp-2">{cat.name}</p>
                            </div>
                            <ChevronRight className={cn('w-4 h-4 text-muted-foreground/50 group-hover:text-primary shrink-0 transition-transform',
                              isOpen && 'rotate-90 text-primary')} />
                          </button>
                          <AnimatePresence>
                            {isOpen && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.18 }} className="overflow-hidden">
                                <div className="px-3 pb-3 border-t border-border/60 pt-2">
                                  <SubCatList nodes={nodes} onPick={pickSubCat} />
                                  {!vehicleKtype && (
                                    <p className="text-[11px] text-muted-foreground mt-2 px-2">
                                      Tipp: Fahrzeug wählen, um nur exakt passende Teile zu sehen.
                                    </p>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {/* ── ARTICLES ─────────────────────────────────────────────────── */}
          {phase === 'articles' && (
            <AnimatePresence mode="wait">
              <motion.div key="arts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-6">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 mb-4">
                  <button onClick={() => { setPhase('categories'); setArticles([]); setActiveCat(null); }}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Alle Teile
                  </button>
                  {activeCat && <><span className="text-muted-foreground/50">/</span><span className="text-sm font-medium">{activeCat.name}</span></>}
                </div>
                {/* Suchfeld */}
                <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-5">
                  <input value={partQuery} onChange={e => setPartQuery(e.target.value)} placeholder="Andere Kategorie oder Teilenummer …" className="input-base flex-1" />
                  <button type="submit" disabled={partsLoading} className="btn-dark px-4">
                    {partsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </button>
                </form>

                {partsLoading && (
                  <div className="flex items-center gap-3 text-muted-foreground py-16 justify-center">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Teile werden geladen …</span>
                  </div>
                )}
                {partsError && <p className="text-destructive text-sm">{partsError}</p>}

                {!partsLoading && articles.length > 0 && (
                  <div className="flex gap-5">
                    {/* Brand Filter */}
                    {allBrands.length > 1 && (
                      <BrandFilter
                        brands={allBrands.map(b => ({ name: b, count: articles.filter(a => a.brand === b).length, logo: getBrandLogo(b, 'd') }))}
                        selected={selectedBrands}
                        onToggle={(b) => { const n = new Set(selectedBrands); n.has(b) ? n.delete(b) : n.add(b); setSelectedBrands(n); }}
                        onReset={() => setSelectedBrands(new Set())}
                      />
                    )}

                    {/* Artikelliste */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                        <span className="font-bold">{activeCat ? activeCat.name : 'Suchergebnisse'}
                          <span className="text-muted-foreground font-normal text-sm ml-2">({totalCount > articles.length ? totalCount : articles.length})</span>
                        </span>
                        <div className="flex items-center gap-3">
                          <MembershipSelect level={memberLevel} onChange={setMemberLevel} />
                          {selectedBrands.size > 0 && <span className="text-sm text-muted-foreground">{filtered.length} gefiltert</span>}
                        </div>
                      </div>

                      <div className="space-y-2">
                        {filtered.map((a, aIdx) => (
                          <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="border border-border rounded-xl bg-card hover:border-primary/30 transition-all">
                            <div className="flex gap-4 p-4">
                              <div onClick={() => openDetail(a)} role="button" tabIndex={0}
                                className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 rounded-lg bg-white border border-border flex items-center justify-center overflow-hidden cursor-zoom-in p-1.5 hover:border-primary/50 transition-colors">
                                {a.imageUrl ? (
                                  <img src={a.imageUrl} alt={a.name} loading="lazy" className="w-full h-full object-contain"
                                    onError={e => { const logo = getBrandLogo(a.brand); if (logo) { (e.target as HTMLImageElement).src = logo; (e.target as HTMLImageElement).className = 'w-full h-full object-contain p-2'; } else (e.target as HTMLImageElement).style.display = 'none'; }} />
                                ) : getBrandLogo(a.brand) ? (
                                  <img src={getBrandLogo(a.brand)!} alt={a.brand} loading="lazy" className="w-full h-full object-contain p-2"
                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                ) : <Package className="w-7 h-7 text-muted-foreground" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="font-bold text-sm text-primary truncate">{a.articleNumber}</p>
                                    <p className="font-semibold text-sm leading-snug mt-0.5">{a.name}</p>
                                    {a.brand && <span className="inline-block mt-1 px-2 py-0.5 rounded bg-secondary text-xs font-bold tracking-wide uppercase">{a.brand}</span>}
                                    {a.oeNumbers && a.oeNumbers.length > 0 && <p className="text-xs text-muted-foreground mt-0.5">OE: {a.oeNumbers.join(', ')}</p>}
                                  </div>
                                  <div className="shrink-0 text-right flex flex-col items-end gap-2">
                                    {getBrandLogo(a.brand) && (
                                      <img src={getBrandLogo(a.brand)!} alt={a.brand} loading="lazy"
                                        className="h-6 max-w-[100px] object-contain"
                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                    )}
                                    {a.price != null ? (
                                      <>
                                        <DeliveryBadge deliveryDays={a.deliveryDays} availability={a.availability} />
                                        <PriceBlock price={a.price} level={memberLevel} />
                                        <button onClick={() => addArticleToCart(a)} className="btn-primary text-xs px-3 py-2 min-h-0 h-auto inline-flex items-center gap-1">
                                          <ShoppingBag className="w-3.5 h-3.5" /> In den Warenkorb
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Preis auf Anfrage</span>
                                        <DeliveryBadge />
                                        <button onClick={() => addArticleToCart(a)} className="btn-primary text-xs px-3 py-2 min-h-0 h-auto inline-flex items-center gap-1">
                                          <ShoppingBag className="w-3.5 h-3.5" /> In den Warenkorb
                                        </button>
                                        <button onClick={() => openDetail(a)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:border-primary/50 hover:text-primary transition-colors">
                                          Details ansehen
                                        </button>
                                        <a href={`tel:${SHOP_INFO.phone}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                                          <Phone className="w-3.5 h-3.5" /> {SHOP_INFO.phone}
                                        </a>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <SpecStrip articleId={a.id} specs={a.specs} auto={aIdx < 12} />
                            <ArticleExpander articleId={a.id} articleNumber={a.articleNumber} specs={a.specs} oeNumbers={a.oeNumbers}
                              onSearchNumber={(no) => { setPartQuery(no); setActiveCat(null); setPhase('articles'); loadParts(no); }} />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {!partsLoading && articles.length === 0 && !partsError && (
                  <div className="text-center py-20 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-medium">Keine Teile gefunden</p>
                    <p className="text-sm mt-1">Versuch eine andere Suchanfrage oder ruf uns an: <a href={`tel:${SHOP_INFO.phone}`} className="text-primary hover:underline">{SHOP_INFO.phone}</a></p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Search Phase (Desktop leer, zeigt Sidebar-Hinweis) */}
          {phase === 'search' && (
            <div className="hidden md:flex flex-col items-center justify-center h-full text-center p-12 text-muted-foreground">
              <Car className="w-16 h-16 mb-5 opacity-20" />
              <h2 className="text-xl font-bold mb-2 text-foreground">Fahrzeug suchen</h2>
              <p className="text-sm max-w-xs">VIN / FIN oder Schlüsselnummer (HSN/TSN) in der Seitenleiste eingeben</p>
              <button onClick={() => setPhase('categories')}
                className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:border-primary/50 hover:text-primary transition-colors">
                Katalog ohne Fahrzeug durchstöbern <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </main>
      </div>

      <PartDetailModal article={detailArticle} vehicleLabel={vehicleLabel} onClose={() => setDetailArticle(null)}
        onAddToCart={(a) => addArticleToCart(a)} brandLogo={detailArticle ? getBrandLogo(detailArticle.brand) : undefined} />
      <PartsCartButton count={cart.count} onClick={() => setCartOpen(true)} />
      <PartsCartDrawer open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} vehicleLabel={vehicleLabel} vehicleVin={vehicleVin} />
    </>
  );
}
