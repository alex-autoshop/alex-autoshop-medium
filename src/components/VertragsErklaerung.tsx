/**
 * Zweistufige Online-Erklärung:
 *  - typ "widerruf"   → Widerrufsfunktion nach § 356a BGB
 *                       (Schaltfläche „Vertrag widerrufen“, dann „Widerruf bestätigen“)
 *  - typ "kuendigung" → Kündigungsbutton nach § 312k BGB
 *                       (Schaltfläche „Verträge hier kündigen“, dann „Jetzt kündigen“)
 * Nach dem Absenden zeigt die Seite Inhalt, Datum und Uhrzeit, und der Server
 * schickt dieselbe Bestätigung per E-Mail.
 */
import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { anfrageGesendet } from "@/lib/besuch";

type Typ = "widerruf" | "kuendigung";

export function VertragsErklaerung({ typ }: { typ: Typ }) {
  const w = typ === "widerruf";
  const [schritt, setSchritt] = useState<"form" | "pruefen" | "fertig">("form");
  const [d, setD] = useState({ name: "", email: "", anschrift: "", vertrag: "", datum: "", grund: "ordentlich", zeitpunkt: "", hinweis: "" });
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [zeit, setZeit] = useState("");
  const feld = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setD({ ...d, [k]: e.target.value });
  const ok = d.name.trim() && /\S+@\S+\.\S+/.test(d.email) && d.vertrag.trim();

  async function senden() {
    setLaeuft(true); setFehler("");
    try {
      const r = await fetch("/api/vertragserklaerung", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typ, ...d }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) {
        anfrageGesendet(typ);
        setZeit(j.zeit || "");
        setSchritt("fertig");
      }
      else setFehler(j.error || "Das hat nicht geklappt. Bitte per E-Mail an info@alex-autoshop.de.");
    } catch {
      setFehler("Keine Verbindung. Bitte per E-Mail an info@alex-autoshop.de.");
    } finally { setLaeuft(false); }
  }

  const input = "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm";
  if (schritt === "fertig") {
    return (
      <div className="rounded-xl border border-emerald-600/40 bg-emerald-600/5 p-5 space-y-2 not-prose">
        <p className="font-semibold flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-600" /> {w ? "Widerruf" : "Kündigung"} eingegangen</p>
        <p className="text-sm">Eingegangen am {zeit} (deutsche Zeit). Eine Bestätigung mit dem Inhalt Ihrer Erklärung ist an {d.email} unterwegs.</p>
        <p className="text-sm">Vertrag / Bestellnummer: {d.vertrag}</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3 not-prose">
      {schritt === "form" ? (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm space-y-1"><span>Name *</span><input className={input} value={d.name} onChange={feld("name")} autoComplete="name" /></label>
            <label className="text-sm space-y-1"><span>E-Mail für die Bestätigung *</span><input className={input} type="email" value={d.email} onChange={feld("email")} autoComplete="email" /></label>
            <label className="text-sm space-y-1 sm:col-span-2"><span>{w ? "Bestellnummer oder Artikel *" : "Welcher Vertrag? (z. B. Mitgliedschaft, Produkt-Abo, Kundennummer) *"}</span><input className={input} value={d.vertrag} onChange={feld("vertrag")} /></label>
            {w && <label className="text-sm space-y-1"><span>Bestellt am / erhalten am</span><input className={input} value={d.datum} onChange={feld("datum")} /></label>}
            <label className="text-sm space-y-1"><span>Anschrift</span><input className={input} value={d.anschrift} onChange={feld("anschrift")} autoComplete="street-address" /></label>
            {!w && (
              <>
                <label className="text-sm space-y-1"><span>Art der Kündigung</span>
                  <select className={input} value={d.grund} onChange={feld("grund")}>
                    <option value="ordentlich">ordentlich</option>
                    <option value="außerordentlich">außerordentlich (bitte Grund angeben)</option>
                  </select>
                </label>
                <label className="text-sm space-y-1"><span>Zeitpunkt (leer = nächstmöglich)</span><input className={input} value={d.zeitpunkt} onChange={feld("zeitpunkt")} placeholder="nächstmöglicher Zeitpunkt" /></label>
              </>
            )}
            <label className="text-sm space-y-1 sm:col-span-2"><span>{w ? "Hinweis (freiwillig)" : "Grund / Hinweis (bei außerordentlicher Kündigung)"}</span><textarea className={input} rows={2} value={d.hinweis} onChange={feld("hinweis")} /></label>
          </div>
          <button className="btn-primary w-full disabled:opacity-60" disabled={!ok} onClick={() => setSchritt("pruefen")}>
            Weiter zur Bestätigung
          </button>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold">Bitte prüfen:</p>
          <ul className="text-sm space-y-0.5">
            <li>Name: {d.name}</li><li>E-Mail: {d.email}</li><li>Vertrag / Bestellung: {d.vertrag}</li>
            {d.datum && <li>Bestellt / erhalten: {d.datum}</li>}
            {d.anschrift && <li>Anschrift: {d.anschrift}</li>}
            {!w && <li>Art: {d.grund}, Zeitpunkt: {d.zeitpunkt || "nächstmöglich"}</li>}
            {d.hinweis && <li>Hinweis: {d.hinweis}</li>}
          </ul>
          <div className="flex flex-col sm:flex-row gap-2">
            <button className="rounded-xl border border-border py-2.5 px-4 text-sm font-semibold" onClick={() => setSchritt("form")}>Ändern</button>
            <button className="btn-primary flex-1 gap-2 disabled:opacity-60" disabled={laeuft} onClick={senden}>
              {laeuft ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {w ? "Widerruf bestätigen" : "Jetzt kündigen"}
            </button>
          </div>
        </>
      )}
      {fehler && <p className="text-sm text-destructive">{fehler}</p>}
    </div>
  );
}
