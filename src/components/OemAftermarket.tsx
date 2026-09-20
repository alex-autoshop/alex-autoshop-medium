import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, PackageSearch, Phone, MessageCircle, ChevronDown } from "lucide-react";
import { TeileZeile, type WorkArticle } from "@/components/TeileWorkspace";
import { type MemberLevelId } from "@/components/TeileportalPricing";
import { aftermarketZuOe, type OeArtikel } from "@/lib/oeAftermarket";
import { icPriceLookup } from "@/lib/intercarsGateway";
import { SHOP_INFO, whatsappLink } from "@/data/shopInfo";
import { cn } from "@/lib/utils";

/**
 * Rechte Spalte, wenn in der Explosionszeichnung ein Teil angeklickt wurde:
 * die kaufbaren Ersatzteile dazu — in genau derselben Zeile wie in der
 * normalen Teilebörse (Foto, Marke, Lieferzeit, Mitgliedspreis, Warenkorb).
 * Ein System, keine zweite Oberfläche.
 *
 * Reihenfolge wie überall in der Teilebörse: was am schnellsten da ist, steht
 * oben, bei gleicher Lieferzeit das günstigere.
 */

export interface KaufTeil {
  pos: string;
  /** Nummer, wie sie in der Zeichnungsliste steht. */
  nummer: string;
  name: string;
  /** Alle Originalnummern dieses Teils (Katalog-, GM-, Ersatznummer …). */
  nummern: string[];
}

type Zeile = OeArtikel & {
  price?: number;
  deliveryDays?: number;
  availability?: string;
  icSku?: string;
  /** true, sobald der Preis-Abruf für diese Zeile durch ist (mit oder ohne Treffer). */
  geprueft?: boolean;
};

const PREIS_STAPEL = 12;   // so viele Preise auf einmal
const PREIS_MAX = 36;      // höchstens so viele insgesamt, dann ist Schluss
const GLEICHZEITIG = 4;    // Inter Cars nicht mit 36 Anfragen gleichzeitig fluten

