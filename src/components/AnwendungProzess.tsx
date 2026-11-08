import { useEffect, useId, useMemo, useState } from "react";
import { katalogLesen } from "@/lib/katalog";
import {
  besterTreffer,
  einsatzFuer,
  istSet,
  produktAusZeile,
  setInhaltTitel,
  suchanfrage,
  type ProzessEinsatz,
  type ProzessProdukt,
} from "../../shared/prozess.js";

const ICON: Record<string, string> = {
  schleifen: '<path d="M4 17h16M6 17l3-8h6l3 8" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="12" cy="11" r="1.2" fill="currentColor"/>',
  reinigen: '<path d="M8 5h8l1.2 3.5H6.8L8 5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M7 8.5V16a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V8.5" stroke="currentColor" stroke-width="1.5"/>',
  spachteln: '<path d="M5 16l9-9 3 3-9 9H5v-3z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  fuellern: '<rect x="7" y="5" width="10" height="14" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M10 10h4M10 13h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  basislack: '<rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M9 15c1.5-3 4.5-3 6 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  klarlack: '<path d="M4 15h8l3.2-4H19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="16" y="7" width="4" height="3.2" rx=".7" stroke="currentColor" stroke-width="1.5"/>',
  polieren: '<circle cx="12" cy="12" r="6.5" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="2.2" stroke="currentColor" stroke-width="1.5"/>',
  ablassen: '<path d="M12 4c1.6 2.4 3.6 4.8 3.6 7.5a3.6 3.6 0 0 1-7.2 0C8.4 8.8 10.4 6.4 12 4z" stroke="currentColor" stroke-width="1.5"/><path d="M12 15.5V19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  filter: '<circle cx="12" cy="12" r="6.5" stroke="currentColor" stroke-width="1.5"/><path d="M9 12h6M12 9v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  einfuellen: '<path d="M9 4h6l1.5 3.5v11A1.5 1.5 0 0 1 15 20H9a1.5 1.5 0 0 1-1.5-1.5v-11L9 4z" stroke="currentColor" stroke-width="1.5"/><path d="M12 10v5M9.8 12.5h4.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  kontrollieren: '<circle cx="12" cy="12" r="6.5" stroke="currentColor" stroke-width="1.5"/><path d="M8.5 12.3l2.2 2.2 4.5-4.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  vorwaesche: '<path d="M4 15c2.2 0 3.2-2.8 5-2.8s2.8 3.2 4.6 3.2 2.8-2.6 4.5-2.6 2.2 1.8 3 2.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  felgen: '<circle cx="12" cy="12" r="6.5" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="2" stroke="currentColor" stroke-width="1.5"/><path d="M12 5.5v2.2M12 16.3v2.2M5.5 12h2.2M16.3 12h2.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  waesche: '<ellipse cx="12" cy="15.5" rx="6" ry="3" stroke="currentColor" stroke-width="1.5"/><path d="M7.5 14.5c1-3.2 7-3.2 8 0" stroke="currentColor" stroke-width="1.5"/>',
  trocknen: '<path d="M8 16c0-4 2.5-7 4-8 1.5 1 4 4 4 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M7 18h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  versiegeln: '<path d="M12 4l6 2.5v5.5c0 4-2.8 6.8-6 7.8-3.2-1-6-3.8-6-7.8V6.5L12 4z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  innenraum: '<rect x="5" y="8" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M8 8V6.5h8V8" stroke="currentColor" stroke-width="1.5"/>',
  scheiben: '<path d="M5 17c2-6 5-10 7-10s5 4 7 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M5 17h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  kratzen: '<path d="M7 17h10M8.2 17l2-9h3.6l2 9" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 4.5v2.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  enteisen: '<path d="M12 4.5v15M6.5 7.5l11 9M17.5 7.5l-11 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  sicht: '<path d="M3.5 12s3.2-5 8.5-5 8.5 5 8.5 5-3.2 5-8.5 5-8.5-5-8.5-5z" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="2" stroke="currentColor" stroke-width="1.5"/>',
  loesen: '<path d="M14 6.5l3.5 3.5-6.8 6.8H7.2v-3.5L14 6.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  schmieren: '<path d="M5 15.5h8l1.4-3.2H6.4L5 15.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M14.2 12.4l4.2-2v3.4" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M7 15.5v2.8h5v-2.8" stroke="currentColor" stroke-width="1.5"/>',
  sichern: '<rect x="7" y="11" width="10" height="8" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M9 11V8.5a3 3 0 0 1 6 0V11" stroke="currentColor" stroke-width="1.5"/>',
  schuetzen: '<path d="M5 16c0-5.5 3-8.5 7-8.5s7 3 7 8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M5 16h14M8 16v2.5M16 16v2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
};

function rohwert(produkt: ProzessProdukt): string | null {
  const roh = produkt.prozessSchritte;
  if (roh == null || roh === "") return null;
  if (typeof roh === "string") return roh;
  return roh.value || null;
}

function kanten(daten: { data?: { products?: { edges?: unknown[] } } } | null) {
  const edges = daten?.data?.products?.edges || [];
  return edges
    .map((kante) => (kante as { node?: ProzessProdukt } | null)?.node)
    .filter((knoten): knoten is ProzessProdukt => Boolean(knoten?.title));
}

async function suche(filter: string, first: number) {
  if (!filter) return [];
  const daten = await katalogLesen({ was: "produkte", filter, first });
  return kanten(daten);
}

