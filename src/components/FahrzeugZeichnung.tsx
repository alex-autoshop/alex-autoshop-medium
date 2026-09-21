import { useEffect, useState } from "react";
import { Car, Loader2, Layers, ChevronRight } from "lucide-react";
import { yqImage, type YqNode, type YqUnitShort, type YqVehicle } from "@/lib/yqcat";
import { aufbauErkennen, gesamtansichtSuchen, type Aufbau, type Gesamtansicht } from "@/lib/fahrzeugAnsicht";
import { cn } from "@/lib/utils";

/**
 * Gesamtansicht im Teilefinder: das KOMPLETTE Auto als Zeichnung, sobald die
 * FIN steht — statt einer leeren Fläche.
 *
 * Gibt der Hersteller-Katalog eine Gesamtzeichnung dieses Modells her
 * (BMW, Mini, Mercedes, VW, Seat, Porsche, Renault, Dacia, Volvo …), steht
 * genau die da. Sonst eine eigene Zeichnung in der passenden Karosserieform —
 * sofort, ohne Warten, und ehrlich als Symbolbild beschriftet.
 */

/* ─────────────────────── Eigene Zeichnungen (Seitenansicht) ─────────────────────── */

function Rad({ x, y, r }: { x: number; y: number; r: number }) {
  const speichen = [0, 1, 2, 3, 4].map((i) => {
    const w = ((-90 + i * 72) * Math.PI) / 180;
    return { x1: x + Math.cos(w) * r * 0.2, y1: y + Math.sin(w) * r * 0.2, x2: x + Math.cos(w) * r * 0.62, y2: y + Math.sin(w) * r * 0.62 };
  });
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#fff" />
      <circle cx={x} cy={y} r={r * 0.87} className="opacity-50" />
      <circle cx={x} cy={y} r={r * 0.66} />
      <circle cx={x} cy={y} r={r * 0.5} strokeDasharray="4 4" className="opacity-40" />
      {speichen.map((s, i) => <line key={i} {...s} />)}
      <circle cx={x} cy={y} r={r * 0.15} />
    </g>
  );
}

interface Form {
  aussen: string;
  fenster: string;
  linien: string[];
  saeule: string;
  scheinwerfer: string;
  rueckleuchte: string;
  spiegel: string;
  griffe: [number, number][];
  raeder: [number, number, number];
  extra?: string[];
}

