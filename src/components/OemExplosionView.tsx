/**
 * OEM Original-Katalog — UI Shell for PartsLink24 integration
 * Voll funktionale UI, echte Daten kommen wenn PartsLink24 API aktiviert wird.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Lock, Sparkles, Phone, MessageCircle, ChevronRight,
  Settings, Disc, Zap, Wind, Thermometer, Battery, Radio, Fuel,
  Wrench, Navigation, Layers, Lightbulb, Car, Circle, Cpu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SHOP_INFO, whatsappLink } from "@/data/shopInfo";

// ─── Assembly groups (static demo — replaced by PartsLink24 API data) ─────────
const ASSEMBLY_GROUPS = [
  { id:  1, name: "Motor",                    count: 847,  cx: 150, cy: 106, Icon: Settings },
  { id:  2, name: "Getriebe & Kupplung",      count: 312,  cx: 150, cy: 187, Icon: Wrench   },
  { id:  3, name: "Bremsanlage vorn",         count: 178,  cx:  70, cy: 158, Icon: Disc     },
  { id:  4, name: "Bremsanlage hinten",       count: 112,  cx:  70, cy: 340, Icon: Disc     },
  { id:  5, name: "Vorderachse",              count: 243,  cx: 150, cy: 152, Icon: Circle   },
  { id:  6, name: "Hinterachse",              count: 198,  cx: 150, cy: 348, Icon: Circle   },
  { id:  7, name: "Lenkung",                  count:  89,  cx: 126, cy: 138, Icon: Navigation },
  { id:  8, name: "Kraftstoffanlage",         count: 167,  cx: 174, cy: 308, Icon: Fuel     },
  { id:  9, name: "Elektrik & Elektronik",    count: 423,  cx: 198, cy: 202, Icon: Radio    },
  { id: 10, name: "Karosserie & Anbauteile",  count: 589,  cx:  50, cy: 250, Icon: Layers   },
  { id: 11, name: "Innenausstattung",         count: 234,  cx: 150, cy: 248, Icon: Lightbulb },
  { id: 12, name: "Klimaanlage",              count:  78,  cx: 180, cy: 118, Icon: Thermometer },
  { id: 13, name: "Abgasanlage",              count: 145,  cx: 150, cy: 388, Icon: Wind     },
  { id: 14, name: "Elektroanlage & Batterie", count: 203,  cx: 198, cy: 130, Icon: Battery  },
  { id: 15, name: "Steuergeräte & Sensoren",  count: 311,  cx: 198, cy: 168, Icon: Cpu      },
];

// Demo OE parts table (blurred, placeholder)
const DEMO_PARTS = [
  { pos: "1",  oe: "06A 103 101 T", name: "Zylinderblock",         qty: 1 },
  { pos: "2",  oe: "06A 103 171 F", name: "Zylinderbolzen",        qty: 4 },
  { pos: "3",  oe: "06A 103 195 C", name: "Wellendichtring vorn",  qty: 1 },
  { pos: "4",  oe: "06A 103 269 K", name: "Verschlussschraube",    qty: 2 },
  { pos: "5",  oe: "06A 103 484 A", name: "Dichtungssatz Motor",   qty: 1 },
];

interface Props {
  vehicle: { manufacturer?: string; model?: string; typeName?: string } | null;
  vehicleVin?: string;
  onBack: () => void;
}

export function OemExplosionView({ vehicle, vehicleVin, onBack }: Props) {
  const [selectedGroup, setSelectedGroup] = useState<typeof ASSEMBLY_GROUPS[0] | null>(null);
  const [hoveredId, setHoveredId]         = useState<number | null>(null);

  const vehicleLabel = vehicle
    ? [vehicle.manufacturer, vehicle.model, vehicle.typeName].filter(Boolean).join(" ")
    : null;

  const selectGroup = (g: typeof ASSEMBLY_GROUPS[0]) =>
    setSelectedGroup(prev => prev?.id === g.id ? null : g);

  return (
    <div className="flex flex-col min-h-0">

      {/* ── Internal breadcrumb ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 sm:px-6 py-2.5 border-b border-border bg-card/40">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Aftermarket-Teile
        </button>
        <ChevronRight className="w-3 h-3 text-muted-foreground/30 shrink-0" />
        <span className="text-xs sm:text-sm font-bold text-foreground">Original-Katalog (OEM)</span>
        <div className="ml-auto shrink-0">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/15 border border-primary/20 text-[10px] sm:text-[11px] font-bold text-primary">
            <Sparkles className="w-2.5 h-2.5" />
            PartsLink24 · API ausstehend
          </span>
        </div>
      </div>

      {/* ── Main layout ──────────────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row gap-5 p-4 sm:p-6">

        {/* ── Left: Assembly groups ─────────────────────────────────────── */}
        <aside className="w-full xl:w-[268px] xl:shrink-0">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Baugruppen</h3>
              <span className="text-[11px] text-muted-foreground bg-secondary rounded-full px-2 py-0.5 font-semibold">{ASSEMBLY_GROUPS.length}</span>
            </div>

            {/* On mobile: 2-col grid. On desktop: single-col list */}
            <div className="grid grid-cols-2 xl:grid-cols-1 max-h-[280px] xl:max-h-[520px] overflow-y-auto">
              {ASSEMBLY_GROUPS.map((group) => {
                const isSelected = selectedGroup?.id === group.id;
                const isHovered  = hoveredId === group.id;
                const Icon = group.Icon;
                return (
                  <button
                    key={group.id}
                    onClick={() => selectGroup(group)}
                    onMouseEnter={() => setHoveredId(group.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 text-left transition-all border-b border-border/30 last:border-0",
                      isSelected
                        ? "bg-primary/10 text-primary"
                        : isHovered
                        ? "bg-secondary/50"
                        : "hover:bg-secondary/30"
                    )}
                  >
                    <span className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ring-1 transition-all",
                      isSelected
                        ? "bg-primary text-primary-foreground ring-primary"
                        : "bg-card text-foreground ring-border"
                    )}>
                      {group.id}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold leading-tight truncate">{group.name}</p>
                      <p className="text-[10px] text-muted-foreground">{group.count.toLocaleString("de-DE")} Teile</p>
                    </div>
                    {isSelected && <ChevronRight className="w-3 h-3 text-primary shrink-0 hidden xl:block" />}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* ── Right: Diagram + Parts list ───────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">

          {/* ── Diagram card ──────────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Explosionszeichnung</span>
                {selectedGroup && (
                  <motion.span
                    key={selectedGroup.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="px-2 py-0.5 rounded-full bg-primary/15 border border-primary/20 text-primary text-[10px] font-bold"
                  >
                    {selectedGroup.name}
                  </motion.span>
                )}
              </div>
              {vehicleLabel && (
                <span className="text-[11px] text-muted-foreground truncate max-w-[180px] hidden sm:inline">{vehicleLabel}</span>
              )}
            </div>

            {/* SVG wrapper */}
            <div className="relative bg-[#07070e] flex items-center justify-center overflow-hidden" style={{ minHeight: 400 }}>

              {/* Background grid */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <pattern id="oem-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                    <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#D4A017" strokeWidth="0.25" opacity="0.15" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#oem-grid)" />
              </svg>

              {/* Ambient glow */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse 55% 45% at 50% 48%, rgba(212,160,23,0.055) 0%, transparent 68%)" }} />

              {/* Car SVG — top-down view */}
              <div className="relative w-full max-w-[280px] sm:max-w-[320px] mx-auto py-4">
                <svg
                  viewBox="0 0 300 500"
                  className="w-full h-auto"
                  style={{ filter: "drop-shadow(0 0 32px rgba(212,160,23,0.08))" }}
                >
                  {/* ── Body ─────────────────────────────────────────── */}
                  <rect x="90" y="82" width="120" height="340" rx="22"
                    fill="#0d0d1f" stroke="#D4A017" strokeWidth="1.5" opacity="0.75" />

                  {/* Hood */}
                  <path d="M98,82 Q150,58 202,82 L202,98 Q150,78 98,98 Z"
                    fill="#0d0d1f" stroke="#D4A017" strokeWidth="1.2" opacity="0.65" />

                  {/* Front windshield */}
                  <path d="M98,98 Q150,86 202,98 L198,138 Q150,122 102,138 Z"
                    fill="#D4A017" fillOpacity="0.04" stroke="#D4A017" strokeWidth="1" opacity="0.6" />

                  {/* A-pillars */}
                  <line x1="102" y1="138" x2="96" y2="148" stroke="#D4A017" strokeWidth="0.8" opacity="0.4" />
                  <line x1="198" y1="138" x2="204" y2="148" stroke="#D4A017" strokeWidth="0.8" opacity="0.4" />

                  {/* Roof / cabin */}
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

                  {/* ── Wheels ─────────────────────────────────────── */}
                  {[
                    { cx: 68, cy: 158 },  // FL
                    { cx: 232, cy: 158 }, // FR
                    { cx: 68, cy: 340 },  // RL
                    { cx: 232, cy: 340 }, // RR
                  ].map(({ cx, cy }, i) => (
                    <g key={i}>
                      <ellipse cx={cx} cy={cy} rx="24" ry="40"
                        fill="#080814" stroke="#D4A017" strokeWidth="1.5" opacity="0.75" />
                      <ellipse cx={cx} cy={cy} rx="14" ry="26"
                        fill="none" stroke="#D4A017" strokeWidth="0.8" opacity="0.35" />
                      <ellipse cx={cx} cy={cy} rx="5" ry="8"
                        fill="#D4A017" opacity="0.18" />
                      {/* Spoke hints */}
                      <line x1={cx} y1={cy - 26} x2={cx} y2={cy + 26} stroke="#D4A017" strokeWidth="0.4" opacity="0.2" />
                      <line x1={cx - 14} y1={cy} x2={cx + 14} y2={cy} stroke="#D4A017" strokeWidth="0.4" opacity="0.2" />
                    </g>
                  ))}

                  {/* ── Internal dashes (engine, gearbox, driveline, exhaust) ── */}
                  {/* Engine block */}
                  <rect x="108" y="87" width="84" height="55" rx="5"
                    fill="none" stroke="#D4A017" strokeWidth="0.7" strokeDasharray="5,3" opacity="0.38" />
                  {/* Engine detail lines */}
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

                  {/* Exhaust pipes */}
                  <path d="M138,368 Q132,385 134,410 Q136,424 142,430"
                    fill="none" stroke="#D4A017" strokeWidth="0.7" strokeDasharray="4,3" opacity="0.28" />
                  <path d="M162,368 Q168,385 166,410 Q164,424 158,430"
                    fill="none" stroke="#D4A017" strokeWidth="0.7" strokeDasharray="4,3" opacity="0.28" />

                  {/* Steering column hint */}
                  <circle cx="130" cy="178" r="11" fill="none" stroke="#D4A017" strokeWidth="0.6" opacity="0.28" />
                  <line x1="124" y1="178" x2="136" y2="178" stroke="#D4A017" strokeWidth="0.5" opacity="0.22" />
                  <line x1="130" y1="172" x2="130" y2="184" stroke="#D4A017" strokeWidth="0.5" opacity="0.22" />

                  {/* ── Hotspot circles ──────────────────────────── */}
                  {ASSEMBLY_GROUPS.map((group) => {
                    const isSelected = selectedGroup?.id === group.id;
                    const isHovered  = hoveredId === group.id;
                    const active     = isSelected || isHovered;

                    return (
                      <g
                        key={group.id}
                        style={{ cursor: "pointer" }}
                        onClick={() => selectGroup(group)}
                        onMouseEnter={() => setHoveredId(group.id)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        {/* Outer glow ring */}
                        {active && (
                          <circle cx={group.cx} cy={group.cy} r="18"
                            fill="#D4A017" fillOpacity="0.10" stroke="none" />
                        )}
                        {/* Main circle */}
                        <circle cx={group.cx} cy={group.cy} r={active ? 11 : 9}
                          fill={active ? "#D4A017" : "#0d0d1f"}
                          stroke="#D4A017" strokeWidth={active ? 1.5 : 1}
                          opacity={active ? 1 : 0.82}
                          style={{ transition: "r 0.15s, fill 0.15s" }}
                        />
                        {/* Number */}
                        <text
                          x={group.cx} y={group.cy}
                          textAnchor="middle" dominantBaseline="central"
                          fill={active ? "#0d0d1f" : "#D4A017"}
                          fontSize="7" fontWeight="900"
                          style={{ userSelect: "none" }}
                        >
                          {group.id}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* ── Coming soon overlay (bottom fade) ─────────────── */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#07070e] via-[#07070e]/75 to-transparent pt-16 pb-4 px-4 text-center pointer-events-none">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/12 border border-primary/20 text-[11px] font-bold text-primary/90">
                  <Sparkles className="w-3 h-3" />
                  Echte OEM-Zeichnungen · Freigeschaltet nach PartsLink24-Aktivierung
                </div>
              </div>

              {/* Click instruction */}
              {!selectedGroup && (
                <div className="absolute top-3 left-0 right-0 text-center pointer-events-none">
                  <span className="text-[11px] text-muted-foreground/50">
                    Baugruppe anklicken → Stückliste anzeigen
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Parts list (selected group) ────────────────────────────── */}
          <AnimatePresence mode="wait">
            {selectedGroup ? (
              <motion.div
                key={selectedGroup.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
                className="bg-card border border-border rounded-2xl overflow-hidden"
              >
                {/* Header */}
                <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-black shrink-0">
                    {selectedGroup.id}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold leading-tight">{selectedGroup.name}</h3>
                    <p className="text-[11px] text-muted-foreground">{selectedGroup.count.toLocaleString("de-DE")} Originalteile im Katalog</p>
                  </div>
                  <Lock className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                </div>

                {/* Blurred demo table */}
                <div className="relative">
                  <div className="blur-[3px] select-none pointer-events-none">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-secondary/40 border-b border-border/60">
                          <th className="px-4 py-2 text-left text-muted-foreground font-medium w-12">Pos.</th>
                          <th className="px-4 py-2 text-left text-muted-foreground font-medium">OE-Nummer</th>
                          <th className="px-4 py-2 text-left text-muted-foreground font-medium hidden sm:table-cell">Bezeichnung</th>
                          <th className="px-4 py-2 text-center text-muted-foreground font-medium w-16">Qty</th>
                          <th className="px-4 py-2 text-right text-muted-foreground font-medium w-24">Preis</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {DEMO_PARTS.map((p) => (
                          <tr key={p.pos}>
                            <td className="px-4 py-3 font-black text-primary text-center">{p.pos}</td>
                            <td className="px-4 py-3 font-mono text-[11px] font-semibold">{p.oe}</td>
                            <td className="px-4 py-3 hidden sm:table-cell">{p.name}</td>
                            <td className="px-4 py-3 text-center text-muted-foreground">{p.qty}</td>
                            <td className="px-4 py-3 text-right font-bold">—</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Lock overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/88 backdrop-blur-[2px] py-8 px-4 text-center">
                    <div className="w-11 h-11 rounded-2xl bg-primary/12 border border-primary/25 flex items-center justify-center mb-3">
                      <Lock className="w-5 h-5 text-primary/75" />
                    </div>
                    <p className="text-sm font-bold mb-1">Stückliste folgt mit PartsLink24</p>
                    <p className="text-xs text-muted-foreground max-w-sm mb-5">
                      Sobald die API aktiviert ist: echte OE-Nummern, Stücklisten mit Explosionsansicht
                      und direkte Bestellmöglichkeit. Bis dahin einfach anfragen.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <a
                        href={whatsappLink(
                          `Hallo Alex Autoshop, ich suche Originalteile — Baugruppe: ${selectedGroup.name}` +
                          (vehicleLabel ? ` für ${vehicleLabel}` : "")
                        )}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500 text-white text-sm font-bold hover:bg-green-400 active:scale-[0.97] transition-all"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Per WhatsApp anfragen
                      </a>
                      <a
                        href={`tel:${SHOP_INFO.phone}`}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:border-primary/50 hover:text-primary transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        {SHOP_INFO.phone}
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-6"
              >
                <p className="text-sm text-muted-foreground">
                  Baugruppe links auswählen → OE-Stückliste erscheint hier.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Footer CTA ───────────────────────────────────────────────────── */}
      <div className="mt-2 mb-6 mx-4 sm:mx-6 rounded-2xl border border-primary/20 bg-primary/5 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-sm font-bold">OEM-Katalog — kommt in Kürze</p>
          </div>
          <p className="text-xs text-muted-foreground">
            PartsLink24 stellt über 60 Mio. Originalteile für alle Fahrzeuge bereit —
            mit echten Explosionszeichnungen und OE-Nummern direkt in der Teilebörse.
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
