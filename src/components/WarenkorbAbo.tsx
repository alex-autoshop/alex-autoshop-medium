import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { ABO_RABATTE, mitgliedZeile } from "../../shared/produktabo.js";
import { formatPrice } from "@/lib/shopify";
import {
  ABO_EREIGNIS,
  aboEinzelLoeschen,
  aboEinzelMerken,
  aboListeLesen,
  type AboMerkProdukt,
} from "@/lib/aboListe";
import { cn } from "@/lib/utils";

export function useAboListe() {
  const [liste, setListe] = useState(aboListeLesen);
  useEffect(() => {
    const sync = () => setListe(aboListeLesen());
    window.addEventListener(ABO_EREIGNIS, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ABO_EREIGNIS, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return liste;
}

export function WarenkorbAboZeile({
  produkt,
  menge,
  stufe,
  drin,
  onStufe,
}: {
  produkt: AboMerkProdukt;
  menge: number;
  stufe: number;
  drin: boolean;
  onStufe: (rabatt: number) => void;
}) {
  const rechnung = mitgliedZeile(produkt.preis, menge, stufe);
  const waehrung = produkt.waehrung || "EUR";

  const umschalten = () => {
    if (drin) {
      aboEinzelLoeschen(produkt.id);
      toast.success("Aus der Abo-Liste genommen", { description: produkt.titel });
      return;
    }
    const erg = aboEinzelMerken({ ...produkt, rabatt: stufe });
    if (erg === "voll") toast.error("Die Abo-Liste ist voll.");
    else if (erg !== "leer") toast.success("In die Abo-Liste gelegt", { description: produkt.titel });
  };

  const waehlen = (rabatt: number) => {
    onStufe(rabatt);
    if (drin) aboEinzelMerken({ ...produkt, rabatt });
  };

  return (
    <div className="mt-2 space-y-1.5">
      {rechnung && (
        <p className="text-xs text-foreground">
          Als Mitglied: {formatPrice(String(rechnung.mitglied), waehrung)}{" "}
          <span className="text-primary font-semibold">(du sparst {formatPrice(String(rechnung.ersparnis), waehrung)})</span>
        </p>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <div role="group" aria-label={`Rabatt für ${produkt.titel}`} className="inline-flex rounded-lg border border-border overflow-hidden">
          {ABO_RABATTE.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={stufe === r}
              onClick={() => waehlen(r)}
              className={cn(
                "min-h-11 min-w-11 px-2 text-xs font-semibold",
                stufe === r ? "bg-primary text-primary-foreground" : "bg-card hover:bg-primary/10"
              )}
            >
              {r} %
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={drin}
          onClick={umschalten}
          className={cn(
            "min-h-11 px-3 rounded-lg border text-xs font-semibold",
            drin
              ? "border-primary bg-primary/15 text-primary"
              : "border-border bg-card hover:border-primary hover:text-primary"
          )}
        >
          {drin ? <span className="inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" aria-hidden="true" /> Im Abo ✓</span> : "+ Ins Abo"}
        </button>
      </div>
    </div>
  );
}

export function WarenkorbAboSumme({
  betrag,
  waehrung,
  allesDrin,
  onAlle,
  onZurMitgliedschaft,
}: {
  betrag: number;
  waehrung: string;
  allesDrin: boolean;
  onAlle: () => void;
  onZurMitgliedschaft: () => void;
}) {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 space-y-2">
      <p className="text-sm leading-snug">
        Mit Mitgliedschaft spart du bei diesem Warenkorb{" "}
        <strong>{formatPrice(String(betrag), waehrung)}</strong>
        {" "}+ kostenloser Versand
      </p>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onAlle}
          disabled={allesDrin}
          className="min-h-11 rounded-lg border border-primary/40 bg-card px-3 text-sm font-semibold hover:border-primary disabled:opacity-60"
        >
          {allesDrin ? "Alle im Abo" : "Alle ins Abo"}
        </button>
        <Link to="/mitgliedschaft" onClick={onZurMitgliedschaft} className="btn-primary text-sm">
          Zur Mitgliedschaft
        </Link>
      </div>
    </div>
  );
}