async function inhalteLaden(zeilen: string[]): Promise<ProzessProdukt[]> {
  const fragen = zeilen.map((zeile) => suchanfrage(zeile));
  const cache = new Map<string, ProzessProdukt[]>();
  await Promise.all([...new Set(fragen.filter(Boolean))].map(async (frage) => {
    cache.set(frage, await suche(frage, 10));
  }));
  const aus: ProzessProdukt[] = [];
  for (let i = 0; i < zeilen.length; i += 1) {
    let treffer = besterTreffer(zeilen[i], cache.get(fragen[i]) || []);
    if (!treffer) {
      const weit = suchanfrage(zeilen[i]).split(" AND ")[0] || "";
      treffer = besterTreffer(zeilen[i], await suche(weit, 15));
    }
    if (treffer) aus.push(treffer);
    else {
      const ersatz = produktAusZeile(zeilen[i]);
      if (ersatz) aus.push(ersatz);
    }
  }
  return aus;
}

function SchrittIcon({ id }: { id: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-[22px] w-[22px]"
      dangerouslySetInnerHTML={{ __html: ICON[id] || ICON.kontrollieren }}
    />
  );
}

export function AnwendungProzess({ produkt }: { produkt: ProzessProdukt }) {
  const tipId = useId();
  const override = rohwert(produkt);
  const set = istSet(produkt);
  const [inhalte, setInhalte] = useState<ProzessProdukt[] | null>(null);
  const [bereit, setBereit] = useState(!set || Boolean(override));
  const [hover, setHover] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const darfHover = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches,
    [],
  );

  useEffect(() => {
    let aktiv = true;
    if (!set || override) {
      setInhalte(null);
      setBereit(true);
      return;
    }
    if (typeof produkt.description !== "string") {
      setBereit(false);
      return;
    }
    const zeilen = setInhaltTitel(produkt.description);
    if (!zeilen.length) {
      setInhalte([]);
      setBereit(true);
      return;
    }
    setBereit(false);
    inhalteLaden(zeilen).then((liste) => {
      if (!aktiv) return;
      setInhalte(liste);
      setBereit(true);
    });
    return () => {
      aktiv = false;
    };
  }, [produkt.handle, produkt.description, produkt.productType, override, set]);

  const erg = useMemo<ProzessEinsatz | null>(() => {
    if (set && !override && !bereit) return null;
    return einsatzFuer(produkt, inhalte ?? undefined);
  }, [produkt, inhalte, set, override, bereit]);

  useEffect(() => {
    if (!pin) return;
    const zu = () => setPin(null);
    document.addEventListener("click", zu);
    return () => document.removeEventListener("click", zu);
  }, [pin]);

  if (!erg) return null;
  const aktiv = pin || hover;
  const satz = erg.schritte.find((schritt) => schritt.id === aktiv);

  return (
    <section className="mt-8 border-t border-border pt-6" aria-label="Einsatz im Arbeitsablauf">
      <h2 className="text-lg">Einsatz im Arbeitsablauf</h2>
      <p className="mt-1 text-sm text-muted-foreground">{erg.label}</p>
      <div className="mt-4 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max min-w-full items-start py-1" role="list">
          {erg.schritte.map((schritt, index) => {
            const hier = erg.markiert.includes(schritt.id);
            return (
              <div key={schritt.id} className="flex items-start">
                {index > 0 && (
                  <div className="prozess-ein mt-3.5 grid h-3 w-3 shrink-0 place-items-center text-[#D8D4CC]" style={{ animationDelay: `${index * 60}ms` }} aria-hidden="true">
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
                <div
                  role="listitem"
                  className="prozess-ein flex w-16 shrink-0 flex-col items-center text-center"
                  style={{ animationDelay: `${index * 60}ms` }}
                  onMouseEnter={() => { if (darfHover) setHover(schritt.id); }}
                  onMouseLeave={() => setHover((bisher) => (bisher === schritt.id ? null : bisher))}
                >
                  <button
                    type="button"
                    className={`grid h-11 w-11 place-items-center rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B8860B]/40 ${hier ? "text-[#B8860B]" : "text-[#9a9a9a] hover:text-[#666]"}`}
                    aria-label={hier ? `${schritt.wort}, dieses Produkt` : schritt.wort}
                    aria-describedby={aktiv === schritt.id ? tipId : undefined}
                    aria-pressed={pin === schritt.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      setPin((bisher) => (bisher === schritt.id ? null : schritt.id));
                    }}
                  >
                    <SchrittIcon id={schritt.id} />
                  </button>
                  <span className={`mt-1 min-h-[2.3em] max-w-[4rem] text-[0.66rem] leading-tight ${hier ? "font-semibold text-[#7a6518]" : "font-medium text-[#b0b0b0]"}`}>
                    {schritt.wort}
                  </span>
                  <span className={`mt-0.5 text-[0.58rem] font-bold uppercase tracking-wide text-[#B8860B] ${hier ? "" : "invisible"}`}>
                    Hier
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {satz?.tip && (
        <p id={tipId} className="mt-2 max-w-md text-sm leading-snug text-muted-foreground" role="status">
          {erg.markiert.includes(satz.id) ? `Dieses Produkt: ${satz.tip}` : satz.tip}
        </p>
      )}
    </section>
  );
}
