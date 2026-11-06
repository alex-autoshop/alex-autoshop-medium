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
    <div className="mt-3 flex flex-col gap-4">
      {rechnung && rechnung.ersparnis > 0 && (
        <p className="text-xs text-foreground">
          Mit Abo sparst du <span className="text-primary font-semibold">{formatPrice(String(rechnung.ersparnis), waehrung)}</span>
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <div role="group" aria-label={`Rabatt für ${produkt.titel}`} className="flex w-full rounded-lg border border-border overflow-hidden">
          {ABO_RABATTE.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={stufe === r}
              onClick={() => waehlen(r)}
              className={cn(
                "flex-1 basis-0 min-w-0 min-h-11 px-1 text-xs font-semibold text-center",
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
          {drin ? <span className="inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" aria-hidden="true" /> Im Abo</span> : "Ins Abo"}
        </button>
      </div>
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

/** Abschluss über den Kauf-Buttons. Der Monatsbeitrag kommt aus der Abo-Liste, die Ersparnis aus dieser Bestellung. */
export function AboKasse({ ersparnis }: { ersparnis: number }) {
  const liste = useAboListe();
  const { user } = useAuth();
  const [zahlweg, setZahlweg] = useState<Zahlweg>("gocardless");
  const [laeuft, setLaeuft] = useState(false);
  const [anmeldung, setAnmeldung] = useState(false);
  const [anfrage, setAnfrage] = useState(false);
  const gesamt = aboListeGesamt(liste.produkte);
  if (!liste.produkte.length || !gesamt) return null;
  const anzahl = liste.produkte.length;
  const titel = anzahl === 1 ? "1 Produkt" : `${anzahl} Produkte`;

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
    <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 space-y-2">
      <p className="text-sm font-semibold leading-snug">
        Dein Abo: {titel} · {euro(gesamt.beitrag)}/Monat · du sparst {euro(ersparnis)} pro Bestellung
      </p>
      <div className="grid grid-cols-2 gap-2">
        {(["gocardless", "stripe"] as const).map((z) => (
          <button
            key={z}
            type="button"
            aria-pressed={zahlweg === z}
            onClick={() => setZahlweg(z)}
            className={cn(
              "min-h-10 rounded-lg border px-2 text-xs font-semibold",
              zahlweg === z ? "border-primary bg-card text-primary" : "border-border bg-card/70"
            )}
          >
            {z === "gocardless" ? "SEPA-Lastschrift" : "Karte"}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={starten}
        disabled={laeuft}
        className="btn-primary w-full text-sm disabled:opacity-60"
      >
        {laeuft ? <Loader2 className="w-4 h-4 animate-spin" /> : user
          ? `Abo zahlungspflichtig abschließen – ${euro(gesamt.beitrag)}/Monat`
          : `Anmelden und Abo abschließen – ${euro(gesamt.beitrag)}/Monat`}
      </button>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Keine Mindestlaufzeit, monatlich zum Monatsende kündbar über{" "}
        <Link to="/kuendigen" className="underline">Verträge hier kündigen</Link>.
        Der Rabatt gilt für diese Shop-Produkte, nicht in der Teilebörse.
        {anfrage ? " Die Online-Zahlung ist noch nicht freigeschaltet — wir melden uns zur Liste." : ""}
      </p>
      <p className="text-[11px] text-muted-foreground">
        Stufe je Produkt: 15 % für {euro(PRODUKT_ABO_PREISE[15])}, 28 % für {euro(PRODUKT_ABO_PREISE[28])}, 40 % für {euro(PRODUKT_ABO_PREISE[40])} im Monat.
      </p>
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
