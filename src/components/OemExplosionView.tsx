/**
 * OEM Baugruppen-Katalog — echte TecDoc-Daten via apCategoryTree + apArticlesByCategory
 * Zeigt echte Baugruppen für das gewählte Fahrzeug, echte Artikel pro Baugruppe.
 * Partslink24 / TecRMI-Explosionsbilder kommen wenn API aktiv — UI ist schon fertig.
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Sparkles, Phone, MessageCircle, ChevronRight,
  Settings, Disc, Zap, Wind, Thermometer, Battery, Radio, Fuel,
  Wrench, Navigation, Layers, Lightbulb, Car, Circle, Cpu,
  Loader2, AlertCircle, ShoppingCart, ExternalLink, Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SHOP_INFO, whatsappLink } from "@/data/shopInfo";
import {
  apCategoryTree, apArticlesByCategory,
  type ApCategoryNode, type ApArticle,
} from "@/lib/autoparts";
import type { LucideIcon } from "lucide-react";

// ─── Keyword → SVG Position Mapping ──────────────────────────────────────────
interface HotspotMeta { cx: number; cy: number; Icon: LucideIcon }

const KEYWORD_HOTSPOTS: Array<{ kw: string[]; meta: HotspotMeta }> = [
  { kw: ['motor', 'engine', 'trieb', 'verbren', 'zylind', 'kolb'],     meta: { cx: 150, cy: 106, Icon: Settings } },
  { kw: ['getriebe', 'kupplung', 'transmission', 'antrieb'],            meta: { cx: 150, cy: 187, Icon: Wrench   } },
  { kw: ['bremse', 'brems', 'brake', 'schei', 'belag'],                 meta: { cx: 70,  cy: 248, Icon: Disc     } },
  { kw: ['vorderachs', 'querlenk', 'radnabe vorn'],                     meta: { cx: 100, cy: 145, Icon: Circle   } },
  { kw: ['hinterachs', 'radnabe hint'],                                  meta: { cx: 100, cy: 352, Icon: Circle   } },
  { kw: ['lenkung', 'lenk', 'steering'],                                 meta: { cx: 126, cy: 138, Icon: Navigation } },
  { kw: ['kraftstoff', 'einspritz', 'vergaser', 'fuel'],                 meta: { cx: 174, cy: 308, Icon: Fuel     } },
  { kw: ['elektrik', 'elektro', 'electric', 'zündung', 'starter'],      meta: { cx: 200, cy: 202, Icon: Radio    } },
  { kw: ['karosserie', 'karos', 'anbau', 'außen'],                      meta: { cx: 50,  cy: 250, Icon: Layers   } },
  { kw: ['innen', 'cockpit', 'sitz', 'sitze', 'interieur'],             meta: { cx: 150, cy: 250, Icon: Lightbulb } },
  { kw: ['klima', 'heiz', 'klimaanlage', 'gebläse'],                    meta: { cx: 180, cy: 118, Icon: Thermometer } },
  { kw: ['abgas', 'auspuff', 'exhaust', 'katalysator'],                 meta: { cx: 150, cy: 400, Icon: Wind     } },
  { kw: ['batterie', 'akku', 'battery'],                                 meta: { cx: 212, cy: 130, Icon: Battery  } },
  { kw: ['sensor', 'steuergerät', 'lambdasonde', 'ecu'],                meta: { cx: 200, cy: 168, Icon: Cpu      } },
  { kw: ['feder', 'dämpfer', 'stoßdämp', 'federbein', 'suspension'],   meta: { cx: 212, cy: 248, Icon: Circle   } },
  { kw: ['kühlung', 'kühlsystem', 'kühler', 'thermostat'],              meta: { cx: 150, cy: 90,  Icon: Thermometer } },
  { kw: ['rad', 'reifen', 'felge', 'wheel'],                            meta: { cx: 68,  cy: 158, Icon: Circle   } },
  { kw: ['beleucht', 'scheinwerfer', 'lampe', 'licht'],                 meta: { cx: 150, cy: 68,  Icon: Zap      } },
];

// Used positions tracker to avoid overlap
const FALLBACK_POSITIONS: HotspotMeta[] = [
  { cx: 150, cy: 106, Icon: Settings }, { cx: 150, cy: 187, Icon: Wrench },
  { cx: 70,  cy: 248, Icon: Disc     }, { cx: 100, cy: 145, Icon: Circle   },
  { cx: 100, cy: 352, Icon: Circle   }, { cx: 126, cy: 138, Icon: Navigation },
  { cx: 174, cy: 308, Icon: Fuel     }, { cx: 200, cy: 202, Icon: Radio    },
  { cx: 50,  cy: 250, Icon: Layers   }, { cx: 150, cy: 250, Icon: Lightbulb },
  { cx: 180, cy: 118, Icon: Thermometer }, { cx: 150, cy: 400, Icon: Wind  },
  { cx: 212, cy: 130, Icon: Battery  }, { cx: 200, cy: 168, Icon: Cpu      },
  { cx: 212, cy: 248, Icon: Circle   }, { cx: 150, cy: 90,  Icon: Thermometer },
];

interface MappedGroup extends ApCategoryNode {
  cx: number;
  cy: number;
  Icon: LucideIcon;
  displayId: number;
}

function mapGroupsToHotspots(nodes: ApCategoryNode[]): MappedGroup[] {
  const used = new Set<string>();
  const fallbackQueue = [...FALLBACK_POSITIONS];

  return nodes.map((node, idx) => {
    const lower = node.name.toLowerCase();
    let meta: HotspotMeta | undefined;

    for (const { kw, meta: m } of KEYWORD_HOTSPOTS) {
      if (kw.some(k => lower.includes(k))) {
        const key = `${m.cx},${m.cy}`;
        if (!used.has(key)) {
          used.add(key);
          meta = m;
          break;
        }
      }
    }

    if (!meta) {
      const fb = fallbackQueue.find(f => !used.has(`${f.cx},${f.cy}`));
      if (fb) {
        used.add(`${fb.cx},${fb.cy}`);
        meta = fb;
      } else {
        meta = { cx: 120 + (idx % 8) * 15, cy: 150 + Math.floor(idx / 8) * 40, Icon: Wrench };
      }
    }

    return { ...node, ...meta, displayId: idx + 1 };
  });
}

// ─── Static fallback groups (when no ktype) ───────────────────────────────────
const STATIC_GROUPS: MappedGroup[] = [
  { id: null, name: "Motor",                   children: [], cx: 150, cy: 106, Icon: Settings,     displayId: 1  },
  { id: null, name: "Getriebe & Kupplung",     children: [], cx: 150, cy: 187, Icon: Wrench,       displayId: 2  },
  { id: null, name: "Bremsanlage",             children: [], cx: 70,  cy: 248, Icon: Disc,          displayId: 3  },
  { id: null, name: "Vorderachse",             children: [], cx: 100, cy: 145, Icon: Circle,        displayId: 4  },
  { id: null, name: "Hinterachse",             children: [], cx: 100, cy: 352, Icon: Circle,        displayId: 5  },
  { id: null, name: "Lenkung",                 children: [], cx: 126, cy: 138, Icon: Navigation,    displayId: 6  },
  { id: null, name: "Kraftstoffanlage",        children: [], cx: 174, cy: 308, Icon: Fuel,          displayId: 7  },
  { id: null, name: "Elektrik & Elektronik",   children: [], cx: 200, cy: 202, Icon: Radio,         displayId: 8  },
  { id: null, name: "Karosserie",              children: [], cx: 50,  cy: 250, Icon: Layers,        displayId: 9  },
  { id: null, name: "Innenausstattung",        children: [], cx: 150, cy: 250, Icon: Lightbulb,     displayId: 10 },
  { id: null, name: "Klimaanlage & Heizung",  children: [], cx: 180, cy: 118, Icon: Thermometer,   displayId: 11 },
  { id: null, name: "Abgasanlage",             children: [], cx: 150, cy: 400, Icon: Wind,          displayId: 12 },
];

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  vehicle: { manufacturer?: string; model?: string; typeName?: string } | null;
  vehicleKtype?: number | null;
  vehicleVin?: string;
  onBack: () => void;
}

export function OemExplosionView({ vehicle, vehicleKtype, vehicleVin, onBack }: Props) {
  const [groups, setGroups]               = useState<MappedGroup[]>(STATIC_GROUPS);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError]     = useState<string | null>(null);

  const [selectedGroup, setSelectedGroup] = useState<MappedGroup | null>(null);
  const [hoveredId, setHoveredId]         = useState<number | null>(null);

  const [articles, setArticles]               = useState<ApArticle[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [articlesError, setArticlesError]     = useState<string | null>(null);

  const articlesRef = useRef<HTMLDivElement>(null);

  const vehicleLabel = vehicle
    ? [vehicle.manufacturer, vehicle.model, vehicle.typeName].filter(Boolean).join(" ")
    : null;

  // ── Load real categories when ktype available ─────────────────────────────
  useEffect(() => {
    if (!vehicleKtype) { setGroups(STATIC_GROUPS); return; }
    let cancelled = false;
    setGroupsLoading(true);
    setGroupsError(null);
    setSelectedGroup(null);
    setArticles([]);

    apCategoryTree(vehicleKtype)
      .then(nodes => {
        if (cancelled) return;
        if (nodes.length === 0) { setGroups(STATIC_GROUPS); return; }
        const top = nodes.slice(0, 20); // max 20 Baugruppen
        setGroups(mapGroupsToHotspots(top));
      })
      .catch(() => {
        if (!cancelled) { setGroupsError("Baugruppen konnten nicht geladen werden."); setGroups(STATIC_GROUPS); }
      })
      .finally(() => { if (!cancelled) setGroupsLoading(false); });

    return () => { cancelled = true; };
  }, [vehicleKtype]);

  // ── Load articles for selected group ─────────────────────────────────────
  useEffect(() => {
    if (!selectedGroup || !selectedGroup.id || !vehicleKtype) return;

    let cancelled = false;
    setArticlesLoading(true);
    setArticlesError(null);
    setArticles([]);

    apArticlesByCategory(vehicleKtype, selectedGroup.id)
      .then(arts => {
        if (!cancelled) setArticles(arts);
      })
      .catch(() => {
        if (!cancelled) setArticlesError("Artikel konnten nicht geladen werden.");
      })
      .finally(() => { if (!cancelled) setArticlesLoading(false); });

    return () => { cancelled = true; };
  }, [selectedGroup, vehicleKtype]);

  // Scroll to articles on mobile when group selected
  useEffect(() => {
    if (selectedGroup && articlesRef.current) {
      setTimeout(() => {
        articlesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [selectedGroup]);

  const selectGroup = (g: MappedGroup) => {
    setSelectedGroup(prev => prev?.displayId === g.displayId ? null : g);
  };

  const noData = !vehicleKtype;

  return (
    <div className="flex flex-col min-h-0">

      {/* ── Breadcrumb ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 sm:px-6 py-2.5 border-b border-border bg-card/40">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Aftermarket-Teile
        </button>
        <ChevronRight className="w-3 h-3 text-muted-foreground/30 shrink-0" />
        <span className="text-xs sm:text-sm font-bold text-foreground">Baugruppen-Katalog</span>

        {vehicleKtype && !groupsLoading && (
          <div className="ml-auto shrink-0">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-[10px] sm:text-[11px] font-bold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live-Daten
            </span>
          </div>
        )}
        {noData && (
          <div className="ml-auto shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/15 border border-amber-500/25 text-[10px] sm:text-[11px] font-semibold text-amber-400">
              <Car className="w-3 h-3" />
              Fahrzeug wählen für echte Daten
            </span>
          </div>
        )}
      </div>

      {/* ── Main layout ──────────────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row gap-5 p-4 sm:p-6">

        {/* ── Left: Assembly groups ─────────────────────────────────────── */}
        <aside className="w-full xl:w-[268px] xl:shrink-0">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Baugruppen</h3>
              {groupsLoading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                : <span className="text-[11px] text-muted-foreground bg-secondary rounded-full px-2 py-0.5 font-semibold">{groups.length}</span>
              }
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-1 max-h-[280px] xl:max-h-[540px] overflow-y-auto">
              {groupsLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2.5 border-b border-border/30 animate-pulse">
                      <div className="w-6 h-6 rounded-full bg-secondary shrink-0" />
                      <div className="flex-1">
                        <div className="h-2.5 bg-secondary rounded w-3/4 mb-1.5" />
                        <div className="h-2 bg-secondary/60 rounded w-1/2" />
                      </div>
                    </div>
                  ))
                : groups.map((group) => {
                    const isSelected = selectedGroup?.displayId === group.displayId;
                    const isHovered  = hoveredId === group.displayId;
                    const Icon = group.Icon;
                    const clickable = !!group.id && !!vehicleKtype;

                    return (
                      <button
                        key={group.displayId}
                        onClick={() => clickable ? selectGroup(group) : undefined}
                        onMouseEnter={() => setHoveredId(group.displayId)}
                        onMouseLeave={() => setHoveredId(null)}
                        disabled={!clickable}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2.5 text-left transition-all border-b border-border/30 last:border-0",
                          clickable
                            ? isSelected
                              ? "bg-primary/10 text-primary"
                              : isHovered
                              ? "bg-secondary/50 cursor-pointer"
                              : "hover:bg-secondary/30 cursor-pointer"
                            : "opacity-50 cursor-default"
                        )}
                      >
                        <span className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ring-1 transition-all",
                          isSelected
                            ? "bg-primary text-primary-foreground ring-primary"
                            : "bg-card text-foreground ring-border"
                        )}>
                          {group.displayId}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold leading-tight truncate">{group.name}</p>
                          {group.children.length > 0 && (
                            <p className="text-[10px] text-muted-foreground">{group.children.length} Unterkategorien</p>
                          )}
                          {noData && (
                            <p className="text-[10px] text-muted-foreground/50">Fahrzeug wählen</p>
                          )}
                        </div>
                        {isSelected && <ChevronRight className="w-3 h-3 text-primary shrink-0 hidden xl:block" />}
                      </button>
                    );
                  })
              }
            </div>
          </div>
        </aside>

        {/* ── Right: Diagram + Articles ─────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">

          {/* ── Car diagram ───────────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Baugruppen-Übersicht
                </span>
                {selectedGroup && (
                  <motion.span
                    key={selectedGroup.displayId}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="px-2 py-0.5 rounded-full bg-primary/15 border border-primary/20 text-primary text-[10px] font-bold"
                  >
                    {selectedGroup.name}
                  </motion.span>
                )}
              </div>
              {vehicleLabel && (
                <span className="text-[11px] text-muted-foreground truncate max-w-[200px] hidden sm:inline">{vehicleLabel}</span>
              )}
            </div>

            {/* SVG */}
            <div className="relative bg-[#07070e] flex items-center justify-center overflow-hidden" style={{ minHeight: 380 }}>

              {/* Grid */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <pattern id="oem-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                    <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#D4A017" strokeWidth="0.25" opacity="0.15" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#oem-grid)" />
              </svg>

              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse 55% 45% at 50% 48%, rgba(212,160,23,0.055) 0%, transparent 68%)" }} />

              <div className="relative w-full max-w-[280px] sm:max-w-[320px] mx-auto py-4">
                <svg viewBox="0 0 300 500" className="w-full h-auto"
                  style={{ filter: "drop-shadow(0 0 32px rgba(212,160,23,0.08))" }}>

                  {/* Body */}
                  <rect x="90" y="82" width="120" height="340" rx="22"
                    fill="#0d0d1f" stroke="#D4A017" strokeWidth="1.5" opacity="0.75" />

                  {/* Hood */}
                  <path d="M98,82 Q150,58 202,82 L202,98 Q150,78 98,98 Z"
                    fill="#0d0d1f" stroke="#D4A017" strokeWidth="1.2" opacity="0.65" />

                  {/* Front windshield */}
                  <path d="M98,98 Q150,86 202,98 L198,138 Q150,122 102,138 Z"
                    fill="#D4A017" fillOpacity="0.04" stroke="#D4A017" strokeWidth="1" opacity="0.6" />

                  {/* Pillars */}
                  <line x1="102" y1="138" x2="96" y2="148" stroke="#D4A017" strokeWidth="0.8" opacity="0.4" />
                  <line x1="198" y1="138" x2="204" y2="148" stroke="#D4A017" strokeWidth="0.8" opacity="0.4" />

                  {/* Cabin */}
                  <rect x="94" y="148" width="112" height="128" rx="6"
                    fill="#D4A017" fillOpacity="0.025" stroke="#D4A017" strokeWidth="0.8" opacity="0.5" />

                  {/* C-pillars */}
                  <line x1="94" y1="276" x2="98" y2="290" stroke="#D4A017" strokeWidth="0.8" opacity="0.4" />
                  <line x1="206" y1="276" x2="202" y2="290" stroke="#D4A017" strokeWidth="0.8" opacity="0.4" />

                  {/* Rear windshield */}
                  <path d="M102,290 Q150,304 198,290 L202,328 Q150,340 98,328 Z"
                    fill="#D4A017" fillOpacity="0.04" stroke="#D4A017" strokeWidth="1" opacity="0.6" />

                  {/* Trunk */}
                  <path d="M98,328 Q150,342 202,328 L202,345 Q150,358 98,345 Z"
                    fill="#0d0d1f" stroke="#D4A017" strokeWidth="1.2" opacity="0.65" />

                  {/* Rear bumper */}
                  <path d="M98,345 Q150,362 202,345 L202,368 Q150,380 98,368 Z"
                    fill="#0d0d1f" stroke="#D4A017" strokeWidth="1" opacity="0.5" />

                  {/* Wheels */}
                  {[{ cx: 68, cy: 158 }, { cx: 232, cy: 158 }, { cx: 68, cy: 340 }, { cx: 232, cy: 340 }].map(({ cx, cy }, i) => (
                    <g key={i}>
                      <ellipse cx={cx} cy={cy} rx="24" ry="40" fill="#080814" stroke="#D4A017" strokeWidth="1.5" opacity="0.75" />
                      <ellipse cx={cx} cy={cy} rx="14" ry="26" fill="none" stroke="#D4A017" strokeWidth="0.8" opacity="0.35" />
                      <ellipse cx={cx} cy={cy} rx="5" ry="8" fill="#D4A017" opacity="0.18" />
                      <line x1={cx} y1={cy - 26} x2={cx} y2={cy + 26} stroke="#D4A017" strokeWidth="0.4" opacity="0.2" />
                      <line x1={cx - 14} y1={cy} x2={cx + 14} y2={cy} stroke="#D4A017" strokeWidth="0.4" opacity="0.2" />
                    </g>
                  ))}

                  {/* Engine block dash */}
                  <rect x="108" y="87" width="84" height="55" rx="5"
                    fill="none" stroke="#D4A017" strokeWidth="0.7" strokeDasharray="5,3" opacity="0.38" />
                  <line x1="122" y1="95" x2="178" y2="95" stroke="#D4A017" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.25" />
                  <line x1="122" y1="107" x2="178" y2="107" stroke="#D4A017" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.25" />
                  <line x1="122" y1="119" x2="178" y2="119" stroke="#D4A017" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.25" />

                  {/* Gearbox */}
                  <rect x="118" y="155" width="64" height="42" rx="5"
                    fill="none" stroke="#D4A017" strokeWidth="0.7" strokeDasharray="4,3" opacity="0.32" />

                  {/* Driveshaft */}
                  <line x1="150" y1="197" x2="150" y2="310" stroke="#D4A017" strokeWidth="0.7" strokeDasharray="6,4" opacity="0.28" />

                  {/* Fuel tank */}
                  <rect x="138" y="290" width="42" height="28" rx="5"
                    fill="none" stroke="#D4A017" strokeWidth="0.7" strokeDasharray="4,3" opacity="0.3" />

                  {/* Exhaust */}
                  <path d="M138,368 Q132,385 134,410 Q136,424 142,430" fill="none" stroke="#D4A017" strokeWidth="0.7" strokeDasharray="4,3" opacity="0.28" />
                  <path d="M162,368 Q168,385 166,410 Q164,424 158,430" fill="none" stroke="#D4A017" strokeWidth="0.7" strokeDasharray="4,3" opacity="0.28" />

                  {/* Steering */}
                  <circle cx="130" cy="178" r="11" fill="none" stroke="#D4A017" strokeWidth="0.6" opacity="0.28" />
                  <line x1="124" y1="178" x2="136" y2="178" stroke="#D4A017" strokeWidth="0.5" opacity="0.22" />
                  <line x1="130" y1="172" x2="130" y2="184" stroke="#D4A017" strokeWidth="0.5" opacity="0.22" />

                  {/* Hotspots */}
                  {groups.map((group) => {
                    const isSelected = selectedGroup?.displayId === group.displayId;
                    const isHovered  = hoveredId === group.displayId;
                    const active     = isSelected || isHovered;
                    const clickable  = !!group.id && !!vehicleKtype;

                    return (
                      <g
                        key={group.displayId}
                        style={{ cursor: clickable ? "pointer" : "default" }}
                        onClick={() => clickable ? selectGroup(group) : undefined}
                        onMouseEnter={() => setHoveredId(group.displayId)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        {active && (
                          <circle cx={group.cx} cy={group.cy} r="18"
                            fill="#D4A017" fillOpacity="0.10" stroke="none" />
                        )}
                        <circle
                          cx={group.cx} cy={group.cy} r={active ? 11 : 9}
                          fill={active ? "#D4A017" : "#0d0d1f"}
                          stroke="#D4A017" strokeWidth={active ? 1.5 : 1}
                          opacity={active ? 1 : 0.82}
                          style={{ transition: "r 0.15s, fill 0.15s" }}
                        />
                        <text
                          x={group.cx} y={group.cy}
                          textAnchor="middle" dominantBaseline="central"
                          fill={active ? "#0d0d1f" : "#D4A017"}
                          fontSize="7" fontWeight="900"
                          style={{ userSelect: "none" }}
                        >
                          {group.displayId}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* No-vehicle hint */}
              {noData && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#07070e] via-[#07070e]/80 to-transparent pt-12 pb-4 px-4 text-center pointer-events-none">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/12 border border-amber-500/20 text-[11px] font-bold text-amber-400/90">
                    <Car className="w-3 h-3" />
                    Fahrzeug über Kennzeichen/VIN suchen → echte Baugruppen laden
                  </div>
                </div>
              )}

              {vehicleKtype && !selectedGroup && !groupsLoading && (
                <div className="absolute top-3 left-0 right-0 text-center pointer-events-none">
                  <span className="text-[11px] text-muted-foreground/50">
                    Baugruppe anklicken → Artikel laden
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Articles panel ────────────────────────────────────────── */}
          <div ref={articlesRef}>
            <AnimatePresence mode="wait">
              {selectedGroup ? (
                <motion.div
                  key={selectedGroup.displayId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                  className="bg-card border border-border rounded-2xl overflow-hidden"
                >
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-black shrink-0">
                      {selectedGroup.displayId}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold leading-tight">{selectedGroup.name}</h3>
                      {articlesLoading
                        ? <p className="text-[11px] text-muted-foreground">Artikel werden geladen…</p>
                        : <p className="text-[11px] text-muted-foreground">{articles.length} Artikel gefunden</p>
                      }
                    </div>
                  </div>

                  {/* Loading */}
                  {articlesLoading && (
                    <div className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <span className="text-sm">Lade Artikel…</span>
                    </div>
                  )}

                  {/* Error */}
                  {!articlesLoading && articlesError && (
                    <div className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
                      <AlertCircle className="w-5 h-5 text-destructive" />
                      <p className="text-sm">{articlesError}</p>
                    </div>
                  )}

                  {/* No results */}
                  {!articlesLoading && !articlesError && articles.length === 0 && (
                    <div className="py-10 flex flex-col items-center gap-3 text-muted-foreground">
                      <Search className="w-5 h-5" />
                      <div className="text-center">
                        <p className="text-sm font-medium">Keine Artikel in dieser Baugruppe</p>
                        <p className="text-xs mt-1">Frag uns direkt — wir bestellen alles</p>
                      </div>
                      <a
                        href={whatsappLink(`Hallo, ich suche Teile für ${vehicleLabel || "mein Fahrzeug"} — Baugruppe: ${selectedGroup.name}`)}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 text-white text-sm font-bold hover:bg-green-400 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" /> Per WhatsApp anfragen
                      </a>
                    </div>
                  )}

                  {/* Real articles */}
                  {!articlesLoading && !articlesError && articles.length > 0 && (
                    <div className="divide-y divide-border/40">
                      {articles.slice(0, 30).map((art, i) => (
                        <ArticleRow
                          key={`${art.articleNumber}-${i}`}
                          article={art}
                          vehicleLabel={vehicleLabel}
                          groupName={selectedGroup.name}
                        />
                      ))}
                      {articles.length > 30 && (
                        <div className="px-4 py-3 text-center">
                          <p className="text-xs text-muted-foreground">
                            + {articles.length - 30} weitere Artikel — per WhatsApp anfragen
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* No ktype footer */}
                  {!vehicleKtype && (
                    <div className="py-10 flex flex-col items-center gap-3">
                      <Car className="w-6 h-6 text-muted-foreground" />
                      <div className="text-center">
                        <p className="text-sm font-bold">Fahrzeug eingeben</p>
                        <p className="text-xs text-muted-foreground mt-1">Kennzeichen oder VIN eingeben für echte Artikel</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : !groupsLoading ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-6"
                >
                  <p className="text-sm text-muted-foreground">
                    {vehicleKtype
                      ? "Baugruppe anklicken → Artikel erscheinen hier"
                      : "Fahrzeug suchen + Baugruppe anklicken → echte Teile"}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className="mt-2 mb-6 mx-4 sm:mx-6 rounded-2xl border border-primary/20 bg-primary/5 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-sm font-bold">OEM-Explosionszeichnungen — coming soon</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Echte Explosionsbilder mit nummerierten OE-Teilen über PartsLink24 — API-Freischaltung läuft.
            Artikel und Preise sind schon jetzt verfügbar.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={whatsappLink("Hallo, ich brauche ein Originalteil. Könnt ihr mir weiterhelfen?")}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-green-500 text-white text-sm font-bold hover:bg-green-400 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </a>
          <a
            href={`tel:${SHOP_INFO.phone}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border text-sm font-medium hover:border-primary/50 hover:text-primary transition-colors"
          >
            <Phone className="w-3.5 h-3.5" /> Anrufen
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Article Row ──────────────────────────────────────────────────────────────
function ArticleRow({
  article,
  vehicleLabel,
  groupName,
}: {
  article: ApArticle;
  vehicleLabel: string | null;
  groupName: string;
}) {
  const wa = whatsappLink(
    `Hallo Alex Autoshop, ich brauche:\n` +
    `Artikel: ${article.brand} ${article.articleNumber}\n` +
    `${article.name}\n` +
    (article.oeNumbers?.length ? `OE-Nummer: ${article.oeNumbers[0]}\n` : '') +
    (vehicleLabel ? `Fahrzeug: ${vehicleLabel}\n` : '') +
    `Baugruppe: ${groupName}`
  );

  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors group">
      {/* Image */}
      {article.imageUrl ? (
        <img src={article.imageUrl} alt={article.name}
          className="w-12 h-12 rounded-lg object-contain bg-secondary/30 border border-border/50 shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-secondary/30 border border-border/50 flex items-center justify-center shrink-0">
          <Settings className="w-5 h-5 text-muted-foreground/30" />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground truncate">{article.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[10px] font-semibold text-primary bg-primary/10 rounded px-1.5 py-0.5">{article.brand}</span>
              <span className="text-[10px] font-mono text-muted-foreground">{article.articleNumber}</span>
            </div>
          </div>
          {article.price && (
            <span className="text-sm font-black text-foreground shrink-0">
              {typeof article.price === 'number' ? `${article.price.toFixed(2)} €` : article.price}
            </span>
          )}
        </div>

        {/* OE Numbers */}
        {article.oeNumbers && article.oeNumbers.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {article.oeNumbers.slice(0, 3).map((oe, i) => (
              <span key={i} className="text-[10px] font-mono bg-secondary/50 border border-border/40 rounded px-1.5 py-0.5 text-muted-foreground">
                OE: {oe}
              </span>
            ))}
          </div>
        )}

        {/* Specs */}
        {article.specs && article.specs.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            {article.specs.slice(0, 3).map((s, i) => (
              <span key={i} className="text-[10px] text-muted-foreground">
                {s.name}: <span className="text-foreground/70">{s.value}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action */}
      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 text-[11px] font-bold hover:bg-green-500/25 transition-colors"
        >
          <MessageCircle className="w-3 h-3" />
          Anfragen
        </a>
      </div>
    </div>
  );
}
