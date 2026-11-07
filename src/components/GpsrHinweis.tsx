import { FileDown } from "lucide-react";
import { gpsrLesen } from "../../shared/gpsr.js";

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
    <section className="mt-6 rounded-2xl border border-border bg-card p-4 space-y-2" aria-label="Herstellerangaben">
      <h2 className="text-lg font-display">Herstellerangaben / Produktsicherheit</h2>
      {zeilen.map(([label, wert]) => (
        <p key={label} className="text-sm">
          <span className="font-semibold">{label}: </span>{wert}
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
