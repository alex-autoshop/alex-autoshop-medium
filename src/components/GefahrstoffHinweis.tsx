import { hSatzText, pSatzText, type Gefahrstoff } from "../../shared/gefahrstoff.js";
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

export function GefahrstoffBlock({ g }: { g: Gefahrstoff }) {
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
        <ul className="space-y-1 text-sm">
          {g.pSaetze.map((code) => (
            <li key={code}>
              <span className="font-semibold">{code}</span>
              {pSatzText(code) ? ` — ${pSatzText(code)}` : " — Wortlaut steht im Sicherheitsdatenblatt."}
            </li>
          ))}
        </ul>
      )}
      {g.unNr && (
        <p className="text-sm">Gefahrgut-Hinweis für den Versand: {g.unNr}{g.versandHinweis ? `. ${g.versandHinweis}` : ""}</p>
      )}
      {!g.unNr && g.versandHinweis && <p className="text-sm">Versandhinweis: {g.versandHinweis}</p>}
      {g.mindestalter && <p className="text-sm">Abgabe erst ab {g.mindestalter} Jahren.</p>}
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
