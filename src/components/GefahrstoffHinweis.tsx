import { useState, type FormEvent } from "react";
import { FileDown, Mail } from "lucide-react";
import { hSatzText, type Gefahrstoff } from "../../shared/gefahrstoff.js";
import { GhsPiktogramm } from "@/components/GhsPiktogramm";

export function GefahrstoffKompakt({ g }: { g: Gefahrstoff }) {
  if (!g.ist || !g.piktogramme.length && !g.signalwort) return null;
  return (
    <div className="flex items-center gap-1 flex-wrap" aria-label="Gefahrstoff">
      {g.piktogramme.map((code) => <GhsPiktogramm key={code} code={code} />)}
      {g.signalwort && (
        <span className={`text-[11px] font-bold uppercase tracking-wide ${g.signalwort === "Gefahr" ? "text-red-700" : "text-amber-800"}`}>
          {g.signalwort}
        </span>
      )}
    </div>
  );
}

function SdbForm({ titel, handle, onZu }: { titel: string; handle: string; onZu: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [firma, setFirma] = useState("");
  const [status, setStatus] = useState<"offen" | "sendet" | "ok" | "fehler">("offen");

  async function senden(e: FormEvent) {
    e.preventDefault();
    setStatus("sendet");
    try {
      const res = await fetch("/api/sdb-anfrage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, firma, produkt: titel, handle }),
      });
      if (!res.ok) throw new Error();
      setStatus("ok");
    } catch {
      setStatus("fehler");
    }
  }

  if (status === "ok") {
    return <p className="text-sm text-primary font-semibold">Danke. Wir schicken das Sicherheitsdatenblatt an {email}.</p>;
  }

  return (
    <form onSubmit={senden} className="space-y-2">
      <input className="input-base" required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" />
      <input className="input-base" required type="email" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="E-Mail" />
      <input className="input-base" placeholder="Firma (optional)" value={firma} onChange={(e) => setFirma(e.target.value)} aria-label="Firma" />
      {status === "fehler" && (
        <p className="text-sm text-destructive">Das hat nicht geklappt. Schreib an info@alex-autoshop.de.</p>
      )}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary text-sm" disabled={status === "sendet"}>
          {status === "sendet" ? "Wird gesendet …" : "Anfordern"}
        </button>
        <button type="button" className="btn-outline text-sm" onClick={onZu}>Abbrechen</button>
      </div>
    </form>
  );
}

export function GefahrstoffBlock({ g, titel, handle }: { g: Gefahrstoff; titel: string; handle: string }) {
  const [form, setForm] = useState(false);
  if (!g.ist) return null;
  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3" aria-label="Gefahrenhinweise">
      <h2 className="text-lg font-display">Gefahrenhinweise</h2>
      <div className="flex items-center gap-3 flex-wrap">
        {g.piktogramme.map((code) => <GhsPiktogramm key={code} code={code} gross />)}
        {g.signalwort && (
          <p className={`text-xl font-bold ${g.signalwort === "Gefahr" ? "text-red-700" : "text-amber-800"}`}>{g.signalwort}</p>
        )}
      </div>
      {g.hSaetze.length > 0 && (
        <ul className="space-y-1 text-sm">
          {g.hSaetze.map((code) => (
            <li key={code}>
              <span className="font-semibold">{code}</span>
              {hSatzText(code) ? ` — ${hSatzText(code)}` : " — Wortlaut liegt uns zu diesem Code nicht vor."}
            </li>
          ))}
        </ul>
      )}
      {g.pSaetze.length > 0 && (
        <p className="text-xs text-muted-foreground">Sicherheitshinweise: {g.pSaetze.join(", ")}. Der volle Wortlaut steht im Sicherheitsdatenblatt.</p>
      )}
      {g.unNr && (
        <p className="text-sm">Gefahrgut-Hinweis für den Versand: {g.unNr}{g.versandHinweis ? `. ${g.versandHinweis}` : ""}</p>
      )}
      {!g.unNr && g.versandHinweis && <p className="text-sm">Versandhinweis: {g.versandHinweis}</p>}
      {g.mindestalter && <p className="text-sm">Abgabe erst ab {g.mindestalter} Jahren.</p>}
      <div className="pt-1">
        {g.sdbUrl ? (
          <a href={g.sdbUrl} className="btn-outline text-sm" target="_blank" rel="noopener noreferrer">
            <FileDown className="w-4 h-4" /> Sicherheitsdatenblatt herunterladen
          </a>
        ) : form ? (
          <SdbForm titel={titel} handle={handle} onZu={() => setForm(false)} />
        ) : (
          <button type="button" className="btn-outline text-sm" onClick={() => setForm(true)}>
            <Mail className="w-4 h-4" /> Sicherheitsdatenblatt anfordern
          </button>
        )}
      </div>
    </section>
  );
}

export function BaldVerfuegbar() {
  return (
    <p className="inline-flex items-center justify-center w-full rounded-lg border border-border bg-secondary text-muted-foreground text-sm font-semibold min-h-12">
      Bald verfügbar
    </p>
  );
}
