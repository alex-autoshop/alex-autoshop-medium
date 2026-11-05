import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { CheckCircle, Plus, X } from "lucide-react";
import { ABO_RABATTE } from "../../shared/produktabo.js";
import { formatPrice, type ShopifyProduct } from "@/lib/shopify";
import { cn } from "@/lib/utils";

const euro = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

function kurz(text: string) {
  const rein = text.replace(/\s+/g, " ").trim();
  if (rein.length <= 420) return rein;
  const schnitt = rein.slice(0, 420);
  const leer = schnitt.lastIndexOf(" ");
  return `${(leer > 240 ? schnitt.slice(0, leer) : schnitt).trim()} …`;
}

export function AboVorschau({
  produkt,
  stufe,
  schon,
  misch,
  onStufe,
  onHinzu,
  onZu,
}: {
  produkt: ShopifyProduct;
  stufe: number;
  schon: boolean;
  misch: boolean;
  onStufe: (rabatt: number) => void;
  onHinzu: () => void;
  onZu: () => void;
}) {
  const n = produkt.node;
  const bilder = n.images?.edges?.map((e) => e.node.url).filter(Boolean) ?? [];
  const [bild, setBild] = useState(0);
  const preis = parseFloat(n.priceRange?.minVariantPrice?.amount ?? "0");
  const waehrung = n.priceRange?.minVariantPrice?.currencyCode ?? "EUR";
  const dialog = useRef<HTMLDivElement>(null);
  const text = kurz(n.description || "");

  useEffect(() => {
    const vorher = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    const zu = (e: KeyboardEvent) => { if (e.key === "Escape") onZu(); };
    document.addEventListener("keydown", zu);
    return () => {
      document.removeEventListener("keydown", zu);
      vorher?.focus();
    };
  }, [onZu]);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-6">
      <button type="button" className="absolute inset-0 bg-black/60" aria-label="Schließen" onClick={onZu} />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="abo-vorschau-titel"
        tabIndex={-1}
        className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-[#FAF9F7] text-[#1a1a1a] shadow-card outline-none"
      >
        <button
          type="button"
          onClick={onZu}
          className="absolute top-3 right-3 z-10 w-11 h-11 rounded-full bg-white/90 border border-border inline-flex items-center justify-center"
          aria-label="Vorschau schließen"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="bg-white">
          {bilder[bild] && (
            <img src={bilder[bild]} alt="" className="w-full aspect-square object-contain" />
          )}
          {bilder.length > 1 && (
            <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
              {bilder.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  aria-label={`Bild ${i + 1}`}
                  aria-pressed={i === bild}
                  onClick={() => setBild(i)}
                  className={cn("shrink-0 w-14 h-14 rounded-lg border overflow-hidden bg-white", i === bild ? "border-primary" : "border-border")}
                >
                  <img src={url} alt="" className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="p-5 flex flex-col gap-4">
          <h2 id="abo-vorschau-titel" className="font-display text-xl sm:text-2xl leading-snug pr-8">
            {n.title}
          </h2>
          {text && <p className="text-sm leading-relaxed text-neutral-600">{text}</p>}
          <p className="text-sm text-neutral-500 line-through">{formatPrice(String(preis), waehrung)}</p>
          <ul className="space-y-1">
            {ABO_RABATTE.map((r) => (
              <li key={r} className={cn("text-sm flex justify-between gap-3", r === stufe && "font-semibold text-primary")}>
                <span>als Mitglied {r} %</span>
                <span>{euro(preis * (1 - r / 100))}</span>
              </li>
            ))}
          </ul>
          {!misch && (
            <div role="group" aria-label={`Rabatt für ${n.title}`} className="inline-flex rounded-lg border border-border overflow-hidden">
              {ABO_RABATTE.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={stufe === r}
                  onClick={() => onStufe(r)}
                  className={cn(
                    "min-h-11 min-w-11 px-3 text-sm font-semibold",
                    stufe === r ? "bg-primary text-primary-foreground" : "bg-white hover:bg-primary/10"
                  )}
                >
                  {r} %
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={onHinzu}
            disabled={schon && !misch}
            className={cn(
              "w-full min-h-11 rounded-lg inline-flex items-center justify-center gap-1.5 text-sm font-semibold",
              schon && !misch ? "bg-neutral-200 text-neutral-500" : "bg-primary text-primary-foreground"
            )}
          >
            {schon && misch ? "Öffnen" : schon ? <><CheckCircle className="w-4 h-4" /> drin</> : <><Plus className="w-4 h-4" /> Hinzufügen</>}
          </button>
          <Link to={`/produkt/${n.handle}`} className="inline-block text-sm font-semibold text-primary underline underline-offset-2">
            Zur Produktseite
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
