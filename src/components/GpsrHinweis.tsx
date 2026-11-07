import { FileDown } from "lucide-react";
import { gpsrLesen } from "../../shared/gpsr.js";

function Kontakt({ wert }: { wert: string }) {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(wert)) {
    return <a href={`mailto:${wert}`} className="underline">{wert}</a>;
  }
  if (/^https?:\/\//i.test(wert)) {
    return <a href={wert} className="underline break-all" target="_blank" rel="noopener noreferrer">{wert}</a>;
  }
  return <>{wert}</>;
}

export function GpsrHinweis({
  felder,
  sdbUrl,
}: {
  felder?: Array<{ key?: string; value?: string } | null> | null;
  sdbUrl?: string;
}) {
  const g = gpsrLesen(felder);
  if (!g.hat && !sdbUrl) return null;
  const zeilen = [
    g.name && ["Hersteller", g.name],
    g.adresse && ["Anschrift", g.adresse],
    g.kontakt && ["Kontakt", g.kontakt],
    g.eu && ["Verantwortliche Person in der EU", g.eu],
  ].filter(Boolean) as Array<[string, string]>;
  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-2" aria-label="Herstellerangaben">
      <h2 className="text-lg font-display">Herstellerangaben / Produktsicherheit</h2>
      {zeilen.map(([label, wert]) => (
        <p key={label} className="text-sm whitespace-pre-line">
          <span className="font-semibold">{label}: </span>
          {label === "Kontakt" ? <Kontakt wert={wert} /> : wert}
        </p>
      ))}
      {g.hinweise && <p className="text-sm whitespace-pre-line">{g.hinweise}</p>}
      {sdbUrl && (
        <a href={sdbUrl} className="btn-outline text-sm mt-1" target="_blank" rel="noopener noreferrer">
          <FileDown className="w-4 h-4" /> Sicherheitsdatenblatt
        </a>
      )}
    </section>
  );
}