export function OemAftermarket({
  teil,
  fahrzeugMarke,
  fahrzeugLabel,
  level,
  onAdd,
  onZurueck,
}: {
  teil: KaufTeil;
  fahrzeugMarke: string;
  fahrzeugLabel?: string;
  level: MemberLevelId;
  onAdd?: (a: WorkArticle, menge: number) => void;
  onZurueck: () => void;
}) {
  const [zeilen, setZeilen] = useState<Zeile[] | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [alleZeigen, setAlleZeigen] = useState(false);
  const [aktiv, setAktiv] = useState<string | null>(null);

  const schluessel = teil.nummern.join("|");

  useEffect(() => {
    let lebt = true;
    setZeilen(null);
    setFehler(null);
    setAlleZeigen(false);
    setLaeuft(true);

    (async () => {
      try {
        const { artikel } = await aftermarketZuOe(teil.nummern, fahrzeugMarke);
        if (!lebt) return;
        let stand: Zeile[] = artikel.map((a) => ({ ...a }));
        setZeilen(stand);
        if (stand.length === 0) return;

        // Preise in Stapeln holen, bis genug lieferbare Teile da sind.
        let bisher = 0;
        while (lebt && bisher < Math.min(stand.length, PREIS_MAX)) {
          const stapel = stand.slice(bisher, bisher + PREIS_STAPEL);
          bisher += stapel.length;
          const ergebnisse = new Map<string, Partial<Zeile>>();
          for (let i = 0; i < stapel.length; i += GLEICHZEITIG) {
            const teilstueck = stapel.slice(i, i + GLEICHZEITIG);
            const res = await Promise.all(
              teilstueck.map(async (z) => {
                try {
                  const live = await icPriceLookup(z.articleNumber, z.name);
                  return [z.id, live ? {
                    price: live.price,
                    deliveryDays: live.deliveryDays,
                    availability: live.availability,
                    icSku: live.icSku,
                    imageUrl: z.imageUrl || live.imageUrl,
                    geprueft: true,
                  } : { geprueft: true }] as const;
                } catch {
                  return [z.id, { geprueft: true }] as const;
                }
              }),
            );
            if (!lebt) return;
            for (const [id, daten] of res) ergebnisse.set(id, daten);
            stand = stand.map((z) => (ergebnisse.has(z.id) ? { ...z, ...ergebnisse.get(z.id) } : z));
            setZeilen(stand);
          }
          // Kein vorzeitiges Ende: die ersten Preise stehen nach dem ersten
          // Stapel schon da, der Rest tropft im Hintergrund nach.
        }
      } catch (e) {
        if (lebt) setFehler(e instanceof Error ? e.message : String(e));
      } finally {
        if (lebt) setLaeuft(false);
      }
    })();

    return () => { lebt = false; };
    // Nur neu suchen, wenn sich das Teil wirklich ändert.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schluessel, fahrzeugMarke]);

  /** Anzeige: lieferbar zuerst, dann schnell, dann günstig. Doppelte Lager-Artikel raus. */
  const { mitPreis, ohnePreis } = useMemo(() => {
    const liste = zeilen ?? [];
    const sku = new Set<string>();
    const mit: Zeile[] = [];
    for (const z of liste.filter((x) => x.price != null)) {
      // Zwei Zubehör-Nummern können auf DENSELBEN Lagerartikel führen (baugleich).
      if (z.icSku && sku.has(z.icSku)) continue;
      if (z.icSku) sku.add(z.icSku);
      mit.push(z);
    }
    mit.sort((a, b) =>
      (a.deliveryDays ?? 99) - (b.deliveryDays ?? 99) || (a.price ?? 0) - (b.price ?? 0));
    return { mitPreis: mit, ohnePreis: liste.filter((x) => x.price == null) };
  }, [zeilen]);

  const alsArtikel = (z: Zeile): WorkArticle => ({
    id: z.id,
    name: z.name,
    brand: z.brand,
    articleNumber: z.articleNumber,
    imageUrl: z.imageUrl,
    price: z.price,
    deliveryDays: z.deliveryDays,
    availability: z.availability,
    oeNumbers: [z.ueberOe],
  });

  const anfrageText = [
    "Anfrage Originalteil — Alex Autoshop Teilebörse",
    fahrzeugLabel ? `Fahrzeug: ${fahrzeugLabel}` : "",
    `Teil: ${teil.name} (Pos. ${teil.pos || "–"})`,
    `Originalnummer: ${teil.nummern.join(" / ")}`,
  ].filter(Boolean).join("\n");

  const nochPreise = laeuft && (zeilen?.some((z) => !z.geprueft) ?? true);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Kopf: welches Teil, und zurück zur Liste */}
      <div className="shrink-0 border-b border-border bg-card/80 px-3 pt-2.5 pb-3">
        <button
          onClick={onZurueck}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary mb-2"
        >
          <ArrowLeft className="w-3 h-3" /> Alle Teile der Zeichnung
        </button>
        <div className="flex items-start gap-2.5">
          <span className="shrink-0 inline-flex items-center justify-center min-w-[26px] h-[26px] px-1 rounded-md bg-primary text-primary-foreground text-[12px] font-bold">
            {teil.pos || "–"}
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-bold leading-tight">{teil.name || "Teil"}</p>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5 break-words">
              {teil.nummern.join(" · ")}
            </p>
          </div>
        </div>
      </div>

      {/* Stand */}
      <div className="shrink-0 px-3 py-2 border-b border-border/60 text-[11px] text-muted-foreground flex items-center gap-2">
        {zeilen === null ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> Suche passende Ersatzteile …</>
        ) : zeilen.length === 0 ? (
          <span>Kein Ersatzteil zu dieser Originalnummer</span>
        ) : (
          <>
            <span>
              <b className="text-foreground">{mitPreis.length}</b> lieferbar
              {ohnePreis.length > 0 && <> · {ohnePreis.length} weitere Hersteller</>}
            </span>
            {nochPreise && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary ml-auto" />}
          </>
        )}
      </div>

      {/* Liste */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border/60">
        {fehler && <p className="px-3 py-4 text-xs text-muted-foreground">{fehler}</p>}

        {zeilen !== null && zeilen.length === 0 && !fehler && (
          <div className="px-4 py-8 text-center">
            <PackageSearch className="w-9 h-9 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm font-semibold mb-1">Dafür gibt es kein Zubehörteil</p>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Das ist bei Karosserie- und Innenraumteilen normal. Wir besorgen dir das Original —
              schick uns die Nummer, wir melden uns mit Preis und Lieferzeit.
            </p>
            <div className="flex flex-col gap-2 max-w-[240px] mx-auto">
              <a href={whatsappLink(anfrageText)} target="_blank" rel="noopener noreferrer" className="btn-primary w-full gap-2 text-sm">
                <MessageCircle className="w-4 h-4" /> Original anfragen
              </a>
              <a href={`tel:${SHOP_INFO.phone}`} className="text-xs text-muted-foreground hover:text-primary inline-flex items-center justify-center gap-1">
                <Phone className="w-3 h-3" /> {SHOP_INFO.phone}
              </a>
            </div>
          </div>
        )}

        {/* Noch keine Preise, aber Treffer: Platzhalter statt leerer Fläche */}
        {zeilen && zeilen.length > 0 && mitPreis.length === 0 && nochPreise && (
          <div className="px-3 py-3 space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3 items-center">
                <div className="w-14 h-14 rounded-lg bg-secondary animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 rounded bg-secondary animate-pulse" />
                  <div className="h-2.5 w-1/2 rounded bg-secondary animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {mitPreis.map((z) => (
          <TeileZeile
            key={z.id}
            kompakt
            a={alsArtikel(z)}
            active={aktiv === z.id}
            level={level}
            onSelect={() => setAktiv(z.id)}
            onAdd={(menge) => onAdd?.(alsArtikel(z), menge)}
          />
        ))}

        {/* Hersteller, die Inter Cars nicht mit Preis führt — auf Wunsch */}
        {ohnePreis.length > 0 && !nochPreise && (
          <div>
            <button
              onClick={() => setAlleZeigen((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-[12px] text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            >
              <span>
                {mitPreis.length === 0
                  ? `${ohnePreis.length} passende Teile — Preis auf Anfrage`
                  : `${ohnePreis.length} weitere Hersteller — Preis auf Anfrage`}
              </span>
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", alleZeigen && "rotate-180")} />
            </button>
            {(alleZeigen || mitPreis.length === 0) && ohnePreis.slice(0, 40).map((z) => (
              <TeileZeile
                key={z.id}
                kompakt
                a={alsArtikel(z)}
                active={aktiv === z.id}
                level={level}
                onSelect={() => setAktiv(z.id)}
                onAdd={(menge) => onAdd?.(alsArtikel(z), menge)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
