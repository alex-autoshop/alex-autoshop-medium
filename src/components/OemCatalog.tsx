import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ChevronRight, Loader2, Search, ZoomIn, ZoomOut, Maximize2,
  Package, AlertCircle, Copy, Check, Layers, Car, Tag,
} from "lucide-react";
import {
  yqFindByVin, yqGroups, yqNavigationTree, yqUnits, yqUnitInfo, yqUnitParts,
  yqAllParts, yqPartApplicability, yqGroupParts, linkTo, yqImage, partLabel, partNo, partQty,
  type YqLink, type YqNode, type YqUnitShort, type YqUnit, type YqPartSection, type YqPart, type YqVehicle, type YqPartShort,
} from "@/lib/yqcat";
import { cn } from "@/lib/utils";
import { SHOP_INFO } from "@/data/shopInfo";
import { sucheBaugruppen, aehnlicheBaugruppen, type BaugruppenTreffer } from "@/lib/baugruppenSuche";
import { oeNummernAusTeil } from "@/lib/oeAftermarket";
import { OemAftermarket, type KaufTeil } from "@/components/OemAftermarket";
import { type WorkArticle } from "@/components/TeileWorkspace";
import { type MemberLevelId } from "@/components/TeileportalPricing";
import { TeilefinderStufen, ProBereich, CampusBereich, type Stufe, type KvaPosition } from "@/components/TeilefinderPro";

/**
 * Explosionszeichnungen im Werkstatt-Stil (Vorbild Partslink24):
 *
 *   Baugruppen │ Explosionszeichnung │ Teileliste → Ersatzteile mit Preis
 *
 * Der Weg zum Kauf ist EIN System: Teil in der Zeichnung anklicken → rechts
 * stehen sofort die passenden Ersatzteile in derselben Zeile wie überall in
 * der Teilebörse, mit Mitgliedspreis, Lieferzeit und Warenkorb. Die
 * Originalnummer ist nur das Bindeglied — gekauft wird das Ersatzteil.
 *
 * Die Zeichnung kommt als Bild plus Koordinaten-Rechtecke ("imageMaps") vom
 * YQ-Katalog. Positionsnummer im Bild und Zeile in der Teileliste sind in
 * BEIDE Richtungen verknüpft: Zeile antippen hebt die Stelle im Bild hervor,
 * ins Bild klicken springt zur Zeile. Genau das macht den Unterschied zwischen
 * "Bild angucken" und "Teil finden".
 */

type Step = "vehicle" | "groups" | "unit";

interface Crumb { label: string; token: string; action: string; }

/* ── Baumknoten links ─────────────────────────────────────────────── */

const kinderVon = (n: YqNode) => n.childs ?? n.children ?? [];
const hatZeichnung = (n: YqNode) => !!(
  linkTo(n, "getUnits") ||
  linkTo(n, "getGroupParts") ||
  linkTo(n, "getGroupPartsAll") ||
  linkTo(n, "getGroups")
);
const SUCHZUGRIFF = { kinder: kinderVon, name: (n: YqNode) => n.name || "", oeffenbar: hatZeichnung };

