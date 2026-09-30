/**
 * Karosserie-Silhouetten für die Filterkacheln. Bewusst selbst gezeichnet:
 * fertige Symbolsätze haben keine Unterscheidung zwischen Kombi, Limousine
 * und Coupé — und ein Diamant für "Coupé" sieht nach Verlegenheit aus.
 * Alle Formen teilen dieselbe Grundlinie, damit die Kacheln ruhig wirken.
 */
const UMRISS: Record<string, string> = {
  "Kleinwagen":       "3,15.5 3,11 6,10 10,5.6 21,5.2 25,10 37,11.4 37,15.5",
  "Kompakt":          "3,15.5 3,11 6,10 11,5.4 24,5.2 28,10 37,11.4 37,15.5",
  "Limousine":        "3,15.5 3,11.4 8,10.4 13,5.6 26,5.6 31,10.4 37,11.4 37,15.5",
  "Kombi":            "3,15.5 3,11 7,10 12,5.2 30,5.2 33,9 37,10.4 37,15.5",
  "SUV":              "3,15.5 3,10.2 7,9.2 12,4.4 27,4.4 31,9.2 37,10.2 37,15.5",
  "Cabrio":           "3,15.5 3,11.4 7,10.4 13,6.2 16.5,6 17.5,10.6 32,11 37,11.4 37,15.5",
  "Coupé":            "3,15.5 3,11 7,10 13,6 22,5.4 30,10 37,11.4 37,15.5",
  "Van & Transporter":"3,15.5 3,10 5,4.4 13,3.6 30,3.6 34,8.4 37,9.6 37,15.5",
};

export function KarosserieSymbol({ art, className }: { art: string; className?: string }) {
  const punkte = UMRISS[art] ?? UMRISS["Kompakt"];
  return (
    <svg viewBox="0 0 40 20" fill="none" stroke="currentColor" strokeWidth="1.3"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points={punkte} />
      {/* Unterboden zwischen den Rädern */}
      <path d="M3 15.5h5M14 15.5h12M32 15.5h5" />
      <circle cx="11" cy="15.5" r="3" />
      <circle cx="29" cy="15.5" r="3" />
    </svg>
  );
}
