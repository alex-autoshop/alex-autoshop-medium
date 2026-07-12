/**
 * Preis-/Liefer-Bausteine fürs Teileportal:
 * Mitgliedspreise (Level 1–3), Lieferprognose mit Tour-Ansage, Spec-Zeile mit Auto-Load.
 */
import { useEffect, useState } from "react";
import { ChevronDown, Crown, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { apArticleSpecs } from "@/lib/autoparts";

// ─── MITGLIEDSCHAFT ─────────────────────────────────────────

export const MEMBER_LEVELS = [
  { id: "L1", name: "Level 1", pct: 15 },
  { id: "L2", name: "Level 2", pct: 33 },
  { id: "L3", name: "Level 3", pct: 46 },
] as const;
export type MemberLevelId = "none" | "L1" | "L2" | "L3";

const MS_KEY = "tp:membership";
/** Bis der Login-Flow steht: Kunde wählt seine Stufe selbst (localStorage). */
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

/** Grundpreis vs. Mitgliedspreis, alle Stufen zum Aufklappen. */
export function PriceBlock({ price, level }: { price: number; level: MemberLevelId }) {
  const [open, setOpen] = useState(false);
  const my = MEMBER_LEVELS.find((l) => l.id === level);
  const myPrice = my ? memberPrice(price, my.pct) : null;
  return (
    <div className="text-right">
      {myPrice != null ? (
        <>
          <p className="text-xs text-muted-foreground">Grundpreis <span className="line-through">{eur(price)}</span></p>
          <p className="font-bold text-xl leading-tight text-primary">{eur(myPrice)}</p>
          <p className="text-[11px] font-medium text-green-700 dark:text-green-400">
            Dein {my!.name}-Preis — du sparst {eur(price - myPrice)}
          </p>
        </>
      ) : (
        <p className="font-bold text-lg leading-none">{eur(price)}</p>
      )}
      <button onClick={() => setOpen((o) => !o)}
        className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors">
        Mitgliedspreise <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-1 rounded-lg border border-border bg-secondary/40 text-[11px] divide-y divide-border/60 overflow-hidden text-left min-w-[170px]">
          <div className="flex justify-between gap-3 px-2.5 py-1.5"><span>Grundpreis</span><b>{eur(price)}</b></div>
          {MEMBER_LEVELS.map((l) => (
            <div key={l.id} className={cn("flex justify-between gap-3 px-2.5 py-1.5", level === l.id && "bg-primary/10 text-primary font-semibold")}>
              <span>{l.name} (−{l.pct} %)</span><b>{eur(memberPrice(price, l.pct))}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── LIEFERPROGNOSE ─────────────────────────────────────────

const TOUR_NAME = "Morgentour";
const WOCHENTAGE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

/** Bestellt bis 16 Uhr → +n Werktage, Zustellung ca. 9:00 mit der Tour. */
export function deliveryForecast(days: number): string {
  const d = new Date();
  let rest = Math.max(1, days) + (d.getHours() >= 16 ? 1 : 0);
  while (rest > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) rest--; }
  return `${WOCHENTAGE[d.getDay()]}, ${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}. · ca. 9:00 · ${TOUR_NAME}`;
}

export function DeliveryBadge({ deliveryDays, availability }: { deliveryDays?: number; availability?: string }) {
  if (deliveryDays == null) {
    return (
      <div className="text-right space-y-0.5">
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-secondary text-muted-foreground">Lieferzeit auf Anfrage</span>
        <p className="text-[11px] text-muted-foreground max-w-[190px] ml-auto">Meist schon {deliveryForecast(1)} bei dir — wir bestätigen sofort.</p>
      </div>
    );
  }
  const farbe = deliveryDays <= 1
    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    : deliveryDays <= 2
      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
  return (
    <div className="text-right space-y-0.5">
      <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold", farbe)}>
        <Truck className="w-3 h-3" /> {deliveryDays <= 1 ? "1 Werktag" : `${deliveryDays} Werktage`}
      </span>
      <p className="text-[11px] font-medium">Wäre {deliveryForecast(deliveryDays)} da</p>
      {availability && <p className="text-[11px] text-muted-foreground">Lager: {availability}</p>}
    </div>
  );
}

// ─── SPEC-ZEILE (lädt Kriterien automatisch nach, edge-gecacht) ─

export function SpecStrip({ articleId, specs, auto }: {
  articleId: string | number;
  specs?: { name: string; value: string }[];
  auto?: boolean;
}) {
  const [loaded, setLoaded] = useState<{ name: string; value: string }[] | null>(specs && specs.length > 0 ? specs : null);
  useEffect(() => {
    if (loaded || !auto) return;
    let alive = true;
    apArticleSpecs(articleId).then((s) => { if (alive && s.length > 0) setLoaded(s.slice(0, 6)); }).catch(() => {});
    return () => { alive = false; };
  }, [articleId, auto, loaded]);
  if (!loaded || loaded.length === 0) return null;
  return (
    <div className="px-4 pb-2 pt-2 border-t border-border/40 text-xs text-muted-foreground flex flex-wrap items-center gap-y-1">
      {loaded.map((s, si) => (
        <span key={si} className="whitespace-nowrap">
          {si > 0 && <span className="mx-2 text-border">|</span>}
          {s.name}: <span className="font-semibold text-primary">{s.value}</span>
        </span>
      ))}
    </div>
  );
}