function TreeItem({
  node, depth, onOpen,
}: { node: YqNode; depth: number; onOpen: (n: YqNode) => void }) {
  const kids = node.childs ?? node.children ?? [];
  const [open, setOpen] = useState(depth === 0);
  const hasKids = kids.length > 0;
  // Ein Knoten kann BEIDES haben: Unterknoten und eine eigene Zeichnung
  // (z.B. Opel "Scheibenbremse"). Früher klappte so einer nur auf und ließ
  // sich nie öffnen — der Klick blieb wirkungslos.
  const openable = !!(
    linkTo(node, "getUnits") ||
    linkTo(node, "getGroupParts") ||
    linkTo(node, "getGroupPartsAll") ||
    linkTo(node, "getGroups")
  );

  return (
    <div>
      <div
        className="w-full flex items-stretch rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        style={{ paddingLeft: 8 + depth * 12 }}
      >
        {hasKids ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Zuklappen" : "Aufklappen"}
            className="shrink-0 w-5 flex items-center justify-center"
          >
            <ChevronRight className={cn("w-3 h-3 transition-transform", open && "rotate-90")} />
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => {
            if (openable) { onOpen(node); if (hasKids) setOpen(true); }
            else setOpen((o) => !o);
          }}
          className={cn(
            "flex-1 min-w-0 text-left text-[13px] py-1.5 pr-2",
            openable && "font-medium"
          )}
          title={openable ? "Zeichnungen anzeigen" : undefined}
        >
          <span className="truncate block">{node.name || node.code}</span>
        </button>
      </div>
      {open && hasKids && (
        <div>
          {kids.map((k, i) => (
            <TreeItem key={(k.code || k.name || i) + String(i)} node={k} depth={depth + 1} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Zeichnung mit anklickbaren Stellen ───────────────────────────── */

function Drawing({
  unit, activePos, onPick,
}: {
  unit: YqUnit;
  activePos: string | null;
  onPick: (pos: string) => void;
}) {
  const map = unit.imageMaps?.[0];
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  useEffect(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, [unit.token, map?.imageName]);

  if (!map?.imageName) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
        <Package className="w-10 h-10 opacity-25" />
        <p className="text-sm">Für diese Baugruppe gibt es keine Zeichnung.</p>
      </div>
    );
  }

  // Mehrfach vorkommende Positionsnummern zusammenfassen (kommt im Katalog vor).
  const areas = (map.areas ?? []).filter((a) => a.x2 > a.x1 && a.y2 > a.y1);

  return (
    <div className="relative h-full flex flex-col">
      {/* Werkzeugleiste */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-card/70">
        <button onClick={() => setZoom((z) => Math.min(6, z * 1.3))} className="w-8 h-8 rounded-md hover:bg-secondary flex items-center justify-center" title="Vergrößern">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={() => setZoom((z) => Math.max(0.4, z / 1.3))} className="w-8 h-8 rounded-md hover:bg-secondary flex items-center justify-center" title="Verkleinern">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="w-8 h-8 rounded-md hover:bg-secondary flex items-center justify-center" title="Ansicht zurücksetzen">
          <Maximize2 className="w-4 h-4" />
        </button>
        <span className="text-[11px] text-muted-foreground ml-1 tabular-nums">{Math.round(zoom * 100)} %</span>
        <span className="ml-auto text-[11px] text-muted-foreground hidden sm:inline">
          Ziehen zum Verschieben · Nummer anklicken
        </span>
      </div>

      {/* Bildfläche */}
      <div
        className="flex-1 overflow-hidden bg-white relative cursor-grab active:cursor-grabbing"
        onWheel={(e) => {
          if (!e.ctrlKey && !e.metaKey) return;
          e.preventDefault();
          setZoom((z) => Math.min(6, Math.max(0.4, z * (e.deltaY < 0 ? 1.12 : 0.89))));
        }}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setPan({ x: drag.current.px + (e.clientX - drag.current.x), y: drag.current.py + (e.clientY - drag.current.y) });
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerLeave={() => { drag.current = null; }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "center center" }}
        >
          <div className="relative max-w-full max-h-full">
            <img
              // "source" ist die einzige Variante, die der Bildserver ausliefert.
              src={yqImage(map.imageName, "source")}
              alt={unit.name || "Explosionszeichnung"}
              draggable={false}
              onLoad={(e) => {
                const el = e.currentTarget;
                setNat({ w: el.naturalWidth, h: el.naturalHeight });
              }}
              className="max-w-full max-h-[calc(100vh-220px)] object-contain select-none"
            />
            {nat && (
              <svg
                viewBox={`0 0 ${nat.w} ${nat.h}`}
                className="absolute inset-0 w-full h-full"
                preserveAspectRatio="xMidYMid meet"
              >
                {areas.map((a, i) => {
                  const on = activePos != null && a.areaCode === activePos;
                  return (
                    <rect
                      key={`${a.areaCode}-${i}`}
                      x={a.x1} y={a.y1} width={a.x2 - a.x1} height={a.y2 - a.y1}
                      rx={4}
                      onClick={() => a.areaCode && onPick(a.areaCode)}
                      className={cn(
                        "cursor-pointer transition-all",
                        on ? "fill-[#B8860B]/35 stroke-[#B8860B]" : "fill-transparent stroke-transparent hover:fill-[#B8860B]/15 hover:stroke-[#B8860B]/60"
                      )}
                      strokeWidth={Math.max(2, nat.w / 500)}
                    />
                  );
                })}
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Katalog ──────────────────────────────────────────────────────── */

export function OemCatalog({
  vin,
  brand,
  vorabFahrzeug,
  vehicleLabel,
  onBack,
  level = "none",
  onAddArticle,
  istMitglied = false,
  istAdmin = false,
  kvaPositionen = [],
  startTeil,
}: {
  vin?: string;
  /** Marke des Fahrzeugs — nur noch Notnagel, falls kein vorabFahrzeug vorliegt. */
  brand?: string;
  /**
   * Fahrzeug, das die Teilebörse beim FIN-Eintippen schon bestimmt hat.
   * Liegt es vor, entfaellt hier die zweite FIN-Aufloesung — und mit ihr das
   * Raten der Marke, an dem frueher ganze Hersteller gescheitert sind.
   */
  vorabFahrzeug?: YqVehicle | null;
  vehicleLabel?: string;
  onBack: () => void;
  /** Mitgliedsstufe — damit die Ersatzteile denselben Preis zeigen wie die Teilebörse. */
  level?: MemberLevelId;
  /** Ersatzteil in den Teile-Warenkorb — dieselbe Funktion wie in der Trefferliste. */
  onAddArticle?: (a: WorkArticle, menge: number) => void;
  /** Zahlendes Mitglied? Entscheidet über den Pro-Bereich. */
  istMitglied?: boolean;
  /** Nur Alex: blendet den internen Campus-Reiter ein. */
  istAdmin?: boolean;
  /** Warenkorb-Positionen für das Angebot im Pro-Bereich. */
  kvaPositionen?: KvaPosition[];
  /**
   * Teil, mit dem der Finder geöffnet wurde (aus der Trefferliste).
   * Damit springt er direkt auf die passende Zeichnung, statt die
   * Bezeichnung nochmal abzufragen.
   */
  startTeil?: { name: string; articleNumber?: string; oeNumbers?: string[] } | null;
}) {
  const [step, setStep] = useState<Step>("vehicle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [vehicle, setVehicle] = useState<YqVehicle | null>(null);
  const [tree, setTree] = useState<YqNode | null>(null);
  const [units, setUnits] = useState<YqUnitShort[]>([]);
  const [unit, setUnit] = useState<YqUnit | null>(null);
  const [sections, setSections] = useState<YqPartSection[]>([]);
  const [filterState, setFilterState] = useState<string | undefined>();
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  const [activePos, setActivePos] = useState<string | null>(null);
  const [treeSearch, setTreeSearch] = useState("");

  /* Teilesuche im Fahrzeug: alle Teile einmal holen, dann sofort filtern.
     Klick auf einen Treffer holt über getPartApplicability die Bildtafeln,
     in denen das Teil sitzt, und öffnet die erste davon. */
  const [catalogParts, setCatalogParts] = useState<YqPartShort[] | null>(null);
  /** true, wenn der Dienst die Volltextsuche für diesen Zugang sperrt. */
  const [partSearchBlocked, setPartSearchBlocked] = useState(false);
  const [partHitBusy, setPartHitBusy] = useState<string | null>(null);
  const [hitUnits, setHitUnits] = useState<{ label: string; category: string; link: YqLink; partsToken?: string }[]>([]);
  const [hitNumber, setHitNumber] = useState<string | null>(null);
  /** Teil aus der Zeichnung, zu dem rechts die kaufbaren Ersatzteile stehen. */
  const [kaufTeil, setKaufTeil] = useState<KaufTeil | null>(null);
  const [stufe, setStufe] = useState<Stufe>("finder");
  const suchfeld = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const partHits = useMemo(() => {
    const q = treeSearch.trim().toLowerCase();
    if (!catalogParts || q.length < 2) return [];
    return catalogParts
      .filter(
        (p) =>
          (p.partName || "").toLowerCase().includes(q) ||
          (p.partNumber || "").toLowerCase().replace(/\s/g, "").includes(q.replace(/\s/g, ""))
      )
      .slice(0, 60);
  }, [catalogParts, treeSearch]);

  /* Baugruppen-Suche über den GANZEN Baum. Vorher wurde nur die oberste
     Ebene verglichen ("Motor", "Filter" …) — "Ölfilter" steht zwei Ebenen
     tiefer und wurde nie gefunden. */
  const suchText = treeSearch.trim();
  const baugruppenTreffer: BaugruppenTreffer<YqNode>[] = useMemo(
    () => (tree && suchText.length >= 2 ? sucheBaugruppen(tree, suchText, SUCHZUGRIFF, 12) : []),
    [tree, suchText]
  );
  const aehnlich: BaugruppenTreffer<YqNode>[] = useMemo(
    () => (tree && suchText.length >= 2 && baugruppenTreffer.length === 0
      ? aehnlicheBaugruppen(tree, suchText, SUCHZUGRIFF, 3)
      : []),
    [tree, suchText, baugruppenTreffer.length]
  );

  /* Fahrzeug per VIN bestimmen */
  const loadVehicle = useCallback(async () => {
    if (!vin && !vorabFahrzeug) return;
    setBusy(true); setError(null);
    try {
      let v = vorabFahrzeug ?? null;
      let envelope: Parameters<typeof linkTo>[0] = v ?? undefined;
      if (!v) {
        const r = await yqFindByVin(vin!, brand);
        v = r.vehicles[0] ?? null;
        envelope = r.envelope as Parameters<typeof linkTo>[0];
      }
      // Zwei Ursachen sehen gleich aus: Tippfehler in der FIN — oder eine Marke,
      // die statt der FIN eine Modellauswahl verlangt (Hyundai, Kia, Nissan, Mazda).
      // Deshalb keine Ursachen-Behauptung, sondern ein Weg, der immer funktioniert.
      if (!v) {
        setError(`Zu dieser FIN liefert der Katalog${brand ? " von " + brand : ""} kein Fahrzeug. Prüf die FIN — oder ruf uns an: ${SHOP_INFO.phone}, wir schlagen die Zeichnung für dich nach.`);
        return;
      }
      setVehicle(v);
      const link = linkTo(v, "getGroups") || linkTo(v, "getNavigationTree") || linkTo(envelope, "getGroups");
      if (!link) { setError("Der Katalog liefert für dieses Fahrzeug keine Baugruppen."); return; }
      const res = link.action === "getGroups" ? await yqGroups(link.token) : await yqNavigationTree(link.token);
      setTree((res.data as YqNode) ?? null);
      setFilterState(res.currentFilterState);
      setStep("groups");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Der Katalog antwortet gerade nicht.");
    } finally { setBusy(false); }
  }, [vin, brand, vorabFahrzeug]);

  useEffect(() => { loadVehicle(); }, [loadVehicle]);

  /* Baugruppe öffnen → Zeichnung + Teileliste */
  const openUnit = async (u: YqUnitShort, label: string) => {
    const infoLink = linkTo(u, "getUnitInfo");
    const partsLink = linkTo(u, "getUnitParts");
    const token = infoLink?.token || partsLink?.token || u.token || "";
    if (!token) return;
    setBusy(true); setError(null); setActivePos(null); setKaufTeil(null);
    try {
      // Jeder Link trägt seinen EIGENEN Token. getUnitParts mit dem
      // getUnitInfo-Token beantwortet der Dienst mit einer leeren Liste.
      const [info, parts] = await Promise.all([
        yqUnitInfo(token, filterState),
        yqUnitParts(partsLink?.token || token, filterState),
      ]);
      setUnit(info.unit ?? null);
      setSections(parts.sections);
      setCrumbs((c) => [...c.slice(0, 2), { label, token, action: "getUnitInfo" }]);
      setStep("unit");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Baugruppe konnte nicht geladen werden.");
    } finally { setBusy(false); }
  };

  /* Knoten im Baum anklicken → Baugruppen laden. Gibt die Baugruppen zurück,
     damit die Suche bei genau einer Zeichnung direkt hineinspringen kann. */
  const openNode = async (n: YqNode): Promise<YqUnitShort[]> => {
    const unitsLink = linkTo(n, "getUnits");
    const groupLink = linkTo(n, "getGroups");
    // Manche Marken (z.B. Opel) liefern die Baugruppen nicht über getUnits,
    // sondern über getGroupParts — gleiche Zeichnungen, anderer Endpunkt.
    const gpLink = linkTo(n, "getGroupParts") || linkTo(n, "getGroupPartsAll");
    if (!unitsLink && gpLink) {
      setBusy(true); setError(null);
      try {
        const res = await yqGroupParts(gpLink.token, gpLink.action === "getGroupPartsAll", filterState);
        setUnits(res.units);
        setFilterState(res.filterState ?? filterState);
        setCrumbs([{ label: n.name || "Gruppe", token: gpLink.token, action: gpLink.action }]);
        if (res.units.length === 0) setError(`Für „${n.name}" liefert der Katalog keine Zeichnung.`);
        return res.units;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Baugruppen konnten nicht geladen werden.");
      } finally { setBusy(false); }
      return [];
    }
    if (unitsLink) {
      setBusy(true);
      try {
        const res = await yqUnits(unitsLink.token, filterState);
        setUnits(res.units);
        setFilterState(res.filterState ?? filterState);
        setCrumbs([{ label: n.name || "Gruppe", token: unitsLink.token, action: "getUnits" }]);
        return res.units;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Baugruppen konnten nicht geladen werden.");
      } finally { setBusy(false); }
    } else if (groupLink) {
      setBusy(true);
      try {
        const res = await yqGroups(groupLink.token, filterState);
        setTree((res.data as YqNode) ?? null);
      } finally { setBusy(false); }
    }
    return [];
  };

  /* Suchtreffer (Baugruppe) anklicken: Gruppe laden — und gibt es darin genau
     EINE Zeichnung, gleich hinein. "Ölfilter" tippen, Enter, Zeichnung da. */
  const oeffneTreffer = async (n: YqNode) => {
    const geladen = await openNode(n);
    if (geladen.length === 1) {
      const u = geladen[0];
      await openUnit(u, u.name || n.name || "Baugruppe");
    }
  };

  const allParts = useMemo(
    () => sections.flatMap((s) => (s.parts ?? []).map((p) => ({ ...p, section: s.title }))),
    [sections]
  );


  /* Baugruppe laden und — wenn von der Suche kommend — das Teil markieren. */
  const openUnitLink = useCallback(async (link: YqLink, highlightNumber?: string, partsToken?: string) => {
    setBusy(true); setError(null);
    try {
      // Jeder Link trägt seinen eigenen Token — getUnitParts mit dem
      // getUnitInfo-Token liefert eine leere Teileliste.
      const [info, parts] = await Promise.all([
        yqUnitInfo(link.token, filterState),
        yqUnitParts(partsToken || link.token, filterState),
      ]);
      setUnit(info.unit ?? null);
      setSections(parts.sections);
      setStep("unit");
      setKaufTeil(null);
      const flat = parts.sections.flatMap((sec) => sec.parts ?? []);
      const hit =
        (highlightNumber &&
          flat.find(
            (x) =>
              partNo(x).replace(/\s/g, "").toLowerCase() ===
              highlightNumber.replace(/\s/g, "").toLowerCase()
          )) ||
        flat.find((x) => x.matched);
      const pos = (hit?.areaCode || "").trim();
      setActivePos(pos || null);
      if (pos) setTimeout(() => rowRefs.current[pos]?.scrollIntoView({ block: "center" }), 60);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [filterState]);

  /* Suchtreffer anklicken -> Bildtafeln ermitteln und erste öffnen. */
  const openPartHit = useCallback(async (part: YqPartShort) => {
    const number = (part.partNumber || "").trim();
    if (!number || !vehicle?.token) return;
    setPartHitBusy(number); setError(null);
    try {
      const { categories } = await yqPartApplicability(vehicle.token, number);
      const found: { label: string; category: string; link: YqLink; partsToken?: string }[] = [];
      for (const cat of categories) {
        for (const u of cat.units ?? []) {
          const link = linkTo(u.unit, "getUnitInfo");
          if (link) {
            found.push({
              label: u.unit?.code || u.unit?.name || "Bildtafel",
              category: cat.category?.name || "",
              link,
              partsToken: linkTo(u.unit, "getUnitParts")?.token,
            });
          }
        }
      }
      setHitUnits(found);
      setHitNumber(number);
      if (found.length === 0) {
        setError(`Zu ${number} liefert der Teilefinder keine Zeichnung.`);
        return;
      }
      await openUnitLink(found[0].link, number, found[0].partsToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPartHitBusy(null);
    }
  }, [vehicle?.token, openUnitLink]);


  /* Einmal pro Fahrzeug alle Teile holen — danach sucht es ohne Netzverkehr. */
  useEffect(() => {
    const token = vehicle?.token;
    if (!token) return;
    let alive = true;
    setCatalogParts(null);
    setPartSearchBlocked(false);
    yqAllParts(token)
      .then((r) => { if (alive) setCatalogParts(r.parts); })
      .catch((e) => {
        if (!alive) return;
        setCatalogParts([]);
        // "Access denied" heißt: der Endpunkt ist für diesen Zugang nicht
        // freigeschaltet — nicht, dass es das Teil nicht gibt.
        setPartSearchBlocked(/access denied|forbidden|denied/i.test(String(e?.message || e)));
      });
    return () => { alive = false; };
  }, [vehicle?.token]);

  /* ── Direkt zum Teil, mit dem der Finder geöffnet wurde ──────────────
     Vorher landete man auf der leeren Zeichnungsfläche und musste die
     Bezeichnung ein zweites Mal eintippen. Jetzt: erst über die
     Originalnummer die echte Bildtafel suchen, sonst über die Bezeichnung
     die Baugruppe — und nur wenn beides nichts findet, steht der Begriff
     wenigstens schon im Suchfeld. */
  const startErledigt = useRef(false);
  useEffect(() => {
    const token = vehicle?.token;
    if (!startTeil || startErledigt.current || !tree || !token) return;
    startErledigt.current = true;
    let lebt = true;

    const begriffe = (name: string) => {
      const teile = [name, ...name.split(/[,/(]/).map((x) => x.trim())]
        .map((x) => x.replace(/\s+/g, " ").trim())
        .filter((x) => x.length >= 4);
      return [...new Set(teile)];
    };

    (async () => {
      setBusy(true);
      try {
        for (const nr of (startTeil.oeNumbers ?? []).slice(0, 3)) {
          if (!lebt) return;
          const { categories } = await yqPartApplicability(token, nr);
          for (const cat of categories) {
            for (const u of cat.units ?? []) {
              const link = linkTo(u.unit, "getUnitInfo");
              if (link && lebt) {
                await openUnitLink(link, nr, linkTo(u.unit, "getUnitParts")?.token);
                return;
              }
            }
          }
        }
        for (const b of begriffe(startTeil.name)) {
          const treffer = sucheBaugruppen(tree, b, SUCHZUGRIFF, 1);
          if (treffer[0] && lebt) {
            await oeffneTreffer(treffer[0].node);
            return;
          }
        }
        if (lebt) setTreeSearch(startTeil.name);
      } catch {
        if (lebt) setTreeSearch(startTeil.name);
      } finally {
        if (lebt) setBusy(false);
      }
    })();

    return () => { lebt = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTeil, tree, vehicle?.token]);

  /** Teil der Zeichnung → rechts die kaufbaren Ersatzteile dazu. */
  const kaufen = (p: YqPart) => {
    const nummern = oeNummernAusTeil(p);
    if (nummern.length === 0) return;
    const pos = (p.areaCode || "").trim();
    if (pos) setActivePos(pos);
    setKaufTeil({ pos, nummer: partNo(p), name: partLabel(p), nummern });
  };

  const pickPos = (pos: string) => {
    setActivePos(pos);
    // Steht an der Stelle genau EIN Teil, gleich die Ersatzteile zeigen.
    // Mehrere Nummern an derselben Stelle (links/rechts, alt/neu): erst die
    // Liste — da muss man selbst wählen, sonst kauft jemand die falsche Seite.
    const hier = allParts.filter((x) => (x.areaCode || "").trim() === pos && partNo(x));
    if (hier.length === 1) { kaufen(hier[0]); return; }
    setKaufTeil(null);
    setTimeout(() => rowRefs.current[pos]?.scrollIntoView({ block: "center", behavior: "smooth" }), 30);
  };

  const copyNo = (no: string) => {
    navigator.clipboard?.writeText(no).then(() => {
      setCopied(no);
      setTimeout(() => setCopied(null), 1400);
    }).catch(() => { /* ohne Zwischenablage eben nicht */ });
  };

  /* ── Kopfzeile ── */
  const header = (
    <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-20">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors shrink-0">
        <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Teileportal</span>
      </button>
      <span className="text-muted-foreground/30 hidden sm:inline">|</span>
      <Car className="w-4 h-4 text-primary shrink-0" />
      <span className="text-sm font-semibold truncate min-w-0">
        {vehicle ? [vehicle.brand, vehicle.name || vehicle.model, vehicle.description].filter(Boolean).join(" ") : vehicleLabel || "Teilefinder"}
      </span>
      {stufe === "finder" && crumbs.map((c) => (
        <span key={c.token} className="hidden xl:flex items-center gap-2 min-w-0">
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
          <span className="text-sm text-muted-foreground truncate">{c.label}</span>
        </span>
      ))}
      {busy && stufe === "finder" && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
      <div className="ml-auto shrink-0">
        <TeilefinderStufen stufe={stufe} setStufe={setStufe} istMitglied={istMitglied} istAdmin={istAdmin} />
      </div>
    </div>
  );

  if (error) {
    return (
      <div>
        {header}
        <div className="max-w-lg mx-auto text-center py-20 px-6">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
          <p className="font-semibold mb-1">Teilefinder gerade nicht verfügbar</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button onClick={onBack} className="btn-outline mt-6">Zurück zur Teilesuche</button>
        </div>
      </div>
    );
  }

  const treeNodes = tree?.childs ?? tree?.children ?? [];
  const sucht = suchText.length >= 2;
  const hatMengen = allParts.some((p) => partQty(p));
  const vehicleVinAnzeige = (vin || "").trim().toUpperCase();
  const fahrzeugName = vehicle
    ? [vehicle.brand, vehicle.name || vehicle.model].filter(Boolean).join(" ")
    : (vehicleLabel || "");

  return (
    <div>
      {header}

      {stufe === "pro" && (
        <div className="h-[calc(100vh-108px)]">
          <ProBereich
            istMitglied={istMitglied}
            vin={vehicleVinAnzeige}
            fahrzeug={fahrzeugName}
            level={level}
            positionen={kvaPositionen}
          />
        </div>
      )}

      {stufe === "campus" && istAdmin && (
        <div className="h-[calc(100vh-108px)]"><CampusBereich /></div>
      )}

      {/* Der Finder bleibt beim Wechsel nach Pro/Campus GELADEN (Zeichnung,
          Baugruppen, Suche) — nur unsichtbar. display per style, weil die
          Klasse "hidden" von "lg:grid" wieder überschrieben würde. */}
      <div
        style={{ display: stufe === "finder" ? undefined : "none" }}
        className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)_440px] lg:h-[calc(100vh-108px)]"
      >
        {/* ── Links: Suche + Baugruppen ── */}
        {/* Auf dem Handy oben, begrenzt hoch — vorher war die Spalte dort ganz
            ausgeblendet und man kam an keine Baugruppe heran. */}
        <aside className="border-b lg:border-b-0 lg:border-r border-border overflow-y-auto p-2 max-h-[45vh] lg:max-h-none">
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <input
              ref={suchfeld}
              value={treeSearch}
              onChange={(e) => setTreeSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const t = baugruppenTreffer[0];
                  if (t) { setTreeSearch(""); oeffneTreffer(t.node); }
                  else if (partHits[0]) openPartHit(partHits[0]);
                }
                if (e.key === "Escape") setTreeSearch("");
              }}
              placeholder="Baugruppe — z.B. Ölfilter"
              className="w-full h-9 pl-8 pr-7 rounded-lg border border-border bg-card text-[13px] focus:outline-none focus:border-primary/60"
            />
            {treeSearch && (
              <button
                onClick={() => { setTreeSearch(""); suchfeld.current?.focus(); }}
                aria-label="Suche leeren"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground/60 hover:text-foreground"
              >
                ×
              </button>
            )}
          </div>

          {sucht && (
            <div className="mb-3">
              {/* Baugruppen — Klick öffnet die Gruppe, bei einer Zeichnung gleich diese */}
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-1">
                Baugruppen ({baugruppenTreffer.length})
              </p>
              {baugruppenTreffer.length > 0 ? (
                <ul className="space-y-0.5">
                  {baugruppenTreffer.map((t, i) => (
                    <li key={t.pfad.join("›") + i}>
                      <button
                        onClick={() => { setTreeSearch(""); oeffneTreffer(t.node); }}
                        className={cn(
                          "w-full text-left px-2 py-1.5 rounded-md transition-colors flex items-start gap-2",
                          i === 0 ? "bg-primary/[0.07] hover:bg-primary/12" : "hover:bg-secondary"
                        )}
                      >
                        <Layers className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary/70" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13px] font-semibold leading-tight">{t.pfad[t.pfad.length - 1]}</span>
                          {t.pfad.length > 1 && (
                            <span className="block text-[10.5px] text-muted-foreground truncate">
                              {t.pfad.slice(0, -1).join(" › ")}
                            </span>
                          )}
                        </span>
                        {i === 0 && <span className="text-[9px] text-muted-foreground/70 mt-0.5 shrink-0">Enter</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-muted-foreground px-1 py-1.5 leading-snug">
                  Keine Baugruppe „{suchText}" bei diesem Fahrzeug.
                  {aehnlich.length > 0 && (
                    <>
                      {" "}Ähnlich:{" "}
                      {aehnlich.map((t, i) => (
                        <span key={t.pfad.join("›")}>
                          {i > 0 && ", "}
                          <button
                            onClick={() => { setTreeSearch(""); oeffneTreffer(t.node); }}
                            className="text-primary font-semibold hover:underline"
                          >
                            {t.pfad[t.pfad.length - 1]}
                          </button>
                        </span>
                      ))}
                    </>
                  )}
                </p>
              )}

              {/* Einzelteile per Volltext — nur, wenn der Marken-Katalog sie liefert.
                  Wo er gesperrt ist, bleibt der Abschnitt weg statt eine Fehlermeldung
                  anzuzeigen: die Baugruppen-Suche oben deckt es ab. */}
              {partHits.length > 0 && (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 mt-3 mb-1">
                    Teile ({partHits.length}{partHits.length === 60 ? "+" : ""})
                  </p>
                  <ul className="space-y-0.5">
                    {partHits.map((h, i) => {
                      const no = (h.partNumber || "").trim();
                      const active = hitNumber === no;
                      return (
                        <li key={`${no}-${i}`}>
                          <button
                            onClick={() => openPartHit(h)}
                            className={cn(
                              "w-full text-left px-2 py-1.5 rounded-md transition-colors flex items-start gap-2",
                              active ? "bg-primary/12 ring-1 ring-inset ring-primary/40" : "hover:bg-secondary"
                            )}
                          >
                            <span className="flex-1 min-w-0">
                              <span className="block font-mono text-[11px] font-semibold truncate">{no}</span>
                              <span className="block text-[11px] text-muted-foreground leading-snug">{h.partName || "—"}</span>
                            </span>
                            {partHitBusy === no ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0 mt-0.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 mt-0.5" />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          )}

          {/* Baum bzw. Baugruppen der gewählten Gruppe — während der Suche mit
              Treffern ausgeblendet, sonst steht das Gesuchte unter 300 Zeilen. */}
          {(!sucht || baugruppenTreffer.length === 0) && (units.length > 0 ? (
            <>
              <button
                onClick={() => { setUnits([]); setCrumbs([]); }}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary mb-1 px-2"
              >
                <ArrowLeft className="w-3 h-3" /> Alle Gruppen
              </button>
              <div className="space-y-0.5">
                {units.map((u, i) => {
                  const link = linkTo(u, "getUnitInfo") || linkTo(u, "getUnitParts");
                  const active = unit?.code && u.code === unit.code;
                  return (
                    <button
                      key={(u.code || "") + i}
                      onClick={() => link && openUnit(u, u.name || u.code || "Baugruppe")}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-[13px] transition-colors",
                        active ? "bg-primary/10 text-foreground font-semibold" : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {u.imageNames?.[0] ? (
                        <img src={yqImage(u.imageNames[0], "source")} alt="" loading="lazy" className="w-8 h-8 object-contain bg-white rounded border border-border/60 shrink-0" />
                      ) : (
                        <Layers className="w-4 h-4 shrink-0 opacity-40" />
                      )}
                      <span className="truncate">{u.name || u.code}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="space-y-0.5">
              {treeNodes.map((n, i) => (
                <TreeItem key={(n.code || n.name || i) + String(i)} node={n} depth={0} onOpen={openNode} />
              ))}
              {treeNodes.length === 0 && !busy && (
                <p className="text-xs text-muted-foreground px-2 py-4">Keine Baugruppen gefunden.</p>
              )}
            </div>
          ))}
        </aside>

        {/* ── Mitte: Zeichnung ── */}
        <section className="border-r border-border min-w-0 h-[60vh] lg:h-auto flex flex-col">
          {/* Sitzt das gesuchte Teil in mehreren Bildtafeln, hier umschaltbar */}
          {hitUnits.length > 1 && hitNumber && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border bg-primary/5 overflow-x-auto">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 pl-1">
                {hitNumber} in
              </span>
              {hitUnits.map((h, i) => (
                <button
                  key={`${h.label}-${i}`}
                  onClick={() => openUnitLink(h.link, hitNumber, h.partsToken)}
                  title={h.category}
                  className={cn(
                    "shrink-0 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors border",
                    unit?.code === h.label
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground hover:border-primary/60 hover:text-foreground"
                  )}
                >
                  {h.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex-1 min-h-0">
            {unit ? (
              <Drawing unit={unit} activePos={activePos} onPick={pickPos} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center px-8 text-muted-foreground gap-2">
                <Layers className="w-10 h-10 opacity-25" />
                <p className="text-sm">
                  Baugruppe suchen oder links wählen — die Zeichnung erscheint hier.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ── Rechts: Teileliste → Ersatzteile ── */}
        <aside className="flex flex-col min-h-0 overflow-hidden h-[70vh] lg:h-auto">
          {kaufTeil ? (
            <OemAftermarket
              teil={kaufTeil}
              fahrzeugMarke={vehicle?.brand || brand || ""}
              fahrzeugLabel={vehicle ? [vehicle.brand, vehicle.name || vehicle.model].filter(Boolean).join(" ") : vehicleLabel}
              level={level}
              onAdd={onAddArticle}
              onZurueck={() => setKaufTeil(null)}
            />
          ) : (
            <>
              {allParts.length > 0 && (
                <p className="shrink-0 px-3 py-2 text-[11px] text-muted-foreground border-b border-border/60 bg-primary/[0.04] flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-primary shrink-0" />
                  Teil anklicken — hier erscheinen die passenden Ersatzteile mit Preis.
                </p>
              )}
              <div className="flex-1 min-h-0 overflow-y-auto">
                {allParts.length > 0 ? (
                  <table className="w-full text-[13px]">
                    <thead className="sticky top-0 bg-secondary/90 backdrop-blur-sm">
                      <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        <th className="text-left font-bold px-2 py-2 w-10">Pos.</th>
                        <th className="text-left font-bold px-2 py-2">Teilenummer / Bezeichnung</th>
                        {hatMengen && <th className="text-right font-bold px-2 py-2 w-12">Anz.</th>}
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {allParts.map((p, i) => {
                        const pos = (p.areaCode || "").trim();
                        const on = (pos !== "" && pos === activePos) || (!activePos && !!p.matched);
                        const no = partNo(p);
                        return (
                          <tr
                            key={`${pos}-${no}-${i}`}
                            ref={(el) => { if (pos) rowRefs.current[pos] = el; }}
                            onClick={() => no && kaufen(p)}
                            title={no ? "Passende Ersatzteile mit Preis anzeigen" : undefined}
                            className={cn(
                              "border-b border-border/60 transition-colors group",
                              no ? "cursor-pointer" : "cursor-default",
                              on ? "bg-primary/15 ring-1 ring-inset ring-primary/40" : "hover:bg-secondary/60"
                            )}
                          >
                            <td className="px-2 py-2 align-top">
                              <span className={cn(
                                "inline-flex items-center justify-center min-w-[22px] h-[22px] px-1 rounded text-[11px] font-bold",
                                on ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                              )}>
                                {pos || "–"}
                              </span>
                            </td>
                            <td className="px-2 py-2 align-top min-w-0">
                              {no && (
                                <span className="inline-flex items-center gap-1">
                                  {/* Die Nummer selbst führt zu den Ersatzteilen (früher: kopieren). */}
                                  <span className="font-mono text-[12px] font-semibold group-hover:text-primary">{no}</span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); copyNo(no); }}
                                    className="w-5 h-5 inline-flex items-center justify-center rounded text-muted-foreground/50 hover:text-primary hover:bg-secondary"
                                    title="Nummer kopieren"
                                    aria-label="Nummer kopieren"
                                  >
                                    {copied === no ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-2.5 h-2.5" />}
                                  </button>
                                </span>
                              )}
                              <p className="text-muted-foreground leading-snug">{partLabel(p)}</p>
                            </td>
                            {hatMengen && (
                              <td className="px-2 py-2 text-right align-top tabular-nums text-muted-foreground">
                                {partQty(p)}
                              </td>
                            )}
                            <td className="px-1 py-2 align-top">
                              {no && <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary mt-0.5" />}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center px-6 text-muted-foreground gap-2 py-16">
                    <Package className="w-9 h-9 opacity-25" />
                    <p className="text-sm">Hier stehen die Teile der gewählten Baugruppe — anklicken, und die passenden Ersatzteile mit Preis erscheinen.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
