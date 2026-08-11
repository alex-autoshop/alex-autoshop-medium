import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Search, Car, Phone, MessageCircle, Loader2, Package, ChevronRight, ArrowLeft,
  Filter, Settings, Disc, Zap, Wind, Thermometer, Battery, Radio, Fuel,
  Wrench, Navigation, Layers, Lightbulb, Truck, Circle, ShoppingBag, Check, Hash, X,
  LogIn, UserPlus, UserCheck
} from "lucide-react";
import { Seo } from "@/components/Seo";
import { SHOP_INFO, whatsappLink } from "@/data/shopInfo";
import { cn } from "@/lib/utils";
import { apVehicleByKba, apResolveVin, apArticlesForVehicle, apArticlesByNumber, apCategoryTree, apArticlesByCategory, apEnrichVehicle, type ApArticle, type ApCategoryNode, type ApVinCandidate } from "@/lib/autoparts";
import { STATIC_CAT_TREE } from "@/lib/catTreeStatic";
import { useGarage, usePartsCart, GarageList, PartDetailModal, PartsCartButton, PartsCartDrawer, type GarageVehicle, type DetailArticle } from "@/components/TeileportalExtras";
import { icPriceLookup } from "@/lib/intercarsGateway";
import { ArticleExpander, BrandFilter, SubCatList } from "@/components/TeileportalExtras";
import { MembershipSelect, useMembership, PriceBlock, DeliveryBadge, SpecStrip, type MemberLevelId } from "@/components/TeileportalPricing";
import { useAuth } from "@/context/AuthContext";
import { OemExplosionView } from "@/components/OemExplosionView";

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
  price?: number;        // Einzelhandel / UVP — was Kunden sehen (listPriceGross)
  priceEK?: number;      // EK-Preis (customerPriceGross) — Alex's Einkaufspreis
  priceOriginal?: number; // legacy alias für priceEK
  availability?: string;
  deliveryDays?: number;
  source?: "intercars" | "static";
}

