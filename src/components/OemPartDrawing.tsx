import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Layers, Maximize2, Minimize2, ExternalLink } from "lucide-react";
import {
  yqFindByVin, yqPartApplicability, yqUnitInfo, yqUnitParts, linkTo, yqImage, partNo, partQty,
  type YqLink, type YqUnit, type YqImageArea,
} from "@/lib/yqcat";
import { cn } from "@/lib/utils";

/**
 * Die Explosionszeichnung DIREKT beim Teil — nicht als Link, sondern als Bild.
 *
 * Wer ein Teil im Angebot anschaut, will nicht wissen, dass es irgendwo eine
 * Zeichnung gibt. Er will sehen, WO das Teil sitzt. Deshalb steht hier nicht
 * die ganze Bildtafel (die ist 2500 Pixel breit und im schmalen Panel
 * unlesbar), sondern der Ausschnitt um genau diese Position — mit der
 * Positionsnummer markiert. Die ganze Tafel ist einen Klick entfernt.
 *
 * Der Weg dorthin: OE-Nummer → getPartApplicability → Bildtafel → Bildbereich.
 */

type Treffer = {
  unit: YqUnit;
  bild: string;
  bereich: YqImageArea | null;
  position: string;
  oe: string;
  menge: string;
  /** Link auf die Bildtafel, für "im Katalog öffnen". */
  unitLink?: YqLink;
};

/* Fahrzeug und Zeichnung werden pro Sitzung gemerkt: der Kunde klickt sich
   durch zwanzig Teile, und jedes Mal die FIN neu aufzulösen wären vier
   zusätzliche Anfragen pro Klick. */
const fahrzeugCache = new Map<string, Promise<string | null>>();
const zeichnungCache = new Map<string, Promise<Treffer | null>>();

function fahrzeugToken(vin: string, brand: string): Promise<string | null> {
  const key = `${vin}|${brand}`.toUpperCase();
  let p = fahrzeugCache.get(key);
  if (!p) {
    p = yqFindByVin(vin, brand)
      .then((r) => r.vehicles[0]?.token ?? null)
      .catch(() => null);
    fahrzeugCache.set(key, p);
  }
  return p;
}

const gleich = (a: string, b: string) =>
  a.replace(/[^a-z0-9]/gi, "").toLowerCase() === b.replace(/[^a-z0-9]/gi, "").toLowerCase();

async function sucheZeichnung(vin: string, brand: string, oeNummern: string[], vorabToken?: string): Promise<Treffer | null> {
  // Hat die Teilebörse das Fahrzeug beim FIN-Eintippen schon bestimmt, wird der
  // Token durchgereicht — das spart die zweite Aufloesung und funktioniert auch
  // bei Marken, deren Namen wir nie richtig erraten haetten.
  const token = vorabToken || (await fahrzeugToken(vin, brand));
  if (!token) return null;

  // Mehrere OE-Nummern pro Artikel sind der Normalfall (verschiedene Baujahre).
  // Die erste, zu der der Katalog eine Bildtafel kennt, gewinnt.
  for (const oe of oeNummern.slice(0, 4)) {
    const nummer = oe.trim();
    if (!nummer) continue;
    try {
      const { categories } = await yqPartApplicability(token, nummer);
      let infoLink: YqLink | undefined;
      let partsToken: string | undefined;
      for (const cat of categories) {
        for (const u of cat.units ?? []) {
          const l = linkTo(u.unit, "getUnitInfo");
          if (l) {
            infoLink = l;
            partsToken = linkTo(u.unit, "getUnitParts")?.token;
            break;
          }
        }
        if (infoLink) break;
      }
      if (!infoLink) continue;

      const [info, teile] = await Promise.all([
        yqUnitInfo(infoLink.token),
        yqUnitParts(partsToken || infoLink.token).catch(() => ({ sections: [] })),
      ]);
      const unit = info.unit;
      const map = unit?.imageMaps?.[0];
      if (!unit || !map?.imageName) continue;

      const flach = (teile.sections ?? []).flatMap((s) => s.parts ?? []);
      const treffer = flach.find((x) => gleich(partNo(x), nummer)) || flach.find((x) => x.matched);
      const position = (treffer?.areaCode || "").trim();
      const bereich =
        (map.areas ?? []).find((a) => (a.areaCode || "").trim() === position && a.x2 > a.x1 && a.y2 > a.y1) ?? null;

      return {
        unit,
        // Nur die Variante "source" liefert der Bildserver aus; ohne Groessenangabe
        // oder mit "small"/"medium" kommt nichts zurueck (live geprueft).
        bild: yqImage(map.imageName, "source"),
        bereich,
        position,
        oe: nummer,
        menge: treffer ? partQty(treffer) : "",
        unitLink: infoLink,
      };
    } catch {
      /* nächste OE-Nummer versuchen */
    }
  }
  return null;
}

