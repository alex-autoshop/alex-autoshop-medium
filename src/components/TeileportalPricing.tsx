/**
 * Preis-/Liefer-Bausteine fürs Teileportal — IC-Style Design.
 * Ein Verkaufspreis für alle. Die Mitgliedschaft gilt im Shopify-Shop.
 */
import { useEffect, useState } from "react";
import { Crown, Truck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { merkmaleLaden, positionZuerst } from "@/lib/einbauposition";

// ─── MITGLIEDSCHAFT ─────────────────────────────────────────

export const MEMBER_LEVELS = [
  { id: "L1", name: "Level 1", pct: 15 },
  { id: "L2", name: "Level 2", pct: 28 },
  { id: "L3", name: "Level 3", pct: 40 },
] as const;
export type MemberLevelId = "none" | "L1" | "L2" | "L3";

const MS_KEY = "tp:membership";
export function useMembership(): [MemberLevelId, (l: MemberLevelId) => void] {
  const [level, setLevel] = useState<MemberLevelId>(() => {
    try { return (localStorage.getItem(MS_KEY) as MemberLevelId) || "none"; } catch { return "none"; }
  });
  const set = (l: MemberLevelId) => { setLevel(l); try { localStorage.setItem(MS_KEY, l); } catch { /* egal */ } };
  return [level, set];
}

export const eur = (x: number) => `${x.toFixed(2).replace(".", ",")} €`;
export const memberPrice = (grund: number, pct: number) => Math.ceil(grund * (1 - pct / 100) * 100) / 100;

export function MembershipSelect({ level, onChange }: { level: MemberLevelId; onChange: (l: MemberLevelId) => void }) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
      <Crown className="w-3.5 h-3.5 text-primary" /> Mitgliedschaft:
      <select value={level} onChange={(e) => onChange(e.target.value as MemberLevelId)}
        className="rounded-lg border border-border bg-card px-2 py-1 text-xs font-medium">
        <option value="none">Keine</option>
        {MEMBER_LEVELS.map((l) => <option key={l.id} value={l.id}>{l.name} (−{l.pct} %)</option>)}
      </select>
    </label>
  );
}

// ─── IC-STYLE PREIS-BLOCK ────────────────────────────────────

/**
 * Ein Bruttopreis für alle. `level` bleibt in der Signatur, damit bestehende
 * Aufrufer nicht brechen; die Teilebörse rechnet keinen Mitgliedsrabatt.
 */
export function PriceBlock({ price }: { price: number; level?: MemberLevelId }) {
  return (
    <div className="text-right">
      <p className="text-[11px] text-muted-foreground/70 leading-none mb-0.5">Preis</p>
      <p className="font-bold text-lg leading-tight">{eur(price)}</p>
      <p className="text-[10px] text-muted-foreground leading-none">inkl. MwSt</p>
    </div>
  );
}

// ─── IC-STYLE LIEFER-BADGE ───────────────────────────────────

const WOCHENTAGE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export function deliveryForecast(days: number): string {
  const d = new Date();
  let rest = Math.max(1, days) + (d.getHours() >= 16 ? 1 : 0);
  while (rest > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) rest--; }
  return `${WOCHENTAGE[d.getDay()]}, ${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.`;
}

/**
 * Lieferbadge à la Intercars:
 * 🟢 Heute (in der Filiale) 06:00
 * ⚡ 1 Werktag
 */
