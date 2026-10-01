import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, Loader2, AlertTriangle, Phone, ShieldCheck } from "lucide-react";
import { SHOP_INFO } from "@/data/shopInfo";
import {
  RECHTSFORMEN, brauchtHandelsregister, anfrageSenden, zahl, euro,
  type Finanzierungsanfrage,
} from "@/lib/youlend";
import { cn } from "@/lib/utils";

const LEER: Finanzierungsanfrage = {
  firma: "", firmenform: "GmbhUg", handelsregister: "",
  strasse: "", plz: "", ort: "",
  ansprechpartner: "", email: "", telefon: "", webseite: "",
  jahresumsatz: 0, wunschsumme: 0, zweck: "",
  bonitaetspruefung: false,
};

const UMSATZSTUFEN = [
  { wert: 100000, label: "unter 250.000 €" },
  { wert: 250000, label: "250.000 – 500.000 €" },
  { wert: 500000, label: "500.000 – 1 Mio. €" },
  { wert: 1000000, label: "1 – 3 Mio. €" },
  { wert: 3000000, label: "über 3 Mio. €" },
];

function Feld({ label, hinweis, children }: { label: string; hinweis?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold mb-1.5">{label}</span>
      {children}
      {hinweis && <span className="block text-xs text-muted-foreground mt-1">{hinweis}</span>}
    </label>
  );
}