const FORMEN: Record<Aufbau, Form> = {
  pkw: {
    aussen: "M110 332 C86 330 72 318 70 296 L72 262 C74 248 86 238 106 234 L300 204 C316 202 328 199 340 195 L450 116 C466 106 494 101 530 100 L735 103 C764 105 786 111 802 122 L860 190 C870 200 878 210 884 222 L898 262 C904 284 905 304 900 322 C896 330 886 332 872 332 L825.2 332 A66 66 0 0 0 704.8 332 L305.2 332 A66 66 0 0 0 184.8 332 Z",
    fenster: "M356 194 L452 124 C468 114 494 110 528 109 L730 112 C752 113 770 119 782 128 L826 186 Z",
    saeule: "M580 110 L594 110 L598 191 L584 192 Z",
    linien: [
      "M346 198 C336 236 326 280 330 326",
      "M591 192 L593 326",
      "M752 188 C752 220 740 244 718 258",
      "M742 113 L752 187",
      "M306 324 L704 324",
      "M74 296 L150 300", "M82 314 L140 316",
    ],
    scheinwerfer: "M80 250 C98 242 140 234 178 229 L186 243 C150 249 112 258 84 264 Z",
    rueckleuchte: "M862 196 L886 226 L894 256 L870 244 Z",
    spiegel: "M358 196 L382 180 L398 184 L394 202 Z",
    griffe: [[546, 214], [706, 210]],
    raeder: [245, 765, 305],
    extra: ["M800 206 h22 v17 h-22 Z"],
  },
  kombi: {
    aussen: "M110 332 C86 330 72 318 70 296 L72 262 C74 248 86 238 106 234 L300 204 C316 202 328 199 340 195 L450 116 C466 106 494 101 530 100 L800 102 C826 103 846 110 856 124 L884 196 C890 206 894 216 896 228 L902 264 C906 286 906 306 900 322 C896 330 886 332 872 332 L825.2 332 A66 66 0 0 0 704.8 332 L305.2 332 A66 66 0 0 0 184.8 332 Z",
    fenster: "M356 194 L452 124 C468 114 494 110 528 109 L792 111 C812 112 826 118 834 128 L862 186 Z",
    saeule: "M580 110 L594 110 L598 191 L584 192 Z",
    linien: [
      "M346 198 C336 236 326 280 330 326",
      "M591 192 L593 326",
      "M752 188 C752 220 740 244 718 258",
      "M744 111 L752 187",
      "M306 324 L704 324",
      "M74 296 L150 300", "M82 314 L140 316",
    ],
    scheinwerfer: "M80 250 C98 242 140 234 178 229 L186 243 C150 249 112 258 84 264 Z",
    rueckleuchte: "M880 202 L894 232 L899 262 L886 250 Z",
    spiegel: "M358 196 L382 180 L398 184 L394 202 Z",
    griffe: [[546, 214], [706, 210]],
    raeder: [245, 765, 305],
    extra: ["M800 208 h22 v17 h-22 Z", "M540 94 L800 96", "M560 94 v6 M780 96 v6"],
  },
  suv: {
    aussen: "M106 326 C84 324 70 310 68 288 L70 246 C72 232 84 222 104 218 L296 190 C314 188 328 184 340 180 L440 96 C456 84 484 79 520 78 L800 80 C830 81 850 88 860 100 L886 180 C892 192 896 206 898 220 L904 262 C908 288 908 304 902 318 C898 324 888 326 874 326 L832.1 326 A72 72 0 0 0 697.9 326 L312.1 326 A72 72 0 0 0 177.9 326 Z",
    fenster: "M356 180 L444 104 C460 93 486 89 518 88 L790 90 C814 91 830 97 838 108 L862 172 Z",
    saeule: "M578 89 L592 89 L596 177 L582 178 Z",
    linien: [
      "M346 184 C336 224 326 272 330 318",
      "M589 178 L591 318",
      "M754 176 C756 208 746 232 716 250",
      "M748 90 L754 175",
      "M312 312 L698 312",
      "M72 280 L150 284", "M80 298 L140 300",
      "M170 318 A80 80 0 0 1 320 318", "M690 318 A80 80 0 0 1 840 318",
    ],
    scheinwerfer: "M76 234 C96 226 140 216 176 212 L184 226 C148 232 110 242 80 248 Z",
    rueckleuchte: "M880 186 L894 216 L900 250 L886 238 Z",
    spiegel: "M354 182 L380 166 L396 170 L392 188 Z",
    griffe: [[546, 198], [706, 194]],
    raeder: [245, 765, 300],
    extra: ["M520 70 L800 72", "M540 70 v8 M780 72 v8", "M800 194 h22 v17 h-22 Z"],
  },
  transporter: {
    aussen: "M100 332 C80 330 68 318 66 298 L68 250 C70 236 80 226 98 222 L170 206 C184 203 194 198 202 190 L270 88 C280 74 296 68 316 67 L890 66 C906 66 916 76 918 92 L922 318 C922 328 914 332 902 332 L848.5 332 A64 64 0 0 0 731.5 332 L288.5 332 A64 64 0 0 0 171.5 332 Z",
    fenster: "M224 190 L280 104 C286 96 294 92 304 92 L360 92 L360 190 Z",
    saeule: "M366 70 L378 70 L378 330 L366 330 Z",
    linien: [
      "M212 196 C204 240 200 280 204 326",
      "M392 72 L392 326",
      "M566 72 L566 326",
      "M392 152 L910 152",
      "M316 78 L888 77",
      "M404 96 L552 96 L552 144 L404 144 Z",
      "M72 294 L150 298", "M80 312 L140 314",
    ],
    scheinwerfer: "M72 244 C90 236 130 228 168 222 L174 236 C140 242 104 252 76 258 Z",
    rueckleuchte: "M906 190 h10 v62 h-10 Z",
    spiegel: "M214 186 L236 170 L252 174 L248 194 Z",
    griffe: [[330, 206], [536, 206]],
    raeder: [230, 790, 306],
  },
};

const RAD_R: Record<Aufbau, number> = { pkw: 55, kombi: 55, suv: 60, transporter: 54 };

