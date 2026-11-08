import { useState, type FormEvent, type ReactNode } from "react";
import { FileText, Mail } from "lucide-react";
import type { Gefahrstoff } from "../../shared/gefahrstoff.js";

function dateiname(url: string): string {
  try {
    const teil = decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean).pop() || "");
    return teil.replace(/\.pdf$/i, "");
  } catch {
    return "";
  }
}

function standText(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `Stand ${m[3]}.${m[2]}.${m[1]}` : "";
}

function zeilenVon(...teile: string[]): string[] {
  return teile.filter(Boolean);
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

function Kachel({
  href,
  titel,
  zeilen,
  icon,
}: {
  href: string;
  titel: string;
  zeilen?: string[];
  icon: ReactNode;
}) {
  const inhalt = (
    <>
      <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-secondary text-foreground">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-semibold leading-snug">{titel}</span>
        {zeilen?.map((zeile) => (
          <span key={zeile} className="mt-0.5 block text-sm text-muted-foreground [overflow-wrap:anywhere]">{zeile}</span>
        ))}
      </span>
    </>
  );
  const klasse =
    "flex w-full items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-card transition-colors hover:border-primary";
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={klasse}>
      {inhalt}
    </a>
  );
}

function PdfIcon() {
  return (
    <>
      <FileText className="h-5 w-5" aria-hidden />
      <span className="text-[9px] font-bold leading-none tracking-wide">PDF</span>
    </>
  );
}

export function TechnischeDokumentation({
  g,
  titel,
  handle,
}: {
  g: Gefahrstoff;
  titel: string;
  handle: string;
}) {
  const [form, setForm] = useState(false);
  const anfordern = g.ist && !g.sdbUrl;
  const anzahl = Number(Boolean(g.tdsUrl)) + Number(Boolean(g.sdbUrl)) + Number(anfordern);
  if (anzahl === 0) return null;

  return (
    <section className="mt-8" aria-label="Technische Dokumentation">
      <h2 className="text-lg mb-3">Technische Dokumentation</h2>
      <div className={`grid gap-3 ${anzahl > 1 ? "sm:grid-cols-2" : ""}`}>
        {g.tdsUrl && (
          <Kachel
            href={g.tdsUrl}
            titel="Technisches Datenblatt – TDS"
            zeilen={zeilenVon(dateiname(g.tdsUrl))}
            icon={<PdfIcon />}
          />
        )}
        {g.sdbUrl && (
          <Kachel
            href={g.sdbUrl}
            titel="Sicherheitsdatenblatt – SDS"
            zeilen={zeilenVon(dateiname(g.sdbUrl), standText(g.sdbStand))}
            icon={<PdfIcon />}
          />
        )}
        {anfordern && (
          <button
            type="button"
            onClick={() => setForm(true)}
            className="flex w-full items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-card transition-colors hover:border-primary"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
              <Mail className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold leading-snug">Sicherheitsdatenblatt anfordern</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">Wir schicken es per E-Mail.</span>
            </span>
          </button>
        )}
      </div>
      {anfordern && form && (
        <div className="mt-3 max-w-md rounded-2xl border border-border bg-card p-4">
          <SdbForm titel={titel} handle={handle} onZu={() => setForm(false)} />
        </div>
      )}
    </section>
  );
}