function holeZeichnung(vin: string, brand: string, oeNummern: string[], vorabToken?: string): Promise<Treffer | null> {
  const key = `${vorabToken || vin}|${brand}|${oeNummern.slice(0, 4).join(",")}`.toUpperCase();
  let p = zeichnungCache.get(key);
  if (!p) {
    p = sucheZeichnung(vin, brand, oeNummern, vorabToken);
    zeichnungCache.set(key, p);
  }
  return p;
}

export function OemPartDrawing({
  vin,
  brand,
  vehicleToken,
  oeNumbers,
  partName,
  onOpenCatalog,
}: {
  vin?: string;
  brand?: string;
  /** Fahrzeug-Token aus der FIN-Bestimmung — erspart die zweite Aufloesung. */
  vehicleToken?: string;
  oeNumbers?: string[];
  partName?: string;
  /** Ganze Bildtafel im Original-Katalog öffnen. */
  onOpenCatalog?: () => void;
}) {
  const nummern = useMemo(() => (oeNumbers ?? []).filter(Boolean), [oeNumbers]);
  const [treffer, setTreffer] = useState<Treffer | null>(null);
  const [laden, setLaden] = useState(false);
  const [fertig, setFertig] = useState(false);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [ganz, setGanz] = useState(false);
  const lauf = useRef(0);

  useEffect(() => {
    if ((!vehicleToken && (!vin || !brand)) || nummern.length === 0) return;
    const id = ++lauf.current;
    setLaden(true); setFertig(false); setTreffer(null); setNat(null); setGanz(false);
    holeZeichnung(vin ?? "", brand ?? "", nummern, vehicleToken).then((t) => {
      if (lauf.current !== id) return;
      setTreffer(t); setLaden(false); setFertig(true);
    });
  }, [vin, brand, vehicleToken, nummern]);

  if ((!vehicleToken && (!vin || !brand)) || nummern.length === 0) return null;

  /* Ausschnitt um die markierte Position — in Bildkoordinaten. */
  const sicht = (() => {
    if (!nat) return null;
    if (ganz || !treffer?.bereich) return { x: 0, y: 0, w: nat.w, h: nat.h };
    const a = treffer.bereich;
    const bw = a.x2 - a.x1, bh = a.y2 - a.y1;
    const mx = (a.x1 + a.x2) / 2, my = (a.y1 + a.y2) / 2;
    // Das Teil soll das Motiv sein, aber im Zusammenhang stehen: rund das
    // Dreifache seiner Kantenlaenge, in einem 4:3-Kasten, und nie so nah, dass
    // die Strichzeichnung ausfranst (mindestens 12 % der Tafelbreite).
    const F = 3;
    // Untergrenze absolut statt prozentual: ein 37x34-Kaestchen auf einer
    // 706er Tafel waere bei 12 % der Breite kaum zu erkennen. 200 px ist der
    // Kompromiss: Marke deutlich sichtbar, Strichzeichnung noch scharf.
    const boden = Math.min(nat.w, Math.max(200, nat.w * 0.08));
    let w = Math.max(bw * F, (bh * F * 4) / 3, boden);
    let h = (w * 3) / 4;
    if (w > nat.w) { w = nat.w; h = (w * 3) / 4; }
    if (h > nat.h) { h = nat.h; w = Math.min(nat.w, (h * 4) / 3); }
    const x = Math.min(Math.max(0, mx - w / 2), Math.max(0, nat.w - w));
    const y = Math.min(Math.max(0, my - h / 2), Math.max(0, nat.h - h));
    return { x, y, w, h };
  })();

  return (
    <div className="p-4 border-b border-border">
      <div className="flex items-center gap-2 mb-2">
        <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex-1 min-w-0 truncate">
          Explosionszeichnung
        </p>
        {laden && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />}
        {treffer?.bereich && (
          <button
            onClick={() => setGanz((g) => !g)}
            className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
          >
            {ganz ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            {ganz ? "Ausschnitt" : "Ganze Tafel"}
          </button>
        )}
      </div>

      {laden && (
        <div className="aspect-[4/3] rounded-lg bg-secondary/60 border border-border flex items-center justify-center">
          <p className="text-[11px] text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Suche die Bildtafel zu {partName || "diesem Teil"} …
          </p>
        </div>
      )}

      {fertig && !treffer && (
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Zu {nummern.length > 1 ? "diesen Originalnummern" : `der Originalnummer ${nummern[0]}`} führt der
          Hersteller-Katalog keine Bildtafel für dieses Fahrzeug.
        </p>
      )}

      {treffer && (
        <>
          <div
            className="relative overflow-hidden rounded-lg border border-border bg-white"
            style={sicht ? { aspectRatio: `${sicht.w} / ${sicht.h}` } : { aspectRatio: "4 / 3" }}
          >
            <div
              className="absolute transition-all duration-300"
              style={
                nat && sicht
                  ? {
                      left: `${(-sicht.x / sicht.w) * 100}%`,
                      top: `${(-sicht.y / sicht.h) * 100}%`,
                      width: `${(nat.w / sicht.w) * 100}%`,
                      height: `${(nat.h / sicht.h) * 100}%`,
                    }
                  : { left: 0, top: 0, width: "100%" }
              }
            >
              <img
                src={treffer.bild}
                alt={treffer.unit.name || "Explosionszeichnung"}
                draggable={false}
                onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                className="w-full h-full object-contain select-none"
              />
              {nat && treffer.bereich && (
                <svg viewBox={`0 0 ${nat.w} ${nat.h}`} className="absolute inset-0 w-full h-full pointer-events-none">
                  <rect
                    x={treffer.bereich.x1}
                    y={treffer.bereich.y1}
                    width={treffer.bereich.x2 - treffer.bereich.x1}
                    height={treffer.bereich.y2 - treffer.bereich.y1}
                    rx={4}
                    className="fill-[#B8860B]/[0.18] stroke-[#B8860B]"
                    strokeWidth={Math.max(3, nat.w / 320)}
                  />
                </svg>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {treffer.position && (
              <span className="px-1.5 py-0.5 rounded bg-[#B8860B] text-black text-[10px] font-black shrink-0">
                POS. {treffer.position}
              </span>
            )}
            <span className="text-[11px] text-muted-foreground min-w-0 truncate flex-1">
              {treffer.unit.name || treffer.unit.code}
              {treffer.menge ? ` · ${treffer.menge}×` : ""}
            </span>
            {onOpenCatalog && (
              <button
                onClick={onOpenCatalog}
                className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              >
                Im Katalog <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
          {!treffer.bereich && (
            <p className={cn("mt-1 text-[10px] text-muted-foreground")}>
              Die Tafel gehört zu dieser Nummer — die genaue Position markiert der Katalog hier nicht.
            </p>
          )}
        </>
      )}
    </div>
  );
}