export function AutoZeichnung({ aufbau, className }: { aufbau: Aufbau; className?: string }) {
  const f = FORMEN[aufbau];
  const r = RAD_R[aufbau];
  return (
    <svg
      viewBox="30 40 940 340"
      className={cn("w-full h-auto text-neutral-800", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinejoin="round"
      strokeLinecap="round"
      role="img"
      aria-label="Zeichnung des Fahrzeugs (Seitenansicht)"
    >
      <line x1="40" y1="362" x2="960" y2="362" className="opacity-25" />
      <path d={f.aussen} fill="#fff" />
      <path d={f.fenster} fill="#eef1f5" />
      <path d={f.saeule} fill="#fff" />
      {f.linien.map((d, i) => <path key={i} d={d} className={i >= f.linien.length - 2 && aufbau !== "suv" ? "opacity-60" : undefined} />)}
      {f.extra?.map((d, i) => <path key={`e${i}`} d={d} />)}
      <path d={f.scheinwerfer} fill="#f6f7f9" />
      <path d={f.rueckleuchte} fill="#f1f1f1" />
      <path d={f.spiegel} fill="#fff" />
      {f.griffe.map(([x, y], i) => <rect key={`g${i}`} x={x} y={y} width={28} height={7} rx={3.5} />)}
      <Rad x={f.raeder[0]} y={f.raeder[2]} r={r} />
      <Rad x={f.raeder[1]} y={f.raeder[2]} r={r} />
    </svg>
  );
}

const AUFBAU_NAME: Record<Aufbau, string> = { pkw: "Pkw", kombi: "Kombi", suv: "SUV", transporter: "Transporter" };

/* ─────────────────────── Gesamtansicht ─────────────────────── */

export function Gesamtansicht({
  vehicle, fahrzeugName, tree, filterState, gruppen, onGruppe, onOeffnen,
}: {
  vehicle: YqVehicle | null;
  fahrzeugName: string;
  tree: YqNode | null;
  filterState?: string;
  /** Hauptgruppen des Fahrzeugs (oberste Ebene des Baums). */
  gruppen: YqNode[];
  onGruppe: (n: YqNode) => void;
  onOeffnen: (u: YqUnitShort, name: string) => void;
}) {
  // undefined = wird noch gesucht, null = gibt es nicht → eigene Zeichnung
  const [ansicht, setAnsicht] = useState<Gesamtansicht | null | undefined>(undefined);
  const [bildKaputt, setBildKaputt] = useState(false);
  const aufbau = aufbauErkennen(vehicle, fahrzeugName);

  useEffect(() => {
    setBildKaputt(false);
    if (!vehicle || !tree) { setAnsicht(undefined); return; }
    let lebt = true;
    setAnsicht(undefined);
    gesamtansichtSuchen(vehicle, tree, filterState)
      .then((a) => { if (lebt) setAnsicht(a); })
      .catch(() => { if (lebt) setAnsicht(null); });
    return () => { lebt = false; };
    // Nur neu suchen, wenn ein anderes Fahrzeug bzw. ein neuer Baum kommt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle, tree]);

  const echt = !!ansicht && !bildKaputt;

  return (
    <div className="h-full flex flex-col bg-white text-neutral-900">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-200 bg-white/90">
        <Car className="w-4 h-4 text-primary shrink-0" />
        <span className="text-[13px] font-semibold truncate">{fahrzeugName || "Dein Fahrzeug"}</span>
        <span className="text-[11px] text-neutral-500 shrink-0">· Gesamtansicht</span>
        <span className="ml-auto text-[11px] text-neutral-500 shrink-0 flex items-center gap-1.5">
          {ansicht === undefined && vehicle && tree && (
            <><Loader2 className="w-3 h-3 animate-spin" /> <span className="hidden sm:inline">Herstellerzeichnung wird gesucht …</span></>
          )}
          {ansicht !== undefined && (echt ? "Herstellerzeichnung" : `Symbolbild · ${AUFBAU_NAME[aufbau]}`)}
        </span>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
        {echt && ansicht ? (
          <button
            type="button"
            onClick={() => onOeffnen(ansicht.baugruppe, ansicht.name)}
            title="Zeichnung mit Teileliste öffnen"
            className="max-w-full max-h-full flex items-center justify-center group"
          >
            <img
              src={yqImage(ansicht.bild, "source")}
              alt={`${fahrzeugName} — ${ansicht.name}`}
              onError={() => setBildKaputt(true)}
              draggable={false}
              className="max-w-full max-h-[calc(100vh-330px)] object-contain select-none group-hover:opacity-90 transition-opacity"
            />
          </button>
        ) : (
          <AutoZeichnung aufbau={aufbau} className="max-w-[760px] max-h-full" />
        )}
      </div>

      {gruppen.length > 0 && (
        <div className="shrink-0 border-t border-neutral-200 px-3 py-2.5 bg-neutral-50/80">
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3 h-3" /> Hauptgruppe wählen
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-[88px] overflow-y-auto">
            {gruppen.map((g, i) => (
              <button
                key={(g.code || g.name || "") + i}
                type="button"
                onClick={() => onGruppe(g)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-neutral-200 bg-white text-[12px] text-neutral-700 hover:border-primary/60 hover:text-primary transition-colors"
              >
                {(g.name || g.code || "").replace(/\s*\/\s*/g, "/")}
                <ChevronRight className="w-3 h-3 opacity-40" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