export function DeliveryBadge({
  deliveryDays,
  availability,
  compact = false,
}: {
  deliveryDays?: number;
  availability?: string;
  /** Eine Zeile statt drei — fuer die Trefferliste, wo Platz knapp ist. */
  compact?: boolean;
}) {
  if (compact) {
    if (deliveryDays == null) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
          <Truck className="w-3.5 h-3.5 shrink-0 opacity-60" /> Lieferzeit auf Anfrage
        </span>
      );
    }
    const naechsterTag = deliveryDays <= 1;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-[12px] font-semibold",
          naechsterTag ? "text-green-700 dark:text-green-400" : "text-muted-foreground"
        )}
      >
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0",
            naechsterTag ? "bg-green-500" : deliveryDays === 2 ? "bg-yellow-500" : "bg-amber-500"
          )}
        />
        {naechsterTag ? "1 Werktag · Inter Cars" : `${deliveryForecast(deliveryDays)} · ${deliveryDays} Werktage`}
      </span>
    );
  }

  if (deliveryDays == null) {
    return (
      <div className="space-y-1">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700">
          <Truck className="w-3.5 h-3.5" /> Lieferzeit auf Anfrage
        </span>
        <p className="text-[11px] text-muted-foreground leading-snug">
          Lieferzeit steht fest, sobald Inter Cars ein Datum nennt.
        </p>
      </div>
    );
  }

  const is1day = deliveryDays <= 1;
  const is2day = deliveryDays === 2;

  return (
    <div className="space-y-1">
      {/* Datum-Badge — grün wenn 1 Tag, gelb wenn 2, orange wenn mehr */}
      <span className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border",
        is1day
          ? "bg-green-500 text-white border-green-600"
          : is2day
            ? "bg-yellow-400 text-yellow-900 border-yellow-500"
            : "bg-amber-400 text-amber-900 border-amber-500"
      )}>
        {is1day && (
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
          </span>
        )}
        {is1day ? "1 Werktag · Inter Cars" : `${deliveryForecast(deliveryDays)} · ${deliveryDays} Werktage`}
      </span>

      {/* Werktage-Badge */}
      <div>
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium",
          is1day ? "text-green-700 dark:text-green-400" : "text-muted-foreground"
        )}>
          {is1day ? <Zap className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
          {is1day ? "1 Werktag" : `${deliveryDays} Werktage`}
          {availability && availability.includes("sofort") && (
            <span className="ml-1 text-muted-foreground">· {availability}</span>
          )}
        </span>
      </div>
    </div>
  );
}

// ─── SPEC-WERTE LESBAR MACHEN ────────────────────────────────
// TecDoc liefert Baujahre als YYYYMM ohne Trenner ("201905") und mehrere
// Werte mit Semikolon ("201905; 202010"). Für Werkstatt-Mitarbeiter ist das
// nicht lesbar → "2019/05 · 2020/10".
// Nur bei Datums-Feldern anwenden: eine 6-stellige Artikelnummer darf NICHT
// zu "2051/30" werden.
const DATE_SPEC_RE = /baujahr|bj\.?\b|jahr|year|datum|date|modelljahr/i;

export function formatSpecValue(name: string, value: string): string {
  if (!value) return value;
  if (!DATE_SPEC_RE.test(name || "")) return value;
  return String(value)
    .split(/\s*[;,]\s*/)
    .map((tok) => {
      const m = tok.trim().match(/^(\d{4})(\d{2})$/);
      if (!m) return tok.trim();
      const [, y, mo] = m;
      const mn = parseInt(mo, 10);
      const yr = parseInt(y, 10);
      // Plausibilitätsprüfung: echter Monat und realistisches Baujahr
      if (mn < 1 || mn > 12 || yr < 1900 || yr > 2100) return tok.trim();
      return `${y}/${mo}`;
    })
    .filter(Boolean)
    .join(" · ");
}

// ─── SPEC-ZEILE ──────────────────────────────────────────────

export function SpecStrip({ articleId, specs, auto }: {
  articleId: string | number;
  specs?: { name: string; value: string }[];
  auto?: boolean;
}) {
  const vorab = specs && specs.length > 0 ? positionZuerst(specs).slice(0, 6) : null;
  const [loaded, setLoaded] = useState<{ name: string; value: string }[] | null>(vorab);
  // Anderes Teil gewählt → dessen Daten, nicht die des vorigen stehen lassen.
  const [fuer, setFuer] = useState(String(articleId));
  if (fuer !== String(articleId)) {
    setFuer(String(articleId));
    setLoaded(vorab);
  }
  useEffect(() => {
    if (loaded || !auto) return;
    let alive = true;
    // Einbauposition (vorne/hinten, links/rechts) zuerst — sie stand sonst als
    // letztes Merkmal hinter den ersten sechs und fiel weg.
    merkmaleLaden(articleId)
      .then((s) => { if (alive && s.length > 0) setLoaded(positionZuerst(s).slice(0, 6)); })
      .catch(() => {});
    return () => { alive = false; };
  }, [articleId, auto, loaded]);

  if (!loaded || loaded.length === 0) return null;
  return (
    <div className="px-4 pb-2 pt-2 border-t border-border/40 text-xs text-muted-foreground flex flex-wrap items-center gap-y-1">
      {loaded.map((s, si) => (
        <span key={si} className="whitespace-nowrap">
          {si > 0 && <span className="mx-2 text-border">|</span>}
          {s.name}: <span className="font-semibold text-foreground/80">{formatSpecValue(s.name, s.value)}</span>
        </span>
      ))}
    </div>
  );
}