export function FinanzierungsAnfrage() {
  const [d, setD] = useState<Finanzierungsanfrage>(LEER);
  const [laeuft, setLaeuft] = useState(false);
  const [fertig, setFertig] = useState<null | { leadId?: string | null; hinweis?: string }>(null);
  const [fehler, setFehler] = useState("");

  const setz = <K extends keyof Finanzierungsanfrage>(k: K, v: Finanzierungsanfrage[K]) =>
    setD((alt) => ({ ...alt, [k]: v }));

  const hrNoetig = brauchtHandelsregister(d.firmenform);

  async function absenden(e: React.FormEvent) {
    e.preventDefault();
    setFehler("");
    setLaeuft(true);
    try {
      const a = await anfrageSenden(d);
      setFertig({ leadId: a.leadId, hinweis: a.hinweis });
    } catch (err) {
      setFehler(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLaeuft(false);
    }
  }

  if (fertig) {
    return (
      <div className="card-tilt hover:translate-y-0 p-7 sm:p-9 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-7 h-7 text-primary" />
        </div>
        <h3 className="text-xl mb-3">Anfrage ist da.</h3>
        <p className="text-muted-foreground leading-relaxed max-w-md mx-auto">
          {fertig.hinweis ||
            "Wir prüfen deine Angaben und melden uns. Wenn etwas fehlt, rufen wir an — du musst nichts weiter tun."}
        </p>
        {fertig.leadId && (
          <p className="text-xs text-muted-foreground mt-4">
            Vorgangsnummer: <span className="font-mono">{fertig.leadId}</span>
          </p>
        )}
        <a href={`tel:${SHOP_INFO.phoneIntl}`} className="btn-outline mt-7">
          <Phone className="w-5 h-5" /> {SHOP_INFO.phone}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={absenden} className="card-tilt hover:translate-y-0 p-6 sm:p-8">
      <h3 className="text-xl mb-1.5">Finanzierungsanfrage</h3>
      <p className="text-sm text-muted-foreground mb-7 leading-relaxed">
        Dauert zwei Minuten. Die Angaben brauchen wir, um überhaupt prüfen zu können —
        ohne sie kann dir niemand eine Summe nennen.
      </p>

      <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary mb-4">Betrieb</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <Feld label="Firmenname">
          <input className="input-base" required maxLength={120} value={d.firma}
            onChange={(e) => setz("firma", e.target.value)} placeholder="Muster Kfz GmbH" />
        </Feld>
        <Feld label="Rechtsform">
          <select className="input-base" value={d.firmenform}
            onChange={(e) => setz("firmenform", e.target.value)}>
            {RECHTSFORMEN.map((r) => <option key={r.wert} value={r.wert}>{r.label}</option>)}
          </select>
        </Feld>
        <Feld
          label={hrNoetig ? "Handelsregisternummer" : "Handelsregisternummer (falls vorhanden)"}
          hinweis="Format HRA12345 oder HRB12345"
        >
          <input className="input-base" required={hrNoetig} maxLength={40} value={d.handelsregister}
            onChange={(e) => setz("handelsregister", e.target.value)} placeholder="HRB 12345" />
        </Feld>
        <Feld label="Webseite (optional)">
          <input className="input-base" maxLength={160} value={d.webseite}
            onChange={(e) => setz("webseite", e.target.value)} placeholder="www.deinbetrieb.de" />
        </Feld>
        <Feld label="Straße und Hausnummer">
          <input className="input-base" required maxLength={120} value={d.strasse}
            onChange={(e) => setz("strasse", e.target.value)} />
        </Feld>
        <div className="grid grid-cols-[1fr_2fr] gap-4">
          <Feld label="PLZ">
            <input className="input-base" required inputMode="numeric" maxLength={10} value={d.plz}
              onChange={(e) => setz("plz", e.target.value)} />
          </Feld>
          <Feld label="Ort">
            <input className="input-base" required maxLength={80} value={d.ort}
              onChange={(e) => setz("ort", e.target.value)} />
          </Feld>
        </div>
      </div>

      <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary mt-8 mb-4">Kontakt</p>
      <div className="grid sm:grid-cols-3 gap-4">
        <Feld label="Ansprechpartner">
          <input className="input-base" required maxLength={120} value={d.ansprechpartner}
            onChange={(e) => setz("ansprechpartner", e.target.value)} placeholder="Vor- und Nachname" />
        </Feld>
        <Feld label="E-Mail">
          <input className="input-base" type="email" required maxLength={160} value={d.email}
            onChange={(e) => setz("email", e.target.value)} />
        </Feld>
        <Feld label="Telefon">
          <input className="input-base" type="tel" required maxLength={32} value={d.telefon}
            onChange={(e) => setz("telefon", e.target.value)} placeholder="0202 82690" />
        </Feld>
      </div>

      <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary mt-8 mb-4">Finanzierung</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <Feld label="Jahresumsatz">
          <select className="input-base" value={d.jahresumsatz || ""}
            onChange={(e) => setz("jahresumsatz", Number(e.target.value))} required>
            <option value="" disabled>Bitte wählen</option>
            {UMSATZSTUFEN.map((u) => <option key={u.wert} value={u.wert}>{u.label}</option>)}
          </select>
        </Feld>
        <Feld label="Wunschsumme" hinweis={d.wunschsumme >= 1000 ? euro(d.wunschsumme) : "mindestens 1.000 €"}>
          <input className="input-base" required inputMode="numeric" placeholder="25.000"
            value={d.wunschsumme ? d.wunschsumme.toLocaleString("de-DE") : ""}
            onChange={(e) => setz("wunschsumme", zahl(e.target.value))} />
        </Feld>
      </div>
      <div className="mt-4">
        <Feld label="Wofür brauchst du das Geld?">
          <textarea className="input-base min-h-[96px] resize-y" required maxLength={600} value={d.zweck}
            onChange={(e) => setz("zweck", e.target.value)}
            placeholder="Zum Beispiel: Einkauf von zehn Fahrzeugen für den Hof, neue Hebebühne, Lackierkabine erneuern …" />
        </Feld>
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-border bg-secondary/50 p-4 cursor-pointer select-none mt-6">
        <input type="checkbox" className="mt-0.5 w-5 h-5 accent-primary shrink-0"
          checked={d.bonitaetspruefung} onChange={(e) => setz("bonitaetspruefung", e.target.checked)} />
        <span className="text-sm leading-relaxed">
          Ich handele als <strong>Gewerbetreibender oder Unternehmen</strong> und bin damit einverstanden,
          dass meine Angaben zur Prüfung an unseren Finanzierungspartner weitergegeben werden. Das schließt
          eine <strong>Bonitätsprüfung</strong> ein. Hinweise zum Datenschutz stehen in der{" "}
          <Link to="/datenschutz" className="text-primary underline underline-offset-2">Datenschutzerklärung</Link>.
        </span>
      </label>

      {fehler && (
        <p className="flex items-start gap-2 text-sm text-destructive mt-4">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {fehler}
        </p>
      )}

      <button type="submit" disabled={laeuft || !d.bonitaetspruefung}
        className={cn("btn-primary w-full mt-6", (laeuft || !d.bonitaetspruefung) && "opacity-50 cursor-not-allowed")}>
        {laeuft ? <><Loader2 className="w-5 h-5 animate-spin" /> Wird gesendet …</> : "Anfrage absenden"}
      </button>

      <p className="flex items-start gap-2 text-xs text-muted-foreground mt-4 leading-relaxed">
        <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
        Die Anfrage ist unverbindlich und kostet nichts. Eine Zusage ist damit nicht verbunden —
        über Angebot und Konditionen entscheidet der Finanzierungspartner nach Prüfung deiner Unterlagen.
      </p>
    </form>
  );
}
