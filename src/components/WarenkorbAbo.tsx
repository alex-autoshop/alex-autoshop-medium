import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ABO_RABATTE, aboListeGesamt, mitgliedZeile, PRODUKT_ABO_PREISE } from "../../shared/produktabo.js";
import { formatPrice } from "@/lib/shopify";
import { useAuth } from "@/context/AuthContext";
import { aboAbschliessen, type Zahlweg } from "@/lib/aboAbschluss";
import {
  ABO_EREIGNIS,
  aboAktivLesen,
  aboEinzelLoeschen,
  aboEinzelMerken,
  aboListeLesen,
  type AboMerkProdukt,
} from "@/lib/aboListe";
import { AboAnmeldung } from "@/components/AboAnmeldung";
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
    <div className="mt-1 flex items-center gap-1 min-w-0">
      <div role="group" aria-label={`Rabatt für ${produkt.titel}`} className="flex shrink-0 rounded-full border border-border overflow-hidden">
        {ABO_RABATTE.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={stufe === r}
            onClick={() => waehlen(r)}
            className={cn(
              "min-h-8 px-2 text-[11px] font-bold tabular-nums",
              stufe === r ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
            )}
          >
            {r}
          </button>
        ))}
      </div>
      {rechnung && rechnung.ersparnis > 0 && (
        <span className="text-[11px] font-semibold text-primary truncate">−{formatPrice(String(rechnung.ersparnis), waehrung)}</span>
      )}
      <button
        type="button"
        aria-pressed={drin}
        onClick={umschalten}
        className={cn(
          "ml-auto shrink-0 min-h-8 px-2 rounded-full text-[11px] font-semibold",
          drin ? "text-primary" : "text-muted-foreground"
        )}
      >
        {drin ? <span className="inline-flex items-center gap-0.5"><Check className="w-3 h-3" aria-hidden="true" /> Im Abo</span> : "Ins Abo"}
      </button>
    </div>
  );
}

const euro = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

export function useAboAktiv() {
  const [aktiv, setAktiv] = useState(aboAktivLesen);
  useEffect(() => {
    const sync = () => setAktiv(aboAktivLesen());
    window.addEventListener(ABO_EREIGNIS, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ABO_EREIGNIS, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return aktiv;
}

/** Kompakter Abo-Streifen. Zahlweg und der zahlungspflichtige Text erst im zweiten Schritt. */
export function AboKasse({ ersparnis }: { ersparnis: number }) {
  const liste = useAboListe();
  const { user } = useAuth();
  const [zahlweg, setZahlweg] = useState<Zahlweg>("gocardless");
  const [zahlen, setZahlen] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const [anmeldung, setAnmeldung] = useState(false);
  const [anfrage, setAnfrage] = useState(false);
  const gesamt = aboListeGesamt(liste.produkte);
  if (!liste.produkte.length || !gesamt) return null;
  const anzahl = liste.produkte.length;
  const titel = anzahl === 1 ? "1 Produkt" : `${anzahl} Produkte`;

  const oeffnen = () => {
    const mail = user?.email?.trim().toLowerCase() || "";
    if (!user || !mail) { setAnmeldung(true); return; }
    setZahlen(true);
  };

  const starten = async () => {
    const mail = user?.email?.trim().toLowerCase() || "";
    if (!user || !mail) { setAnmeldung(true); return; }
    setLaeuft(true);
    try {
      const erg = await aboAbschliessen({
        email: mail,
        zahlweg,
        price: gesamt.beitrag,
        produkte: liste.produkte,
      });
      if (erg.art === "weiter") { window.location.href = erg.url; return; }
      if (erg.art === "anfrage") {
        setAnfrage(true);
        toast.success("Liste ist bei uns", { description: "Die Online-Zahlung ist noch nicht freigeschaltet. Wir melden uns." });
        return;
      }
      toast.error(erg.text);
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <div className="py-3 space-y-2">
      <p className="text-sm font-semibold leading-snug">
        Abo: {titel} · {euro(gesamt.beitrag)}/Monat · spart {euro(ersparnis)}
      </p>
      {!zahlen ? (
        <button type="button" onClick={oeffnen} className="btn-primary w-full text-sm min-h-11">
          Abo abschließen
        </button>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {(["gocardless", "stripe"] as const).map((z) => (
              <button
                key={z}
                type="button"
                aria-pressed={zahlweg === z}
                onClick={() => setZahlweg(z)}
                className={cn(
                  "min-h-10 rounded-lg border px-2 text-xs font-semibold",
                  zahlweg === z ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"
                )}
              >
                {z === "gocardless" ? "SEPA-Lastschrift" : "Karte"}
              </button>
            ))}
          </div>
          <button type="button" onClick={starten} disabled={laeuft} className="btn-primary w-full text-sm min-h-11 disabled:opacity-60">
            {laeuft ? <Loader2 className="w-4 h-4 animate-spin" /> : `Abo zahlungspflichtig abschließen – ${euro(gesamt.beitrag)}/Monat`}
          </button>
        </div>
      )}
      <details className="text-[11px] text-muted-foreground">
        <summary className="cursor-pointer">Details</summary>
        <p className="mt-1 leading-relaxed">
          Keine Mindestlaufzeit, monatlich zum Monatsende kündbar über{" "}
          <Link to="/kuendigen" className="underline">Verträge hier kündigen</Link>.
          Der Rabatt gilt für diese Shop-Produkte, nicht in der Teilebörse.
          Stufe je Produkt: 15 % für {euro(PRODUKT_ABO_PREISE[15])}, 28 % für {euro(PRODUKT_ABO_PREISE[28])}, 40 % für {euro(PRODUKT_ABO_PREISE[40])} im Monat.
          {anfrage ? " Die Online-Zahlung ist noch nicht freigeschaltet — wir melden uns zur Liste." : ""}
        </p>
      </details>
      <AboAnmeldung offen={anmeldung} onZu={() => setAnmeldung(false)} />
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