type Phase = 'search' | 'categories' | 'articles' | 'oem';
type SearchMode = 'vin' | 'kba';
type HeroTab = 'search' | 'vin' | 'kba' | 'vehicle' | 'number';
// VK = EK × 2.0 → immer unter IC-Listenpreis, Level 3 (-40%) = EK × 1.2 (noch profitabel)
const PRICE_MARKUP = 2.0;

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
    // IC gibt zurück:
    //   price         = customerPriceGross (EK-Preis inkl. MwSt, z.B. 4,50€)
    //   priceOriginal = listPriceGross (Intercars-UVP — wird NICHT verwendet)
    // UVP = EK * PRICE_MARKUP (1.5). Intercars-Listenpreis als letzter Fallback wenn kein EK.
    const ekPrice: number | undefined = ic.price > 0 ? Number(ic.price) : undefined;
    const uvpPrice: number | undefined = ekPrice != null
      ? Math.ceil(ekPrice * PRICE_MARKUP * 100) / 100
      : ic.priceOriginal != null && ic.priceOriginal > 0
        ? Number(ic.priceOriginal)
        : undefined;
    const imgRaw = ic.images?.[0];
    const imageUrl: string | undefined = typeof imgRaw === "string" ? imgRaw : imgRaw?.url ?? imgRaw?.imageURL;
    return {
      id: ic.id ?? ic._sku ?? Math.random(),
      name: ic.name ?? "Artikel",
      brand: ic.brand ?? "",
      articleNumber: ic._sku ?? ic._index ?? ic.id ?? "",
      imageUrl,
      oeNumbers: ic.oemNumbers ?? [],
      specs: ic.specs ? Object.entries(ic.specs).map(([name, value]) => ({ name, value: String(value) })) : [],
      price: uvpPrice,      // Einzelhandel — für Kunden
      priceEK: ekPrice,     // EK-Preis — für interne Anzeige
      availability: ic.availability,
      deliveryDays: ic.deliveryDays,
      source: "intercars" as const,
    };
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
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [authModal, setAuthModal] = useState<null | { name: string; brand: string; articleNumber: string; imageUrl?: string; price?: number }>(null);
  // VIN-Auflösung: Motorvarianten zur Auswahl (wenn VIN nicht exakt eine Variante trifft)
  const [vinCandidates, setVinCandidates] = useState<ApVinCandidate[]>([]);
  const [vinBase, setVinBase] = useState<{ manufacturer: string; model: string; vin: string } | null>(null);
  const [catTree, setCatTree] = useState<ApCategoryNode[] | null>(null);
  const [openCatId, setOpenCatId] = useState<string | null>(null);
  const [catNodes, setCatNodes] = useState<Record<string, ApCategoryNode[]>>({});
  const cart = usePartsCart();
  const [cartOpen, setCartOpen] = useState(false);
  // memberLevel kommt aus dem echten Supabase-Account, NICHT aus localStorage.
  // membership_level: 0=kein Mitglied, 1=L1, 2=L2, 3=L3
  const [memberLevel, setMemberLevel] = useMembership();
  const actualLevel: MemberLevelId = !user ? "none"
    : profile?.membership_level === 3 ? "L3"
    : profile?.membership_level === 2 ? "L2"
    : profile?.membership_level === 1 ? "L1"
    : "none";
  // Angezeigter Level darf nie höher als der echte Account-Level sein
  const effectiveMemberLevel: MemberLevelId = (() => {
    const order: MemberLevelId[] = ["none", "L1", "L2", "L3"];
    const actualIdx = order.indexOf(actualLevel);
    const chosenIdx = order.indexOf(memberLevel);
    return chosenIdx <= actualIdx ? memberLevel : actualLevel;
  })();
  const [detailArticle, setDetailArticle] = useState<DetailArticle | null>(null);
  const [heroTab, setHeroTab] = useState<HeroTab>('search');

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
    if (!user) {
      setAuthModal(a);
      return;
    }
    cart.add({ key: `${a.brand}::${a.articleNumber}`.toLowerCase(), name: a.name, brand: a.brand,
      articleNumber: a.articleNumber, imageUrl: a.imageUrl, price: a.price, vehicleLabel });
  };

  const addArticleAsGuest = () => {
    if (!authModal) return;
    cart.add({ key: `${authModal.brand}::${authModal.articleNumber}`.toLowerCase(), name: authModal.name,
      brand: authModal.brand, articleNumber: authModal.articleNumber, imageUrl: authModal.imageUrl,
      price: authModal.price, vehicleLabel });
    setAuthModal(null);
  };

  const vehicleLabel = vehicle ? [vehicle.manufacturer, vehicle.model, vehicle.typeName].filter(Boolean).join(' ') : '';

  /** Aufgelöstes Fahrzeug übernehmen → Garage + Kategorien-Phase. */
  const applyVehicle = (veh: ApVinCandidate, vinStr: string) => {
    setVehicle({ manufacturer: veh.manufacturer, model: veh.model, typeName: veh.typeName, power: veh.power,
      ps: veh.ps, ccm: veh.ccm, fuel: veh.fuel, bodyType: veh.bodyType,
      buildFrom: veh.buildFrom, buildTo: veh.buildTo, engineCodes: veh.engineCodes, raw: veh.raw });
    setVehicleKtype(veh.vehicleId ?? null);
    setVehicleVin(vinStr);
    addToGarage({ label: [veh.manufacturer, veh.model, veh.typeName].filter(Boolean).join(' ').slice(0, 60),
      manufacturer: veh.manufacturer, model: veh.model, typeName: veh.typeName, power: veh.power,
      ps: veh.ps, ccm: veh.ccm, fuel: veh.fuel, bodyType: veh.bodyType,
      buildFrom: veh.buildFrom, buildTo: veh.buildTo, engineCodes: veh.engineCodes,
      vin: vinStr || undefined, ktype: veh.vehicleId ?? null });
    setVinCandidates([]); setVinBase(null);
    setPhase('categories');
  };

  const lookupVehicle = async (e: React.FormEvent, modeOverride?: SearchMode) => {
    e.preventDefault();
    const mode = modeOverride ?? searchMode;
    setVehicleLoading(true);
    setVehicleError(null);
    setVehicle(null);
    setVehicleKtype(null);
    setCatTree(null); setCatNodes({}); setOpenCatId(null);
    setArticles([]);
    setActiveCat(null);
    setVinCandidates([]); setVinBase(null);
    const normVin = vin.trim().toUpperCase().replace(/\s/g,'').replace(/I/g,'1').replace(/O/g,'0').replace(/Q/g,'0');
    try {
      // ── VIN: Marke+Modell auflösen, Motorvarianten zur Auswahl anbieten ──
      if (mode === 'vin') {
        try {
          const res = await apResolveVin(normVin);
          if (res && res.candidates.length === 1) { applyVehicle(res.candidates[0], normVin); setVehicleLoading(false); return; }
          if (res && res.candidates.length > 1) {
            setVinBase({ manufacturer: res.manufacturer, model: res.model, vin: normVin });
            setVinCandidates(res.candidates);
            setVehicleLoading(false);
            return;
          }
          if (res && res.candidates.length === 0 && res.manufacturer) {
            setVehicleError(`${res.manufacturer}${res.model ? ' ' + res.model : ''} per VIN erkannt, aber keine passende TecDoc-Variante gefunden. Bitte HSN/TSN nutzen oder ruf uns an: ${SHOP_INFO.phone}`);
            setPhase('search'); setVehicleLoading(false); return;
          }
        } catch { /* weiter zu Fallback */ }
      } else {
        try {
          const veh = await apVehicleByKba(hsn.trim().padStart(4,'0'), tsn.trim().padStart(3,'0'));
          if (veh) { applyVehicle(veh as ApVinCandidate, ''); setVehicleLoading(false); return; }
        } catch { /* weiter */ }
      }
      const payload = mode === 'vin'
        ? { action: 'vin', vin: normVin }
        : { action: 'kba', hsn: hsn.trim().padStart(4,'0'), tsn: tsn.trim().padStart(3,'0') };
      const data = await tecdoc(payload);
      if (data?.source === 'vin_decoded' && data?.vinBrand) {
        setVehicle({ manufacturer: String(data.vinBrand), typeName: data.vinYear ? String(data.vinYear) : undefined, raw: data });
        setVehicleVin(normVin);
        setPhase('categories');
      } else {
        const info = parseVehicle(data);
        if (info) { setVehicle(info); setVehicleVin(mode === 'vin' ? normVin : ''); setPhase('categories'); }
        else {
          setPhase('search');
          setVehicleError(data?.error === 'kba_not_licensed'
            ? 'Schlüsselnummer-Suche nicht freigeschaltet. Ruf uns an: 0202 82690'
            : 'Fahrzeug nicht gefunden. Prüfe die Eingabe oder ruf uns an: 0202 82690');
        }
      }
    } catch { setPhase('search'); setVehicleError('Abfrage fehlgeschlagen. Versuch es später oder ruf uns an: 0202 82690'); }
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

  /** Die ERSTEN sichtbaren Artikel mit echten IC-Preisen anreichern.
   *  WICHTIG — Limit: Kategorien wie "Bremsbelag" liefern 900+ Artikel. Ohne Kappung
   *  würden pro Suche tausende IC-Requests rausgehen (Rate-Limit + langsame Seite).
   *  Nur was der Nutzer zuerst sieht wird angereichert; beim Nachladen mehr.
   *  price = UVP/Einzelhandel, priceEK = EK (customerPriceGross). */
  const IC_ENRICH_LIMIT = 24;
  const enrichTopWithIc = (arts: Article[]) => {
    const toEnrich = arts
      .filter((a) => a.price == null && a.articleNumber)
      .slice(0, IC_ENRICH_LIMIT);
    const BATCH = 5;
    toEnrich.forEach((a, i) => {
      const delay = Math.floor(i / BATCH) * 300 + (i % BATCH) * 30;
      setTimeout(() => {
        icPriceLookup(a.articleNumber).then((live) => {
          if (!live) return;
          setArticles((prev) => prev.map((x) => x.articleNumber === a.articleNumber
            ? {
                ...x,
                price: live.price,           // UVP / Einzelhandel
                priceEK: live.priceEK,       // EK-Preis
                availability: live.availability,
                deliveryDays: live.deliveryDays,
                imageUrl: x.imageUrl ?? live.imageUrl,
                source: 'intercars' as const,
              }
            : x));
        }).catch(() => {});
      }, delay);
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
  // ── Schnellfilter-States ─────────────────────────────────────────────────
  const [artSearch,    setArtSearch]    = useState('');
  const [quickFilter,  setQuickFilter]  = useState<string | null>(null);
  const [sortOrder,    setSortOrder]    = useState<'popular' | 'cheapest' | 'quality' | 'savings' | 'fast' | 'brand'>('popular');
  const [availFilter,  setAvailFilter]  = useState<'all' | 'instant' | 'fast'>('all');
  const [oemFilter,    setOemFilter]    = useState(false);

  const filtered = useMemo(() => {
    let result = selectedBrands.size > 0 ? articles.filter(a => selectedBrands.has(a.brand)) : articles;

    // Artikel-Textsuche
    if (artSearch.trim()) {
      const q = artSearch.toLowerCase();
      result = result.filter(a =>
        a.name?.toLowerCase().includes(q) ||
        a.articleNumber?.toLowerCase().includes(q) ||
        a.brand?.toLowerCase().includes(q)
      );
    }

    // Verfügbarkeits-Filter — unabhängig von Sortierung
    if (availFilter === 'instant') {
      result = result.filter(a => a.deliveryDays != null && a.deliveryDays <= 1);
    } else if (availFilter === 'fast') {
      // "Bis 3 Tage": alles was Inter Cars per Nachtsprung/Zentrallager schafft
      result = result.filter(a => a.deliveryDays != null && a.deliveryDays <= 3);
    }

    // Originalteil-Filter — unabhängig
    if (oemFilter) {
      result = result.filter(a => Array.isArray(a.oeNumbers) && a.oeNumbers.length > 0);
    }

    // Sortierung
    const sorted = [...result];
    switch (sortOrder) {
      case 'cheapest':
        sorted.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity)); break;
      case 'quality':
        // Premiummarken (mit hinterlegtem Marken-Logo) zuerst, dann günstigster Preis
        sorted.sort((a, b) => {
          const qa = getBrandLogo(a.brand) ? 1 : 0;
          const qb = getBrandLogo(b.brand) ? 1 : 0;
          if (qb !== qa) return qb - qa;
          return (a.price ?? Infinity) - (b.price ?? Infinity);
        }); break;
      case 'savings':
        sorted.sort((a, b) => {
          const savA = a.priceEK != null && a.price != null ? a.price - a.priceEK : 0;
          const savB = b.priceEK != null && b.price != null ? b.price - b.priceEK : 0;
          return savB - savA;
        }); break;
      case 'fast':
        sorted.sort((a, b) => (a.deliveryDays ?? 99) - (b.deliveryDays ?? 99)); break;
      case 'brand':
        sorted.sort((a, b) => (a.brand || '').localeCompare(b.brand || '')); break;
    }
    return sorted;
  }, [articles, selectedBrands, artSearch, quickFilter, sortOrder, availFilter, oemFilter]);

  const inquiry = (article?: Article) => {
    const lines = ['Hallo Alex Autoshop, ich brauche ein Teil:',
      article ? `Teil: ${article.brand} ${article.name} (Art.-Nr. ${article.articleNumber})` : `Teil: ${partQuery || activeCat?.name}`,
      vehicleLabel ? `Fahrzeug: ${vehicleLabel}` : '', vehicleVin ? `FIN: ${vehicleVin}` : ''].filter(Boolean);
    return whatsappLink(lines.join('\n'));
  };

  const handleSidebarCat = (cat: typeof CATEGORIES[0]) => {
    if (vehicleKtype) {
      setPhase('categories');
      handleCategoryClick(cat);
    } else {
      setActiveCat(cat);
      setPhase('articles');
      loadParts(cat.keywords[0]);
    }
  };

  return (
    <>
      {/* ── SUCH-OVERLAY (Blur + Logo beim Laden) ────────────────────────── */}
      <AnimatePresence>
        {(partsLoading || vehicleLoading) && (
          <motion.div
            key="search-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9998] flex items-center justify-center"
            style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", backgroundColor: "rgba(10,10,10,0.55)" }}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center gap-4"
            >
              <img
                src="/images/logo-cropped.png"
                alt="Alex Autoshop"
                className="w-28 sm:w-36"
                style={{ animation: "aa-pulse 1.4s ease-in-out infinite" }}
              />
              <span className="text-xs text-white/50 tracking-widest uppercase font-medium">Wird geladen …</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Seo title="Teilebörse – Autoteile per Schlüsselnummer oder VIN finden"
        description="HSN/TSN oder VIN eingeben, Fahrzeug erkennen, alle passenden Autoteile mit Bild und Preis." />

      <div className="min-h-screen lg:flex">

        {/* ── KATEGORIE-LEISTE (Desktop: linke Sidebar, immer sichtbar) ────── */}
        <aside className="hidden lg:flex flex-col w-52 xl:w-56 shrink-0 border-r border-border bg-card/60 sticky top-0 h-screen overflow-y-auto z-20">
          <div className="px-4 py-3.5 border-b border-border flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Kategorien</span>
          </div>
          <nav className="flex-1 p-2 space-y-0.5 py-3">
            {CATEGORIES.map((cat) => {
              const isActive = activeCat?.id === cat.id;
              const isOpen = openCatId === cat.id;
              const nodes = catNodes[cat.id] ?? [];
              return (
                <div key={cat.id}>
                  <button
                    onClick={() => handleCategoryClick(cat)}
                    className={cn(
                      "group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all duration-150",
                      isActive || isOpen
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-md bg-gradient-to-br flex items-center justify-center shrink-0 ring-1 ring-border/50 transition-transform group-hover:scale-105",
                      cat.color,
                      isOpen && "scale-110"
                    )}>
                      <cat.Icon className="w-3 h-3 text-foreground/80" />
                    </div>
                    <span className="flex-1 text-xs font-medium leading-tight line-clamp-2">
                      {cat.name.split(' / ')[0]}
                    </span>
                    <ChevronRight className={cn(
                      "w-3.5 h-3.5 shrink-0 transition-transform text-muted-foreground/60",
                      isOpen && "rotate-90 text-primary"
                    )} />
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }} className="overflow-hidden"
                      >
                        <div className="pl-1 py-1">
                          {nodes.length > 0 ? (
                            <SubCatList nodes={nodes} onPick={pickSubCat} />
                          ) : (
                            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-2 py-1">
                              {partsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                              {partsLoading ? "Lädt …" : "Keine Unterkategorien"}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>
          {/* Kontakt am unteren Rand */}
          <div className="p-3 border-t border-border space-y-1.5">
            <a href={`tel:${SHOP_INFO.phone}`}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors">
              <Phone className="w-3 h-3" /> {SHOP_INFO.phone}
            </a>
            <a href={whatsappLink("Hallo, ich brauche Hilfe bei der Teilesuche.")}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors">
              <MessageCircle className="w-3 h-3" /> WhatsApp
            </a>
          </div>
        </aside>

        {/* ── HAUPTINHALT + Mobile-Leiste ──────────────────────────────────── */}
        <div className="flex-1 min-w-0">


        {/* ── HERO (Suchphase) ───────────────────────────────────────────── */}
        {phase === 'search' && (
          <section className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none" />

            <div className="relative max-w-5xl mx-auto px-6 pt-8 md:pt-14 pb-6 text-center">

              {/* Pill Badge */}
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card/80 backdrop-blur text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Alex Autoshop · Teilebörse
                <span className="px-2 py-0.5 rounded bg-amber-500 text-black text-xs font-black tracking-wider">BETA</span>
              </motion.div>

              {/* Headline */}
              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-3">
                Über 5 Mio.<br />
                <span className="text-primary">KFZ-Teile</span> finden.
              </motion.h1>

              {/* Subtitle */}
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto mb-4 leading-relaxed">
                Per VIN, Schlüsselnummer oder Freitextsuche — Originalteile, Premium-Marken
                und Budget-Alternativen auf einer Plattform.
              </motion.p>

              {/* Feature Badges */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                className="flex flex-wrap justify-center gap-2 mb-5">
                {['5 Mio. Teile', 'Intercars & TecDoc', 'B2B-Preise ab Level 1', 'Next-Day Lieferung'].map(b => (
                  <span key={b} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
                    <Check className="w-3.5 h-3.5" /> {b}
                  </span>
                ))}
              </motion.div>

              {/* Search Card */}
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                className="bg-card border border-border rounded-2xl shadow-xl max-w-3xl mx-auto overflow-hidden">

                {/* Tab bar */}
                <div className="flex border-b border-border px-1 pt-3">
                  {([
                    { id: 'search' as HeroTab, label: 'Suche', mobileLabel: 'Suche', Icon: Search },
                    { id: 'vin' as HeroTab, label: 'VIN / FIN', mobileLabel: 'VIN', Icon: Hash },
                    { id: 'kba' as HeroTab, label: 'HSN / TSN', mobileLabel: 'HSN/TSN', Icon: Wrench },
                    { id: 'vehicle' as HeroTab, label: 'Meine Fahrzeuge', mobileLabel: 'Garage', Icon: Car },
                  ]).map(({ id, label, mobileLabel, Icon }) => (
                    <button key={id} onClick={() => setHeroTab(id)}
                      className={cn('flex-1 flex items-center justify-center gap-1 px-1 py-2.5 text-xs sm:text-sm font-semibold transition-colors border-b-2 -mb-px',
                        heroTab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                      <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                      <span className="sm:hidden">{mobileLabel}</span>
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="p-5">
                  <AnimatePresence mode="wait">
                    {heroTab === 'search' && (
                      <motion.form key="hs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onSubmit={handleSearchSubmit} className="flex gap-2">
                        <input value={partQuery} onChange={e => setPartQuery(e.target.value)}
                          placeholder="Teile oder Teilenummer suchen (z.B. Bremsbeläge, 1J0615301D)"
                          className="input-base flex-1 h-12 text-base" autoFocus />
                        <button type="submit" disabled={partsLoading} className="btn-primary px-6 h-12 gap-2 shrink-0">
                          {partsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                          Suchen
                        </button>
                      </motion.form>
                    )}

                    {heroTab === 'vin' && (
                      <motion.form key="hv" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onSubmit={(e) => lookupVehicle(e, 'vin')} className="flex gap-2">
                        <input value={vin} onChange={e => setVin(e.target.value)}
                          placeholder="VIN / Fahrgestellnummer (17 Zeichen)"
                          className="input-base flex-1 h-12 text-base uppercase font-mono tracking-wider" maxLength={17} autoFocus />
                        <button type="submit" disabled={vehicleLoading} className="btn-primary px-6 h-12 gap-2 shrink-0">
                          {vehicleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Car className="w-4 h-4" />}
                          Suchen
                        </button>
                      </motion.form>
                    )}

                    {heroTab === 'kba' && (
                      <motion.form key="hk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onSubmit={(e) => lookupVehicle(e, 'kba')} className="space-y-3">
                        <div className="flex gap-3 items-end">
                          <div className="flex-1">
                            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Herstellerschlüssel (HSN)</label>
                            <input value={hsn} onChange={e => { setHsn(e.target.value); if (e.target.value.length === 4) tsnInputRef.current?.focus(); }}
                              placeholder="4-stellig" className="input-base w-full h-11" maxLength={4} autoFocus />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Typschlüssel (TSN)</label>
                            <input ref={tsnInputRef} value={tsn} onChange={e => setTsn(e.target.value)}
                              placeholder="3-stellig" className="input-base w-full h-11" maxLength={3} />
                          </div>
                          <button type="submit" disabled={vehicleLoading} className="btn-primary px-5 h-11 gap-2 shrink-0">
                            {vehicleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Car className="w-4 h-4" />}
                            Suchen
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">Seite 1 der Zulassungsbescheinigung — Zeile 2.1 = HSN, Zeile 2.2 = TSN</p>
                      </motion.form>
                    )}

                    {heroTab === 'vehicle' && (
                      <motion.div key="hgar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {garage.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Car className="w-10 h-10 mx-auto mb-3 opacity-20" />
                            <p className="text-sm font-medium">Noch keine Fahrzeuge gespeichert</p>
                            <p className="text-xs mt-1">Fahrzeug per VIN oder HSN/TSN suchen — wir merken es uns automatisch.</p>
                          </div>
                        ) : (
                          <GarageList garage={garage} onPick={activateGarageVehicle} onRemove={removeFromGarage} />
                        )}
                      </motion.div>
                    )}

                  </AnimatePresence>

                  {vehicleError && (
                    <div className="mt-3 rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive">{vehicleError}</div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* ── OEM TEASER ────────────────────────────────────────────────── */}
            <div className="max-w-5xl mx-auto px-6 pb-6">
              <button
                onClick={() => setPhase('oem')}
                className="w-full rounded-2xl border-2 border-primary/60 bg-primary/10 p-5 sm:p-6 flex items-center gap-4 text-left hover:border-primary hover:bg-primary/15 transition-all group shadow-sm"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/20 border-2 border-primary/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Layers className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-bold">OEM Original-Katalog</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500 text-black text-[10px] font-black">PREVIEW</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Explosionszeichnungen + OE-Nummern direkt in der Teilebörse — Vorschau anzeigen.
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-primary/60 group-hover:text-primary shrink-0 transition-colors" />
              </button>
            </div>

            {/* ── HINWEIS: Gespeicherte Fahrzeuge (Kategorien links in der Sidebar) ── */}
            <div className="max-w-5xl mx-auto px-6 pb-16">
              <div className="max-w-2xl mx-auto rounded-2xl border-2 border-primary/50 bg-primary/8 p-6 sm:p-8 text-center shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 border-2 border-primary/40 flex items-center justify-center mx-auto mb-4">
                  <Car className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-1.5">Deine Fahrzeuge — immer griffbereit</h3>
                <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-5">
                  {user
                    ? (garage.length > 0
                        ? `Du hast ${garage.length} Fahrzeug${garage.length === 1 ? '' : 'e'} gespeichert — ruf sie mit einem Klick ab und finde sofort passende Teile.`
                        : 'Angemeldet: Sobald du ein Fahrzeug per VIN oder HSN/TSN suchst, merken wir es uns automatisch — jederzeit wieder abrufbar.')
                    : 'Melde dich an, um deine eingegebenen Fahrzeuge dauerhaft zu speichern und mit einem Klick wieder abzurufen — samt passender Teile.'}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    onClick={() => { setHeroTab('vehicle'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="btn-primary px-5 h-11 gap-2">
                    <Car className="w-4 h-4" /> Meine Fahrzeuge{garage.length > 0 ? ` (${garage.length})` : ''}
                  </button>
                  {!user && (
                    <a href="/konto" className="btn-outline px-5 h-11 inline-flex items-center justify-center gap-2">
                      Anmelden
                    </a>
                  )}
                </div>
              </div>

              {/* Contact links */}
              <div className="flex justify-center gap-6 mt-10 pt-6 border-t border-border/50">
                <a href={`tel:${SHOP_INFO.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <Phone className="w-4 h-4" /> {SHOP_INFO.phone}
                </a>
                <a href={whatsappLink("Hallo, ich brauche Hilfe bei der Teilesuche.")} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
              </div>
            </div>
          </section>
        )}

        {/* ── FAHRZEUG-LEISTE (categories / articles phase) ────────────── */}
        {phase !== 'search' && (
          <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3 min-w-0">
              <button
                onClick={() => { setPhase('search'); setVehicle(null); setVehicleKtype(null); setCatTree(null); setCatNodes({}); setOpenCatId(null); setArticles([]); setActiveCat(null); }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors shrink-0">
                <ArrowLeft className="w-4 h-4" />
                Teileportal
              </button>
              {vehicle ? (
                <>
                  <span className="text-muted-foreground/30 shrink-0">|</span>
                  <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                    {vehicle.manufacturer && getCarBrandLogo(vehicle.manufacturer) && (
                      <img src={getCarBrandLogo(vehicle.manufacturer)!} alt={vehicle.manufacturer}
                        className="h-5 w-5 object-contain shrink-0"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    )}
                    <span className="text-sm font-semibold truncate">{vehicleLabel}</span>
                    {(vehicle.buildFrom || vehicle.buildTo) && (
                      <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
                        ({fmtBau(vehicle.buildFrom)} – {fmtBau(vehicle.buildTo) || 'heute'})
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => { setPhase('search'); setVehicle(null); setVehicleKtype(null); setCatTree(null); setCatNodes({}); setOpenCatId(null); setArticles([]); setActiveCat(null); }}
                    className="shrink-0 text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded border border-border/60 hover:border-destructive/30">
                    Wechseln
                  </button>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Kein Fahrzeug — alle Teile</span>
              )}
              <div className="ml-auto flex items-center gap-4 shrink-0">
                <a href={`tel:${SHOP_INFO.phone}`} className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                  <Phone className="w-3.5 h-3.5" /> {SHOP_INFO.phone}
                </a>
                <a href={whatsappLink(vehicleLabel ? `Fahrzeuganfrage: ${vehicleLabel}` : 'Hallo, ich brauche Hilfe.')} target="_blank" rel="noopener noreferrer"
                  className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ── CATEGORIES ───────────────────────────────────────────────── */}
        {phase === 'categories' && (
          <AnimatePresence mode="wait">
            <motion.div key="cat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="max-w-7xl mx-auto px-6 py-8">
              {/* Suchfeld */}
              <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-8 max-w-2xl">
                <input value={partQuery} onChange={e => setPartQuery(e.target.value)} placeholder="Teilekategorie oder Stichwort eingeben …" className="input-base flex-1" />
                <button type="submit" disabled={partsLoading} className="btn-dark px-5 gap-2">
                  {partsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Suchen
                </button>
              </form>
              {/* Tabs */}
              <div className="flex gap-0 mb-6 border-b border-border">
                <button className="px-4 py-2.5 text-sm font-bold border-b-2 border-primary text-primary -mb-px">AFTERMARKET-TEILE</button>
                <button
                  onClick={() => setPhase('oem')}
                  className="px-4 py-2.5 text-sm font-bold text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2 -mb-px border-b-2 border-transparent hover:border-primary/40">
                  ORIGINAL-KATALOG (OEM)
                  <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-bold">PREVIEW</span>
                </button>
              </div>
              {/* Kategorien */}
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
            <motion.div key="arts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="max-w-7xl mx-auto px-6 py-6">
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
                  {allBrands.length > 1 && (
                    <BrandFilter
                      brands={allBrands.map(b => ({ name: b, count: articles.filter(a => a.brand === b).length, logo: getBrandLogo(b, 'd') }))}
                      selected={selectedBrands}
                      onToggle={(b) => { const n = new Set(selectedBrands); n.has(b) ? n.delete(b) : n.add(b); setSelectedBrands(n); }}
                      onReset={() => setSelectedBrands(new Set())}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                      <span className="font-bold">{activeCat ? activeCat.name : 'Suchergebnisse'}
                        <span className="text-muted-foreground font-normal text-sm ml-2">({totalCount > articles.length ? totalCount : articles.length})</span>
                      </span>
                      <div className="flex items-center gap-3">
                        {actualLevel !== "none" && (
                          <MembershipSelect level={effectiveMemberLevel} onChange={setMemberLevel} />
                        )}
                        {selectedBrands.size > 0 && <span className="text-sm text-muted-foreground">{filtered.length} gefiltert</span>}
                      </div>
                    </div>
                    {/* ── SCHNELLFILTER + FILTER-BAR ─────────────────────── */}
                    <div className="mb-4 rounded-xl border border-border bg-card/60 overflow-hidden">
                      {/* Schnellfilter-Chips */}
                      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 shrink-0 mr-1">Schnellfilter</span>
                        {[
                          { id: 'instant',  label: 'Sofort lieferbar', icon: '📦' },
                          { id: 'fast',     label: 'Bis 3 Tage',       icon: '🚚' },
                          { id: 'cheapest', label: 'Günstigste',        icon: '⚡' },
                          { id: 'quality',  label: 'Qualität',          icon: '★' },
                          { id: 'oem',      label: 'Originalteil',      icon: '✓' },
                        ].map(f => {
                          // Jeder Chip hat seinen eigenen State — können gleichzeitig aktiv sein
                          const isActive =
                            f.id === 'instant'  ? availFilter === 'instant' :
                            f.id === 'fast'     ? availFilter === 'fast' :
                            f.id === 'oem'      ? oemFilter :
                            sortOrder === f.id;
                          return (
                            <button
                              key={f.id}
                              onClick={() => {
                                if (f.id === 'instant') {
                                  setAvailFilter(prev => prev === 'instant' ? 'all' : 'instant');
                                } else if (f.id === 'fast') {
                                  setAvailFilter(prev => prev === 'fast' ? 'all' : 'fast');
                                } else if (f.id === 'oem') {
                                  setOemFilter(prev => !prev);
                                } else {
                                  setSortOrder(prev => (prev as string) === f.id ? 'popular' : f.id as typeof sortOrder);
                                }
                              }}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all",
                                isActive
                                  ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
                                  : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                              )}
                            >
                              <span>{f.icon}</span> {f.label}
                            </button>
                          );
                        })}
                        {(oemFilter || sortOrder !== 'popular' || availFilter !== 'all' || artSearch) && (
                          <button onClick={() => { setQuickFilter(null); setSortOrder('popular'); setAvailFilter('all'); setArtSearch(''); setOemFilter(false); }}
                            className="ml-auto text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                            <X className="w-3 h-3" /> Zurücksetzen
                          </button>
                        )}
                      </div>

                      {/* Filter-Row: Suche + Dropdowns */}
                      <div className="flex items-center gap-2 px-4 py-2.5 flex-wrap">
                        {/* Artikel-Textsuche */}
                        <div className="relative flex-1 min-w-[160px] max-w-xs">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <input
                            value={artSearch}
                            onChange={e => setArtSearch(e.target.value)}
                            placeholder="Produkt suchen ..."
                            className="input-base pl-8 h-8 text-xs"
                          />
                        </div>

                        {/* Marke Dropdown */}
                        {allBrands.length > 1 && (
                          <select
                            value={[...selectedBrands][0] || ''}
                            onChange={e => {
                              if (e.target.value) {
                                setSelectedBrands(new Set([e.target.value]));
                              } else {
                                setSelectedBrands(new Set());
                              }
                            }}
                            className="h-8 rounded-lg border border-border bg-card px-2 py-0 text-xs font-medium"
                          >
                            <option value="">Marke</option>
                            {allBrands.map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                        )}

                        {/* Verfügbarkeit Dropdown */}
                        <select
                          value={availFilter}
                          onChange={e => setAvailFilter(e.target.value as typeof availFilter)}
                          className="h-8 rounded-lg border border-border bg-card px-2 py-0 text-xs font-medium"
                        >
                          <option value="all">Verfügbarkeit</option>
                          <option value="instant">Sofort (1 Werktag)</option>
                          <option value="fast">Schnell (≤ 2 Tage)</option>
                        </select>

                        {/* Sortierung */}
                        <select
                          value={sortOrder}
                          onChange={e => setSortOrder(e.target.value as typeof sortOrder)}
                          className="h-8 rounded-lg border border-border bg-card px-2 py-0 text-xs font-medium ml-auto"
                        >
                          <option value="popular">↕ Beliebt</option>
                          <option value="cheapest">↕ Günstigste</option>
                          <option value="savings">↕ Max. Ersparnis</option>
                          <option value="fast">↕ Schnellste Lieferung</option>
                          <option value="brand">↕ Marke A–Z</option>
                        </select>

                        {/* Ergebnis-Zähler */}
                        {filtered.length < articles.length && (
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                            {filtered.length} von {articles.length}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* IC-Style Tabellen-Header — Desktop */}
                    <div className="hidden lg:grid grid-cols-[56px_1fr_90px_180px_200px] gap-4 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60 border-b border-border/60 mb-1">
                      <span></span>
                      <span>Produkt / Artikelnummer</span>
                      <span className="text-center">Hersteller</span>
                      <span>Lieferung</span>
                      <span className="text-right">Preis (inkl. MwSt.)</span>
                    </div>

                    <div className="space-y-1.5">
                      {filtered.map((a, aIdx) => (
                        <motion.div key={a.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(aIdx * 0.03, 0.3) }}
                          className="border border-border rounded-xl bg-card hover:border-primary/40 hover:bg-card/80 transition-all duration-150 overflow-hidden group">

                          {/* ── Haupt-Zeile ── */}
                          <div className="flex items-center gap-3 px-3 py-3 lg:grid lg:grid-cols-[56px_1fr_90px_180px_200px] lg:gap-4 lg:px-4 lg:py-3.5">

                            {/* Bild — 56×56, kompakt wie IC */}
                            <div onClick={() => openDetail(a)} role="button" tabIndex={0}
                              className="w-14 h-14 shrink-0 rounded-lg bg-white border border-border/60 flex items-center justify-center overflow-hidden cursor-zoom-in p-1 hover:border-primary/50 transition-colors">
                              {a.imageUrl ? (
                                <img src={a.imageUrl} alt={a.name} loading="lazy" className="w-full h-full object-contain"
                                  onError={e => { const logo = getBrandLogo(a.brand); if (logo) { (e.target as HTMLImageElement).src = logo; (e.target as HTMLImageElement).className = 'w-full h-full object-contain p-1.5 opacity-70'; } else (e.target as HTMLImageElement).style.display = 'none'; }} />
                              ) : getBrandLogo(a.brand) ? (
                                <img src={getBrandLogo(a.brand)!} alt={a.brand} loading="lazy" className="w-full h-full object-contain p-1.5 opacity-70"
                                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              ) : <Package className="w-5 h-5 text-muted-foreground/40" />}
                            </div>

                            {/* Artikel-Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-primary">{a.articleNumber}</span>
                                {a.brand && (
                                  <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-secondary/80 text-secondary-foreground/80 uppercase tracking-wide">
                                    {a.brand}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-medium leading-snug text-foreground/90 truncate mt-0.5">{a.name}</p>
                              {a.oeNumbers && a.oeNumbers.length > 0 && (
                                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">OE: {a.oeNumbers.slice(0, 3).join(' · ')}</p>
                              )}
                            </div>

                            {/* Brand-Logo — Desktop-Spalte */}
                            <div className="hidden lg:flex items-center justify-center">
                              {getBrandLogo(a.brand) ? (
                                <img src={getBrandLogo(a.brand)!} alt={a.brand} loading="lazy"
                                  className="max-h-7 max-w-[72px] w-auto object-contain opacity-80"
                                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              ) : (
                                <span className="text-[10px] text-muted-foreground/60 font-medium text-center">{a.brand}</span>
                              )}
                            </div>

                            {/* Lieferung — Desktop-Spalte, Mobile: hidden */}
                            <div className="hidden lg:block">
                              <DeliveryBadge deliveryDays={a.deliveryDays} availability={a.availability} />
                            </div>

                            {/* Preise + Warenkorb */}
                            <div className="shrink-0 ml-auto lg:ml-0 flex flex-col items-end gap-1.5">
                              {a.price != null ? (
                                <>
                                  {/* Mobile: kompakte Lieferung */}
                                  <div className="lg:hidden">
                                    {a.deliveryDays != null && (
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                                        a.deliveryDays <= 1 ? 'bg-green-500 text-white' : 'bg-amber-400 text-amber-900'
                                      }`}>
                                        {a.deliveryDays <= 1 ? '1 Werktag' : `${a.deliveryDays} Werktage`}
                                      </span>
                                    )}
                                  </div>
                                  <PriceBlock price={a.price} priceEK={a.priceEK} level={effectiveMemberLevel} />
                                  <button onClick={() => addArticleToCart(a)}
                                    className="btn-primary text-xs px-3 py-1.5 min-h-0 h-auto inline-flex items-center gap-1.5 mt-0.5">
                                    <ShoppingBag className="w-3.5 h-3.5" /> Warenkorb
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/50">
                                    Preis auf Anfrage
                                  </span>
                                  <div className="flex gap-1.5 mt-1">
                                    <button onClick={() => addArticleToCart(a)}
                                      className="btn-primary text-xs px-2.5 py-1.5 min-h-0 h-auto inline-flex items-center gap-1">
                                      <ShoppingBag className="w-3.5 h-3.5" /> Anfragen
                                    </button>
                                    <button onClick={() => openDetail(a)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium hover:border-primary/50 hover:text-primary transition-colors">
                                      Details
                                    </button>
                                  </div>
                                  <a href={`tel:${SHOP_INFO.phone}`}
                                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors mt-0.5">
                                    <Phone className="w-3 h-3" /> {SHOP_INFO.phone}
                                  </a>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Spec-Zeile */}
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

        {/* ── OEM EXPLOSIONSKATALOG ────────────────────────────── */}
        {phase === 'oem' && (
          <OemExplosionView
            vehicle={vehicle}
            vehicleKtype={vehicleKtype}
            vehicleVin={vehicleVin}
            onBack={() => setPhase(vehicle ? 'categories' : 'search')}
          />
        )}

        </div>{/* end flex-1 main content */}
      </div>{/* end lg:flex wrapper */}

      <PartDetailModal article={detailArticle} vehicleLabel={vehicleLabel} onClose={() => setDetailArticle(null)}
        onAddToCart={(a) => addArticleToCart(a)} brandLogo={detailArticle ? getBrandLogo(detailArticle.brand) : undefined} />
      <PartsCartButton count={cart.count} onClick={() => setCartOpen(true)} />
      <PartsCartDrawer open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} vehicleLabel={vehicleLabel} vehicleVin={vehicleVin} />

      {/* ── VIN-Variantenauswahl ─────────────────────────────────── */}
      {vinCandidates.length > 0 && vinBase && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-night/60 backdrop-blur-sm p-0 sm:p-6"
          onClick={() => { setVinCandidates([]); setVinBase(null); }}>
          <div className="bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl border border-border shadow-xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-border">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-primary">VIN erkannt</p>
                  <h3 className="text-lg font-bold leading-tight">{vinBase.manufacturer} {vinBase.model}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Wähle deine genaue Motorvariante für exakt passende Teile.</p>
                </div>
                <button onClick={() => { setVinCandidates([]); setVinBase(null); }}
                  className="shrink-0 w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto p-2">
              {vinCandidates.map((c) => (
                <button key={c.vehicleId}
                  onClick={() => applyVehicle(c, vinBase.vin)}
                  className="w-full text-left px-3 py-3 rounded-xl hover:bg-primary/5 border border-transparent hover:border-primary/40 transition-colors flex items-center gap-3 min-h-[56px]">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight">{c.typeName || c.modelName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[c.modelName, [c.ps && `${c.ps} PS`, c.ccm && `${c.ccm} ccm`, c.fuel].filter(Boolean).join(' · ')].filter(Boolean).join(' — ')}
                    </p>
                    {(c.buildFrom || c.buildTo) && (
                      <p className="text-[11px] text-muted-foreground/70">{fmtBau(c.buildFrom)} – {fmtBau(c.buildTo) || 'heute'}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                </button>
              ))}
            </div>
            <div className="p-3 border-t border-border text-center">
              <p className="text-[11px] text-muted-foreground">Nicht dabei? <a href={`tel:${SHOP_INFO.phone}`} className="text-primary font-medium">{SHOP_INFO.phone} anrufen</a></p>
            </div>
          </div>
        </div>
      )}

      {/* ── Auth-Modal: Anmelden / Registrieren / Als Gast bestellen ── */}
      <AnimatePresence>
        {authModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center px-4"
            style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
            onClick={() => setAuthModal(null)}
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="w-full max-w-[360px] bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 pt-6 pb-4 text-center">
                <img src="/images/logo-cropped.png" alt="Alex Autoshop" className="h-9 mx-auto mb-4" />
                <h2 className="text-lg font-bold text-white mb-1">Zum Bestellen anmelden</h2>
                <p className="text-sm text-white/50 leading-snug">
                  Du bestellst: <span className="text-white/80 font-medium">{authModal.name}</span>
                </p>
              </div>
              <div className="px-6 pb-6 flex flex-col gap-2.5">
                <Link
                  to="/konto"
                  state={{ from: "/teileboerse" }}
                  className="flex items-center justify-center gap-2 w-full bg-gold-bright text-night font-bold py-3 rounded-xl hover:brightness-95 active:scale-[0.98] transition-all text-[15px]"
                >
                  <LogIn className="w-4 h-4" /> Anmelden
                </Link>
                <Link
                  to="/konto"
                  state={{ from: "/teileboerse", tab: "register" }}
                  className="flex items-center justify-center gap-2 w-full bg-white/10 text-white font-semibold py-3 rounded-xl hover:bg-white/15 active:scale-[0.98] transition-all text-[15px] border border-white/10"
                >
                  <UserPlus className="w-4 h-4" /> Konto erstellen
                </Link>
                <button
                  onClick={addArticleAsGuest}
                  className="flex items-center justify-center gap-2 w-full bg-transparent text-white/60 font-medium py-3 rounded-xl hover:text-white/90 hover:bg-white/5 active:scale-[0.98] transition-all text-[14px] border border-white/10"
                >
                  <UserCheck className="w-4 h-4" /> Als Gast bestellen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
